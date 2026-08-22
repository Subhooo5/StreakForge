"use client";

import type { BurnoutReport } from "@/types/burnout";
import { calculateBurnoutRisk, type BurnoutRiskResult } from "@/utils/calculateBurnoutRisk";

/**
 * Maps a `BurnoutReport` onto the shapes the ported Burnout Radar markup
 * renders.
 *
 * The page's design is the contract, so this module exists to keep the view
 * unchanged while its numbers become real: every field below is computed from
 * the report the API returned, and nothing is seeded or invented. Where the
 * report has no data — an empty repository — the derived values are zeros and
 * the page shows an empty state rather than a plausible-looking chart.
 */

/** Monday-first, matching `CommitTiming.byWeekday`. */
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type ContributorData = {
  key: string;
  handle: string;
  initial: string;
  avatar: string;
  avatarUrl: string;
  commitsStr: string;
  shareStr: string;
  sparkData: number[];
  intense: string;
  rest: string;
  riskPct: string;
  riskLabel: string;
  riskColor: string;
};

export type DayBar = { key: number; day: string; heightPct: number; bg: string };
export type WeekBar = { key: number; label: string; heightPct: number; bg: string; commits: number };
export type IndicatorData = { key: number; label: string; level: string; color: string; icon: string; text: string };
export type RecData = { key: number; icon: string; title: string; text: string };
export type AdviceData = { key: number; text: string; ai: boolean };

export type BurnoutView = {
  repoName: string;
  owner: string;
  repo: string;
  slug: string;
  empty: boolean;
  botsExcluded: boolean;
  botsFiltered: number;
  contributorsTruncated: boolean;

  score: number;
  health: string;
  healthColor: string;
  commitsStr: string;
  contributorsStr: string;

  list: ContributorData[];
  busFactor: number;
  conc: number;
  concColor: string;
  busLevel: string;
  busColor: string;
  busNote: string;
  topContributor: string;

  dayBars: DayBar[];
  offHoursPct: string;
  offColor: string;
  weekendPct: string;
  wkColor: string;
  peakDay: string;
  timingSample: number;

  weeks: WeekBar[];
  avgWeekly: string;

  indicators: IndicatorData[];
  recs: RecData[];
  advice: AdviceData[];

  risk: BurnoutRiskResult;
  riskColor: string;
};

/** Deterministic fallback tint for a contributor with no avatar. */
function avatarTint(handle: string): string {
  let h = 2166136261;
  for (let i = 0; i < handle.length; i++) {
    h ^= handle.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const seed = Math.abs(h) >>> 0;
  return `linear-gradient(135deg,hsl(${seed % 360} 68% 55%),hsl(${(seed * 7) % 360} 70% 42%))`;
}

function riskOf(pct: number): [string, string] {
  if (pct < 25) return ["Low", "var(--good)"];
  if (pct < 55) return ["Moderate", "var(--warn)"];
  return ["High", "var(--bad)"];
}

function healthOf(score: number): [string, string] {
  if (score >= 85) return ["Excellent", "var(--good)"];
  if (score >= 70) return ["Healthy", "var(--good)"];
  if (score >= 52) return ["Fair", "var(--warn)"];
  if (score >= 35) return ["Strained", "var(--warn)"];
  return ["At Risk", "var(--bad)"];
}

/** Maps the risk calculator's lucide icon keys onto the page's icon set. */
const REC_ICONS: Record<string, string> = {
  Users: "users",
  UserPlus: "users",
  TrendingDown: "drop",
  GitPullRequest: "rotate",
  BookOpen: "calendar",
  MessageCircle: "spark",
  CheckCircle: "shield",
};

export function deriveView(report: BurnoutReport): BurnoutView {
  const { timing, weeklyActivity } = report;

  // A repository with no history is unknown, not unhealthy — scoring it "At
  // Risk" off a zero would read as a verdict the data cannot support.
  const [health, healthColor] = report.empty ? ['No data', 'var(--soft)'] : healthOf(report.sustainabilityScore);

  const list: ContributorData[] = report.contributors.map((c) => {
    const [riskLabel, riskColor] = riskOf(c.burnoutScore);
    return {
      key: c.username,
      handle: c.username,
      initial: (c.username[0] ?? "?").toUpperCase(),
      avatar: avatarTint(c.username),
      avatarUrl: c.avatarUrl,
      commitsStr: c.totalCommits.toLocaleString(),
      shareStr: c.commitShare.toFixed(2) + "%",
      sparkData: c.recentTrend,
      intense: `${c.highIntensityWeeks} / ${c.recentTrend.length || 12}`,
      rest: `${c.restWeeks} / ${c.recentTrend.length || 12}`,
      riskPct: c.burnoutScore + "%",
      riskLabel,
      riskColor,
    };
  });

  const conc = report.contributors[0]?.commitShare ?? 0;
  const concColor = conc > 20 ? "var(--bad)" : conc > 13 ? "var(--warn)" : "var(--good)";
  const topContributor = report.contributors[0]?.username ?? "—";

  // The report's own dependency verdict drives the copy, so the badge and the
  // paragraph below it can never disagree.
  const busLevel = report.dependencyRisk === "High" ? "Elevated" : report.dependencyRisk === "Medium" ? "Moderate" : "Low";
  const busColor = report.dependencyRisk === "High" ? "var(--bad)" : report.dependencyRisk === "Medium" ? "var(--warn)" : "var(--good)";
  const busNote =
    report.dependencyRisk === "High"
      ? "A small core carries most of the load. Losing one or two maintainers would stall progress — start spreading review ownership now."
      : report.dependencyRisk === "Medium"
        ? "Knowledge is reasonably shared, but a few contributors still anchor critical paths. Pair them up to widen coverage."
        : "Healthy distribution of ownership. No single departure would meaningfully threaten momentum.";

  const dayMax = Math.max(...timing.byWeekday, 0);
  const dayBars: DayBar[] = DAYS.map((day, i) => ({
    key: i,
    day,
    heightPct: dayMax > 0 ? Math.max(2, Math.round((timing.byWeekday[i] / dayMax) * 100)) : 0,
    bg: i >= 5 ? "color-mix(in srgb,var(--accent-2) 70%,transparent)" : "var(--accent)",
  }));

  const offColor = timing.offHoursPct > 30 ? "var(--bad)" : timing.offHoursPct > 18 ? "var(--warn)" : "var(--good)";
  const wkColor = timing.weekendPct > 22 ? "var(--bad)" : timing.weekendPct > 14 ? "var(--warn)" : "var(--good)";

  const weekMax = Math.max(...weeklyActivity.last12Weeks, 0);
  const weeks: WeekBar[] = weeklyActivity.last12Weeks.map((commits, i) => ({
    key: i,
    label: "W" + (i + 1),
    commits,
    heightPct: weekMax > 0 ? Math.max(2, Math.round((commits / weekMax) * 100)) : 0,
    bg: `color-mix(in srgb,var(--accent-ink) ${weekMax > 0 ? 40 + Math.round((commits / weekMax) * 50) : 40}%,transparent)`,
  }));

  const inactivityCount = report.inactivityAlerts.length;
  const indicators: IndicatorData[] = [
    {
      key: 0,
      label: "Bus-factor exposure",
      level: busLevel,
      color: busColor,
      icon: "bus",
      text:
        report.dependencyRisk === "Low"
          ? `Ownership is spread across ${report.busFactor} maintainers before reaching 70% of commits.`
          : `Critical paths depend on ${report.busFactor} maintainer${report.busFactor === 1 ? "" : "s"}.`,
    },
    {
      key: 1,
      label: "Workload concentration",
      level: conc > 20 ? "High" : conc > 13 ? "Watch" : "Balanced",
      color: concColor,
      icon: "conc",
      text: `Top contributor holds ${conc.toFixed(1)}% of all commits.`,
    },
    {
      key: 2,
      label: "Off-hours pressure",
      level: timing.offHoursPct > 30 ? "High" : timing.offHoursPct > 18 ? "Watch" : "Low",
      color: offColor,
      icon: "clock",
      text:
        timing.sampleCommits > 0
          ? `${timing.offHoursPct}% of commits land outside 09:00–18:00.`
          : "GitHub has not published commit timing for this repository.",
    },
    {
      key: 3,
      label: "Inactivity drops",
      level: inactivityCount > 0 ? "Detected" : "Stable",
      color: inactivityCount > 0 ? "var(--warn)" : "var(--good)",
      icon: "drop",
      text:
        inactivityCount > 0
          ? `${inactivityCount} contributor${inactivityCount === 1 ? "" : "s"} went quiet after sustained activity.`
          : "No abnormal activity cliffs in the last quarter.",
    },
  ];

  const risk = calculateBurnoutRisk({
    sustainabilityScore: report.sustainabilityScore,
    busFactor: report.busFactor,
    dependencyRisk: report.dependencyRisk,
    contributors: report.contributors.map((c) => ({ commitShare: c.commitShare, recentTrend: c.recentTrend })),
    inactivityAlerts: report.inactivityAlerts.map((a) => ({ weeksSilent: a.weeksSilent, severity: a.severity })),
  });

  const recs: RecData[] = risk.recommendations.map((r, i) => ({
    key: i,
    icon: REC_ICONS[r.icon] ?? "shield",
    title: r.title,
    text: r.description,
  }));

  const advice: AdviceData[] = report.recommendations.map((a, i) => ({ key: i, text: a.text, ai: a.ai }));

  return {
    repoName: report.repo,
    owner: report.owner,
    repo: report.repo,
    slug: report.repoName,
    empty: report.empty,
    botsExcluded: report.botsExcluded,
    botsFiltered: report.botsFiltered,
    contributorsTruncated: report.contributorsTruncated,

    score: report.sustainabilityScore,
    health,
    healthColor,
    commitsStr: report.totalCommits.toLocaleString(),
    contributorsStr: report.totalContributors.toLocaleString(),

    list,
    busFactor: report.busFactor,
    conc,
    concColor,
    busLevel,
    busColor,
    busNote,
    topContributor,

    dayBars,
    offHoursPct: timing.offHoursPct + "%",
    offColor,
    weekendPct: timing.weekendPct + "%",
    wkColor,
    peakDay: timing.sampleCommits > 0 ? DAYS[timing.peakWeekdayIndex] : "—",
    timingSample: timing.sampleCommits,

    weeks,
    avgWeekly: weeklyActivity.avgWeeklyCommits.toLocaleString(),

    indicators,
    recs,
    advice,

    risk,
    riskColor: risk.level === "Low" ? "var(--good)" : risk.level === "Moderate" ? "var(--warn)" : "var(--bad)",
  };
}
