import type { ContributionCalendar, GraphNode, GraphLink } from './index';

export interface UserProfile {
  username: string;
  name: string;
  avatarUrl: string;
  isPro: boolean;
  bio: string;
  location: string;
  joinedDate: string;
  developerScore: number;
  type?: 'User' | 'Organization';
  stats: {
    repositories: number;
    followers: number;
    following: number;
    stars: number;
  };
}

export interface ActivityData {
  date: string;
  count: number;
  intensity: 0 | 1 | 2 | 3 | 4;

  locAdditions?: number;
  locDeletions?: number;
}

export interface UserStats {
  currentStreak: number;
  peakStreak: number;
  totalContributions: number;
}

export interface LanguageData {
  name: string;
  color: string;
  percentage: number;
}

export interface AIInsight {
  id: string;
  icon: string;
  text: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  isUnlocked: boolean;

  type: 'contributions' | 'streak' | 'behavior';
  threshold: number;
  currentValue: number;
  progress: number;
}

export interface HallOfFameAward {
  category: 'active' | 'growing' | 'collaborative' | 'popular' | 'contributed';
  title: string;
  repoName: string;
  repoAvatar?: string;
  description: string;

  centerpieceLabel: string;
  centerpieceValue: string | number;
  bottomStats: string;

  explanation: string;
  icon: string;
  url: string;
}

export interface CommitClockData {
  day: string;
  commits: number;
}

export interface DashboardExportData {
  stats: UserStats;
  languages: LanguageData[];
  activity?: ActivityData[];
}

export interface WrappedStats {
  totalContributions: number;
  mostActiveDate: string;
  highestDailyCount: number;
  busiestMonth: string;
  weekendRatio: number;
  topLanguage: string;
  calendar: ContributionCalendar;
}

export interface Repository {
  name: string;
  description: string | null;
  stargazerCount: number;
  forkCount: number;
  url: string;
  primaryLanguage: {
    name: string;
    color: string;
  } | null;
}

export interface RepoActivityInfo {
  name: string;
  url: string;
  pushedAt: string | null;
}

export type WorkflowStatus = 'success' | 'failure' | 'in_progress' | 'unknown';

export interface DeploymentData {
  repoName: string;
  repoUrl: string;
  liveUrl: string | null;
  status: WorkflowStatus;
  deployedAt: string | null;
  environment: string;
  workflowName: string | null;
}

export interface DashboardData {
  profile: UserProfile;
  stats: UserStats;
  languages: LanguageData[];
  activity: ActivityData[];
  insights: AIInsight[];
  achievements: Achievement[];
  commitClock: CommitClockData[];
  graphData: {
    nodes: GraphNode[];
    links: GraphLink[];
  };
  popularRepos?: Repository[];
  pinnedRepos?: Repository[];
  starredRepos?: Repository[];
  deployments?: DeploymentData[];
  hallOfFame?: HallOfFameAward[];
}
