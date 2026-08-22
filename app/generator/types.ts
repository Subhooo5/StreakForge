export type TechIconDisplay = 'logo' | 'logo-name';

export type GraphPlacement = 'top' | 'middle' | 'bottom';

export interface GeneratorState {
  name: string;
  description: string;

  techs: string[];
  techIconDisplay: TechIconDisplay;

  socials: string[];
  socialLinks: Record<string, string>;

  githubUsername: string;

  showBadge: boolean;
  badgeAccent: string;

  showRepoSpotlight: boolean;
  spotlightRepo: string;

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
