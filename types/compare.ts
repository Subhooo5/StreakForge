/**
 * Wire types shared by the Compare API routes (`app/api/compare/*`) and the
 * Compare page's data layer (`app/compare/data/*`).
 *
 * Every field here is real GitHub data produced by `lib/github`'s cached,
 * rate-limited pipeline — there are no seeded or placeholder shapes.
 */

export interface CompareProfilePayload {
  username: string;
  name: string;
  avatarUrl: string;
  isPro: boolean;
  bio: string;
  location: string;
  /** e.g. "Jan 2025" — GitHub account creation month. */
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

// Lines-of-code is deliberately absent: it is no longer a StreakForge feature
// line, so nothing on the Compare page derives from it.
export interface CompareActivityPayload {
  date: string;
  count: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

export interface CompareUserPayload {
  profile: CompareProfilePayload;
  stats: CompareStatsPayload;
  languages: CompareLanguagePayload[];
  /**
   * The trailing contribution year, oldest first — the same window
   * github.com/<user> renders. The heatmap buckets it into whole
   * Sunday-first columns.
   */
  activity: CompareActivityPayload[];
}

/** `GET /api/compare?user1=…&user2=…` */
export interface CompareBattlePayload {
  user1: CompareUserPayload;
  user2: CompareUserPayload;
}

// ─── Arena (the pre-comparison battleground) ────────────────────────────────

/** One card in the Trending Showdowns carousel. */
export interface ArenaShowdown {
  /** Editorial category, e.g. "Vite Ecosystem". */
  cat: string;
  /** Left login, without the leading "@". */
  a: string;
  /** Right login, without the leading "@". */
  b: string;
  /** Editorial tagline, e.g. "Vue vs Nuxt/Vite". */
  sub: string;
  /** Head-to-head battles recorded for this pairing. */
  battles: number;
  /** True for the pairings with the most recorded battles. */
  hot: boolean;
}

/** One card in the GitHub Legends Walk of Fame carousel. */
export interface ArenaLegend {
  login: string;
  name: string;
  avatarUrl: string;
  /** Real GitHub bio, falling back to the editorial role when empty. */
  role: string;
  followers: number;
  /** Abbreviated followers, e.g. "203k". */
  followersLabel: string;
  /** Most-used language across their public repos. */
  lang: string;
}

/** One round of Guess the Developer, built from live profile data. */
export interface ArenaGuess {
  /** Three anonymised, real statements about the hidden developer. */
  hints: string[];
  login: string;
  name: string;
  avatarUrl: string;
  bio: string;
}

/** One computed AI Showdown Prediction. */
export interface ArenaPrediction {
  /** The dimension this matchup is judged on, e.g. "OPEN SOURCE KING". */
  cat: string;
  /** Left login, with the leading "@". */
  a: string;
  /** Right login, with the leading "@". */
  b: string;
  /** Verdict sentence computed from both developers' real figures. */
  text: string;
}

export interface ArenaCounters {
  developersCompared: number;
  reposAnalyzed: number;
  languagesTracked: number;
  comparisonsToday: number;
}

/** `GET /api/compare/arena` */
export interface ArenaPayload {
  showdowns: ArenaShowdown[];
  legends: ArenaLegend[];
  guesses: ArenaGuess[];
  predictions: ArenaPrediction[];
  counters: ArenaCounters;
}
