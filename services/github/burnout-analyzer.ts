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

interface ContributorWeekData {
  w: number;
  a: number;
  d: number;
  c: number;
}

interface ContributorStats {
  author: { login: string; avatar_url: string } | null;
  weeks: ContributorWeekData[];
  total: number;
}

type PunchCardEntry = [number, number, number];

const GITHUB_REST_URL = 'https://api.github.com';

const TREND_WEEKS = 12;
const CONTRIBUTOR_CEILING = 500;
const WORK_HOURS_START = 9;
const WORK_HOURS_END = 18;

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-3.6-flash';

const GEMINI_TIMEOUT_MS = 15000;
const GEMINI_ATTEMPTS = 2;

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

function deriveTiming(punchCard: PunchCardEntry[] | null): CommitTiming {
  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  const byHour = Array<number>(24).fill(0);
  let total = 0;
  let offHours = 0;
  let weekend = 0;

  for (const entry of punchCard ?? []) {
    if (!Array.isArray(entry) || entry.length < 3) continue;
    const [sundayFirstDay, hour, commits] = entry;
    if (!Number.isFinite(commits) || commits <= 0) continue;

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

      const isHighIntensity = commits > 8 || additions > 750;
      if (isHighIntensity) {
        highIntensityWeeks++;
        currentConsecutiveHigh++;
        if (currentConsecutiveHigh > maxConsecutiveHigh) maxConsecutiveHigh = currentConsecutiveHigh;
      } else {
        currentConsecutiveHigh = 0;
      }
    });

    let burnoutScore = maxConsecutiveHigh * 15 + highIntensityWeeks * 6 - restWeeks * 4;

    const avgLast3 = recentTrend.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const avgPreceding6 = recentTrend.slice(-9, -3).reduce((a, b) => a + b, 0) / 6;
    if (avgPreceding6 > 0 && avgLast3 > avgPreceding6 * 1.5) burnoutScore += 15;

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

  let runningCommits = 0;
  let busFactor = 0;
  for (const c of contributors) {
    runningCommits += c.totalCommits;
    busFactor++;
    if (totalCommits > 0 && runningCommits / totalCommits >= 0.7) break;
  }

  const dependencyRisk: BurnoutReport['dependencyRisk'] =
    busFactor === 1 ? 'High' : busFactor <= 3 ? 'Medium' : 'Low';

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

  let res: Response | undefined;
  let lastError: unknown;

  for (let attempt = 0; attempt < GEMINI_ATTEMPTS; attempt++) {
    if (input.signal?.aborted) break;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
        signal: withTimeout(input.signal, GEMINI_TIMEOUT_MS),
      });
    } catch (err) {
      lastError = err;
      res = undefined;
    }

    const transient = !res || (res.status >= 500 && res.status !== 501);
    if (!transient) break;
    if (attempt < GEMINI_ATTEMPTS - 1) await new Promise((r) => setTimeout(r, 800));
  }

  if (!res) throw lastError instanceof Error ? lastError : new Error('Gemini request failed');

  if (!res.ok) {
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
