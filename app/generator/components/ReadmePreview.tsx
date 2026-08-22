'use client';

import { TECH_ICONS, SOCIAL_ICONS } from '../data/generatorData';
import { activeSocials, buildBadgeUrl, buildSpotlightUrl, pacmanGraphUrls, resolveSocialUrl, shieldsBadgeUrl, snakeGraphUrls } from '../utils/readme';
import type { GeneratorState } from '../types';

const HEADING: React.CSSProperties = {
  fontFamily: "'Space Grotesk',sans-serif",
  fontSize: '19px',
  fontWeight: 700,
  color: '#e8ecf4',
  margin: '0 0 14px',
};

const DIVIDER = <div style={{ height: '1px', margin: '26px 0', background: 'rgba(255,255,255,.1)' }} />;

function Icon({ src, alt, size }: { src: string; alt: string; size: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} title={alt} width={size} height={size} loading="lazy" decoding="async" style={{ width: size + 'px', height: size + 'px', objectFit: 'contain', display: 'block' }} />;
}

function iconSrc(url: string): string {
  return url.startsWith('https://cdn.simpleicons.org/') ? `${url}/ffffff` : url;
}

export default function ReadmePreview({ state }: { state: GeneratorState }) {
  const name = state.name.trim();
  const description = state.description.trim();
  const username = state.githubUsername.trim();
  const socials = activeSocials(state);

  const blocks: React.ReactNode[] = [];

  if (name || description) {
    blocks.push(
      <div key="header" style={{ textAlign: 'center' }}>
        {name && <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '26px', color: '#fff', lineHeight: 1.25 }}>👋 Hi, I&apos;m {name}</div>}
        {description && <div style={{ marginTop: name ? '12px' : 0, fontFamily: "'Space Grotesk',sans-serif", fontSize: '15px', color: '#9aa6bd', lineHeight: 1.55 }}>{description}</div>}
      </div>
    );
  }

  const graphs = username && (state.showSnakeGraph || state.showPacmanGraph)
    ? (
      <div key="graphs">
        <h2 style={HEADING}>{state.showSnakeGraph ? '🐍 Snake Contribution Graph' : '👾 Pac-Man Contribution Graph'}</h2>
        <div style={{ textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={state.showSnakeGraph ? snakeGraphUrls(username).light : pacmanGraphUrls(username).light}
            alt={`${state.showSnakeGraph ? 'Snake' : 'Pac-Man'} contribution graph for ${username}`}
            style={{ maxWidth: '100%', height: 'auto', display: 'inline-block' }}
            onError={(e) => { const t = e.currentTarget; t.style.display = 'none'; const n = t.nextElementSibling as HTMLElement | null; if (n) n.style.display = 'block'; }}
          />
          <div style={{ display: 'none', padding: '18px', borderRadius: '12px', border: '1px dashed rgba(255,255,255,.16)', fontFamily: "'Space Grotesk',sans-serif", fontSize: '12.5px', color: '#7f8aa3', lineHeight: 1.5 }}>
            The graph appears here once the GitHub Action has run for <strong style={{ color: '#cdd6e6' }}>{username}</strong>.
          </div>
        </div>
      </div>
    )
    : null;

  if (state.graphPlacement === 'top' && graphs) blocks.push(graphs);

  if (state.techs.length > 0) {
    blocks.push(
      <div key="tech">
        <h2 style={HEADING}>🛠️ Tech Stack</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: state.techIconDisplay === 'logo-name' ? '8px' : '14px', justifyContent: 'center', alignItems: 'center' }}>
          {state.techs.map((tech) =>
            state.techIconDisplay === 'logo-name' ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={tech} src={shieldsBadgeUrl(tech)} alt={tech} title={tech} style={{ height: '28px', width: 'auto', display: 'block' }} />
            ) : TECH_ICONS[tech] ? (
              <Icon key={tech} src={iconSrc(TECH_ICONS[tech])} alt={tech} size={40} />
            ) : null
          )}
        </div>
      </div>
    );
  }

  if (state.graphPlacement === 'middle' && graphs) blocks.push(graphs);

  if (socials.length > 0) {
    blocks.push(
      <div key="socials">
        <h2 style={HEADING}>🌐 Connect With Me</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'center', alignItems: 'center' }}>
          {socials.map((platform) => {
            const icon = SOCIAL_ICONS[platform];
            if (!icon) return null;
            return (
              <a key={platform} href={resolveSocialUrl(platform, state.socialLinks[platform])} target="_blank" rel="noopener noreferrer" title={platform} style={{ display: 'block' }}>
                <Icon src={iconSrc(icon)} alt={platform} size={36} />
              </a>
            );
          })}
        </div>
      </div>
    );
  }

  if (state.showBadge && username) {
    blocks.push(
      <div key="badge">
        <h2 style={HEADING}>📊 GitHub Streak</h2>
        <div style={{ textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${buildBadgeUrl(username, state.badgeAccent, '/api/streak')}&theme=dark`} alt={`StreakForge streak monolith for ${username}`} style={{ maxWidth: '100%', height: 'auto', display: 'inline-block' }} />
        </div>
      </div>
    );
  }

  if (state.showRepoSpotlight && username && state.spotlightRepo) {
    blocks.push(
      <div key="spotlight">
        <h2 style={HEADING}>🌟 Repository Spotlight</h2>
        <div style={{ textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${buildSpotlightUrl(username, state.spotlightRepo, state.badgeAccent, '/api/streak')}&theme=dark`} alt={`Repository spotlight: ${state.spotlightRepo}`} style={{ maxWidth: '100%', height: 'auto', display: 'inline-block' }} />
        </div>
      </div>
    );
  }

  if (state.graphPlacement === 'bottom' && graphs) blocks.push(graphs);

  if (blocks.length === 0) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '26px', color: '#fff' }}>👋 Hi, I&apos;m Your Name</div>
        <div style={{ marginTop: '12px', fontFamily: "'Space Grotesk',sans-serif", fontSize: '15px', color: '#9aa6bd', lineHeight: 1.55 }}>Your tagline goes here…</div>
      </div>
    );
  }

  return (
    <div>
      {blocks.map((block, i) => (
        <div key={i}>
          {i > 0 && DIVIDER}
          {block}
        </div>
      ))}
    </div>
  );
}
