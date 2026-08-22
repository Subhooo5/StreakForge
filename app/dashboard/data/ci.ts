import type { CIAnalyticsPayload, CIData, CIHealth, CIHighlight, CIRun, CIStat, DonutSegment } from "../types";

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

const dayLabel = new Intl.DateTimeFormat("en-US", {
  month: "numeric",
  day: "numeric",
  timeZone: "UTC",
});

const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });

function statusColor(conclusion: string | null, status: string): { label: string; color: string } {
  const key = conclusion ?? status;
  switch (key) {
    case "success":
      return { label: "Success", color: "var(--pc)" };
    case "failure":
      return { label: "Failed", color: "var(--pd)" };
    case "cancelled":
      return { label: "Cancelled", color: "var(--pe)" };
    case "in_progress":
    case "queued":
    case "pending":
    case "waiting":
      return { label: "Running", color: "var(--pa)" };
    default:
      return { label: "Unknown", color: "var(--soft)" };
  }
}

function trendFor(data: CIAnalyticsPayload, range: string): { vals: number[]; labels: string[] } {
  if (range === "Weekly") {
    return {
      vals: data.weeklyTrend.map((t) => t.runs),
      labels: data.weeklyTrend.map((t) => dayLabel.format(new Date(`${t.week}T00:00:00Z`))),
    };
  }
  if (range === "Monthly") {
    return {
      vals: data.monthlyTrend.map((t) => t.runs),
      labels: data.monthlyTrend.map((t) => monthLabel.format(new Date(`${t.month}-01T00:00:00Z`))),
    };
  }
  return {
    vals: data.dailyTrend.map((t) => t.runs),
    labels: data.dailyTrend.map((t) => dayLabel.format(new Date(`${t.date}T00:00:00Z`))),
  };
}

export function toCIData(data: CIAnalyticsPayload, range: string): CIData {
  const { success, failed, cancelled } = data.statusBreakdown;

  const stats: CIStat[] = [
    {
      key: 0,
      label: "Successful Runs",
      value: data.successfulRuns.toLocaleString(),
      iconName: "check",
      color: "var(--pc)",
    },
    { key: 1, label: "Failed Runs", value: String(data.failedRuns), iconName: "x", color: "var(--pd)" },
    {
      key: 2,
      label: "Cancelled Runs",
      value: String(data.cancelledRuns),
      iconName: "ban",
      color: "var(--pe)",
    },
    {
      key: 3,
      label: "Success Rate",
      value: `${data.successRate}%`,
      iconName: "trend",
      color: "var(--pc)",
    },
    {
      key: 4,
      label: "Avg Build Time",
      value: formatDuration(data.avgBuildDuration),
      iconName: "clock2",
      color: "var(--pa)",
    },
    {
      key: 5,
      label: "Total Runs",
      value: data.totalRuns.toLocaleString(),
      iconName: "bolt",
      color: "var(--pb)",
    },
  ];

  const donut: DonutSegment[] = [
    { v: success || 0.001, color: "var(--pc)" },
    { v: failed || 0.001, color: "var(--pd)" },
    { v: cancelled || 0.001, color: "var(--pe)" },
  ];

  const highlights: CIHighlight[] = [
    {
      key: 0,
      label: "Fastest Workflow",
      iconName: "bolt",
      color: "var(--pc)",
      value: data.insights.fastestWorkflow,
      sub: `${formatDuration(data.insights.fastestDuration)} avg`,
    },
    {
      key: 1,
      label: "Slowest Workflow",
      iconName: "clock2",
      color: "var(--pe)",
      value: data.insights.slowestWorkflow,
      sub: `${formatDuration(data.insights.slowestDuration)} avg`,
    },
    {
      key: 2,
      label: "Most Active Repo",
      iconName: "lang",
      color: "var(--pb)",
      value: data.insights.mostActiveRepo,
      sub: `${data.insights.mostActiveRepoRuns} total runs`,
    },
    {
      key: 3,
      label: "Most Failed Workflow",
      iconName: "x",
      color: "var(--pd)",
      value: data.insights.mostFailedWorkflow,
      sub: `${data.insights.mostFailedCount} failures`,
    },
    {
      key: 4,
      label: "Highest Success Rate",
      iconName: "check",
      color: "var(--pc)",
      value: data.insights.highestSuccessRepo,
      sub: `${data.insights.highestSuccessRate}% success rate`,
    },
  ];

  const runs: CIRun[] = data.recentRuns.map((r, i) => {
    const s = statusColor(r.conclusion, r.status);
    return {
      key: i,
      workflow: r.name,
      repo: r.repository,
      branch: r.branch,
      status: s.label,
      statusColor: s.color,
      duration: formatDuration(r.duration),
      event: r.triggerEvent,
    };
  });

  const health: CIHealth[] = data.repoHealth.map((h, i) => {
    const last = statusColor(h.lastRunStatus === "unknown" ? null : h.lastRunStatus, h.lastRunStatus);
    return {
      key: i,
      repo: h.name,
      rate: h.successRate,
      rateStr: `${h.successRate}%`,
      widthPct: Math.max(2, h.successRate),
      runs: h.totalRuns,
      avg: formatDuration(h.avgDuration),
      last: last.label.toLowerCase(),
      lastColor: last.color,
      barColor: h.successRate >= 90 ? "var(--pc)" : h.successRate >= 75 ? "var(--pe)" : "var(--pd)",
    };
  });

  const trend = trendFor(data, range);

  return {
    stats,
    donut,
    donutTotal: data.totalRuns,
    trendVals: trend.vals,
    trendXl: trend.labels,
    highlights,
    runs,
    health,
    success,
    failed,
    cancelled,
  };
}
