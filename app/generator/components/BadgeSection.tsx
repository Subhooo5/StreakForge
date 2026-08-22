'use client';

import { useEffect, useState } from 'react';
import CollapsibleSection from './CollapsibleSection';
import { CHECK_CIRCLE, ExternalLink, FieldLabel, Hover, PreviewStage, SearchInput, Spinner, StatusLine, ToggleRow, WARN_TRI } from './ui';
import { buildBadgeUrl, cleanAccent } from '../utils/readme';
import type { GithubProfile } from '../data/useGithubProfile';

interface BadgeSectionProps {
  open: boolean;
  onToggle: () => void;
  username: string;
  onUsernameChange: (v: string) => void;
  show: boolean;
  onShowChange: (v: boolean) => void;
  accent: string;
  onAccentChange: (v: string) => void;
  profile: GithubProfile;
  onReset: () => void;
}

function StatCard({ label, unit, value, color }: { label: string; unit: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '13px 8px', border: '1px solid var(--line2)', borderRadius: '13px', background: 'var(--surface2)', textAlign: 'center' }}>
      <span className="mono" style={{ fontSize: '20px', fontWeight: 700, color }}>{value.toLocaleString()}</span>
      <span className="ui" style={{ marginTop: '3px', fontSize: '11.5px', color: 'var(--soft)' }}>{label}</span>
      <span className="ui" style={{ fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--faint)' }}>{unit}</span>
    </div>
  );
}

/**
 * The StreakForge badge block: include toggle, verified GitHub handle, optional
 * accent override, and a live preview rendered by the real `/api/streak`
 * pipeline (the same route the README embed points at).
 */
export default function BadgeSection({ open, onToggle, username, onUsernameChange, show, onShowChange, accent, onAccentChange, profile, onReset }: BadgeSectionProps) {
  const trimmed = username.trim();
  const accentHex = cleanAccent(accent);
  const verified = profile.status === 'verified';

  // Preview hits the same route as the README embed, just relative.
  const previewSrc = verified ? `${buildBadgeUrl(profile.login || trimmed, accent, '/api/streak')}&theme=dark` : null;

  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [previewSrc]);

  return (
    <CollapsibleSection
      id="badge-section"
      open={open}
      onToggle={onToggle}
      title="StreakForge Badge"
      subtitle="Embed your live 3D contribution streak in the README"
      count={show && trimmed ? 1 : 0}
      onReset={onReset}
      maxHeightOpen="1600px"
    >
      <div style={{ padding: '18px 22px 22px' }}>
        <ToggleRow
          title="Include badge in README"
          description="Adds your 3D isometric streak monolith after the socials section"
          on={show}
          onChange={onShowChange}
          label="Toggle StreakForge badge"
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--line2)' }}>
            {/* GitHub username — shared with the graphs and spotlight sections,
                so it stays available even when the badge itself is off. */}
            <div>
              <FieldLabel style={{ marginBottom: '10px' }}>GitHub username</FieldLabel>
              <SearchInput
                id="badge-username"
                value={username}
                onChange={onUsernameChange}
                onClear={() => onUsernameChange('')}
                placeholder="username"
                maxLength={39}
                spinner={profile.status === 'checking'}
              />

              {profile.status === 'invalid' && (
                <StatusLine tone="warn">{WARN_TRI}Invalid format — letters, numbers and hyphens only; no leading or trailing hyphen.</StatusLine>
              )}
              {profile.status === 'checking' && (
                <StatusLine tone="soft"><Spinner size={13} />Verifying GitHub profile…</StatusLine>
              )}
              {profile.status === 'not_found' && (
                <StatusLine tone="bad">{WARN_TRI}No GitHub user named &ldquo;{trimmed}&rdquo; was found.</StatusLine>
              )}
              {profile.status === 'unverifiable' && (
                <StatusLine tone="warn">{WARN_TRI}Couldn&apos;t verify this username right now — the badge URL is still generated below.</StatusLine>
              )}
              {verified && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px', marginTop: '10px', padding: '10px 12px', border: '1px solid color-mix(in srgb,var(--good) 30%,var(--line))', borderRadius: '13px', background: 'color-mix(in srgb,var(--good) 8%,transparent)' }}>
                  {profile.avatar ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={profile.avatar} alt={`@${profile.login}`} width={26} height={26} style={{ width: '26px', height: '26px', borderRadius: '50%', flex: 'none', objectFit: 'cover', border: '1px solid color-mix(in srgb,var(--good) 30%,transparent)' }} />
                  ) : null}
                  <div style={{ minWidth: 0 }}>
                    <div className="ui" style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.name || profile.login}</div>
                    <div className="ui" style={{ fontSize: '11.5px', color: 'var(--soft)' }}>@{profile.login}</div>
                  </div>
                  <span className="ui" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', flex: 'none', padding: '4px 11px', borderRadius: '100px', background: 'color-mix(in srgb,var(--good) 14%,transparent)', color: 'var(--good)', fontSize: '11px', fontWeight: 700 }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--good)', animation: 'sf-pulse 1.6s ease-in-out infinite' }} />
                    Verified
                  </span>
                </div>
              )}
            </div>

            {/* Accent colour */}
            {show && (
            <div>
              <FieldLabel style={{ marginBottom: '10px' }}>Accent colour (optional)</FieldLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span className="mono" style={{ position: 'absolute', left: '14px', fontSize: '13px', color: 'var(--faint)', pointerEvents: 'none' }}>#</span>
                  <input
                    className="sf-input mono"
                    value={accent.replace(/^#/, '')}
                    onChange={(e) => onAccentChange(e.target.value.replace(/^#/, '').replace(/[^0-9a-fA-F]/g, ''))}
                    placeholder="19d86b"
                    maxLength={6}
                    spellCheck={false}
                    aria-label="Badge accent colour hex"
                    style={{ width: '146px', fontSize: '14px', padding: '13px 14px 13px 30px', border: '1px solid var(--line)', borderRadius: '12px', background: 'var(--surface2)' }}
                  />
                </div>
                <span style={{ width: '38px', height: '38px', flex: 'none', borderRadius: '11px', border: '1px solid var(--line)', background: accentHex ? `#${accentHex}` : 'var(--surface2)', transition: 'background .2s' }} />
                {accent && !accentHex && <span className="ui" style={{ fontSize: '12px', color: 'var(--warn)' }}>Invalid hex</span>}
                {accent && accentHex && (
                  <Hover as="button" onClick={() => onAccentChange('')} base={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--faint)', transition: 'color .18s' }} hover={{ color: 'var(--text)' }}>Clear</Hover>
                )}
              </div>
              <div className="ui" style={{ marginTop: '9px', fontSize: '12px', color: 'var(--faint)', lineHeight: 1.5 }}>Overrides the badge tower colour. Leave blank for the default StreakForge theme.</div>
            </div>
            )}

            {/* Live preview */}
            {show && verified && previewSrc && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <FieldLabel>Live preview</FieldLabel>
                  <ExternalLink href={`/dashboard?user=${encodeURIComponent(profile.login)}`}>Full dashboard</ExternalLink>
                </div>

                <PreviewStage minHeight="180px">
                  {!loaded && !failed && <Spinner size={22} />}
                  {failed && (
                    <p className="ui" style={{ margin: 0, textAlign: 'center', fontSize: '12.5px', color: 'var(--bad)', lineHeight: 1.5 }}>
                      Couldn&apos;t load the badge preview — the streak data may still be generating.
                    </p>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={previewSrc}
                    src={previewSrc}
                    alt={`StreakForge badge for ${profile.login}`}
                    onLoad={() => { setLoaded(true); setFailed(false); }}
                    onError={() => { setFailed(true); setLoaded(false); }}
                    style={{ width: '100%', maxWidth: '480px', height: 'auto', display: 'block', opacity: loaded ? 1 : 0, position: loaded ? 'static' : 'absolute', transition: 'opacity .4s ease' }}
                  />
                </PreviewStage>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginTop: '12px' }}>
                  <StatCard label="Current Streak" unit="days" value={profile.currentStreak} color="var(--accent-2)" />
                  <StatCard label="Longest Streak" unit="days" value={profile.longestStreak} color="var(--warn)" />
                  <StatCard label="Contributions" unit="total" value={profile.totalContributions} color="var(--good)" />
                </div>

                <div className="ui" style={{ marginTop: '10px', textAlign: 'center', fontSize: '12px', color: 'var(--faint)' }}>
                  <span className="mono" style={{ color: 'var(--soft)', fontWeight: 600 }}>{profile.repos.toLocaleString()}</span> public repositories
                </div>
              </div>
            )}

            {show && trimmed.length === 0 && (
              <StatusLine tone="soft">{CHECK_CIRCLE}Enter a GitHub username to see the live badge preview.</StatusLine>
            )}
        </div>
      </div>
    </CollapsibleSection>
  );
}
