// PR Insights mappers: live `/api/dashboard/pr` payload -> the shapes
// `DashboardClient.tsx` renders. Pure functions only, no fetching.

import type { DonutSegment, PRData, PRHighlight, PRInsightsPayload, PRRepo, PRReview, PRSizeBar, PRStat } from "./types";

/** Hours -> "0.2 hrs" / "112.3 hrs", the unit the PR metric cards use. */
function hrs(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "0.0";
  return hours.toFixed(1);
}

/** The API returns raw percentages (83.0985…); cards show one decimal. */
function pct(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function toPRData(data: PRInsightsPayload, range: string): PRData {
  const activity = range === "Weekly" ? data.weeklyActivity : data.monthlyActivity;
  const thisWeek = data.weeklyActivity.at(-1)?.prs ?? 0;

  const stats: PRStat[] = [
    {
      key: 0,
      label: "Total PRs",
      value: String(data.totalPRs),
      iconName: "merge",
      color: "var(--pb)",
      delta: thisWeek > 0 ? `+${thisWeek} this week` : undefined,
    },
    {
      key: 1,
      label: "Merge Rate",
      value: `${pct(data.mergeRate)}%`,
      iconName: "branch",
      color: "var(--pc)",
    },
    {
      key: 2,
      label: "Avg Cycle Time",
      value: `${hrs(data.avgCycleTime)}h`,
      iconName: "clock2",
      color: "var(--pa)",
    },
    {
      key: 3,
      label: "Time to First Review",
      value: `${hrs(data.avgTimeToFirstReview)}h`,
      iconName: "eye",
      color: "var(--pe)",
    },
  ];

  // A zero slice would collapse the arc, so keep a hairline for empty states.
  const donut: DonutSegment[] = [
    { v: data.mergedPRs || 0.001, color: "var(--pc)" },
    { v: data.openPRs || 0.001, color: "var(--pb)" },
    { v: data.closedPRs || 0.001, color: "var(--pd)" },
  ];

  const highlights: PRHighlight[] = [];
  if (data.highlights.fastestMerged) {
    highlights.push({
      key: 0,
      label: "Fastest Merged PR",
      iconName: "bolt",
      color: "var(--pe)",
      metric: `${hrs(data.highlights.fastestMerged.time)} hrs`,
      desc: data.highlights.fastestMerged.title,
    });
  }
  if (data.highlights.mostDiscussed) {
    highlights.push({
      key: 1,
      label: "Most Discussed",
      iconName: "comment",
      color: "var(--pb)",
      metric: `${data.highlights.mostDiscussed.comments} comments`,
      desc: data.highlights.mostDiscussed.title,
    });
  }
  if (data.highlights.largest) {
    highlights.push({
      key: 2,
      label: "Largest Impact",
      iconName: "box",
      color: "var(--pa)",
      metric: `+${data.highlights.largest.additions} −${data.highlights.largest.deletions}`,
      desc: data.highlights.largest.title,
    });
  }

  const review: PRReview = {
    given: data.reviewsGiven,
    received: data.reviewsReceived,
    fastest: `${hrs(data.fastestReview)}h`,
    slowest: `${hrs(data.slowestReview)}h`,
  };

  const repos: PRRepo[] = data.repoPerformance.map((r, i) => {
    const [owner, name] = r.name.includes("/") ? r.name.split("/") : ["", r.name];
    return {
      key: i,
      repo: name,
      owner,
      prs: r.totalPRs,
      mergeRate: r.mergeRate,
      mergeStr: `${Math.round(r.mergeRate)}%`,
      widthPct: Math.max(3, Math.round(r.mergeRate)),
      reviews: r.reviewCount,
      barColor: r.mergeRate >= 70 ? "var(--pc)" : r.mergeRate > 0 ? "var(--pb)" : "var(--line)",
    };
  });

  const dist = data.sizeDistribution ?? { atomic: 0, standard: 0, massive: 0 };
  const sizeMax = Math.max(dist.atomic, dist.standard, dist.massive, 1);
  const sizes: PRSizeBar[] = [
    { key: 0, label: "Atomic (<100 LOC)", value: dist.atomic, color: "var(--pc)" },
    { key: 1, label: "Standard (100–500 LOC)", value: dist.standard, color: "var(--pb)" },
    { key: 2, label: "Massive (>500 LOC)", value: dist.massive, color: "var(--pd)" },
  ].map((s) => ({ ...s, widthPct: Math.round((s.value / sizeMax) * 100) }));

  return {
    stats,
    trendVals: activity.map((a) => a.prs),
    trendXl: activity.map((a) => a.name),
    donut,
    donutTotal: data.totalPRs,
    merged: data.mergedPRs,
    open: data.openPRs,
    closed: data.closedPRs,
    highlights,
    review,
    repos,
    sizes,
  };
}
