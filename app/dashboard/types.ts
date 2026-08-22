import type { ActivityData, AIInsight, CommitClockData, DeploymentData, HallOfFameAward, LanguageData, RepoActivityInfo, Repository, UserProfile, UserStats } from "@/types/dashboard";
import type { GraphLink, GraphNode as ApiGraphNode } from "@/types";
import type { CIAnalyticsData } from "@/types/ci-analytics";
import type { PRInsightData } from "@/services/github/pr-insights";

export interface DashboardOverviewPayload {
  user: string;
  profile: UserProfile;
  stats: UserStats;
  languages: LanguageData[];
  activity: ActivityData[];
  insights: AIInsight[];
  commitClock: CommitClockData[];
  popularRepos?: Repository[];
  pinnedRepos?: Repository[];
  deployments?: DeploymentData[];
  hallOfFame?: HallOfFameAward[];
  graphData: { nodes: ApiGraphNode[]; links: GraphLink[] };
  repoActivity: RepoActivityInfo[];
}

export type CIAnalyticsPayload = CIAnalyticsData & { user: string };
export type PRInsightsPayload = PRInsightData & { user: string };

export interface Profile {
  user: string;
  handle: string;
  name: string;
  initial: string;
  avatar: string;
  bio: string;
  loc: string;
  joined: string;
  score: number;
  reposStr: string;
  starsStr: string;
  followersStr: string;
  followingStr: string;
  streakStr: string;
  peakStr: string;
  contribStr: string;
  repos: number;
  stars: number;
  contrib: number;
}

export interface Deployment {
  key: number;
  name: string;
  url: string;
  ago: string;
  status: string;
  statusColor: string;
}

export interface PopularRepo {
  key: number;
  name: string;
  desc: string;
  stars: number;
}

export interface InactiveRepo {
  key: number;
  name: string;
  date: string;
  days: string;
}

export interface MonthlySummary {
  m: string;
  v: number;
  widthPct: number;
}

export interface YearlySummary {
  y: string;
  v: number;
  widthPct: number;
}

export interface HistData {
  contributions: number;
  activeDays: number;
  windowDays: number;
  windowLabel: string;
  current: number;
  longest: number;
  peak: string;
  deployments: Deployment[];
  avg: string;
  trendVals: number[];
  monthly: MonthlySummary[];
  yearly: YearlySummary[];
  popular: PopularRepo[];
  inactive: InactiveRepo[];
  atOldestWindow: boolean;
}

export interface GraphNode {
  i: number;
  type: "Personal" | "Contributions" | "Forks";
  color: string;
  name: string;
  x: number;
  y: number;
  rr: number;
  stars: number;
  commits: number;
}

export interface LangSlice {
  name: string;
  color: string;
  v: number;
  pct: string;
}

export interface DonutSegment {
  v: number;
  color: string;
}

export interface ActivityBucket {
  startDate: string;
  endDate: string;
  days: number;
  count: number;
}

export interface CIStat {
  key: number;
  label: string;
  value: string;
  iconName: string;
  color: string;
}

export interface CIHighlight {
  key: number;
  label: string;
  iconName: string;
  color: string;
  value: string;
  sub: string;
}

export interface CIRun {
  key: number;
  workflow: string;
  repo: string;
  branch: string;
  status: string;
  statusColor: string;
  duration: string;
  event: string;
}

export interface CIHealth {
  key: number;
  repo: string;
  rate: number;
  rateStr: string;
  widthPct: number;
  runs: number;
  avg: string;
  last: string;
  lastColor: string;
  barColor: string;
}

export interface CIData {
  stats: CIStat[];
  donut: DonutSegment[];
  donutTotal: number;
  trendVals: number[];
  trendXl: string[];
  highlights: CIHighlight[];
  runs: CIRun[];
  health: CIHealth[];
  success: number;
  failed: number;
  cancelled: number;
}

export interface PRStat {
  key: number;
  label: string;
  value: string;
  iconName: string;
  color: string;
  delta?: string;
}

export interface PRHighlight {
  key: number;
  label: string;
  iconName: string;
  color: string;
  metric: string;
  desc: string;
}

export interface PRReview {
  given: number;
  received: number;
  fastest: string;
  slowest: string;
}

export interface PRRepo {
  key: number;
  repo: string;
  owner: string;
  prs: number;
  mergeRate: number;
  mergeStr: string;
  widthPct: number;
  reviews: number;
  barColor: string;
}

export interface PRSizeBar {
  key: number;
  label: string;
  value: number;
  widthPct: number;
  color: string;
}

export interface PRData {
  stats: PRStat[];
  trendVals: number[];
  trendXl: string[];
  donut: DonutSegment[];
  donutTotal: number;
  merged: number;
  open: number;
  closed: number;
  highlights: PRHighlight[];
  review: PRReview;
  repos: PRRepo[];
  sizes: PRSizeBar[];
}

export interface AsyncResource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}
