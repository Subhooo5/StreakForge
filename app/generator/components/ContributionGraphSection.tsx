'use client';

import { useEffect, useState } from 'react';
import CollapsibleSection from './CollapsibleSection';
import { CHECK_CIRCLE, CodeBlock, ExternalLink, FieldLabel, Hover, PreviewStage, SearchInput, Segmented, Spinner, StatusLine, ToggleRow, WARN_TRI } from './ui';
import { PACMAN_SAMPLE_PREVIEW_SRC, SNAKE_SAMPLE_PREVIEW_SRC } from '../data/samplePreviewGraphs';
import { pacmanGraphUrls, snakeGraphUrls } from '../utils/readme';
import { generateReadmeSnippet, generateWorkflowYaml, getPlacementHint, getWorkflowFilename, type GraphKind } from '../utils/workflow';
import { isValidGithubUsername } from '../utils/username';
import type { GithubProfile } from '../hooks/useGithubProfile';
import type { GraphPlacement } from '../types';

interface ContributionGraphSectionProps {
  open: boolean;
  onToggle: () => void;
  username: string;
  onUsernameChange: (v: string) => void;
  showSnake: boolean;
  showPacman: boolean;
  onShowSnakeChange: (v: boolean) => void;
  onShowPacmanChange: (v: boolean) => void;
  placement: GraphPlacement;
  onPlacementChange: (v: GraphPlacement) => void;
  profile: GithubProfile;
  onReset: () => void;
}

const INFO = (
  <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ flex: 'none' }}>
    <circle cx={8} cy={8} r={6.4} />
    <path d="M8 7.2v4M8 4.9h.01" strokeLinecap="round" />
  </svg>
);

const CHEV_SMALL = (
  <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M4 6l4 4 4-4" />
  </svg>
);

function GraphPreview({ kind, username, live, sample }: { kind: GraphKind; username: string; live: string; sample: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [live]);

  const title = kind === 'snake' ? 'Snake Contribution Graph' : 'Pac-Man Contribution Graph';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <span className="ui" style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--soft)' }}>{title}</span>
        <ExternalLink href={`https://github.com/${username}/${username}`}>Visit repository</ExternalLink>
      </div>
      <PreviewStage minHeight="120px" style={{ flexDirection: 'column', gap: '10px' }}>
        {!loaded && !failed && <Spinner size={20} />}
        {failed && (
          <>
            <span className="ui" style={{ position: 'absolute', left: '12px', top: '12px', padding: '3px 9px', borderRadius: '100px', background: 'rgba(0,0,0,.55)', fontSize: '9.5px', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700, color: 'rgba(255,255,255,.72)' }}>Sample preview</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sample} alt={`Sample illustration of a ${title}`} style={{ width: '100%', maxWidth: '420px', height: 'auto', display: 'block', opacity: 0.9 }} />
            <p className="ui" style={{ margin: 0, textAlign: 'center', fontSize: '12px', color: 'rgba(205,214,230,.7)', lineHeight: 1.5 }}>
              This is a sample — your live graph for <strong style={{ color: '#e8ecf4' }}>{username}</strong> {" "} isn&apos;t available yet. Set up the Action above to load your real data.
            </p>
          </>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={live}
          src={live}
          alt={`${title} for ${username}`}
          onLoad={() => { setLoaded(true); setFailed(false); }}
          onError={() => { setFailed(true); setLoaded(false); }}
          style={{ width: '100%', maxWidth: '420px', height: 'auto', display: 'block', opacity: loaded ? 1 : 0, position: loaded ? 'static' : 'absolute', transition: 'opacity .3s ease' }}
        />
      </PreviewStage>
    </div>
  );
}

export default function ContributionGraphSection({ open, onToggle, username, onUsernameChange, showSnake, showPacman, onShowSnakeChange, onShowPacmanChange, placement, onPlacementChange, profile, onReset }: ContributionGraphSectionProps) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [tab, setTab] = useState<GraphKind>('snake');

  const trimmed = username.trim();
  const formatOk = isValidGithubUsername(trimmed);
  const anyOn = showSnake || showPacman;

  useEffect(() => {
    if (showSnake) setTab('snake');
    else if (showPacman) setTab('pacman');
  }, [showSnake, showPacman]);

  const userForCode = trimmed || 'your-username';
  const workflow = generateWorkflowYaml(tab, userForCode);
  const snippet = generateReadmeSnippet(tab, userForCode);
  const filename = getWorkflowFilename(tab);
  const hint = getPlacementHint(placement);

  return (
    <CollapsibleSection
      id="graphs-section"
      open={open}
      onToggle={onToggle}
      title="Contribution Visualizations"
      subtitle="Add an animated Snake or Pac-Man contribution graph to your README"
      count={anyOn ? 1 : 0}
      onReset={onReset}
      maxHeightOpen="3200px"
    >
      <div style={{ padding: '18px 22px 22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <ToggleRow
          title="Snake Contribution Graph"
          description="Generates a classic Snake game animation over your grid"
          on={showSnake}
          label="Toggle Snake contribution graph"
          onChange={(v) => {
            onShowSnakeChange(v);
            if (v) onShowPacmanChange(false);
          }}
        />
        <ToggleRow
          title="Pac-Man Contribution Graph"
          description="Generates a retro Pac-Man animation over your grid"
          on={showPacman}
          label="Toggle Pac-Man contribution graph"
          onChange={(v) => {
            onShowPacmanChange(v);
            if (v) onShowSnakeChange(false);
          }}
        />

        {anyOn && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', paddingTop: '18px', borderTop: '1px solid var(--line2)' }}>
            {}
            <div>
              <FieldLabel style={{ marginBottom: '10px' }}>GitHub username</FieldLabel>
              <SearchInput
                value={username}
                onChange={onUsernameChange}
                onClear={() => onUsernameChange('')}
                placeholder="username"
                maxLength={39}
                spinner={profile.status === 'checking'}
              />
              {trimmed.length === 0 && (
                <StatusLine tone="warn">{WARN_TRI}Enter your GitHub username to generate the workflow and README snippet.</StatusLine>
              )}
              {trimmed.length > 0 && !formatOk && (
                <StatusLine tone="warn">{WARN_TRI}Invalid username format.</StatusLine>
              )}
              {formatOk && profile.status === 'checking' && (
                <StatusLine tone="soft"><Spinner size={13} />Checking username…</StatusLine>
              )}
              {formatOk && profile.status === 'verified' && (
                <StatusLine tone="good">{CHECK_CIRCLE}GitHub user found — workflow and README snippet generated below.</StatusLine>
              )}
              {formatOk && profile.status === 'not_found' && (
                <StatusLine tone="bad">{WARN_TRI}No GitHub user named &ldquo;{trimmed}&rdquo; was found.</StatusLine>
              )}
              {formatOk && profile.status === 'unverifiable' && (
                <StatusLine tone="soft">{WARN_TRI}Couldn&apos;t verify this username right now — showing generated code anyway.</StatusLine>
              )}
            </div>

            {}
            <div>
              <FieldLabel style={{ marginBottom: '10px' }}>Placement location</FieldLabel>
              <Segmented
                uppercase
                value={placement}
                onChange={(v) => onPlacementChange(v)}
                options={[
                  { value: 'top', label: 'Top' },
                  { value: 'middle', label: 'Middle' },
                  { value: 'bottom', label: 'Bottom' },
                ]}
              />
            </div>

            {}
            <div style={{ padding: '14px', border: `1px solid ${showInstructions ? 'var(--line2)' : 'color-mix(in srgb,var(--accent) 38%,var(--line))'}`, borderRadius: '15px', background: showInstructions ? 'var(--surface2)' : 'color-mix(in srgb,var(--accent) 6%,transparent)', transition: 'border-color .3s,background .3s' }}>
              <button type="button" onClick={() => setShowInstructions((v) => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%', textAlign: 'left' }}>
                <span className="ui" style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', fontSize: '13px', fontWeight: 700, color: showInstructions ? 'var(--text)' : 'var(--accent-ink)' }}>
                  <span style={{ display: 'flex', color: 'var(--accent-ink)' }}>{INFO}</span>
                  {trimmed ? 'Your workflow + README code is ready' : 'How do I set this up on GitHub?'}
                </span>
                <span className="ui" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flex: 'none', fontSize: '12px', fontWeight: 600, color: 'var(--accent-ink)' }}>
                  {showInstructions ? 'Hide details' : 'Show details'}
                  <span style={{ display: 'flex', transform: showInstructions ? 'rotate(180deg)' : 'none', transition: 'transform .3s' }}>{CHEV_SMALL}</span>
                </span>
              </button>

              {showInstructions && (
                <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--line2)' }}>
                  <p className="ui" style={{ margin: 0, fontSize: '12.5px', color: 'var(--soft)', lineHeight: 1.6 }}>
                    These contribution graphs are generated automatically via GitHub Actions in a repository matching your username (e.g. <code className="mono" style={{ padding: '2px 6px', borderRadius: '6px', background: 'var(--surface2)', border: '1px solid var(--line2)', fontSize: '11.5px' }}>{trimmed || 'username'}/{trimmed || 'username'}</code>).
                  </p>

                  <ol className="ui" style={{ margin: '14px 0 0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12.5px', color: 'var(--soft)', lineHeight: 1.6 }}>
                    <li>Create a public repository named exactly <strong style={{ color: 'var(--text)' }}>{trimmed || 'your-username'}</strong> if you haven&apos;t already.</li>
                    <li>Inside that repository, create the directory <code className="mono" style={{ padding: '2px 6px', borderRadius: '6px', background: 'var(--surface2)', border: '1px solid var(--line2)', fontSize: '11.5px' }}>.github/workflows/</code></li>
                    <li>Create a file named <code className="mono" style={{ padding: '2px 6px', borderRadius: '6px', background: 'var(--surface2)', border: '1px solid var(--line2)', fontSize: '11.5px' }}>{filename}</code> and copy-paste the workflow configuration below.</li>
                    <li>Push the commit, then run the workflow once manually from the &ldquo;Actions&rdquo; tab in your repo (or wait for the daily schedule).</li>
                    <li>Paste the README snippet below into your <code className="mono" style={{ padding: '2px 6px', borderRadius: '6px', background: 'var(--surface2)', border: '1px solid var(--line2)', fontSize: '11.5px' }}>README.md</code>. {hint}</li>
                  </ol>

                  <div className="ui" style={{ display: 'flex', gap: '4px', marginTop: '16px', borderBottom: '1px solid var(--line2)' }}>
                    {(['snake', 'pacman'] as GraphKind[]).map((k) => (
                      <Hover
                        key={k}
                        as="button"
                        onClick={() => setTab(k)}
                        base={{ padding: '9px 13px', marginBottom: '-1px', borderBottom: `2px solid ${tab === k ? 'var(--accent)' : 'transparent'}`, fontSize: '12.5px', fontWeight: 700, color: tab === k ? 'var(--accent-ink)' : 'var(--faint)', transition: 'color .18s,border-color .18s' }}
                        hover={{ color: tab === k ? 'var(--accent-ink)' : 'var(--soft)' }}
                      >
                        {k === 'snake' ? 'Snake workflow' : 'Pac-Man workflow'}
                      </Hover>
                    ))}
                  </div>

                  <FieldLabel style={{ margin: '16px 0 9px', fontSize: '10.5px' }}>.github/workflows/{filename}</FieldLabel>
                  <CodeBlock code={workflow} maxHeight="240px" />

                  <FieldLabel style={{ margin: '18px 0 9px', fontSize: '10.5px' }}>README.md snippet</FieldLabel>
                  <CodeBlock code={snippet} maxHeight="180px" />
                  <div className="ui" style={{ marginTop: '9px', fontSize: '12px', color: 'var(--faint)', lineHeight: 1.5 }}>{hint}</div>
                </div>
              )}
            </div>

            {}
            {formatOk && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '18px', borderTop: '1px solid var(--line2)' }}>
                <FieldLabel>Live preview</FieldLabel>
                {showSnake && (
                  <GraphPreview kind="snake" username={trimmed} live={snakeGraphUrls(trimmed).light} sample={SNAKE_SAMPLE_PREVIEW_SRC} />
                )}
                {showPacman && (
                  <GraphPreview kind="pacman" username={trimmed} live={pacmanGraphUrls(trimmed).light} sample={PACMAN_SAMPLE_PREVIEW_SRC} />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
