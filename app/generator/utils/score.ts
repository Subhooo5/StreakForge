import { activeSocials } from './readme';
import type { GeneratorState } from '../types';

export const SECTION_IDS = {
  name: 'name-section',
  description: 'description-section',
  technologies: 'technologies-section',
  socials: 'socials-section',
  github: 'badge-section',
  badge: 'badge-section',
} as const;

export interface Facts {
  hasName: boolean;
  hasDescription: boolean;
  techCount: number;
  hasEnoughTechs: boolean;
  hasTechs: boolean;
  hasSocials: boolean;
  hasGithub: boolean;
  hasBadge: boolean;
}

export function readFacts(state: GeneratorState): Facts {
  const techCount = state.techs.length;
  return {
    hasName: state.name.trim().length > 0,
    hasDescription: state.description.trim().length > 0,
    techCount,
    hasEnoughTechs: techCount >= 3,
    hasTechs: techCount > 0,
    hasSocials: activeSocials(state).length > 0,
    hasGithub: state.githubUsername.trim().length > 0,
    hasBadge: state.showBadge,
  };
}

export interface Suggestion {
  id: string;
  completed: boolean;
  text: string;
}

export interface CompletionScore {
  score: number;
  level: string;
  levelColor: string;
  barColor: string;
  strength: string;
  strengthColor: string;
  suggestions: Suggestion[];
}

export function computeCompletion(state: GeneratorState): CompletionScore {
  const f = readFacts(state);

  let score = 0;
  if (f.hasName) score += 15;
  if (f.hasDescription) score += 20;
  if (f.hasEnoughTechs) score += 25;
  if (f.hasSocials) score += 20;
  if (f.hasBadge) score += 10;
  if (f.hasGithub) score += 10;

  let level = 'Beginner';
  let levelColor = 'var(--info)';
  let barColor = 'var(--info)';
  let strength = 'Poor';
  let strengthColor = 'var(--bad)';

  if (score > 80) {
    level = 'Pro Developer';
    levelColor = 'var(--good)';
    barColor = 'var(--good)';
    strength = 'Excellent';
    strengthColor = 'var(--good)';
  } else if (score > 60) {
    level = 'Advanced';
    levelColor = 'var(--accent-2)';
    barColor = 'var(--accent-2)';
    strength = 'Good';
    strengthColor = 'var(--accent-2)';
  } else if (score > 30) {
    level = 'Growing';
    levelColor = 'var(--warn)';
    barColor = 'var(--warn)';
    strength = 'Fair';
    strengthColor = 'var(--warn)';
  }

  const suggestions: Suggestion[] = [
    {
      id: 'name',
      completed: f.hasName,
      text: f.hasName ? 'Name added' : 'Add your name to personalise your profile.',
    },
    {
      id: 'description',
      completed: f.hasDescription,
      text: f.hasDescription
        ? 'Description added'
        : 'Add a short developer bio to improve profile visibility.',
    },
    {
      id: 'techs',
      completed: f.hasEnoughTechs,
      text: f.hasEnoughTechs
        ? 'Technologies added'
        : f.techCount === 0
          ? 'Add technologies to showcase your skills.'
          : `Add ${3 - f.techCount} more technolog${3 - f.techCount === 1 ? 'y' : 'ies'} to better showcase your skills.`,
    },
    {
      id: 'socials',
      completed: f.hasSocials,
      text: f.hasSocials
        ? 'Social links added'
        : 'Connect your social profiles to make collaboration easier.',
    },
    {
      id: 'badge',
      completed: f.hasBadge,
      text: f.hasBadge
        ? 'StreakForge badge enabled'
        : 'Enable the StreakForge badge to display your GitHub activity.',
    },
    {
      id: 'github',
      completed: f.hasGithub,
      text: f.hasGithub
        ? 'GitHub username added'
        : 'Add your GitHub username to link your profile.',
    },
  ];

  return { score, level, levelColor, barColor, strength, strengthColor, suggestions };
}

export interface HealthItem {
  key: string;
  label: string;
  completed: boolean;
  sectionId: string;
}

export function computeHealth(state: GeneratorState): {
  items: HealthItem[];
  percentage: number;
  missing: HealthItem[];
} {
  const f = readFacts(state);
  const items: HealthItem[] = [
    { key: 'name', label: 'Name', completed: f.hasName, sectionId: SECTION_IDS.name },
    {
      key: 'description',
      label: 'Description',
      completed: f.hasDescription,
      sectionId: SECTION_IDS.description,
    },
    {
      key: 'technologies',
      label: 'Technologies',
      completed: f.hasTechs,
      sectionId: SECTION_IDS.technologies,
    },
    {
      key: 'socials',
      label: 'Social Links',
      completed: f.hasSocials,
      sectionId: SECTION_IDS.socials,
    },
    {
      key: 'github',
      label: 'GitHub Username',
      completed: f.hasGithub,
      sectionId: SECTION_IDS.github,
    },
    {
      key: 'badge',
      label: 'StreakForge Badge',
      completed: f.hasBadge,
      sectionId: SECTION_IDS.badge,
    },
  ];

  const completed = items.filter((i) => i.completed).length;
  return {
    items,
    percentage: Math.round((completed / items.length) * 100),
    missing: items.filter((i) => !i.completed),
  };
}

export interface Grade {
  label: string;
  color: string;
}

export function getGrade(score: number): Grade {
  if (score >= 86) return { label: 'Pro', color: 'var(--good)' };
  if (score >= 61) return { label: 'Advanced', color: 'var(--accent-2)' };
  if (score >= 31) return { label: 'Intermediate', color: 'var(--warn)' };
  return { label: 'Beginner', color: 'var(--info)' };
}

export function generateTips(state: GeneratorState): string[] {
  const f = readFacts(state);
  const tips: string[] = [];

  if (!f.hasEnoughTechs) {
    tips.push(
      f.techCount === 0
        ? 'Add technologies to showcase your skills.'
        : `Add ${3 - f.techCount} more technolog${3 - f.techCount === 1 ? 'y' : 'ies'} to better showcase your skills.`
    );
  }
  if (!f.hasSocials) tips.push('Connect your social profiles to make collaboration easier.');
  if (!f.hasDescription) tips.push('Add a longer bio to improve profile visibility.');
  if (!f.hasName) tips.push('Add your name to personalise your profile.');
  if (!f.hasGithub) tips.push('Add your GitHub username to link your profile.');
  if (!f.hasBadge) tips.push('Enable the StreakForge badge to display your live streak.');
  if (!state.showSnakeGraph && !state.showPacmanGraph) {
    tips.push('Add an animated Snake or Pac-Man contribution graph.');
  }
  if (!state.showRepoSpotlight) tips.push('Spotlight your best repository at the bottom.');

  if (tips.length === 0) {
    tips.push('Looking sharp — your README covers everything StreakForge checks for.');
  }
  return tips.slice(0, 4);
}

export function topInsight(state: GeneratorState): { text: string; boost: number } | null {
  const f = readFacts(state);
  if (!f.hasEnoughTechs) return { text: 'List at least three technologies', boost: 25 };
  if (!f.hasDescription) return { text: 'Write a short bio', boost: 20 };
  if (!f.hasSocials) return { text: 'Include social links', boost: 20 };
  if (!f.hasName) return { text: 'Add your display name', boost: 15 };
  if (!f.hasBadge) return { text: 'Enable the StreakForge badge', boost: 10 };
  if (!f.hasGithub) return { text: 'Add your GitHub username', boost: 10 };
  return null;
}
