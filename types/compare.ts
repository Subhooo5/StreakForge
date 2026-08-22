export interface CompareProfilePayload {
  username: string;
  name: string;
  avatarUrl: string;
  isPro: boolean;
  bio: string;
  location: string;
  joinedDate: string;
  developerScore: number;
  stats: {
    repositories: number;
    followers: number;
    following: number;
    stars: number;
  };
}

export interface CompareStatsPayload {
  currentStreak: number;
  peakStreak: number;
  totalContributions: number;
  totalPRs?: number;
  totalIssues?: number;
  totalReviews?: number;
}

export interface CompareLanguagePayload {
  name: string;
  percentage: number;
  color: string;
}

export interface CompareActivityPayload {
  date: string;
  count: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

export interface CompareUserPayload {
  profile: CompareProfilePayload;
  stats: CompareStatsPayload;
  languages: CompareLanguagePayload[];
  activity: CompareActivityPayload[];
}

export interface CompareBattlePayload {
  user1: CompareUserPayload;
  user2: CompareUserPayload;
}

export interface ArenaShowdown {
  cat: string;
  a: string;
  b: string;
  sub: string;
  battles: number;
  hot: boolean;
}

export interface ArenaLegend {
  login: string;
  name: string;
  avatarUrl: string;
  role: string;
  followers: number;
  followersLabel: string;
  lang: string;
}

export interface ArenaGuess {
  hints: string[];
  login: string;
  name: string;
  avatarUrl: string;
  bio: string;
}

export interface ArenaPrediction {
  cat: string;
  a: string;
  b: string;
  text: string;
}

export interface ArenaCounters {
  developersCompared: number;
  reposAnalyzed: number;
  languagesTracked: number;
  comparisonsToday: number;
}

export interface ArenaPayload {
  showdowns: ArenaShowdown[];
  legends: ArenaLegend[];
  guesses: ArenaGuess[];
  predictions: ArenaPrediction[];
  counters: ArenaCounters;
}
