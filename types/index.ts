export type HexColor = string & { __brand: 'HexColor' };

export type Scale = 'linear' | 'log' | 'sqrt';

export type BadgeSize = 'small' | 'medium' | 'large';

export type SpeedString = `${number}s`;

export interface StreakStats {
  currentStreak: number;

  longestStreak: number;

  totalContributions: number;

  todayDate: string;
}

export interface BadgeTheme {
  bg: HexColor;

  text: HexColor;

  accent: HexColor;

  negative?: HexColor;
}

export interface ContributionDay {
  contributionCount: number;

  date: string;

  locAdditions?: number;

  locDeletions?: number;
}

export function isLocDay(
  day: ContributionDay
): day is ContributionDay & { locAdditions: number; locDeletions: number } {
  return typeof day.locAdditions === 'number' && typeof day.locDeletions === 'number';
}

export interface ContributionWeek {
  contributionDays: ContributionDay[];
}

export interface ContributionCalendar {
  totalContributions: number;

  weeks: ContributionWeek[];

  repoContributions?: number;

  lastSyncedAt?: string;
}

export interface RepoContribution {
  repository: {
    name: string;
    nameWithOwner?: string;
    primaryLanguage: { name: string } | null;
  };
  contributions: { totalCount: number };
}

export interface ContributedRepo {
  name: string;

  nameWithOwner: string;

  owner: { login: string };

  stargazerCount: number;

  forkCount: number;

  primaryLanguage: { name: string } | null;

  updatedAt: string;
}

export interface ExtendedContributionData {
  calendar: ContributionCalendar;
  repoContributions: RepoContribution[];
  totalPRs?: number;
  totalIssues?: number;
  totalReviews?: number;
  isOfflineFallback?: boolean;
}

export interface MonthlyStats {
  currentMonthTotal: number;

  previousMonthTotal: number;

  deltaPercentage: number | null;

  deltaAbsolute: number;

  currentMonthName: string;
}

export interface BadgeParams {
  user: string;

  label?: string | boolean;
  versus?: string;

  grace?: number;

  bg: HexColor;

  bgType?: 'solid' | 'linear' | 'radial';

  bgStart?: HexColor;

  bgEnd?: HexColor;

  bgAngle?: number;

  text: HexColor;

  accent: HexColor | HexColor[];

  speed: SpeedString;

  entrance?: 'rise' | 'fade' | 'slide' | 'wave' | 'bounce' | 'none';

  scale: Scale;

  font?: string;

  radius?: number;

  border?: string;

  autoTheme?: boolean;

  theme?: string;

  hide_title?: boolean;

  custom_title?: string;

  custom_subtitle?: string;

  hideBackground?: boolean;

  hide_stats?: boolean;

  lang?: string;

  view?:
    | 'default'
    | 'monthly'
    | 'heatmap'
    | 'pulse'
    | 'skyline'
    | 'languages'
    | 'constellation'
    | 'radar'
    | 'doughnut'
    | 'pie'
    | 'activity_graph'
    | 'commit_clock'
    | 'weekday'
    | 'punchcard'
    | 'spotlight';

  delta_format?: 'percent' | 'absolute' | 'both';

  width?: number;

  height?: number;

  size?: BadgeSize;

  mode?: 'commits' | 'loc';

  repo?: string;

  org?: string;

  labels?: boolean;

  labelColor?: HexColor;

  shading?: boolean;

  dim_weekends?: boolean;

  opacity?: number;

  gradient?: boolean;

  gradient_stops?: string;

  gradient_dir?: 'vertical' | 'horizontal' | 'diagonal';

  disable_particles?: boolean;
  animate?: boolean;
  glow?: boolean;
  isOfflineFallback?: boolean;
  badges?: boolean;

  theta?: number;

  phi?: number;

  compact?: boolean;

  hide_weekend?: boolean;

  __customGradientId?: string;
}

export interface GraphNode {
  id: string;
  name: string;
  type: 'User' | 'Repo' | 'Contribution' | 'Fork';
  val: number;
  color: string;
  stats?: {
    stars?: number;
    forks?: number;
    language?: string | null;
    updatedAt?: string;
    description?: string | null;
    commits?: number;
  };
  x?: number;
  y?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

export type NotificationFrequency = 'realtime' | 'daily' | 'weekly';

export interface NotificationPreferences {
  enabled: boolean;
  frequency: NotificationFrequency;
  email: string;
  notifyOnCommit: boolean;
  notifyOnStreak: boolean;
  notifyOnMilestone: boolean;
}

export interface NotificationPayload {
  username: string;
  email: string;
  frequency: NotificationFrequency;
  preferences: {
    notifyOnCommit: boolean;
    notifyOnStreak: boolean;
    notifyOnMilestone: boolean;
  };
}

export interface NotificationResponse {
  success: boolean;
  message: string;
  data?: NotificationPayload;
  managementToken?: string;
}
