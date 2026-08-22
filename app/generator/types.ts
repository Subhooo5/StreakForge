// Shape of everything the README generator renders from.
//
// The Generator page keeps exactly one source of truth for the document it
// produces: this state object. Every panel on the page (README preview, raw
// markdown, completion score, health breakdown, insights) is derived from it,
// so a change in any control propagates to all of them in the same render.

/** How a selected technology is rendered in the README. */
export type TechIconDisplay = 'logo' | 'logo-name';

/** Where the Snake / Pac-Man graph block is injected in the README. */
export type GraphPlacement = 'top' | 'middle' | 'bottom';

export interface GeneratorState {
  /** Display name for the README header. */
  name: string;
  /** One-line bio / tagline under the header. */
  description: string;

  /** Selected technology names (keys of TECHS / TECH_ICONS). */
  techs: string[];
  techIconDisplay: TechIconDisplay;

  /** Selected social platform names (keys of PLATS / SOCIAL_ICONS). */
  socials: string[];
  /** platform name -> user-entered URL / handle. */
  socialLinks: Record<string, string>;

  /** GitHub handle powering the badge, spotlight and contribution graphs. */
  githubUsername: string;

  /** StreakForge badge section. */
  showBadge: boolean;
  /** Optional 6-digit hex (no leading '#') overriding the badge tower colour. */
  badgeAccent: string;

  /** Repository Spotlight section. */
  showRepoSpotlight: boolean;
  spotlightRepo: string;

  /** Contribution visualisations — mutually exclusive. */
  showSnakeGraph: boolean;
  showPacmanGraph: boolean;
  graphPlacement: GraphPlacement;
}

export const EMPTY_STATE: GeneratorState = {
  name: '',
  description: '',
  techs: [],
  techIconDisplay: 'logo',
  socials: [],
  socialLinks: {},
  githubUsername: '',
  showBadge: false,
  badgeAccent: '',
  showRepoSpotlight: false,
  spotlightRepo: '',
  showSnakeGraph: false,
  showPacmanGraph: false,
  graphPlacement: 'bottom',
};
