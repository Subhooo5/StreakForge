import { TECH_ICONS, SOCIAL_ICONS, TECH_SHIELDS_SLUG, PLATS } from '../data/generatorData';
import type { GeneratorState } from '../types';

export const SITE_BASE = 'https://streakforge.dev';
export const BADGE_BASE = `${SITE_BASE}/api/streak`;
export const DASHBOARD_BASE = `${SITE_BASE}/dashboard`;

const HEX6 = /^[0-9a-fA-F]{6}$/;

export function cleanAccent(accent: string): string | null {
  const c = (accent || '').replace(/^#/, '').trim();
  return HEX6.test(c) ? c.toLowerCase() : null;
}

export function buildBadgeUrl(username: string, accent: string, base = BADGE_BASE): string {
  const params = new URLSearchParams({ user: username });
  const c = cleanAccent(accent);
  if (c) params.set('accent', c);
  return `${base}?${params.toString()}`;
}

export function buildSpotlightUrl(
  username: string,
  repo: string,
  accent: string,
  base = BADGE_BASE
): string {
  const params = new URLSearchParams({ user: username, repo, view: 'spotlight' });
  const c = cleanAccent(accent);
  if (c) params.set('accent', c);
  return `${base}?${params.toString()}`;
}

export function resolveSocialUrl(platform: string, value: string): string {
  const v = (value || '').trim();
  if (!v) return '';
  if (platform === 'Email') return `mailto:${v.replace(/^mailto:/i, '')}`;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^mailto:/i.test(v)) return v;
  return `https://${v.replace(/^\/+/, '')}`;
}

export function activeSocials(state: GeneratorState): string[] {
  return state.socials.filter((p) => (state.socialLinks[p] || '').trim().length > 0);
}

export function shieldsBadgeUrl(tech: string): string {
  const label = encodeURIComponent(tech).replace(/-/g, '--');
  const slug = TECH_SHIELDS_SLUG[tech];
  const base = `https://img.shields.io/badge/${label}-2b2b2b?style=for-the-badge`;
  return slug ? `${base}&logo=${slug}&logoColor=ffffff` : base;
}

export function snakeGraphUrls(username: string) {
  const b = `https://raw.githubusercontent.com/${username}/${username}/output`;
  return { light: `${b}/github-snake.svg`, dark: `${b}/github-snake-dark.svg` };
}

export function pacmanGraphUrls(username: string) {
  const b = `https://raw.githubusercontent.com/${username}/${username}/output`;
  return {
    light: `${b}/pacman-contribution-graph.svg`,
    dark: `${b}/pacman-contribution-graph-dark.svg`,
  };
}

function graphsMarkdown(state: GeneratorState): string | null {
  const username = state.githubUsername.trim();
  if (!username) return null;
  if (!state.showSnakeGraph && !state.showPacmanGraph) return null;

  if (state.showSnakeGraph) {
    const { light, dark } = snakeGraphUrls(username);
    return [
      '## 🐍 Snake Contribution Graph',
      '',
      '<div align="center">',
      '  <picture>',
      `    <source media="(prefers-color-scheme: dark)" srcset="${dark}" />`,
      `    <source media="(prefers-color-scheme: light)" srcset="${light}" />`,
      `    <img alt="${username}'s GitHub Snake Contribution Graph" src="${light}" />`,
      '  </picture>',
      '</div>',
    ].join('\n');
  }

  const { light, dark } = pacmanGraphUrls(username);
  return [
    '## 👾 Pac-Man Contribution Graph',
    '',
    '<div align="center">',
    '  <picture>',
    `    <source media="(prefers-color-scheme: dark)" srcset="${dark}" />`,
    `    <source media="(prefers-color-scheme: light)" srcset="${light}" />`,
    `    <img alt="${username}'s Pac-Man Contribution Graph" src="${light}" />`,
    '  </picture>',
    '</div>',
  ].join('\n');
}

function techMarkdown(state: GeneratorState): string | null {
  if (state.techs.length === 0) return null;

  const items = state.techs
    .map((tech) => {
      if (state.techIconDisplay === 'logo-name') {
        return `<img src="${shieldsBadgeUrl(tech)}" alt="${tech}" title="${tech}" />`;
      }
      const url = TECH_ICONS[tech];
      if (!url) return null;
      if (url.startsWith('https://cdn.simpleicons.org/')) {
        const slug = url.split('/').pop() as string;
        return [
          '<picture>',
          `  <source media="(prefers-color-scheme: dark)" srcset="https://cdn.simpleicons.org/${slug}/ffffff" />`,
          `  <img src="https://cdn.simpleicons.org/${slug}/000000" alt="${tech}" width="40" height="40" title="${tech}" />`,
          '</picture>',
        ].join('\n');
      }
      return `<img src="${url}" alt="${tech}" width="40" height="40" title="${tech}" />`;
    })
    .filter(Boolean) as string[];

  if (items.length === 0) return null;

  return [
    '## 🛠️ Tech Stack',
    '',
    '<div align="center">',
    '',
    items.join('\n&nbsp;\n'),
    '',
    '</div>',
  ].join('\n');
}

function socialsMarkdown(state: GeneratorState): string | null {
  const active = activeSocials(state);
  if (active.length === 0) return null;

  const badges = active
    .map((platform) => {
      const href = resolveSocialUrl(platform, state.socialLinks[platform]);
      const icon = SOCIAL_ICONS[platform];
      if (!href || !icon) return null;

      if (icon.startsWith('https://cdn.simpleicons.org/')) {
        const slug = icon.split('/').pop() as string;
        return [
          `<a href="${href}" target="_blank" rel="noopener noreferrer">`,
          '  <picture>',
          `    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.simpleicons.org/${slug}/ffffff" />`,
          `    <img src="https://cdn.simpleicons.org/${slug}/000000" alt="${platform}" width="36" height="36" title="${platform}" />`,
          '  </picture>',
          '</a>',
        ].join('\n');
      }
      return [
        `<a href="${href}" target="_blank" rel="noopener noreferrer">`,
        `  <img src="${icon}" alt="${platform}" width="36" height="36" title="${platform}" />`,
        '</a>',
      ].join('\n');
    })
    .filter(Boolean) as string[];

  if (badges.length === 0) return null;

  return [
    '## 🌐 Connect With Me',
    '',
    '<div align="center">',
    '',
    badges.join('\n&nbsp;\n'),
    '',
    '</div>',
  ].join('\n');
}

function badgeMarkdown(state: GeneratorState): string | null {
  const username = state.githubUsername.trim();
  if (!state.showBadge || !username) return null;

  const url = buildBadgeUrl(username, state.badgeAccent);
  const dashboard = `${DASHBOARD_BASE}?user=${encodeURIComponent(username)}`;
  return [
    '## 📊 GitHub Streak',
    '',
    '<div align="center">',
    '',
    `[![StreakForge streak monolith for ${username}](${url})](${dashboard})`,
    '',
    '</div>',
  ].join('\n');
}

function spotlightMarkdown(state: GeneratorState): string | null {
  const username = state.githubUsername.trim();
  const repo = state.spotlightRepo.trim();
  if (!state.showRepoSpotlight || !username || !repo) return null;

  const url = buildSpotlightUrl(username, repo, state.badgeAccent);
  const repoUrl = `https://github.com/${username}/${repo}`;
  return [
    '## 🌟 Repository Spotlight',
    '',
    '<div align="center">',
    '',
    `[![Repository Spotlight: ${repo}](${url})](${repoUrl})`,
    '',
    '</div>',
  ].join('\n');
}

export function generateReadme(state: GeneratorState): string {
  const sections: string[] = [];
  const graphs = graphsMarkdown(state);

  const name = state.name.trim();
  const description = state.description.trim();

  if (name || description) {
    const header: string[] = ['<div align="center">', ''];
    if (name) header.push(`# 👋 Hi, I'm ${name}`);
    if (name && description) header.push('');
    if (description) header.push(`<p>${description}</p>`);
    header.push('', '</div>');
    sections.push(header.join('\n'));
  }

  if (state.graphPlacement === 'top' && graphs) sections.push(graphs);

  const tech = techMarkdown(state);
  if (tech) sections.push(tech);

  if (state.graphPlacement === 'middle' && graphs) sections.push(graphs);

  const socials = socialsMarkdown(state);
  if (socials) sections.push(socials);

  const badge = badgeMarkdown(state);
  if (badge) sections.push(badge);

  const spotlight = spotlightMarkdown(state);
  if (spotlight) sections.push(spotlight);

  if (state.graphPlacement === 'bottom' && graphs) sections.push(graphs);

  if (sections.length === 0) return getEmptyReadme();
  return sections.join('\n\n---\n\n') + '\n';
}

export function getEmptyReadme(): string {
  return [
    '<div align="center">',
    '',
    "# 👋 Hi, I'm Your Name",
    '',
    '<p>Your tagline goes here…</p>',
    '',
    '</div>',
    '',
  ].join('\n');
}

export function socialPlaceholder(platform: string): string {
  return PLATS.find((p) => p.name === platform)?.placeholder ?? '';
}
