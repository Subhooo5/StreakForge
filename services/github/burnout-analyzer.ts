import 'server-only';
import { getGitHubTokens } from '@/lib/github';
import { DistributedCache } from '@/lib/cache';
import { isBotAuthor } from '@/lib/bot-filter';
import { logger } from '@/lib/logger';
import type {
  BurnoutAdvice,
  BurnoutReport,
  CommitTiming,
  ContributorMetric,
  InactivityAlert,
  WeeklyActivity,
} from '@/types/burnout';

/** One week of a contributor's history as GitHub reports it. */
interface ContributorWeekData {
  w: number; // week start (Unix seconds)
  a: number; // additions
  d: number; // deletions
  c: number; // commits
}

interface ContributorStats {
  author: { login: string; avatar_url: string } | null;
  weeks: ContributorWeekData[];
  total: number;
}

/** `[dayOfWeek (0=Sunday), hourOfDay, commits]`, as GitHub's punch card returns it. */
type PunchCardEntry = [number, number, number];

const GITHUB_REST_URL = 'https://api.github.com';

/** Trailing window every per-contributor metric is measured over. */
const TREND_WEEKS = 12;
/** GitHub caps `stats/contributors` at this many contributors. */
const CONTRIBUTOR_CEILING = 500;
/** Commits outside this hour range count as off-hours. */
const WORK_HOURS_START = 9;
const WORK_HOURS_END = 18;

/**
 * Model backing the AI half of the recommendations panel.
 *
 * Overridable via `GEMINI_MODEL`. The default is deliberately not
 * `gemini-2.5-flash`: Google has retired that identifier for new keys and
 * answers it with a 404 pointing at this one, which would silently drop the
 * page back to heuristic-only advice.
 */
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-3.6-flash';

/** Ceiling per recommendation attempt, independent of the route's budget. */
const GEMINI_TIMEOUT_MS = 15000;
/** Attempts before falling back to heuristics-only advice. */
const GEMINI_ATTEMPTS = 2;

/** A signal that aborts with `parent`, or after `ms`, whichever comes first. */
function withTimeout(parent: AbortSignal | undefined, ms: number): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const stop = () => clearTimeout(timer);

  if (parent) {
    if (parent.aborted) controller.abort();
    else parent.addEventListener('abort', () => controller.abort(), { once: true });
  }
  controller.signal.addEventListener('abort', stop, { once: true });

  return controller.signal;
}

/**
 * Only the derived report is cached, never the upstream payload —
 * `stats/contributors` is measured in megabytes for a large repository
 * (~12.5 MB for facebook/react) while the report below is a few kilobytes.
 */
const reportCache = new DistributedCache<BurnoutReport>(200);
const CACHE_TTL_MS = 60 * 60 * 1000;

let currentTokenIndex = 0;
function getHeaders(userToken?: string) {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
  let token = userToken;
  if (!token) {
    const tokens = getGitHubTokens();
    if (tokens.length > 0) {
      token = tokens[currentTokenIndex % tokens.length];
      currentTokenIndex++;
    }
  }
  if (token) {
    headers['Authorization'] = `bearer ${token}`;
  }
  return headers;
}

export interface BurnoutAnalysisOptions {
  bypassCache?: boolean;
  token?: string;
  excludeBots?: boolean;
  signal?: AbortSignal;
}

/**
 * Burnout and sustainability report for one repository.
 *
 * `excludeBots` is part of the cache key rather than a post-filter: dropping
 * bot accounts changes the commit totals every downstream figure is derived
 * from, so the two variants are genuinely different analyses and must not
 * share a cache entry.
 */
export async function fetchBurnoutAnalysis(
  owner: string,
  repo: string,
  options: BurnoutAnalysisOptions = {}
): Promise<BurnoutReport> {
  const excludeBots = !!options.excludeBots;
  const cacheKey = `burnout-analyzer:${owner.toLowerCase()}/${repo.toLowerCase()}${excludeBots ? ':no-bots' : ''}`;

  const run = () => analyzeRepositoryUncached(owner, repo, options.token, excludeBots, options.signal);

  if (options.bypassCache) {
    const fresh = await run();
    await reportCache.set(cacheKey, fresh, CACHE_TTL_MS);
    return fresh;
  }

  return reportCache.getOrSet(cacheKey, run, CACHE_TTL_MS);
}

/**
 * GitHub computes repository statistics asynchronously and answers 202 while a
 * job is running. Retry with backoff until it settles.
 */
async function fetchStatsWithCompilingRetry(
  url: string,
  headers: Record<string, string>,
  signal?: AbortSignal
): Promise<Response> {
  let attempts = 0;
  const maxAttempts = 3;
  let delay = 1500;

  while (attempts < maxAttempts) {
    let res: Response;
    try {
      res = await fetch(url, { method: 'GET', headers, cache: 'no-store', signal });
    } catch (err) {
      if (attempts >= maxAttempts - 1) throw err;
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
      continue;
    }

    if (res.status === 202) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
      continue;
    }
    return res;
  }
  throw new Error('GitHub is still compiling statistics. Please try again in a few moments.');
}

/**
 * Reads a statistics response body.
 *
 * A 204 with an empty body means GitHub has nothing to report — an empty
 * repository, or one whose history it has not compiled. That is a legitimate
 * outcome rather than a failure, so it resolves to `null`.
 */
async function readStatsJson<T>(res: Response): Promise<T | null> {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** A zeroed report, so an empty repository renders an empty state, not fake data. */
function emptyReport(owner: string, repo: string, excludeBots: boolean): BurnoutReport {
  return {
    repoName: `${owner}/${repo}`,
    owner,
    repo,
    totalCommits: 0,
    totalContributors: 0,
    busFactor: 0,
    dependencyRisk: 'Low',
    sustainabilityScore: 0,
    contributors: [],
    inactivityAlerts: [],
    recommendations: [],
    timing: {
      byWeekday: [0, 0, 0, 0, 0, 0, 0],
      byHour: Array<number>(24).fill(0),
      offHoursPct: 0,
      weekendPct: 0,
      peakWeekdayIndex: 0,
      sampleCommits: 0,
    },
    weeklyActivity: { last12Weeks: Array<number>(TREND_WEEKS).fill(0), avgWeeklyCommits: 0 },
    botsExcluded: excludeBots,
    botsFiltered: 0,
    empty: true,
    contributorsTruncated: false,
  };
}

/**
 * Commit timing from GitHub's punch card.
 *
 * This is the only repository endpoint that exposes *when* commits land —
 * `stats/contributors` aggregates to whole weeks and cannot answer weekday or
 * hour questions. The punch card is repo-wide and carries no author, so it
 * cannot be filtered by contributor; see `botsExcluded` on the report.
 */
function deriveTiming(punchCard: PunchCardEntry[] | null): CommitTiming {
  const byWeekday = [0, 0, 0, 0, 0, 0, 0]; // Monday-first
  const byHour = Array<number>(24).fill(0);
  let total = 0;
  let offHours = 0;
  let weekend = 0;

  for (const entry of punchCard ?? []) {
    if (!Array.isArray(entry) || entry.length < 3) continue;
    const [sundayFirstDay, hour, commits] = entry;
    if (!Number.isFinite(commits) || commits <= 0) continue;

    // GitHub indexes 0 = Sunday; the page reads Monday-first.
    const weekdayIndex = (sundayFirstDay + 6) % 7;
    byWeekday[weekdayIndex] += commits;
    if (hour >= 0 && hour < 24) byHour[hour] += commits;
    total += commits;

    if (hour < WORK_HOURS_START || hour >= WORK_HOURS_END) offHours += commits;
    if (weekdayIndex >= 5) weekend += commits;
  }

  let peakWeekdayIndex = 0;
  for (let i = 1; i < byWeekday.length; i++) {
    if (byWeekday[i] > byWeekday[peakWeekdayIndex]) peakWeekdayIndex = i;
  }

  return {
    byWeekday,
    byHour,
    offHoursPct: total > 0 ? Math.round((offHours / total) * 100) : 0,
    weekendPct: total > 0 ? Math.round((weekend / total) * 100) : 0,
    peakWeekdayIndex,
    sampleCommits: total,
  };
}

/**
 * Repository-wide weekly volume, summed from the same contributor weeks every
 * other figure uses.
 *
 * Deriving this from `stats/contributors` rather than `stats/commit_activity`
 * costs one fewer upstream request and — more importantly — means the bot
 * filter applies here too, so the chart always agrees with the commit total
 * printed above it.
 */
function deriveWeeklyActivity(contributors: ContributorStats[]): WeeklyActivity {
  const totals = new Map<number, number>();
  for (const c of contributors) {
    for (const week of c.weeks ?? []) {
      if (!week || !Number.isFinite(week.w)) continue;
      totals.set(week.w, (totals.get(week.w) ?? 0) + (week.c || 0));
    }
  }

  const ordered = [...totals.entries()].sort((a, b) => a[0] - b[0]).map(([, commits]) => commits);
  const last12 = ordered.slice(-TREND_WEEKS);
  while (last12.length < TREND_WEEKS) last12.unshift(0);

  const last52 = ordered.slice(-52);
  const avg = last52.length > 0 ? last52.reduce((a, b) => a + b, 0) / last52.length : 0;

  return { last12Weeks: last12, avgWeeklyCommits: Math.round(avg) };
}

async function analyzeRepositoryUncached(
  owner: string,
  repo: string,
  userToken?: string,
  excludeBots?: boolean,
  signal?: AbortSignal
): Promise<BurnoutReport> {
  const headers = getHeaders(userToken);
  const base = `${GITHUB_REST_URL}/repos/${owner}/${repo}`;

  // Both statistics endpoints run together. `stats/contributors` dominates the
  // wall clock, so the punch card is effectively free.
  const [contributorsRes, punchCardRes] = await Promise.all([
    fetchStatsWithCompilingRetry(`${base}/stats/contributors`, headers, signal),
    fetchStatsWithCompilingRetry(`${base}/stats/punch_card`, headers, signal).catch(() => null),
  ]);

  if (!contributorsRes.ok && contributorsRes.status !== 204) {
    if (contributorsRes.status === 404) {
      throw new Error(`Repository ${owner}/${repo} not found.`);
    }
    if (contributorsRes.status === 403 || contributorsRes.status === 429) {
      throw new Error('Rate Limit: GitHub API quota exhausted for repository statistics.');
    }
    throw new Error(`Failed to fetch contributor stats: ${contributorsRes.statusText}`);
  }

  const rawData = await readStatsJson<ContributorStats[]>(contributorsRes);
  if (!Array.isArray(rawData) || rawData.length === 0) {
    // Empty repository, or history GitHub has not compiled. Report it as such.
    return emptyReport(owner, repo, !!excludeBots);
  }

  const punchCard = punchCardRes ? await readStatsJson<PunchCardEntry[]>(punchCardRes) : null;

  const withAuthors = rawData.filter((c) => c && c.author && Array.isArray(c.weeks));
  const botCount = withAuthors.filter((c) => isBotAuthor(c.author!.login)).length;
  const filteredRawData = excludeBots
    ? withAuthors.filter((c) => !isBotAuthor(c.author!.login))
    : withAuthors;

  if (filteredRawData.length === 0) {
    return { ...emptyReport(owner, repo, !!excludeBots), botsFiltered: botCount };
  }

  const totalCommits = filteredRawData.reduce((acc, c) => acc + (c.total || 0), 0);
  const totalContributors = filteredRawData.length;

  const timing = deriveTiming(punchCard);
  const weeklyActivity = deriveWeeklyActivity(filteredRawData);

  const contributors: ContributorMetric[] = [];
  const inactivityAlerts: InactivityAlert[] = [];

  const sortedRaw = [...filteredRawData].sort((a, b) => (b.total || 0) - (a.total || 0));

  for (const c of sortedRaw) {
    if (!c.author || !c.weeks || c.weeks.length === 0) continue;

    const username = c.author.login;
    const avatarUrl = c.author.avatar_url;
    const userCommits = c.total || 0;
    const commitShare = totalCommits > 0 ? (userCommits / totalCommits) * 100 : 0;

    const recentWeeks = c.weeks.slice(-TREND_WEEKS);
    const recentTrend = recentWeeks.map((w) => w.c || 0);
    const recentAdditionsTrend = recentWeeks.map((w) => w.a || 0);

    let activeWeeks = 0;
    let highIntensityWeeks = 0;
    let currentConsecutiveHigh = 0;
    let maxConsecutiveHigh = 0;
    let restWeeks = 0;

    recentWeeks.forEach((w) => {
      const commits = w.c || 0;
      const additions = w.a || 0;

      if (commits > 0) activeWeeks++;
      else restWeeks++;

      // A week is intense at more than 8 commits or more than 750 added lines.
      const isHighIntensity = commits > 8 || additions > 750;
      if (isHighIntensity) {
        highIntensityWeeks++;
        currentConsecutiveHigh++;
        if (currentConsecutiveHigh > maxConsecutiveHigh) maxConsecutiveHigh = currentConsecutiveHigh;
      } else {
        currentConsecutiveHigh = 0;
      }
    });

    // Sustained intensity weighs heaviest; rest weeks pay it back down.
    let burnoutScore = maxConsecutiveHigh * 15 + highIntensityWeeks * 6 - restWeeks * 4;

    // A sudden surge over the trailing three weeks is its own signal.
    const avgLast3 = recentTrend.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const avgPreceding6 = recentTrend.slice(-9, -3).reduce((a, b) => a + b, 0) / 6;
    if (avgPreceding6 > 0 && avgLast3 > avgPreceding6 * 1.5) burnoutScore += 15;

    // Carrying a large share of the repository raises exposure.
    burnoutScore += commitShare * 0.4;

    burnoutScore = Math.max(0, Math.min(100, Math.round(burnoutScore)));
    const riskLevel: ContributorMetric['riskLevel'] =
      burnoutScore > 70 ? 'High' : burnoutScore > 35 ? 'Medium' : 'Low';

    contributors.push({
      username,
      avatarUrl,
      totalCommits: userCommits,
      commitShare: Math.round(commitShare * 100) / 100,
      burnoutScore,
      riskLevel,
      activeWeeks,
      highIntensityWeeks,
      consecutiveHighWeeks: maxConsecutiveHigh,
      restWeeks,
      recentTrend,
      recentAdditionsTrend,
    });

    // Previously active, now silent for the trailing three weeks.
    const avgHistory = recentTrend.slice(0, 9).reduce((a, b) => a + b, 0) / 9;
    const commitsRecent3 = recentTrend.slice(-3).reduce((a, b) => a + b, 0);

    if (avgHistory > 1 && commitsRecent3 === 0) {
      let weeksSilent = 0;
      for (let i = recentTrend.length - 1; i >= 0; i--) {
        if (recentTrend[i] === 0) weeksSilent++;
        else break;
      }

      inactivityAlerts.push({
        username,
        avatarUrl,
        previousAvgWeeklyCommits: Math.round(avgHistory * 10) / 10,
        weeksSilent,
        severity: avgHistory > 3 ? 'High' : 'Medium',
      });
    }
  }

  // Bus factor: how many of the top contributors it takes to reach 70% of commits.
  let runningCommits = 0;
  let busFactor = 0;
  for (const c of contributors) {
    runningCommits += c.totalCommits;
    busFactor++;
    if (totalCommits > 0 && runningCommits / totalCommits >= 0.7) break;
  }

  const dependencyRisk: BurnoutReport['dependencyRisk'] =
    busFactor === 1 ? 'High' : busFactor <= 3 ? 'Medium' : 'Low';

  // Sustainability: dependency exposure, burnout spread, and churn.
  let sustainabilityScore = 100;
  if (dependencyRisk === 'High') sustainabilityScore -= 30;
  else if (dependencyRisk === 'Medium') sustainabilityScore -= 12;

  const highBurnoutCount = contributors.filter((c) => c.riskLevel === 'High').length;
  const mediumBurnoutCount = contributors.filter((c) => c.riskLevel === 'Medium').length;

  if (totalContributors > 0) {
    sustainabilityScore -=
      (highBurnoutCount / totalContributors) * 50 + (mediumBurnoutCount / totalContributors) * 15;
  }

  sustainabilityScore -= inactivityAlerts.filter((a) => a.severity === 'High').length * 8;
  sustainabilityScore = Math.max(0, Math.min(100, Math.round(sustainabilityScore)));

  const recommendations: BurnoutAdvice[] = buildHeuristicRecommendations({
    contributors,
    inactivityAlerts,
    dependencyRisk,
    sustainabilityScore,
  });

  // A language model refines the advice when one is configured. Without a key
  // the heuristic list stands on its own and nothing about the page changes.
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    try {
      const aiLines = await generateRecommendationsWithGemini(geminiApiKey, {
        owner,
        repo,
        totalCommits,
        totalContributors,
        busFactor,
        dependencyRisk,
        sustainabilityScore,
        topContributors: contributors.slice(0, 5),
        inactivityAlerts,
        signal,
      });
      if (aiLines.length > 0) {
        recommendations.unshift(...aiLines.map((text) => ({ text, ai: true })));
      }
    } catch (err) {
      // Log the message, not the Error instance: the logger serialises the
      // latter to `{}`, which hid whether this was a bad key, a retired model
      // or an abort.
      logger.warn('Gemini recommendation generation failed. Falling back to rules-based analyzer.', {
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    repoName: `${owner}/${repo}`,
    owner,
    repo,
    totalCommits,
    totalContributors,
    busFactor,
    dependencyRisk,
    sustainabilityScore,
    contributors,
    inactivityAlerts,
    recommendations,
    timing,
    weeklyActivity,
    botsExcluded: !!excludeBots,
    botsFiltered: botCount,
    empty: false,
    contributorsTruncated: rawData.length >= CONTRIBUTOR_CEILING,
  };
}

function buildHeuristicRecommendations(input: {
  contributors: ContributorMetric[];
  inactivityAlerts: InactivityAlert[];
  dependencyRisk: BurnoutReport['dependencyRisk'];
  sustainabilityScore: number;
}): BurnoutAdvice[] {
  const { contributors, inactivityAlerts, dependencyRisk, sustainabilityScore } = input;
  const out: string[] = [];

  if (dependencyRisk === 'High' && contributors[0]) {
    out.push(
      `High dependency risk detected: @${contributors[0].username} is responsible for ${contributors[0].commitShare}% of all commits. Rotate tasks and onboard other team members to safeguard the repository's future.`
    );
  } else if (dependencyRisk === 'Medium' && contributors.length >= 2) {
    out.push(
      `Moderate dependency risk: The top contributors (@${contributors[0].username} and @${contributors[1].username}) drive the majority of changes. Consider document sharing to bridge technical silos.`
    );
  }

  contributors
    .filter((c) => c.riskLevel === 'High')
    .slice(0, 2)
    .forEach((c) => {
      out.push(
        `Burnout risk warning: @${c.username} has worked for ${c.consecutiveHighWeeks} consecutive high-intensity weeks with almost no resting periods. Encourage them to take a rest week to avoid exhaustion.`
      );
    });

  inactivityAlerts.slice(0, 2).forEach((a) => {
    out.push(
      `Activity drop detected: @${a.username} (previously averaging ${a.previousAvgWeeklyCommits} commits/week) has been silent for ${a.weeksSilent} weeks. Check in with them to see if they need assistance or block removal.`
    );
  });

  if (sustainabilityScore > 85) {
    out.push(
      'Healthy contribution patterns detected! The workload is well-distributed and contributors have sustainable activity levels.'
    );
  } else if (out.length === 0) {
    out.push(
      'Plan regular cooldown periods or refactoring weeks between feature releases to help the team balance workloads.'
    );
  }

  return out.map((text) => ({ text, ai: false }));
}

async function generateRecommendationsWithGemini(
  apiKey: string,
  input: {
    owner: string;
    repo: string;
    totalCommits: number;
    totalContributors: number;
    busFactor: number;
    dependencyRisk: string;
    sustainabilityScore: number;
    topContributors: ContributorMetric[];
    inactivityAlerts: InactivityAlert[];
    signal?: AbortSignal;
  }
): Promise<string[]> {
  const prompt = `
  You are an expert AI repository consultant. Analyze these contributor metrics for GitHub repository ${input.owner}/${input.repo}:
  - Total Commits: ${input.totalCommits}
  - Total Contributors: ${input.totalContributors}
  - Bus Factor: ${input.busFactor}
  - Repository Dependency Risk: ${input.dependencyRisk}
  - Overall Team Sustainability Score: ${input.sustainabilityScore}/100

  Top Contributor Workload Breakdown:
  ${input.topContributors.map((c) => `- @${c.username}: ${c.commitShare}% share, Burnout Score: ${c.burnoutScore}/100 (Risk: ${c.riskLevel}), Consecutive intense weeks: ${c.consecutiveHighWeeks}`).join('\n')}

  Recent Attrition/Inactivity Warnings:
  ${input.inactivityAlerts.map((a) => `- @${a.username}: silent for ${a.weeksSilent} weeks (previously averaged ${a.previousAvgWeeklyCommits} commits/week)`).join('\n')}

  Generate exactly 2 high-value, specific, actionable advice/recommendations (each under 25 words) for the project maintainers to improve developer retention, balance workload, and mitigate burnout.
  Return them as a JSON string array like: ["recommendation 1", "recommendation 2"]
  Do not return any markdown formatting outside of JSON, do not include HTML tags, and do not wrap in a code block.
  `;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  /**
   * The model answers in roughly 7–10s, but intermittently reports itself
   * overloaded (503) and only after a minute or so. One bounded retry turns
   * that from "this repository silently gets heuristics only" into a brief
   * extra wait, while a genuine misconfiguration (401/403/404) still fails on
   * the first attempt rather than being retried pointlessly.
   */
  let res: Response | undefined;
  let lastError: unknown;

  for (let attempt = 0; attempt < GEMINI_ATTEMPTS; attempt++) {
    if (input.signal?.aborted) break;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Google's Generative Language API authenticates on this header. The
          // key comes from the environment — never inlined here.
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
        // Own budget on top of the route's signal: a large repository can spend
        // most of the route's 45s inside GitHub's stats endpoint, which would
        // otherwise starve this call on exactly the repositories that most need
        // the advice.
        signal: withTimeout(input.signal, GEMINI_TIMEOUT_MS),
      });
    } catch (err) {
      lastError = err;
      res = undefined;
    }

    // Retry only what an immediate retry can fix: overload and timeouts.
    // A 429 is deliberately excluded — Google's quota errors carry a retry
    // delay measured in tens of seconds, so retrying here would only spend a
    // second request from the same exhausted allowance.
    const transient = !res || (res.status >= 500 && res.status !== 501);
    if (!transient) break;
    if (attempt < GEMINI_ATTEMPTS - 1) await new Promise((r) => setTimeout(r, 800));
  }

  if (!res) throw lastError instanceof Error ? lastError : new Error('Gemini request failed');

  if (!res.ok) {
    // Surface Google's own message — a retired model or a rejected key each
    // return a 404/403 whose body says exactly which, and losing that made the
    // failure indistinguishable from "no key configured".
    const detail = await res.text().catch(() => '');
    throw new Error(`Gemini API returned status ${res.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (text) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
      }
    } catch {
      logger.warn('Gemini returned malformed JSON, skipping AI recommendations.');
    }
  }
  return [];
}
