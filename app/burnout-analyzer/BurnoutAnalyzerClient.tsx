'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useUrlParams } from '@/hooks/useUrlParams';
import { useBurnout, parseRepoInput } from './data/useBurnout';
import { deriveView } from './data/deriveView';
import ScoreRing from './components/ScoreRing';
import ContributorRow from './components/ContributorRow';
import RiskIndicator from './components/RiskIndicator';
import RecCard from './components/RecCard';
import RiskGauge from './components/RiskGauge';
import BotToggle from './components/BotToggle';
import AdviceRow from './components/AdviceRow';
import Icon from './components/Icon';
import ScrollPane from './components/ScrollPane';
import ExportMenu, { type ExportAction } from './components/ExportMenu';
import Toast, { useToast } from './components/Toast';
import LoadingPanel from '@/components/LoadingPanel';
import { classifyFailure } from '@/utils/emptyState';
import { buildJson, buildMarkdown, buildPdf, buildShareLink, copyText, downloadBlob, reportFileBase } from './utils/report';

// Reproduces the mockup's `style-hover="..."` behaviour with React hover state.
// `base` styles stay verbatim; `hover` styles are merged on pointer-enter.
type HoverProps = React.HTMLAttributes<HTMLElement> & {
  as?: React.ElementType;
  base?: React.CSSProperties;
  hover?: React.CSSProperties;
  href?: string;
  target?: string;
  rel?: string;
  disabled?: boolean;
  'aria-label'?: string;
};
function Hover({ as = 'div', base, hover, children, ...rest }: HoverProps) {
  const [h, setH] = useState(false);
  const Tag = as as React.ElementType;
  return (
    <Tag {...rest} style={{ ...base, ...(h ? hover : undefined) }} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}>
      {children}
    </Tag>
  );
}

// ─── constants ───────────────────────────────────────────────────────────────
const DEMOS = ['facebook/react', 'vercel/next.js', 'Subhooo5/streakforge'];

/** Query params this route owns: `/burnout-analyzer?owner=X&repo=Y`. */
const BURNOUT_PARAMS = ['owner', 'repo'];

// ─── logo SVGs ───────────────────────────────────────────────────────────────
function Logo() {
  return (
    <svg viewBox="0 0 545 150" xmlns="http://www.w3.org/2000/svg" style={{ height: '41px', width: '150px', display: 'block' }}>
      <defs><radialGradient id="sparkBN" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#FFE8B8" /><stop offset="45%" stopColor="#FFB627" /><stop offset="100%" stopColor="#FF7A1A" stopOpacity={0} /></radialGradient></defs>
      <polygon points="25.16,60.45 42.32,69.03 25.16,77.61 8.0,69.03" fill="#E0AAFF" />
      <polygon points="42.32,69.03 25.16,77.61 25.16,96.33 42.32,87.75" fill="#B14AED" />
      <polygon points="8.0,69.03 25.16,77.61 25.16,96.33 8.0,87.75" fill="#6A0DAD" />
      <polygon points="53.24,51.09 70.4,59.67 53.24,68.25 36.08,59.67" fill="#E0AAFF" />
      <polygon points="70.4,59.67 53.24,68.25 53.24,107.25 70.4,98.67" fill="#B14AED" />
      <polygon points="36.08,59.67 53.24,68.25 53.24,107.25 36.08,98.67" fill="#6A0DAD" />
      <polygon points="81.32,41.73 98.48,50.31 81.32,58.89 64.16,50.31" fill="#E0AAFF" />
      <polygon points="98.48,50.31 81.32,58.89 81.32,121.29 98.48,112.71" fill="#B14AED" />
      <polygon points="64.16,50.31 81.32,58.89 81.32,121.29 64.16,112.71" fill="#6A0DAD" />
      <circle cx="81.32" cy="41.73" r="13.26" fill="url(#sparkBN)" />
      <circle cx="81.32" cy="41.73" r="3.51" fill="#FFE8B8" />
      <text x="114" y="91" fontFamily="'Space Grotesk','Styrene B',sans-serif" fontSize={62} fontWeight={700} letterSpacing={-1} fill="var(--text)">streakforge</text>
    </svg>
  );
}

function FooterLogo() {
  return (
    <svg viewBox="0 0 545 150" xmlns="http://www.w3.org/2000/svg" style={{ height: '52px', width: '156px', display: 'block' }}>
      <defs><radialGradient id="sparkBF" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#FFE8B8" /><stop offset="45%" stopColor="#FFB627" /><stop offset="100%" stopColor="#FF7A1A" stopOpacity={0} /></radialGradient></defs>
      <polygon points="25.16,60.45 42.32,69.03 25.16,77.61 8.0,69.03" fill="#E0AAFF" />
      <polygon points="42.32,69.03 25.16,77.61 25.16,96.33 42.32,87.75" fill="#B14AED" />
      <polygon points="8.0,69.03 25.16,77.61 25.16,96.33 8.0,87.75" fill="#6A0DAD" />
      <polygon points="53.24,51.09 70.4,59.67 53.24,68.25 36.08,59.67" fill="#E0AAFF" />
      <polygon points="70.4,59.67 53.24,68.25 53.24,107.25 70.4,98.67" fill="#B14AED" />
      <polygon points="36.08,59.67 53.24,68.25 53.24,107.25 36.08,98.67" fill="#6A0DAD" />
      <polygon points="81.32,41.73 98.48,50.31 81.32,58.89 64.16,50.31" fill="#E0AAFF" />
      <polygon points="98.48,50.31 81.32,58.89 81.32,121.29 98.48,112.71" fill="#B14AED" />
      <polygon points="64.16,50.31 81.32,58.89 81.32,121.29 64.16,112.71" fill="#6A0DAD" />
      <circle cx="81.32" cy="41.73" r="13.26" fill="url(#sparkBF)" />
      <circle cx="81.32" cy="41.73" r="3.51" fill="#FFE8B8" />
      <text x="114" y="91" fontFamily="'Space Grotesk','Styrene B',sans-serif" fontSize={62} fontWeight={700} letterSpacing={-1} fill="var(--text)">streakforge</text>
    </svg>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function BurnoutAnalyzerClient() {
  const [theme, toggleTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [repoInput, setRepoInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  /**
   * Shared by both bot switches — the one under the search box and the one over
   * the results. It is a single piece of state because the filter is not a view
   * option: it changes the commit totals every figure is derived from, so
   * flipping it re-runs the analysis on the server.
   *
   * It stays out of the URL deliberately. `/burnout-analyzer?owner=X&repo=Y`
   * addresses a repository, and Back should leave the results rather than undo
   * a switch.
   */
  const [excludeBots, setExcludeBots] = useState(false);
  const [toast, showToast] = useToast();
  const [exporting, setExporting] = useState<ExportAction | null>(null);

  // A shared link carries the filter it was taken under, so opening one shows
  // the same numbers the sender saw. Read once on mount; toggling afterwards
  // deliberately does not rewrite the URL.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('excludeBots') === 'true') setExcludeBots(true);
  }, []);

  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const readGridColorsRef = useRef<(() => void) | null>(null);
  const ioRef = useRef<IntersectionObserver | null>(null);
  const revealTORef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const burnout = useBurnout();

  // ── URL is the source of truth for the analysis ────────────────────────────
  // `/burnout-analyzer` is the search screen; `/burnout-analyzer?owner=X&repo=Y`
  // is that repository's report. Analysing pushes the params and the effect
  // below performs the fetch, so deep links, refresh, Back and Forward all take
  // one path — and Back from a report lands on a clean search screen.
  const [urlParams, writeUrl] = useUrlParams(BURNOUT_PARAMS);
  const urlOwner = urlParams.owner ?? '';
  const urlRepo = urlParams.repo ?? '';

  const lastRunRef = useRef<string | null>(null);
  const burnoutRunRef = useRef(burnout.run);
  burnoutRunRef.current = burnout.run;
  const burnoutResetRef = useRef(burnout.reset);
  burnoutResetRef.current = burnout.reset;

  useEffect(() => {
    if (!urlOwner || !urlRepo) {
      // Back out of a report → the search screen must look exactly like a first
      // load, so the input and its error clear too.
      lastRunRef.current = null;
      burnoutResetRef.current();
      setRepoInput('');
      setInputError(null);
      return;
    }
    const key = `${urlOwner.toLowerCase()}/${urlRepo.toLowerCase()}|${excludeBots}`;
    if (lastRunRef.current === key) return;
    lastRunRef.current = key;
    setRepoInput(`${urlOwner}/${urlRepo}`);
    setInputError(null);
    void burnoutRunRef.current(urlOwner, urlRepo, excludeBots);
  }, [urlOwner, urlRepo, excludeBots]);

  const view = useMemo(() => (burnout.data ? deriveView(burnout.data) : null), [burnout.data]);
  const analyzed = burnout.data !== null || burnout.loading || burnout.error !== null;

  // ── actions ──
  const startAnalysis = useCallback(
    (raw: string) => {
      const parsed = parseRepoInput(raw);
      if (!parsed) {
        setInputError('Enter a repository as "owner/repo" — for example facebook/react.');
        return;
      }
      setInputError(null);
      // Push the params; the URL effect performs the fetch, so Back returns to
      // the search screen and the link is shareable.
      writeUrl({ owner: parsed.owner, repo: parsed.repo }, 'push');
    },
    [writeUrl],
  );

  function onAnalyze() {
    startAnalysis(repoInput);
  }

  function onBack() {
    writeUrl({ owner: '', repo: '' }, 'push');
  }

  /** Flipping the filter re-runs the analysis; it never merely hides rows. */
  const onToggleBots = useCallback(
    (next: boolean) => {
      setExcludeBots(next);
      // The URL effect re-runs whenever this changes, because the flag is part
      // of its guard key. Nothing else to do here.
    },
    [],
  );

  /**
   * Every export reads the report currently on screen, so the file always
   * matches the active filter rather than an unfiltered default.
   */
  async function onExport(action: ExportAction) {
    const report = burnout.data;
    if (!report || !view) return;

    setExporting(action);
    try {
      const base = reportFileBase(report);
      switch (action) {
        case 'json':
          downloadBlob(buildJson(report, view), `${base}.json`, 'application/json');
          showToast('Report downloaded as JSON');
          break;
        case 'markdown':
          downloadBlob(buildMarkdown(report, view), `${base}.md`, 'text/markdown;charset=utf-8');
          showToast('Report exported as Markdown');
          break;
        case 'share':
          await copyText(buildShareLink(report));
          showToast('Share link copied to clipboard');
          break;
        case 'summary':
          await copyText(buildMarkdown(report, view));
          showToast('Markdown summary copied to clipboard');
          break;
        case 'pdf': {
          const blob = await buildPdf(report, view);
          downloadBlob(blob, `${base}.pdf`, 'application/pdf');
          showToast('Report downloaded as PDF');
          break;
        }
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export failed. Please try again.', 'bad');
    } finally {
      setExporting(null);
    }
  }

  // ── reveal ──
  const runReveal = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    if (ioRef.current) { ioRef.current.disconnect(); ioRef.current = null; }
    const els = [...root.querySelectorAll<HTMLElement>('[data-reveal]')];
    const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (reduce) { els.forEach(e => e.classList.add('in')); return; }
    const reveal = (e: HTMLElement) => e.classList.add('in');
    const inView = (e: HTMLElement) => {
      const r = e.getBoundingClientRect();
      return r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight) * 0.96;
    };
    requestAnimationFrame(() => els.forEach(e => { if (inView(e)) reveal(e); }));
    ioRef.current = new IntersectionObserver(ents => {
      ents.forEach(en => { if (en.isIntersecting) { reveal(en.target as HTMLElement); ioRef.current?.unobserve(en.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });
    els.forEach(e => { if (!e.classList.contains('in')) ioRef.current?.observe(e); });
    if (revealTORef.current) clearTimeout(revealTORef.current);
    revealTORef.current = setTimeout(() => els.forEach(reveal), 1200);
  }, []);

  const runRevealRef = useRef(runReveal);
  runRevealRef.current = runReveal;

  // ── canvas grid (mount only) ──
  useEffect(() => {
    const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const canvas = gridRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const mouse = { x: -9999, y: -9999 };
    const ripples: { x: number; y: number; t: number }[] = [];
    let w = 0, h = 0, dpr = 1, spacing = 40, raf = 0;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      spacing = w < 640 ? 30 : w < 1100 ? 36 : 42;
    };
    resize();
    let dotColor = 'rgba(0,0,0,.16)', hotColor = '#2f5fff';
    const readColors = () => {
      const cs = getComputedStyle(rootRef.current || document.body);
      dotColor = (cs.getPropertyValue('--dot') || '').trim() || dotColor;
      hotColor = (cs.getPropertyValue('--dot-hot') || '').trim() || hotColor;
    };
    readColors();
    readGridColorsRef.current = readColors;
    const onMove = (e: MouseEvent) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    const onClick = (e: MouseEvent) => { const r = canvas.getBoundingClientRect(); ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: 0 }); if (ripples.length > 5) ripples.shift(); };
    const onTouch = (e: TouchEvent) => { if (e.touches?.[0]) { const r = canvas.getBoundingClientRect(); mouse.x = e.touches[0].clientX - r.left; mouse.y = e.touches[0].clientY - r.top; } };
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseout', onLeave);
    window.addEventListener('click', onClick);
    window.addEventListener('touchmove', onTouch, { passive: true });
    const gridReactivity = 1.2;
    const R = 150;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = ripples.length - 1; i >= 0; i--) { ripples[i].t += 7; if (ripples[i].t > Math.hypot(w, h) + 80) ripples.splice(i, 1); }
      const off = spacing / 2;
      for (let gx = off; gx < w; gx += spacing) {
        for (let gy = off; gy < h; gy += spacing) {
          const dx = mouse.x - gx, dy = mouse.y - gy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          let px = gx, py = gy, size = 1.05, hot = 0;
          if (dist < R) { const f = 1 - dist / R; px = gx + dx * f * 0.28 * gridReactivity; py = gy + dy * f * 0.28 * gridReactivity; size = 1.05 + f * f * 2.3 * gridReactivity; hot = f; }
          for (let k = 0; k < ripples.length; k++) {
            const rp = ripples[k];
            const rd = Math.abs(Math.hypot(rp.x - gx, rp.y - gy) - rp.t);
            if (rd < 22) { const rf = (1 - rd / 22) * Math.max(0, 1 - rp.t / 520); size += rf * 2.2; if (rf > hot) hot = rf; }
          }
          if (hot > 0.03) { ctx.fillStyle = hotColor; ctx.globalAlpha = Math.min(1, 0.3 + hot); } else { ctx.fillStyle = dotColor; ctx.globalAlpha = 1; }
          ctx.fillRect(px - size, py - size, size * 2, size * 2);
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    if (reduce) { draw(); cancelAnimationFrame(raf); } else { raf = requestAnimationFrame(draw); }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
      window.removeEventListener('click', onClick);
      window.removeEventListener('touchmove', onTouch);
      ioRef.current?.disconnect();
      if (revealTORef.current) clearTimeout(revealTORef.current);
    };
  }, []);

  // ── update grid colors on theme change ──
  useEffect(() => { readGridColorsRef.current?.(); }, [theme]);

  // `runReveal` only observes the elements present when it runs, so the
  // sections that swap in when a report arrives mount at `[data-reveal]`'s
  // opacity 0 with nobody left to add `.in`. Re-run on every swap, both ways.
  useEffect(() => {
    const id = requestAnimationFrame(() => runRevealRef.current?.());
    return () => cancelAnimationFrame(id);
  }, [analyzed, burnout.data]);

  useEffect(() => {
    if (analyzed) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [analyzed]);

  const themeClass = theme === 'dark' ? 'sf burnout dark' : 'sf burnout';
  const errorMessage = inputError ?? burnout.error;

  return (
    <div className={themeClass} ref={rootRef} style={{ position: 'relative', minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--text)', overflowX: 'hidden', transition: 'background-color .5s ease,color .5s ease' }}>
      <canvas ref={gridRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* TICKER */}
        <div style={{ width: '100%', borderBottom: '1px solid var(--line2)', background: 'var(--surface)', backdropFilter: 'blur(10px)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', height: '34px', width: 'max-content', animation: 'sf-ticker 46s linear infinite' }}>
            {[0, 1].map(dup => (
              <div key={dup} className="ui" aria-hidden={dup === 1 ? 'true' : undefined} style={{ display: 'flex', alignItems: 'center', gap: '34px', paddingRight: '34px', fontSize: '12.5px', letterSpacing: '.01em', color: 'var(--soft)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '9px' }}><span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent)', animation: 'sf-pulse 1.6s ease-in-out infinite' }}></span><span>Sustainability scoring across <span className="mono">2.1M</span> repositories</span></span>
                <span style={{ opacity: 0.4 }}>/</span>
                <span>Bus-factor risk · workload concentration · inactivity drops</span>
                <span style={{ opacity: 0.4 }}>/</span>
                <span><span className="mono">147</span> languages analysed</span>
                <span style={{ opacity: 0.4 }}>/</span>
                <span>Humane recommendations for healthier maintenance</span>
              </div>
            ))}
          </div>
        </div>

        {/* NAV */}
        <header style={{ position: 'sticky', top: 0, zIndex: 40 }}>
          <div style={{ background: 'var(--surface)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line2)' }}>
            <nav style={{ maxWidth: '1240px', margin: '0 auto', padding: '14px clamp(16px,4vw,40px)', display: 'flex', alignItems: 'center', gap: '28px' }}>
              <a href="/" style={{ display: 'flex', alignItems: 'center', flex: 'none' }}><Logo /></a>
              <div className="nav-links ui" style={{ display: 'flex', alignItems: 'center', gap: '30px', marginLeft: '14px', fontSize: '14.5px', color: 'var(--soft)' }}>
                <Hover as="a" className="sf-link" href="/generator" base={{ transition: 'color .2s' }} hover={{ color: 'var(--text)' }}>Generator</Hover>
                <Hover as="a" className="sf-link" href="/compare" base={{ transition: 'color .2s' }} hover={{ color: 'var(--text)' }}>Compare</Hover>
                <a className="sf-link" href="/burnout-analyzer" style={{ color: 'var(--text)', transition: 'color .2s' }}>Burnout Radar</a>
                <Hover as="a" className="sf-link" href="/customize" base={{ transition: 'color .2s' }} hover={{ color: 'var(--text)' }}>Customization Studio</Hover>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Hover as="a" className="nav-repo ui" href="https://github.com/Subhooo5/StreakForge" target="_blank" rel="noopener" base={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 500, padding: '9px 15px', border: '1px solid var(--line)', borderRadius: '11px', background: 'var(--surface2)', transition: 'transform .18s ease,border-color .18s ease,box-shadow .18s ease' }} hover={{ transform: 'translateY(-1px)', border: '1px solid var(--accent)', boxShadow: '0 6px 20px -10px var(--accent)' }}>
                  <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.52.56.83 1.28.83 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" /></svg>
                  GitHub Repo
                </Hover>
                <Hover as="button" onClick={toggleTheme} aria-label="Toggle theme" base={{ width: '40px', height: '40px', display: 'grid', placeItems: 'center', border: '1px solid var(--line)', borderRadius: '11px', background: 'var(--surface2)', transition: 'transform .18s,border-color .18s' }} hover={{ transform: 'translateY(-1px)', border: '1px solid var(--accent)' }}>
                  {theme === 'dark'
                    ? <svg width={18} height={18} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} fill="none"><circle cx={12} cy={12} r={4.2} /><path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M19.4 4.6l-1.7 1.7M6.3 17.7l-1.7 1.7" strokeLinecap="round" /></svg>
                    : <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" /></svg>}
                </Hover>
                <button className="nav-burger" onClick={() => setMenuOpen(m => !m)} aria-label="Menu" style={{ width: '40px', height: '40px', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)', borderRadius: '11px', background: 'var(--surface2)' }}>
                  <svg width={18} height={18} viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.6}><path d="M2 5h14M2 9h14M2 13h14" /></svg>
                </button>
              </div>
            </nav>
          </div>
          <div className="ui" style={{ display: menuOpen ? 'block' : 'none', borderBottom: '1px solid var(--line)', background: 'var(--bg2)' }}>
            <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '8px clamp(16px,4vw,40px) 18px', display: 'flex', flexDirection: 'column' }}>
              <a href="/generator" onClick={() => setMenuOpen(false)} style={{ padding: '13px 4px', borderBottom: '1px solid var(--line2)', fontSize: '15px' }}>Generator</a>
              <a href="/compare" onClick={() => setMenuOpen(false)} style={{ padding: '13px 4px', borderBottom: '1px solid var(--line2)', fontSize: '15px' }}>Compare</a>
              <a href="/burnout-analyzer" onClick={() => setMenuOpen(false)} style={{ padding: '13px 4px', borderBottom: '1px solid var(--line2)', fontSize: '15px' }}>Burnout Radar</a>
              <a href="/customize" onClick={() => setMenuOpen(false)} style={{ padding: '13px 4px', borderBottom: '1px solid var(--line2)', fontSize: '15px' }}>Customization Studio</a>
              <a href="https://github.com/Subhooo5/StreakForge" target="_blank" rel="noopener" style={{ marginTop: '12px', textAlign: 'center', padding: '12px', border: '1px solid var(--line)', borderRadius: '11px', fontSize: '14px', fontWeight: 500 }}>GitHub Repo →</a>
            </div>
          </div>
        </header>

        <main id="top">

          {/* A — INPUT SCREEN */}
          {!analyzed && (
            <section style={{ maxWidth: '760px', margin: '0 auto', padding: 'clamp(50px,8vw,96px) clamp(16px,4vw,40px) clamp(40px,6vw,72px)', textAlign: 'center' }}>
              <div className="ui" data-reveal style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', padding: '7px 16px', border: '1px solid color-mix(in srgb,var(--accent) 35%,var(--line))', borderRadius: '100px', background: 'color-mix(in srgb,var(--accent) 8%,var(--surface))', fontSize: '12px', letterSpacing: '.14em', color: 'var(--accent-ink)', textTransform: 'uppercase', fontWeight: 600 }}>
                <svg width={14} height={14} viewBox="0 0 16 16" fill="currentColor"><path d="M8 1c1 2.5-1 3.5-1 5.5C7 8 8 8.6 8 8.6S9.2 7.8 9.5 6c1.3 1 2.5 2.6 2.5 4.6A4 4 0 0 1 4 10.6C4 7 7 5 8 1Z" /></svg>
                Burnout &amp; Sustainability Radar
              </div>
              <h1 data-reveal style={{ margin: '24px 0 0', fontWeight: 500, letterSpacing: '-.025em', lineHeight: 1.04, fontSize: 'clamp(38px,6.6vw,68px)' }}>
                Spot burnout before<br />it <span style={{ background: 'linear-gradient(100deg,var(--hbase),var(--hsweep))', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>ships</span>.
              </h1>
              <p data-reveal style={{ maxWidth: '560px', margin: '22px auto 0', fontSize: 'clamp(16px,2vw,19px)', lineHeight: 1.6, color: 'var(--soft)', transitionDelay: '.06s' }}>
                Gauge workload sustainability, surface inactivity cliffs, and expose bus-factor dependency risk — with clear, humane next steps for your maintainers.
              </p>

              <div className="ui" data-reveal style={{ display: 'flex', alignItems: 'center', gap: '11px', flexWrap: 'wrap', background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: '16px', padding: '8px 8px 8px 18px', maxWidth: '600px', margin: '34px auto 0', transitionDelay: '.1s' }}>
                <svg width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="var(--faint)" strokeWidth={1.5} style={{ flex: 'none' }}><circle cx={7} cy={7} r={4.5} /><path d="m11 11 3 3" strokeLinecap="round" /></svg>
                <input className="sf-input" value={repoInput} onInput={e => { setRepoInput((e.target as HTMLInputElement).value); setInputError(null); }} onKeyDown={e => { if (e.key === 'Enter') onAnalyze(); }} placeholder="e.g. facebook/react or vercel/next.js" style={{ flex: 1, minWidth: '140px', fontSize: '15.5px', fontWeight: 500 }} />
                <Hover as="button" onClick={onAnalyze} base={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', background: 'var(--accent)', color: '#fff', fontSize: '14.5px', fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 8px 22px -10px var(--accent)', transition: 'transform .16s,box-shadow .16s' }} hover={{ transform: 'translateY(-1px)', boxShadow: '0 12px 28px -10px var(--accent)' }}>
                  <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth={1.7}><path d="M2 8h2l1.5-4 2.5 9 2-5 1 2.5H14" /></svg>
                  Analyze
                </Hover>
              </div>

              {errorMessage && (
                <div className="ui" role="alert" style={{ maxWidth: '600px', margin: '14px auto 0', padding: '12px 16px', borderRadius: '12px', border: '1px solid color-mix(in srgb,var(--bad) 38%,var(--line))', background: 'color-mix(in srgb,var(--bad) 8%,transparent)', color: 'var(--bad)', fontSize: '13.5px', textAlign: 'left' }}>
                  {errorMessage}
                </div>
              )}

              <div data-reveal style={{ maxWidth: '600px', margin: '22px auto 0', textAlign: 'left', transitionDelay: '.12s' }}>
                <BotToggle
                  id="bot-toggle-search"
                  checked={excludeBots}
                  onChange={onToggleBots}
                  label="Exclude Automated Bot Activity"
                  hint="Filters dependabot, renovate and other automation out of every figure — contributor counts, commit totals, workload share and burnout risk."
                />
              </div>

              <div data-reveal style={{ maxWidth: '600px', margin: '28px auto 0', textAlign: 'left', transitionDelay: '.14s' }}>
                <div className="ui" style={{ fontSize: '12px', letterSpacing: '.12em', color: 'var(--soft)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '14px' }}>Try popular repositories</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                  {DEMOS.map((repo, i) => (
                    <button
                      key={i}
                      onClick={() => startAnalysis(repo)}
                      onMouseEnter={() => { const p = parseRepoInput(repo); if (p) burnout.prefetch(p.owner, p.repo, excludeBots); }}
                      className="ui hov-card"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '14px', padding: '16px 20px' }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '11px', fontSize: '15px', fontWeight: 500 }}>
                        <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="var(--faint)" strokeWidth={1.4}><path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5h4.5A1.5 1.5 0 0 1 14 6v5.5A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5v-7Z" /></svg>
                        {repo}
                      </span>
                      <span className="mono" style={{ fontSize: '11px', letterSpacing: '.08em', color: 'var(--accent-ink)', fontWeight: 700, whiteSpace: 'nowrap' }}>LOAD DEMO →</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* B — RESULTS SCREEN */}
          {analyzed && (
            <section style={{ maxWidth: '1240px', margin: '0 auto', padding: 'clamp(24px,4vw,44px) clamp(16px,4vw,40px) clamp(20px,3vw,30px)' }}>

              {/* header card */}
              <div data-reveal style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '24px', padding: 'clamp(20px,3vw,32px)', boxShadow: 'var(--shadow)' }}>
                <Hover as="button" onClick={onBack} className="ui" base={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '13.5px', fontWeight: 500, color: 'var(--soft)', transition: 'color .2s' }} hover={{ color: 'var(--text)' }}>
                  <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M10 3 5 8l5 5" /></svg>Back to search
                </Hover>
                <div className="head-grid" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', marginTop: '18px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '14px', flex: 'none', display: 'grid', placeItems: 'center', background: 'color-mix(in srgb,var(--hsweep) 16%,transparent)', color: 'var(--hsweep)' }}>
                        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><circle cx={6} cy={6} r={2.4} /><circle cx={6} cy={18} r={2.4} /><circle cx={18} cy={9} r={2.4} /><path d="M8.4 6H14a3 3 0 0 1 3 3M8.2 17l7-6.4" /></svg>
                      </div>
                      <div>
                        <div style={{ fontSize: 'clamp(26px,3.6vw,34px)', fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1 }}>{view ? view.repo : urlRepo}</div>
                        <div className="ui" style={{ marginTop: '5px', fontSize: '14.5px', color: 'var(--soft)' }}>Owned by <a className="mono" href={`https://github.com/${view ? view.owner : urlOwner}`} target="_blank" rel="noopener" style={{ color: 'var(--accent-ink)' }}>@{view ? view.owner : urlOwner}</a></div>
                      </div>
                    </div>
                    <div className="ui" style={{ display: 'flex', gap: '11px', flexWrap: 'wrap', marginTop: '18px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 15px', border: '1px solid var(--line)', borderRadius: '11px', background: 'var(--surface2)', fontSize: '13.5px', color: 'var(--soft)' }}><svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="var(--accent-ink)" strokeWidth={1.5}><circle cx={4} cy={8} r={1.6} /><circle cx={12} cy={8} r={1.6} /><path d="M5.6 8h4.8" /></svg><span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>{view ? view.commitsStr : '—'}</span> total commits</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 15px', border: '1px solid var(--line)', borderRadius: '11px', background: 'var(--surface2)', fontSize: '13.5px', color: 'var(--soft)' }}><svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="var(--accent-ink)" strokeWidth={1.5}><circle cx={8} cy={5} r={2.2} /><path d="M3 13a5 5 0 0 1 10 0" /></svg><span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>{view ? view.contributorsStr : '—'}</span> contributors</span>
                    </div>
                  </div>
                  <div className="head-right" style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ position: 'relative', width: '96px', height: '96px', flex: 'none' }}><ScoreRing score={view ? view.score : 0} color={view ? view.healthColor : 'var(--line)'} /></div>
                      <div>
                        <div className="ui" style={{ fontSize: '11px', letterSpacing: '.12em', color: 'var(--soft)', textTransform: 'uppercase', fontWeight: 600 }}>Sustainability</div>
                        <div style={{ fontSize: '24px', fontWeight: 600, color: view ? view.healthColor : 'var(--soft)', lineHeight: 1.1, marginTop: '2px' }}>{view ? view.health : '—'}</div>
                        <div className="ui" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px', padding: '5px 11px', borderRadius: '9px', border: `1px solid color-mix(in srgb,${view ? view.healthColor : 'var(--line)'} 35%,var(--line))`, background: `color-mix(in srgb,${view ? view.healthColor : 'var(--line)'} 10%,transparent)`, fontSize: '10.5px', letterSpacing: '.08em', color: view ? view.healthColor : 'var(--soft)', textTransform: 'uppercase', fontWeight: 600 }}>
                          <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M8 1.6 13 4v4c0 3.2-2.2 5.6-5 6.4C5.2 13.6 3 11.2 3 8V4l5-2.4Z" /></svg>
                          Repository Health
                        </div>
                      </div>
                    </div>
                    <div className="ui" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <ExportMenu onAction={onExport} disabled={!burnout.data} busy={exporting} />
                      <Hover as="button" onClick={() => void burnout.refresh()} aria-label="Re-run" base={{ width: '46px', height: '46px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--surface2)', display: 'grid', placeItems: 'center', transition: 'border-color .18s,transform .4s' }} hover={{ border: '1px solid var(--accent)' }}>
                        <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} style={burnout.loading ? { animation: 'sf-spin 1s linear infinite' } : undefined}><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3h-3" /></svg>
                      </Hover>
                    </div>
                  </div>
                </div>

                {/* Same state as the search screen's switch — flipping it re-runs
                    the analysis rather than hiding rows from a cached one. */}
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--line2)' }}>
                  <BotToggle
                    id="bot-toggle-results"
                    checked={excludeBots}
                    onChange={onToggleBots}
                    disabled={burnout.loading}
                    label="Exclude Bots & Dependency Accounts"
                    hint="Analytics cleanse — recalculates commit totals, contributor count, workload share, bus factor and burnout risk without automation."
                    filteredCount={view?.botsFiltered}
                  />
                </div>
              </div>

              {/* loading */}
              {burnout.loading && !view && (
                <div data-reveal style={{ marginTop: '18px' }}>
                  <LoadingPanel
                    title={`Analysing ${urlOwner}/${urlRepo}`}
                    description="Pulling contributor statistics from GitHub. Large repositories take a few seconds the first time; the result is then cached for an hour."
                  />
                </div>
              )}

              {/* error — routed through the shared classifier so a missing,
                  private or rate-limited repository each reads correctly
                  instead of all collapsing into one generic failure. */}
              {burnout.error && !burnout.loading && (() => {
                const state = classifyFailure(burnout.error, `${urlOwner}/${urlRepo}`);
                const tone = state.tone === 'bad' ? 'var(--bad)' : 'var(--warn)';
                return (
                  <div data-reveal role="alert" style={{ marginTop: '18px', background: 'var(--surface)', border: `1px solid color-mix(in srgb,${tone} 32%,var(--line))`, borderRadius: '22px', padding: 'clamp(24px,4vw,36px)', minHeight: '150px' }}>
                    <div className="ui" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, color: tone }}>
                      <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M8 1.7 15 14H1L8 1.7Z" /><path d="M8 6.4v3.2M8 11.6v.01" /></svg>
                      {state.title}
                    </div>
                    <p style={{ margin: '10px 0 0', fontSize: '14.5px', lineHeight: 1.55, color: 'var(--soft)' }}>{state.body}</p>
                  </div>
                );
              })()}

              {/* empty repository — GitHub published no contributor statistics */}
              {view?.empty && (
                <div data-reveal style={{ marginTop: '18px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '22px', padding: 'clamp(24px,4vw,36px)' }}>
                  <div className="ui" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--warn)' }}>
                    <Icon name="drop" color="var(--warn)" size={16} />
                    No contribution data yet
                  </div>
                  <p style={{ margin: '10px 0 0', fontSize: '14.5px', lineHeight: 1.55, color: 'var(--soft)' }}>
                    GitHub has no contributor statistics for <span className="mono" style={{ color: 'var(--text)' }}>{view.slug}</span>. That means the repository has no commit history yet, or GitHub has not finished compiling it. Burnout Radar shows nothing rather than estimating — push some commits and re-run the analysis.
                  </p>
                  {view.botsExcluded && view.botsFiltered > 0 && (
                    <p className="ui" style={{ margin: '12px 0 0', fontSize: '13px', color: 'var(--faint)' }}>
                      Bot exclusion removed <span className="mono">{view.botsFiltered}</span> automated account{view.botsFiltered === 1 ? '' : 's'}, leaving no human contributors.
                    </p>
                  )}
                </div>
              )}

              {/* A re-fetch (bot toggle, refresh) keeps every section mounted at
                  its current size and shows progress as an overlay inside it.
                  Swapping the block out for a loading panel is what used to
                  collapse the page and move everything below it. */}
              {view && !view.empty && (
                <div style={{ position: 'relative' }} aria-busy={burnout.loading || undefined}>
                  {burnout.loading && (
                    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '120px', borderRadius: '22px', background: 'color-mix(in srgb,var(--bg) 45%,transparent)', backdropFilter: 'blur(1.5px)', pointerEvents: 'none' }}>
                      <span className="ui" style={{ position: 'sticky', top: '120px', display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '11px 18px', borderRadius: '100px', border: '1px solid var(--line)', background: 'var(--surface2)', boxShadow: 'var(--shadow)', fontSize: '13px', fontWeight: 600 }}>
                        <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="var(--accent-ink)" strokeWidth={1.7} style={{ animation: 'sf-spin 1s linear infinite' }}><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" strokeLinecap="round" /></svg>
                        Recalculating…
                      </span>
                    </div>
                  )}
                  {view.contributorsTruncated && (
                    <div className="ui" data-reveal style={{ marginTop: '18px', padding: '12px 16px', borderRadius: '14px', border: '1px solid var(--line)', background: 'var(--surface2)', fontSize: '12.5px', color: 'var(--soft)' }}>
                      GitHub caps contributor statistics at 500 accounts, so these figures describe the top 500 contributors rather than the repository&rsquo;s full history.
                    </div>
                  )}

                  {/* dependency + contributor table */}
                  <div className="dep-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,1fr) 2.3fr', gap: '18px', marginTop: '18px', alignItems: 'start' }}>
                    {/* `alignItems: start` on the grid keeps this card at its natural
                        height instead of stretching to match the contributor table. */}
                    <div data-reveal style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '22px', padding: 'clamp(20px,2.6vw,28px)' }}>
                      <div className="ui" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 }}>
                        <span style={{ width: '24px', height: '24px', borderRadius: '8px', display: 'grid', placeItems: 'center', background: 'color-mix(in srgb,var(--good) 16%,transparent)', color: 'var(--good)' }}><svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7}><path d="M3 8.5 6.5 12 13 4" /></svg></span>
                        Repository Dependency Analysis
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px' }}>
                        <div style={{ background: 'var(--surface2)', border: '1px solid var(--line2)', borderRadius: '16px', padding: '18px' }}>
                          <div className="ui" style={{ fontSize: '11px', letterSpacing: '.08em', color: 'var(--soft)', textTransform: 'uppercase', fontWeight: 600 }}>Bus Factor</div>
                          <div style={{ fontSize: '30px', fontWeight: 600, letterSpacing: '-.02em', marginTop: '8px' }}>{view.busFactor} <span className="ui" style={{ fontSize: '15px', color: 'var(--soft)', fontWeight: 400 }}>dev{view.busFactor === 1 ? '' : 's'}</span></div>
                          <div className="ui" style={{ fontSize: '12px', color: 'var(--faint)', marginTop: '8px', lineHeight: 1.45 }}>to account for 70% of all commits</div>
                        </div>
                        <div style={{ background: 'var(--surface2)', border: '1px solid var(--line2)', borderRadius: '16px', padding: '18px' }}>
                          <div className="ui" style={{ fontSize: '11px', letterSpacing: '.08em', color: 'var(--soft)', textTransform: 'uppercase', fontWeight: 600 }}>Top Concentration</div>
                          <div className="mono" style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-.02em', marginTop: '8px', color: view.concColor }}>{view.conc.toFixed(2)}%</div>
                          <div className="ui" style={{ fontSize: '12px', color: 'var(--faint)', marginTop: '8px', lineHeight: 1.45 }}>held by <span className="mono" style={{ color: 'var(--soft)' }}>@{view.topContributor}</span></div>
                        </div>
                      </div>
                      <div style={{ marginTop: '14px', padding: '16px', borderRadius: '16px', border: `1px solid color-mix(in srgb,${view.busColor} 32%,var(--line))`, background: `color-mix(in srgb,${view.busColor} 8%,transparent)` }}>
                        <div className="ui" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, color: view.busColor }}>{view.busLevel} dependency risk</div>
                        <p style={{ margin: '8px 0 0', fontSize: '13.5px', lineHeight: 1.5, color: 'var(--soft)' }}>{view.busNote}</p>
                      </div>
                    </div>

                    <div data-reveal style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '22px', padding: 'clamp(18px,2.4vw,26px)', minWidth: 0 }}>
                      <div className="ui" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '18px' }}>
                        <svg width={17} height={17} viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--accent-2)' }}><path d="M8 1c1 2.5-1 3.5-1 5.5C7 8 8 8.6 8 8.6S9.2 7.8 9.5 6c1.3 1 2.5 2.6 2.5 4.6A4 4 0 0 1 4 10.6C4 7 7 5 8 1Z" /></svg>
                        Contributor Workload &amp; Burnout Risk
                      </div>
                      <div className="tbl-scroll">
                        <div className="tbl-inner">
                          <div className="ui" style={{ display: 'grid', gridTemplateColumns: '1.7fr .8fr 1.4fr .7fr .7fr .9fr', gap: '10px', padding: '0 6px 12px', borderBottom: '1px solid var(--line)', fontSize: '10.5px', letterSpacing: '.07em', color: 'var(--faint)', textTransform: 'uppercase', fontWeight: 600 }}>
                            <span>Contributor</span><span>Share</span><span>Weekly activity · 12w</span><span>Intense</span><span>Rest</span><span style={{ textAlign: 'right' }}>Risk</span>
                          </div>
                          <div className="list-scroll" style={{ maxHeight: '520px' }}>
                            {view.list.map(c => (
                              <ContributorRow key={c.key} handle={c.handle} initial={c.initial} avatar={c.avatar} avatarUrl={c.avatarUrl} commitsStr={c.commitsStr} shareStr={c.shareStr} sparkData={c.sparkData} sparkColor="var(--accent-ink)" intense={c.intense} rest={c.rest} riskPct={c.riskPct} riskLabel={c.riskLabel} riskColor={c.riskColor} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* timing + indicators — paired, equal height (grid `stretch`),
                      each card scrolling inside itself past the shared height. */}
                  <div className="dep-grid" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '18px', marginTop: '18px' }}>
                    <div data-reveal style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '22px', padding: 'clamp(20px,2.6vw,28px)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                      <div className="ui" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, flex: 'none' }}>
                        <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="var(--accent-ink)" strokeWidth={1.6}><circle cx={8} cy={8} r={6.4} /><path d="M8 4.5V8l2.4 1.6" /></svg>
                        Commit Timing Patterns
                      </div>
                      <ScrollPane>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'clamp(6px,1.4vw,12px)', height: '120px', marginTop: '24px' }}>
                        {view.dayBars.map(d => (
                          <div key={d.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
                            <div title={`${d.day}`} style={{ width: '100%', maxWidth: '34px', height: d.heightPct + '%', borderRadius: '6px 6px 2px 2px', background: d.bg, transformOrigin: 'bottom', animation: 'sf-grow .6s cubic-bezier(.2,.8,.2,1) both' }}></div>
                            <span className="ui" style={{ fontSize: '11px', color: 'var(--faint)' }}>{d.day}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '20px' }}>
                        <div style={{ flex: 1, minWidth: '130px', background: 'var(--surface2)', border: '1px solid var(--line2)', borderRadius: '14px', padding: '14px 16px' }}>
                          <div className="mono" style={{ fontSize: '22px', fontWeight: 700, color: view.offColor }}>{view.offHoursPct}</div>
                          <div className="ui" style={{ fontSize: '11.5px', color: 'var(--soft)', marginTop: '3px' }}>commits in off-hours</div>
                        </div>
                        <div style={{ flex: 1, minWidth: '130px', background: 'var(--surface2)', border: '1px solid var(--line2)', borderRadius: '14px', padding: '14px 16px' }}>
                          <div className="mono" style={{ fontSize: '22px', fontWeight: 700, color: view.wkColor }}>{view.weekendPct}</div>
                          <div className="ui" style={{ fontSize: '11.5px', color: 'var(--soft)', marginTop: '3px' }}>weekend activity</div>
                        </div>
                        <div style={{ flex: 1, minWidth: '130px', background: 'var(--surface2)', border: '1px solid var(--line2)', borderRadius: '14px', padding: '14px 16px' }}>
                          <div className="mono" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>{view.peakDay}</div>
                          <div className="ui" style={{ fontSize: '11.5px', color: 'var(--soft)', marginTop: '3px' }}>busiest weekday</div>
                        </div>
                      </div>
                      <div className="ui" style={{ marginTop: '14px', fontSize: '11.5px', color: 'var(--faint)', lineHeight: 1.45 }}>
                        From GitHub&rsquo;s day/hour commit histogram for this repository{view.timingSample > 0 ? <> · <span className="mono">{view.timingSample.toLocaleString()}</span> commits sampled</> : null}. The histogram carries no author, so it is not affected by the bot filter.
                      </div>
                      </ScrollPane>
                    </div>

                    <div data-reveal style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '22px', padding: 'clamp(20px,2.6vw,28px)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                      <div className="ui" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '18px', flex: 'none' }}>
                        <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="var(--bad)" strokeWidth={1.6}><path d="M8 1.7 15 14H1L8 1.7Z" /><path d="M8 6.4v3.2M8 11.6v.01" /></svg>
                        Risk Indicators
                      </div>
                      <ScrollPane>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                          {view.indicators.map(ind => (
                            <RiskIndicator key={ind.key} color={ind.color} icon={<Icon name={ind.icon} color={ind.color} />} label={ind.label} level={ind.level} text={ind.text} />
                          ))}
                        </div>
                      </ScrollPane>
                    </div>
                  </div>

                  {/* activity breakdown */}
                  <div data-reveal style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '22px', padding: 'clamp(20px,2.6vw,28px)', marginTop: '18px' }}>
                    <div className="ui" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '13px', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 }}>
                        <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="var(--accent-ink)" strokeWidth={1.6}><path d="M2 13V3M2 13h12M5 11V7M8 11V4M11 11V9" /></svg>
                        Activity Breakdown · Last 12 Weeks
                      </span>
                      <span className="ui" style={{ fontSize: '12px', color: 'var(--soft)' }}>avg <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>{view.avgWeekly}</span> commits / week</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'clamp(5px,1.2vw,11px)', height: '130px', marginTop: '24px' }}>
                      {view.weeks.map(w => (
                        <div key={w.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
                          <div title={`${w.commits} commits`} style={{ width: '100%', height: w.heightPct + '%', borderRadius: '5px 5px 2px 2px', background: w.bg, transformOrigin: 'bottom', animation: 'sf-grow .55s cubic-bezier(.2,.8,.2,1) both' }}></div>
                          <span className="mono" style={{ fontSize: '9.5px', color: 'var(--faint)' }}>{w.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* risk assessment + advice — paired, equal height, each
                      scrolling inside itself past the shared height. */}
                  <div className="dep-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '18px', marginTop: '18px' }}>
                    <div data-reveal style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '22px', padding: 'clamp(20px,2.6vw,28px)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                      <div className="ui" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, flex: 'none' }}>
                        <Icon name="conc" color="var(--accent-ink)" size={16} />
                        Risk Assessment
                      </div>
                      <ScrollPane>
                      <div style={{ display: 'grid', placeItems: 'center', marginTop: '18px' }}>
                        <RiskGauge score={view.risk.score} color={view.riskColor} />
                      </div>
                      <div style={{ textAlign: 'center', marginTop: '6px' }}>
                        <div className="ui" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '6px 13px', borderRadius: '100px', border: `1px solid color-mix(in srgb,${view.riskColor} 38%,var(--line))`, background: `color-mix(in srgb,${view.riskColor} 10%,transparent)`, fontSize: '10.5px', letterSpacing: '.08em', fontWeight: 700, color: view.riskColor, textTransform: 'uppercase' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: view.riskColor }}></span>
                          {view.risk.level} risk
                        </div>
                        <p style={{ margin: '12px 0 0', fontSize: '13.5px', lineHeight: 1.5, color: 'var(--soft)' }}>{view.risk.description}</p>
                      </div>
                      <div className="ui" style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--line2)', fontSize: '11.5px', color: 'var(--faint)', lineHeight: 1.5 }}>
                        Weighted across commit-frequency decline, contributor concentration, repository health, dependency risk and inactivity spikes.
                      </div>
                      </ScrollPane>
                    </div>

                    <div data-reveal style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '22px', padding: 'clamp(20px,2.6vw,28px)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                      <div className="ui" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '18px', flex: 'none' }}>
                        <Icon name="spark" color="var(--accent-ink)" size={16} />
                        AI &amp; Heuristic Recommendations
                      </div>
                      {/* Capped so the advice list can never drive the row
                          height: the recommendation count changes with the bot
                          filter, and without this the pair resized on every
                          toggle and shifted the section below it. */}
                      <ScrollPane maxHeight={300}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                          {view.advice.map(a => (
                            <AdviceRow key={a.key} text={a.text} ai={a.ai} />
                          ))}
                        </div>
                      </ScrollPane>
                    </div>
                  </div>

                  {/* recommendations */}
                  <div data-reveal style={{ marginTop: '18px' }}>
                    <div className="ui" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '16px' }}>
                      <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="var(--good)" strokeWidth={1.6}><path d="M8 1.5a4.5 4.5 0 0 0-2.5 8.3V12h5v-2.2A4.5 4.5 0 0 0 8 1.5ZM6 14h4M6.5 12v2M9.5 12v2" /></svg>
                      Recommended Actions
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: '14px' }}>
                      {view.recs.map(r => (
                        <RecCard key={r.key} icon={<Icon name={r.icon} color="var(--accent-ink)" />} title={r.title} text={r.text} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </section>
          )}

          {/* FOOTER */}
          <footer className="ui" style={{ maxWidth: '1180px', margin: '0 auto', padding: 'clamp(34px,5vw,64px) clamp(16px,4vw,40px) 40px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: '30px' }}>
              <div style={{ minWidth: '180px' }}>
                <a href="/" style={{ display: 'inline-flex', alignItems: 'center' }}><FooterLogo /></a>
                <p style={{ margin: '16px 0 0', color: 'var(--soft)', fontSize: '13.5px', lineHeight: 1.6, maxWidth: '240px' }}>GitHub contribution data, forged into premium 3D isometric monoliths. Real-time. Embeddable. Yours.</p>
              </div>
              <div>
                <div style={{ fontSize: '12px', letterSpacing: '.08em', color: 'var(--faint)', textTransform: 'uppercase', fontWeight: 600 }}>Product</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', marginTop: '16px', fontSize: '14px', color: 'var(--soft)' }}>
                  {[['Generator', '/generator'], ['Compare', '/compare'], ['Burnout Radar', '/burnout-analyzer'], ['Customization Studio', '/customize']].map(([label, href]) => (
                    <Hover key={label} as="a" className="sf-link" href={href} base={{ transition: 'color .2s' }} hover={{ color: 'var(--text)' }}>{label}</Hover>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', letterSpacing: '.08em', color: 'var(--faint)', textTransform: 'uppercase', fontWeight: 600 }}>Resources</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', marginTop: '16px', fontSize: '14px', color: 'var(--soft)' }}>
                  <Hover as="a" className="sf-link" href="#" base={{ transition: 'color .2s' }} hover={{ color: 'var(--text)' }}>Documentation</Hover>
                  <Hover as="a" className="sf-link" href="https://github.com/Subhooo5/StreakForge" target="_blank" rel="noopener" base={{ transition: 'color .2s' }} hover={{ color: 'var(--text)' }}>Repository</Hover>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', letterSpacing: '.08em', color: 'var(--faint)', textTransform: 'uppercase', fontWeight: 600 }}>Connect</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', marginTop: '16px', fontSize: '14px', color: 'var(--soft)' }}>
                  {[['GitHub', 'https://github.com/Subhooo5', '_blank'], ['Discord', 'https://discordapp.com/users/488670412096667648', '_blank'], ['Twitter', 'https://x.com/SiMpL36969', '_blank'], ['LinkedIn', 'https://www.linkedin.com/in/subho1817/', '_blank']].map(([label, href, target]) => (
                    <Hover key={label} as="a" className="sf-link" href={href} target={target || undefined} rel={target ? 'noopener' : undefined} base={{ transition: 'color .2s' }} hover={{ color: 'var(--text)' }}>{label}</Hover>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginTop: '48px', paddingTop: '24px', borderTop: '1px solid var(--line)' }}>
              <span style={{ fontSize: '13px', color: 'var(--faint)' }} className="mono">© {new Date().getFullYear()} StreakForge · Made with ❤️‍🔥 for Devs</span>
              <div style={{ display: 'flex', gap: '14px', color: 'var(--soft)' }}>
                <Hover as="a" href="https://github.com/Subhooo5" target="_blank" rel="noopener" aria-label="GitHub" base={{ transition: 'color .2s' }} hover={{ color: 'var(--accent-ink)' }}><svg width={19} height={19} viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.52.56.83 1.28.83 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" /></svg></Hover>
                <Hover as="a" href="https://x.com/SiMpL36969" target="_blank" rel="noopener" aria-label="X" base={{ transition: 'color .2s' }} hover={{ color: 'var(--accent-ink)' }}><svg width={18} height={18} viewBox="0 0 16 16" fill="currentColor"><path d="M12.6 1h2.1L10 6.4 15.5 15h-4.3L7.9 9.9 3.9 15H1.8l4.9-5.8L1.5 1h4.4l3 4.6L12.6 1Zm-.7 12.6h1.1L4.6 2.3H3.4l8.5 11.3Z" /></svg></Hover>
                <Hover as="a" href="https://www.linkedin.com/in/subho1817/" target="_blank" rel="noopener" aria-label="LinkedIn" base={{ transition: 'color .2s' }} hover={{ color: 'var(--accent-ink)' }}><svg width={18} height={18} viewBox="0 0 16 16" fill="currentColor"><path d="M3.4 1.5a1.4 1.4 0 1 1-.01 2.81A1.4 1.4 0 0 1 3.4 1.5ZM1.9 5.5h3V14h-3V5.5Zm5 0h2.9v1.16h.04c.4-.74 1.39-1.52 2.86-1.52 3.06 0 3.62 2 3.62 4.62V14h-3v-3.7c0-.88-.02-2.02-1.23-2.02-1.23 0-1.42.96-1.42 1.95V14h-3V5.5Z" /></svg></Hover>
              </div>
            </div>
          </footer>

        </main>
      </div>

      <Toast toast={toast} />
    </div>
  );
}
