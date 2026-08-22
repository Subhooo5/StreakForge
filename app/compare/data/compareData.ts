// View-model layer for the Compare page.
//
// Everything here maps the REAL payload from `/api/compare` onto the shape the
// ported markup already consumes. The page's original seeded generators
// (`hash`/`mulberry`/`buildProfile`) are gone — no figure on this page is
// invented any more.
//
// Only two things are still deterministic-from-login, and neither is a
// statistic: the gradient that sits behind an avatar while the real image
// loads, and nothing else.

import type { CompareActivityPayload, CompareLanguagePayload, CompareUserPayload } from "@/types/compare";

/** FNV-1a — seeds the placeholder gradient behind a loading avatar only. */
export function hash(s: string): number {
  s = s || "streakforge";
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) >>> 0;
}

/** Placeholder gradient shown behind an avatar until the image resolves. */
export function avatarFor(seed: number): string {
  const h1 = seed % 360,
    h2 = (seed * 7) % 360;
  return `linear-gradient(135deg,hsl(${h1} 70% 55%),hsl(${h2} 72% 42%))`;
}

/** Persona badge shown on a profile card, and its icon key in ProfileCard. */
export interface Persona {
  name: string;
  key: string;
}

export interface CompareProfile {
  user: string;
  handle: string;
  handleUpper: string;
  name: string;
  initial: string;
  /** Real GitHub avatar. */
  avatarUrl: string;
  /** Gradient shown behind {@link avatarUrl} while it loads. */
  avatar: string;
  persona: string;
  personaKey: string;
  bio: string;
  loc: string;
  joined: string;
  score: number;
  repos: number;
  reposStr: string;
  stars: number;
  starsStr: string;
  followers: number;
  followersStr: string;
  streak: number;
  streakStr: string;
  peak: number;
  peakStr: string;
  contrib: number;
  contribStr: string;
  contribRaw: string;
  prs: number;
  issues: number;
  langs: CompareLanguagePayload[];
  activity: CompareActivityPayload[];
}

/**
 * Persona derived from the developer's real figures.
 *
 * Ordered most-specific first, so a single developer resolves to exactly one
 * badge: sustained output, then reach, then collaboration, then consistency,
 * with the low-volume case last.
 */
export function derivePersona(user: CompareUserPayload): Persona {
  const { stats, profile } = user;

  if (stats.currentStreak > 30 || stats.totalContributions > 2000) return { name: "The Machine", key: "cpu" };
  if (profile.stats.stars > 200) return { name: "The Architect", key: "cube" };
  if ((stats.totalPRs || 0) > 50) return { name: "Team Player", key: "users" };
  if (stats.peakStreak > 14) return { name: "Consistent Coder", key: "spark" };
  return { name: "Weekend Warrior", key: "moon" };
}

/** Map one side of the `/api/compare` payload onto the view model. */
export function buildProfile(user: CompareUserPayload): CompareProfile {
  const { profile, stats, languages, activity } = user;
  const login = profile.username;
  const persona = derivePersona(user);

  return {
    user: login,
    handle: "@" + login,
    handleUpper: "@" + login.toUpperCase(),
    name: profile.name || login,
    initial: (login[0] || "o").toUpperCase(),
    avatarUrl: profile.avatarUrl,
    avatar: avatarFor(hash(login.toLowerCase())),
    persona: persona.name,
    personaKey: persona.key,
    bio: profile.bio,
    loc: profile.location,
    joined: profile.joinedDate,
    score: profile.developerScore,
    repos: profile.stats.repositories,
    reposStr: profile.stats.repositories.toLocaleString("en-US"),
    stars: profile.stats.stars,
    starsStr: profile.stats.stars.toLocaleString("en-US"),
    followers: profile.stats.followers,
    followersStr: profile.stats.followers.toLocaleString("en-US"),
    streak: stats.currentStreak,
    streakStr: String(stats.currentStreak),
    peak: stats.peakStreak,
    peakStr: String(stats.peakStreak),
    contrib: stats.totalContributions,
    contribStr: stats.totalContributions.toLocaleString("en-US"),
    contribRaw: String(stats.totalContributions),
    prs: stats.totalPRs ?? 0,
    issues: stats.totalIssues ?? 0,
    langs: languages,
    activity,
  };
}

/**
 * The five radar axes, each normalised against the higher of the two
 * developers so the chart reads as a head-to-head rather than an absolute
 * scale. Returns values in 0…1, the range the chart's polygon builder wants.
 */
export function deriveRadar(a: CompareUserPayload, b: CompareUserPayload): [number[], number[]] {
  const raw = (u: CompareUserPayload) => [
    // Volume is contribution count alone — lines-of-code is no longer a
    // StreakForge feature line, so nothing user-facing derives from it.
    u.stats.totalContributions,
    u.stats.currentStreak * 2 + u.stats.peakStreak,
    u.profile.stats.stars * 3 + u.profile.stats.followers,
    (u.stats.totalPRs || 0) * 2 + (u.stats.totalIssues || 0),
    u.languages.length * 20,
  ];

  const rawA = raw(a);
  const rawB = raw(b);

  const normalise = (values: number[]) => values.map((value, i) => Math.min(value / Math.max(rawA[i], rawB[i], 1), 1));

  return [normalise(rawA), normalise(rawB)];
}

/**
 * Winner of the showdown: whoever takes more of the six head-to-head metrics.
 * `null` means an even split, which the banner renders as a dead heat.
 */
export function deriveWinner(a: CompareProfile, b: CompareProfile): CompareProfile | null {
  const battles: [number, number][] = [
    [a.contrib, b.contrib],
    [a.streak, b.streak],
    [a.peak, b.peak],
    [a.repos, b.repos],
    [a.stars, b.stars],
    [a.followers, b.followers],
  ];

  let scoreA = 0;
  let scoreB = 0;
  for (const [x, y] of battles) {
    if (x > y) scoreA++;
    else if (y > x) scoreB++;
  }

  if (scoreA === scoreB) return null;
  return scoreA > scoreB ? a : b;
}
