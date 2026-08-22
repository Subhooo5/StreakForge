'use client';

import CollapsibleSection from './CollapsibleSection';
import { ExternalLink, FieldLabel, Spinner, StatusLine, ToggleRow, WARN_TRI } from './ui';
import type { UserRepo, UserRepos } from '../data/useGithubProfile';

interface RepoSpotlightSectionProps {
  open: boolean;
  onToggle: () => void;
  username: string;
  show: boolean;
  onShowChange: (v: boolean) => void;
  repo: string;
  onRepoChange: (v: string) => void;
  repos: UserRepos;
  onReset: () => void;
}

const REPO_ICON = (
  <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor" style={{ flex: 'none', opacity: 0.7 }}>
    <path fillRule="evenodd" d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
  </svg>
);

const STAR_ICON = (
  <svg width={14} height={14} viewBox="0 0 16 16" fill="currentColor" style={{ flex: 'none', opacity: 0.6 }}>
    <path fillRule="evenodd" d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" />
  </svg>
);

const FORK_ICON = (
  <svg width={14} height={14} viewBox="0 0 16 16" fill="currentColor" style={{ flex: 'none', opacity: 0.6 }}>
    <path fillRule="evenodd" d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878zm3.75 7.378a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3-8.75a.75.75 0 100-1.5.75.75 0 000 1.5z" />
  </svg>
);

const CHEV = (
  <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <path d="M4 6l4 4 4-4" />
  </svg>
);

function formatUpdated(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `Updated ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

/** GitHub-styled card mirroring the SVG the README embed renders. */
function RepoCard({ repo }: { repo: UserRepo }) {
  return (
    <div style={{ width: '100%', maxWidth: '450px', padding: '20px', border: '1px solid color-mix(in srgb,var(--accent) 30%,transparent)', borderRadius: '14px', background: 'rgba(255,255,255,.03)', color: '#e8ecf4' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        {REPO_ICON}
        <span className="ui" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{repo.name}</span>
      </div>

      <p className="ui" style={{ margin: '14px 0 0', fontSize: '12.5px', lineHeight: 1.55, color: 'rgba(232,236,244,.8)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {repo.description || 'No description provided.'}
      </p>

      <div className="ui" style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', marginTop: '20px', fontSize: '12px', color: 'rgba(232,236,244,.8)' }}>
        {repo.language && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: repo.languageColor || '#858585', flex: 'none' }} />
            {repo.language}
          </span>
        )}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>{STAR_ICON}{repo.stars.toLocaleString()}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>{FORK_ICON}{repo.forks.toLocaleString()}</span>
        {repo.updatedAt && <span style={{ opacity: 0.55 }}>{formatUpdated(repo.updatedAt)}</span>}
      </div>
    </div>
  );
}

/**
 * Showcases one repository. The selector and the card are both driven by the
 * user's real public repositories (`/api/streak?...&view=spotlight&format=json`),
 * and the README embeds the SVG the same route renders.
 */
export default function RepoSpotlightSection({ open, onToggle, username, show, onShowChange, repo, onRepoChange, repos, onReset }: RepoSpotlightSectionProps) {
  const trimmed = username.trim();
  const selected = repos.repos.find((r) => r.name === repo) ?? null;

  return (
    <CollapsibleSection
      id="spotlight-section"
      open={open}
      onToggle={onToggle}
      title="Repository Spotlight"
      subtitle="Showcase a specific repository with details and activity"
      count={show && trimmed && repo ? 1 : 0}
      onReset={onReset}
      maxHeightOpen="1200px"
    >
      <div style={{ padding: '18px 22px 22px' }}>
        <ToggleRow
          title="Include repository spotlight in README"
          description="Adds a GitHub-styled repository card with an activity graph"
          on={show}
          onChange={onShowChange}
          label="Toggle repository spotlight"
        />

        {show && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--line2)' }}>
            {!trimmed ? (
              <StatusLine tone="warn">{WARN_TRI}Enter a GitHub username in the StreakForge Badge section first.</StatusLine>
            ) : repos.status === 'loading' ? (
              <StatusLine tone="soft"><Spinner size={13} />Loading repositories…</StatusLine>
            ) : repos.status === 'error' ? (
              <StatusLine tone="bad">{WARN_TRI}Couldn&apos;t load repositories for &ldquo;{trimmed}&rdquo;.</StatusLine>
            ) : repos.repos.length === 0 ? (
              <StatusLine tone="warn">{WARN_TRI}No public repositories found for this user.</StatusLine>
            ) : (
              <div>
                <FieldLabel style={{ marginBottom: '10px' }}>Select repository</FieldLabel>
                <div className="sf-field">
                  <select className="sf-sel ui" value={repo} onChange={(e) => onRepoChange(e.target.value)} aria-label="Spotlight repository">
                    <option value="" disabled>Select a repository…</option>
                    {repos.repos.map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.name}{r.stars > 0 ? ` (★ ${r.stars})` : ''}
                      </option>
                    ))}
                  </select>
                  {CHEV}
                </div>
              </div>
            )}

            {selected && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <FieldLabel>Live preview</FieldLabel>
                  <ExternalLink href={selected.url}>View repository</ExternalLink>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '18px', border: '1px solid var(--line2)', borderRadius: '14px', background: '#0c0e16' }}>
                  <RepoCard repo={selected} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
