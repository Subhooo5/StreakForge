export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface ContributorMetric {
  username: string;
  avatarUrl: string;
  totalCommits: number;
  commitShare: number;
  burnoutScore: number;
  riskLevel: RiskLevel;
  activeWeeks: number;
  highIntensityWeeks: number;
  consecutiveHighWeeks: number;
  restWeeks: number;
  recentTrend: number[];
  recentAdditionsTrend: number[];
}

export interface InactivityAlert {
  username: string;
  avatarUrl: string;
  previousAvgWeeklyCommits: number;
  weeksSilent: number;
  severity: 'Medium' | 'High';
}

export interface CommitTiming {
  byWeekday: number[];
  byHour: number[];
  offHoursPct: number;
  weekendPct: number;
  peakWeekdayIndex: number;
  sampleCommits: number;
}

export interface WeeklyActivity {
  last12Weeks: number[];
  avgWeeklyCommits: number;
}

export interface BurnoutAdvice {
  text: string;
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
  sustainabilityScore: number;
  contributors: ContributorMetric[];
  inactivityAlerts: InactivityAlert[];
  recommendations: BurnoutAdvice[];
  timing: CommitTiming;
  weeklyActivity: WeeklyActivity;
  botsExcluded: boolean;
  botsFiltered: number;
  empty: boolean;
  contributorsTruncated: boolean;
}
