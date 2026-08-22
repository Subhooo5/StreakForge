/**
 * Wire types shared by the Burnout API route (`app/api/burnout/route.ts`), the
 * analysis service (`services/github/burnout-analyzer.ts`) and the Burnout
 * Radar page's data layer (`app/burnout-analyzer/data/*`).
 *
 * Every field here is real GitHub data. The report is assembled from three
 * repository statistics endpoints — `stats/contributors` (per-contributor
 * weekly commit history), `stats/punch_card` (day-of-week × hour commit
 * counts) and `stats/commit_activity` (52 weeks of daily totals) — all served
 * through the cached, rate-limited pipeline the rest of the app uses. There
 * are no seeded or placeholder shapes.
 *
 * Declaring the shapes here rather than in the service keeps the client free
 * of a `server-only` import.
 */

export type RiskLevel = 'Low' | 'Medium' | 'High';

/** One contributor's workload profile over the trailing 12 weeks. */
export interface ContributorMetric {
  username: string;
  avatarUrl: string;
  totalCommits: number;
  /** Percentage of the repository's commits, 2 decimal places. */
  commitShare: number;
  /** 0–100. Higher means more burnout signal. */
  burnoutScore: number;
  riskLevel: RiskLevel;
  activeWeeks: number;
  highIntensityWeeks: number;
  consecutiveHighWeeks: number;
  /** Weeks in the trailing 12 with zero commits. */
  restWeeks: number;
  /** Commits per week, trailing 12 weeks, oldest first. */
  recentTrend: number[];
  /** Additions per week, trailing 12 weeks, oldest first. */
  recentAdditionsTrend: number[];
}

/** A contributor who was active and then went quiet. */
export interface InactivityAlert {
  username: string;
  avatarUrl: string;
  previousAvgWeeklyCommits: number;
  weeksSilent: number;
  severity: 'Medium' | 'High';
}

/**
 * Commit timing, derived from `stats/punch_card` — GitHub's day-of-week ×
 * hour histogram for the trailing year. This is the only endpoint that exposes
 * when commits land; `stats/contributors` is weekly-aggregated and cannot
 * answer it.
 */
export interface CommitTiming {
  /** Commits per weekday, Monday-first, so index 0 is Monday. */
  byWeekday: number[];
  /** Commits per hour of day, 0–23, as bucketed by GitHub's punch card. */
  byHour: number[];
  /** Share of commits outside 09:00–18:00, as a percentage. */
  offHoursPct: number;
  /** Share of commits on Saturday or Sunday, as a percentage. */
  weekendPct: number;
  /** Monday-first index of the busiest weekday. */
  peakWeekdayIndex: number;
  /** Commits counted in this histogram (trailing year). */
  sampleCommits: number;
}

/** Repository-wide weekly commit volume, from `stats/commit_activity`. */
export interface WeeklyActivity {
  /** Total commits per week, trailing 12 weeks, oldest first. */
  last12Weeks: number[];
  /** Mean commits per week across the trailing 52 weeks. */
  avgWeeklyCommits: number;
}

/** A single recommendation, tagged with the engine that produced it. */
export interface BurnoutAdvice {
  text: string;
  /** `true` only when a language model actually generated this line. */
  ai: boolean;
}

export interface BurnoutReport {
  repoName: string;
  owner: string;
  repo: string;
  totalCommits: number;
  totalContributors: number;
  busFactor: number;
  dependencyRisk: RiskLevel;
  /** 0–100. Higher is healthier. */
  sustainabilityScore: number;
  contributors: ContributorMetric[];
  inactivityAlerts: InactivityAlert[];
  recommendations: BurnoutAdvice[];
  timing: CommitTiming;
  weeklyActivity: WeeklyActivity;
  /** Whether bot and dependency accounts were filtered out of every figure. */
  botsExcluded: boolean;
  /** Number of bot accounts removed when `botsExcluded` is set. */
  botsFiltered: number;
  /**
   * `true` when GitHub returned no contributor statistics — an empty
   * repository, or one whose history GitHub has not compiled. Every numeric
   * field is zero in that case and the page shows an empty state rather than
   * pretending the repository has data.
   */
  empty: boolean;
  /**
   * `true` when GitHub capped `stats/contributors` at its 500-contributor
   * ceiling, so counts describe the top 500 rather than the full history.
   */
  contributorsTruncated: boolean;
}
