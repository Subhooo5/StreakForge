// Overview-tab mappers: live `/api/dashboard` payload -> the shapes
// `DashboardClient.tsx` renders. Pure functions only, no fetching.

import { buildHeatmapGrid } from "@/components/ContributionHeatmap";
import type { HeatmapGrid } from "@/components/ContributionHeatmap";
import type { ActivityData, HallOfFameAward } from "@/types/dashboard";
import type { DashboardPeriod } from "@/utils/dashboardPeriod";
import type { ActivityBucket, DashboardOverviewPayload, Deployment, GraphNode, HistData, InactiveRepo, LangSlice, MonthlySummary, PopularRepo, Profile, YearlySummary } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/* ── small formatting helpers ──────────────────────────────────────────── */

const monthShort = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const monthOnly = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });

const dayShort = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const fullDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function parseDay(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

/** "3 days" / "2 months" / "1 year" — the unit the deployment + inactivity copy uses. */
export function humanizeAgo(fromIso: string, now: number = Date.now()): string {
  const diffDays = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / DAY_MS));
  if (diffDays < 1) return "today";
  if (diffDays === 1) return "1 day";
  if (diffDays < 30) return `${diffDays} days`;
  const months = Math.floor(diffDays / 30);
  if (months < 12) return months === 1 ? "1 month" : `${months} months`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1 year" : `${years} years`;
}

/* ── profile ───────────────────────────────────────────────────────────── */

export function toProfile(payload: DashboardOverviewPayload): Profile {
  const { profile, stats } = payload;
  const hasAvatar = !!profile.avatarUrl;

  return {
    user: profile.username,
    handle: `@${profile.username}`,
    name: profile.name,
    // With a real avatar the image *is* the background, so no initial is drawn.
    initial: hasAvatar ? "" : (profile.name[0] || profile.username[0] || "?").toUpperCase(),
    avatar: hasAvatar ? `url("${profile.avatarUrl}") center/cover no-repeat` : "linear-gradient(135deg,var(--pa),var(--accent))",
    bio: profile.bio,
    loc: profile.location,
    joined: profile.joinedDate,
    score: profile.developerScore,
    reposStr: profile.stats.repositories.toLocaleString(),
    starsStr: profile.stats.stars.toLocaleString(),
    followersStr: profile.stats.followers.toLocaleString(),
    followingStr: profile.stats.following.toLocaleString(),
    streakStr: String(stats.currentStreak),
    peakStr: String(stats.peakStreak),
    contribStr: stats.totalContributions.toLocaleString(),
    repos: profile.stats.repositories,
    stars: profile.stats.stars,
    contrib: stats.totalContributions,
  };
}

/* ── languages ─────────────────────────────────────────────────────────── */

export function toLangs(payload: DashboardOverviewPayload): LangSlice[] {
  const total = payload.languages.reduce((sum, l) => sum + l.percentage, 0) || 1;
  return payload.languages.map((l) => ({
    name: l.name,
    color: l.color,
    v: l.percentage / total,
    pct: `${l.percentage}%`,
  }));
}

/* ── ecosystem graph ───────────────────────────────────────────────────── */

const GRAPH_TYPE: Record<string, GraphNode["type"]> = {
  Repo: "Personal",
  Contribution: "Contributions",
  Fork: "Forks",
};

const GRAPH_COLOR: Record<GraphNode["type"], string> = {
  Personal: "var(--pb)",
  Contributions: "var(--pc)",
  Forks: "var(--pe)",
};

/**
 * Lay the repo nodes out on concentric rings around the centred user node,
 * matching the mockup's orbit geometry but scaling to any repo count.
 */
export function toGraphNodes(payload: DashboardOverviewPayload): GraphNode[] {
  const repoNodes = payload.graphData.nodes.filter((n) => n.type !== "User");

  // Ring sizes grow outward so a large ecosystem stays inside the 600x460 stage.
  const rings: { count: number; radius: number; offset: number }[] = [
    { count: 10, radius: 92, offset: 0 },
    { count: 12, radius: 150, offset: 0.26 },
    { count: 16, radius: 200, offset: 0.13 },
  ];

  let index = 0;
  const out: GraphNode[] = [];

  for (const node of repoNodes) {
    let ring = rings[rings.length - 1];
    let seat = index;
    for (const r of rings) {
      if (seat < r.count) {
        ring = r;
        break;
      }
      seat -= r.count;
    }
    // Anything past the last ring keeps orbiting the outermost ring.
    const seatCount = ring.count;
    const ang = (seat / seatCount) * Math.PI * 2 + ring.offset;

    out.push({
      i: index,
      type: GRAPH_TYPE[node.type] ?? "Personal",
      color: GRAPH_COLOR[GRAPH_TYPE[node.type] ?? "Personal"],
      name: node.name,
      x: 230 + Math.cos(ang) * ring.radius,
      y: 200 + Math.sin(ang) * ring.radius,
      rr: Math.max(5, Math.min(10, Math.round(node.val / 2))),
      stars: node.stats?.stars ?? 0,
      commits: node.stats?.commits ?? 0,
    });
    index++;
  }

  return out;
}

/* ── hall of fame ──────────────────────────────────────────────────────── */

const FAME_STYLE: Record<string, { color: string; iconName: string }> = {
  "Most Popular": { color: "var(--accent-2)", iconName: "star" },
  "Fastest Growing": { color: "var(--pc)", iconName: "trend" },
  "Rising Star": { color: "var(--pb)", iconName: "bolt" },
  "Most Consistent": { color: "var(--pa)", iconName: "fire" },
  "Most Contributed": { color: "var(--pd)", iconName: "compare" },
  "Most Active": { color: "var(--pe)", iconName: "fire" },
  "Most Collaborative": { color: "var(--pb)", iconName: "branch" },
};

export interface FameCardData {
  key: number;
  badge: string;
  color: string;
  iconName: string;
  metricLabel: string;
  metric: string;
  sub: string;
  repo: string;
  repoNote: string;
  avatar: string;
}

export function toFame(payload: DashboardOverviewPayload): FameCardData[] {
  const awards: HallOfFameAward[] = payload.hallOfFame ?? [];
  return awards.map((a, i) => {
    const style = FAME_STYLE[a.title] ?? { color: "var(--pb)", iconName: "trophy" };
    return {
      key: i,
      badge: a.title,
      color: style.color,
      iconName: style.iconName,
      metricLabel: a.centerpieceLabel,
      metric: String(a.centerpieceValue),
      sub: a.bottomStats,
      repo: a.repoName,
      repoNote: a.explanation,
      avatar: a.repoAvatar ? `url("${a.repoAvatar}") center/cover no-repeat` : "linear-gradient(135deg,var(--pa),var(--accent))",
    };
  });
}

/* ── activity bucketing (Activity Landscape bars + 3D city) ────────────── */

export const RANGE_DAYS: Record<string, number> = { "1W": 7, "1M": 30, "3M": 90, "1Y": 365 };

/**
 * Slice the trailing `range` window and aggregate it into at most `maxBars`
 * buckets, summing each window so no day is dropped.
 *
 * Mirrors `getFilteredData` in the ported ActivityLandscape, which is the
 * reference behaviour for the Commits / Lines-of-Code toggle.
 */
export function toActivityBuckets(activity: ActivityData[], range: string, maxBars = 42): ActivityBucket[] {
  const days = RANGE_DAYS[range] ?? 90;
  const recent = activity.slice(-days);
  if (recent.length === 0) return [];

  const pack = (bucket: ActivityData[]): ActivityBucket => ({
    startDate: bucket[0].date,
    endDate: bucket[bucket.length - 1].date,
    days: bucket.length,
    count: bucket.reduce((s, d) => s + d.count, 0),
  });

  if (recent.length <= maxBars) return recent.map((d) => pack([d]));

  const step = Math.ceil(recent.length / maxBars);
  const remainder = recent.length % step;
  const buckets: ActivityBucket[] = [];

  // Keep the partial bucket at the oldest edge so recent bars stay full windows.
  if (remainder > 0) buckets.push(pack(recent.slice(0, remainder)));
  for (let i = remainder; i < recent.length; i += step) {
    buckets.push(pack(recent.slice(i, i + step)));
  }
  return buckets;
}

/** Human label for a bucket, e.g. "Mar 3 – Mar 5, 2026" or "Mar 5, 2026". */
export function bucketLabel(bucket: ActivityBucket): string {
  const end = parseDay(bucket.endDate);
  if (bucket.days <= 1 || bucket.startDate === bucket.endDate) return fullDate.format(end);
  return `${dayShort.format(parseDay(bucket.startDate))} – ${fullDate.format(end)}`;
}

/* ── heatmap + 3D city ─────────────────────────────────────────────────── */

/** 53x7 intensity grid (column-major, oldest first) for the historical heatmap. */
export type { HeatmapCell, HeatmapGrid } from "@/components/ContributionHeatmap";

const HEATMAP_WEEKS = 53;

/**
 * Build GitHub's contribution-graph grid from the real calendar, over the
 * Dashboard's 12-month window.
 *
 * The bucketing itself lives in `components/ContributionHeatmap` so the
 * Dashboard and the Compare results page share one implementation — see
 * CLAUDE.md's core-once principle.
 */
export function toHeatmapGrid(activity: ActivityData[]): HeatmapGrid {
  return buildHeatmapGrid(activity, HEATMAP_WEEKS);
}

/** Sparkline bars under each streak stat card — the trailing 14 buckets. */
export function toMiniBars(activity: ActivityData[], bucketDays: number): { key: number; heightPct: number; bg: string }[] {
  const slice = activity.slice(-14 * bucketDays);
  const buckets: number[] = [];
  for (let i = 0; i < slice.length; i += bucketDays) {
    buckets.push(slice.slice(i, i + bucketDays).reduce((s, d) => s + d.count, 0));
  }
  const tail = buckets.slice(-14);
  const max = Math.max(...tail, 1);
  return tail.map((v, i) => ({
    key: i,
    heightPct: Math.max(6, Math.round((v / max) * 100)),
    bg: v > 0 ? "var(--accent)" : "var(--line)",
  }));
}

/* ── historical trend view ─────────────────────────────────────────────── */

function inPeriod(activity: ActivityData[], period: DashboardPeriod): ActivityData[] {
  const from = period.from.slice(0, 10);
  const to = period.to.slice(0, 10);
  return activity.filter((d) => d.date >= from && d.date <= to);
}

/** Running streak length per day — drives the "Streak Trend" area chart. */
function streakTrend(window: ActivityData[]): number[] {
  let run = 0;
  return window.map((d) => {
    run = d.count > 0 ? run + 1 : 0;
    return run;
  });
}

function longestRun(window: ActivityData[]): number {
  let best = 0;
  let run = 0;
  for (const d of window) {
    run = d.count > 0 ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

function trailingRun(window: ActivityData[]): number {
  let run = 0;
  for (let i = window.length - 1; i >= 0; i--) {
    if (window[i].count === 0) break;
    run++;
  }
  return run;
}

function toMonthly(window: ActivityData[]): MonthlySummary[] {
  const map = new Map<string, number>();
  for (const d of window) {
    const key = d.date.slice(0, 7);
    map.set(key, (map.get(key) ?? 0) + d.count);
  }
  const rows = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const max = Math.max(...rows.map(([, v]) => v), 1);
  return rows.map(([key, v]) => ({
    m: monthShort.format(parseDay(`${key}-01`)),
    v,
    widthPct: Math.round((v / max) * 100),
  }));
}

function toYearly(window: ActivityData[]): YearlySummary[] {
  const map = new Map<string, number>();
  for (const d of window) {
    const key = d.date.slice(0, 4);
    map.set(key, (map.get(key) ?? 0) + d.count);
  }
  const rows = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const max = Math.max(...rows.map(([, v]) => v), 1);
  return rows.map(([y, v]) => ({ y, v, widthPct: Math.round((v / max) * 100) }));
}

function toDeployments(payload: DashboardOverviewPayload): Deployment[] {
  const STATUS: Record<string, { label: string; color: string }> = {
    success: { label: "Success", color: "var(--good)" },
    failure: { label: "Failed", color: "var(--bad)" },
    in_progress: { label: "Running", color: "var(--warn)" },
    unknown: { label: "Unknown", color: "var(--soft)" },
  };

  return (payload.deployments ?? []).map((d, i) => {
    const status = STATUS[d.status] ?? STATUS.unknown;
    return {
      key: i,
      name: d.repoName,
      url: (d.liveUrl ?? d.repoUrl).replace(/^https?:\/\//, ""),
      ago: d.deployedAt ? `Deployed ${humanizeAgo(d.deployedAt)} ago` : "Deployment date unknown",
      status: status.label,
      statusColor: status.color,
    };
  });
}

function toPopular(payload: DashboardOverviewPayload): PopularRepo[] {
  return (payload.popularRepos ?? []).slice(0, 4).map((r, i) => ({
    key: i,
    name: r.name,
    desc: r.description || "No description provided.",
    stars: r.stargazerCount,
  }));
}

/** Repos with no push inside `windowDays`, oldest first. */
export function toInactive(payload: DashboardOverviewPayload, windowDays: number): InactiveRepo[] {
  const now = Date.now();
  return payload.repoActivity
    .filter((r) => r.pushedAt)
    .map((r) => ({
      name: r.name,
      pushed: new Date(r.pushedAt as string).getTime(),
    }))
    .map((r) => ({ ...r, idle: Math.floor((now - r.pushed) / DAY_MS) }))
    .filter((r) => r.idle >= windowDays)
    .sort((a, b) => b.idle - a.idle)
    .map((r, i) => ({
      key: i,
      name: r.name,
      date: fullDate.format(new Date(r.pushed)),
      days: `${r.idle}d`,
    }));
}

export function toHist(payload: DashboardOverviewPayload, period: DashboardPeriod, inactiveWindowDays: number): HistData {
  const window = inPeriod(payload.activity, period);
  const contributions = window.reduce((s, d) => s + d.count, 0);
  const activeDays = window.filter((d) => d.count > 0).length;

  const peakDay = window.reduce<ActivityData | null>((best, d) => (best === null || d.count > best.count ? d : best), null);

  return {
    contributions,
    activeDays,
    windowDays: window.length,
    windowLabel: period.label,
    current: trailingRun(window),
    longest: longestRun(window),
    peak: peakDay && peakDay.count > 0 ? `${peakDay.date} (${peakDay.count})` : "No activity",
    deployments: toDeployments(payload),
    avg: window.length > 0 ? (contributions / window.length).toFixed(1) : "0.0",
    trendVals: streakTrend(window),
    monthly: toMonthly(window),
    yearly: toYearly(window),
    popular: toPopular(payload),
    inactive: toInactive(payload, inactiveWindowDays),
    atOldestWindow: window.length === 0,
  };
}
