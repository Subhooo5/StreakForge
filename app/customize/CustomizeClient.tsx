"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useUrlBackedState, useUrlParams } from "@/hooks/useUrlParams";
import SegButton from "./components/SegButton";
import ToggleRow from "./components/ToggleRow";
import SelectField from "./components/SelectField";
import ThemeTile from "./components/ThemeTile";
import { THEME_PRESETS, themePreset } from "./data/themes";
import { useBadgeSvg } from "./data/useBadgeSvg";
import { EXPORT_FORMATS, FONTS, LANGUAGES, PREVIEW_BGS, SIZES, SPEEDS, TIMEZONES, VIEW_MODES, syncYearOptions } from "./types";
import type { CustomizeOptions, ExportFormat, PreviewBg } from "./types";
import { PARAM_KEYS, activeParams, fromParams, toParams, toQuery } from "./utils/params";
import { PLACEHOLDER_USER, exportSnippet } from "./utils/snippets";
import { downloadConfig, parseConfig } from "./utils/config";

// ---------- constants ----------
// DC `data-props` editor knob → component constant (default from the export).
const GRID_REACTIVITY = 1.2;

// Every studio setting except the handle lives in the URL through
// `useUrlParams`; the handle uses `useUrlBackedState` so typing it leaves one
// history entry rather than one per keystroke (the app-wide convention).
const OPTION_KEYS: string[] = PARAM_KEYS.filter((key) => key !== 'user');

/**
 * Resting border for the page's hoverable controls.
 *
 * Hover swaps these to `var(--accent)` (electric blue in light, green in dark).
 * The reset MUST name this token rather than clearing the property: the inline
 * `border: 1px solid var(--line)` shorthand writes a border-color longhand, and
 * setting that longhand to '' removes it entirely, so the border falls back to
 * its CSS initial value — `currentColor`, i.e. a white outline in dark mode
 * that lingers after the pointer leaves.
 */
const RESTING_BORDER = 'var(--line)';

/** How long a radius drag settles before it becomes a history entry. */
const RADIUS_COMMIT_MS = 400;

// ---------- Logo SVGs ----------
const Logo = (
  <svg viewBox="0 0 545 150" xmlns="http://www.w3.org/2000/svg" style={{ height: '41px', width: '150px', display: 'block' }}>
    <defs><radialGradient id="sparkCN" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#FFE8B8" /><stop offset="45%" stopColor="#FFB627" /><stop offset="100%" stopColor="#FF7A1A" stopOpacity={0} /></radialGradient></defs>
    <polygon points="25.16,60.45 42.32,69.03 25.16,77.61 8.0,69.03" fill="#E0AAFF" />
    <polygon points="42.32,69.03 25.16,77.61 25.16,96.33 42.32,87.75" fill="#B14AED" />
    <polygon points="8.0,69.03 25.16,77.61 25.16,96.33 8.0,87.75" fill="#6A0DAD" />
    <polygon points="53.24,51.09 70.4,59.67 53.24,68.25 36.08,59.67" fill="#E0AAFF" />
    <polygon points="70.4,59.67 53.24,68.25 53.24,107.25 70.4,98.67" fill="#B14AED" />
    <polygon points="36.08,59.67 53.24,68.25 53.24,107.25 36.08,98.67" fill="#6A0DAD" />
    <polygon points="81.32,41.73 98.48,50.31 81.32,58.89 64.16,50.31" fill="#E0AAFF" />
    <polygon points="98.48,50.31 81.32,58.89 81.32,121.29 98.48,112.71" fill="#B14AED" />
    <polygon points="64.16,50.31 81.32,58.89 81.32,121.29 64.16,112.71" fill="#6A0DAD" />
    <circle cx="81.32" cy="41.73" r="13.26" fill="url(#sparkCN)" />
    <circle cx="81.32" cy="41.73" r="3.51" fill="#FFE8B8" />
    <text x="114" y="91" fontFamily="'Space Grotesk','Styrene B',sans-serif" fontSize="62" fontWeight="700" letterSpacing="-1" fill="var(--text)">streakforge</text>
  </svg>
);

const FooterLogo = (
  <svg viewBox="0 0 545 150" xmlns="http://www.w3.org/2000/svg" style={{ height: '52px', width: '156px', display: 'block' }}>
    <defs><radialGradient id="sparkCF" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#FFE8B8" /><stop offset="45%" stopColor="#FFB627" /><stop offset="100%" stopColor="#FF7A1A" stopOpacity={0} /></radialGradient></defs>
    <polygon points="25.16,60.45 42.32,69.03 25.16,77.61 8.0,69.03" fill="#E0AAFF" />
    <polygon points="42.32,69.03 25.16,77.61 25.16,96.33 42.32,87.75" fill="#B14AED" />
    <polygon points="8.0,69.03 25.16,77.61 25.16,96.33 8.0,87.75" fill="#6A0DAD" />
    <polygon points="53.24,51.09 70.4,59.67 53.24,68.25 36.08,59.67" fill="#E0AAFF" />
    <polygon points="70.4,59.67 53.24,68.25 53.24,107.25 70.4,98.67" fill="#B14AED" />
    <polygon points="36.08,59.67 53.24,68.25 53.24,107.25 36.08,98.67" fill="#6A0DAD" />
    <polygon points="81.32,41.73 98.48,50.31 81.32,58.89 64.16,50.31" fill="#E0AAFF" />
    <polygon points="98.48,50.31 81.32,58.89 81.32,121.29 98.48,112.71" fill="#B14AED" />
    <polygon points="64.16,50.31 81.32,58.89 81.32,121.29 64.16,112.71" fill="#6A0DAD" />
    <circle cx="81.32" cy="41.73" r="13.26" fill="url(#sparkCF)" />
    <circle cx="81.32" cy="41.73" r="3.51" fill="#FFE8B8" />
    <text x="114" y="91" fontFamily="'Space Grotesk','Styrene B',sans-serif" fontSize="62" fontWeight="700" letterSpacing="-1" fill="var(--text)">streakforge</text>
  </svg>
);

// ---------- component ----------
export default function CustomizeClient() {
  const [theme, toggleTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  // Mirrored into `?user=` so a configured badge is linkable.
  const [username, setUsername] = useUrlBackedState('user');
  // …and every other setting lives in the URL too, so the address bar *is* the
  // studio's state: a link restores the exact badge, and Back steps back
  // through the settings that were changed.
  const [params, writeParams] = useUrlParams(OPTION_KEYS);
  // A radius drag is one gesture: the draft drives the preview immediately and
  // only the settled value becomes a history entry.
  const [radiusDraft, setRadiusDraft] = useState<number | null>(null);
  const [exportFmt, setExportFmt] = useState<ExportFormat>('markdown');
  const [previewBg, setPreviewBg] = useState<PreviewBg>('dark');
  const [rawView, setRawView] = useState(true);
  const [copied, setCopied] = useState(false);
  const [svgDone, setSvgDone] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const readGridColorsRef = useRef<(() => void) | null>(null);
  const ioRef = useRef<IntersectionObserver | null>(null);
  const revealTORef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTORef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const svgTORef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const radiusTORef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const reduceRef = useRef(false);

  const initReveal = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    if (ioRef.current) ioRef.current.disconnect();
    const els = [...root.querySelectorAll<HTMLElement>('[data-reveal]')];
    if (reduceRef.current) { els.forEach(e => e.classList.add('in')); return; }
    const reveal = (e: HTMLElement) => e.classList.add('in');
    const inView = (e: HTMLElement) => {
      const r = e.getBoundingClientRect();
      return r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight) * 0.96;
    };
    requestAnimationFrame(() => els.forEach(e => { if (inView(e)) reveal(e); }));
    ioRef.current = new IntersectionObserver(ents => {
      ents.forEach(en => { if (en.isIntersecting) { reveal(en.target as HTMLElement); ioRef.current!.unobserve(en.target); } });
    }, { threshold: 0.06, rootMargin: '0px 0px -4% 0px' });
    els.forEach(e => { if (!e.classList.contains('in')) ioRef.current!.observe(e); });
    if (revealTORef.current) clearTimeout(revealTORef.current);
    revealTORef.current = setTimeout(() => els.forEach(reveal), 1200);
  }, []);

  useEffect(() => {
    reduceRef.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
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
      spacing = w < 640 ? 30 : (w < 1100 ? 36 : 42);
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

    const R = 150;
    const react = GRID_REACTIVITY;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = ripples.length - 1; i >= 0; i--) { ripples[i].t += 7; if (ripples[i].t > Math.hypot(w, h) + 80) ripples.splice(i, 1); }
      const off = spacing / 2;
      for (let gx = off; gx < w; gx += spacing) {
        for (let gy = off; gy < h; gy += spacing) {
          const dx = mouse.x - gx, dy = mouse.y - gy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          let px = gx, py = gy, size = 1.05, hot = 0;
          if (dist < R) { const f = 1 - dist / R; px = gx + dx * f * 0.3 * react; py = gy + dy * f * 0.3 * react; size = 1.05 + f * f * 2.4 * react; hot = f; }
          for (let k = 0; k < ripples.length; k++) {
            const rp = ripples[k]; const rd = Math.abs(Math.hypot(rp.x - gx, rp.y - gy) - rp.t);
            if (rd < 22) { const rf = (1 - rd / 22) * Math.max(0, 1 - rp.t / 520); size += rf * 2.2; if (rf > hot) hot = rf; }
          }
          if (hot > 0.03) { ctx.fillStyle = hotColor; ctx.globalAlpha = Math.min(1, 0.3 + hot); } else { ctx.fillStyle = dotColor; ctx.globalAlpha = 1; }
          ctx.fillRect(px - size, py - size, size * 2, size * 2);
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    if (reduceRef.current) { draw(); cancelAnimationFrame(raf); } else { raf = requestAnimationFrame(draw); }

    initReveal();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
      window.removeEventListener('click', onClick);
      window.removeEventListener('touchmove', onTouch);
      if (ioRef.current) ioRef.current.disconnect();
      if (revealTORef.current) clearTimeout(revealTORef.current);
      if (copyTORef.current) clearTimeout(copyTORef.current);
      if (svgTORef.current) clearTimeout(svgTORef.current);
      if (radiusTORef.current) clearTimeout(radiusTORef.current);
    };
  }, [initReveal]);

  useEffect(() => {
    readGridColorsRef.current?.();
  }, [theme]);

  const themeClass = theme === 'dark' ? 'sf customize dark' : 'sf customize';

  const themeIcon = theme === 'dark'
    ? <svg width={18} height={18} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} fill="none"><circle cx={12} cy={12} r={4.2} /><path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M19.4 4.6l-1.7 1.7M6.3 17.7l-1.7 1.7" strokeLinecap="round" /></svg>
    : <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" /></svg>;

  // ── state derived from the URL ──────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const options = useMemo(() => {
    const fromUrl = fromParams({ ...params, user: username }, currentYear);
    return radiusDraft === null ? fromUrl : { ...fromUrl, radius: radiusDraft };
  }, [params, username, currentYear, radiusDraft]);

  /** Writes a whole settings object back to the URL (one history entry). */
  const applyOptions = useCallback((next: CustomizeOptions) => {
    const written = toParams(next);
    // `user` belongs to useUrlBackedState — leave it out of this write.
    delete written.user;
    writeParams(written);
  }, [writeParams]);

  const setOption = useCallback(<K extends keyof CustomizeOptions>(key: K, value: CustomizeOptions[K]) => {
    applyOptions({ ...options, [key]: value });
  }, [applyOptions, options]);

  const preset = themePreset(options.theme);
  const hasUser = !!options.user;

  const seg = (cur: string, val: string) => ({ activeBg: cur === val ? 'var(--accent)' : 'transparent', activeColor: cur === val ? '#fff' : 'var(--soft)' });

  // One query string drives the live preview, the export snippets and the
  // Active Parameters chips, so the three can never disagree.
  const query = toQuery(options);
  const badge = useBadgeSvg(query, hasUser);

  const snippetUser = options.user || PLACEHOLDER_USER;
  const snippetOptions = hasUser ? options : { ...options, user: PLACEHOLDER_USER };
  const snippet = exportSnippet(exportFmt, toQuery(snippetOptions), snippetUser);
  const chips = activeParams(snippetOptions);
  const formatLabel = EXPORT_FORMATS.find(f => f.value === exportFmt)?.label ?? 'Markdown';

  const yearOptions = syncYearOptions(currentYear);

  // The badge paints its own background, so the frame behind it simulates the
  // page the badge will be embedded in: GitHub's dark canvas, a light one, or
  // a checkerboard that shows exactly what "Hide background" leaves behind.
  const previewSurface = previewBg === 'light'
    ? '#fff'
    : previewBg === 'grid'
      ? 'repeating-conic-gradient(var(--line) 0% 25%, transparent 0% 50%) 50%/18px 18px'
      : 'var(--stage)';

  const previewHint = hasUser
    ? 'Preview reflects every change instantly · hosted badge refreshes at UTC midnight'
    : 'Add a username to enable live preview and export snippets';

  const onRadiusInput = (value: number) => {
    setRadiusDraft(value);
    if (radiusTORef.current) clearTimeout(radiusTORef.current);
    radiusTORef.current = setTimeout(() => {
      setRadiusDraft(null);
      applyOptions({ ...options, radius: value });
    }, RADIUS_COMMIT_MS);
  };

  const onShuffle = () => {
    const others = THEME_PRESETS.filter(t => t.key !== options.theme);
    setOption('theme', others[Math.floor(Math.random() * others.length)].key);
  };

  const onCopy = () => {
    try { navigator.clipboard.writeText(snippet); } catch (_) { }
    setCopied(true);
    if (copyTORef.current) clearTimeout(copyTORef.current);
    copyTORef.current = setTimeout(() => setCopied(false), 1600);
  };

  const downloadSvg = () => {
    // The exact bytes on screen — same pipeline, same file.
    if (!badge.svg) return;
    const blob = new Blob([badge.svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (options.user || 'streakforge') + '-badge.svg';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setSvgDone(true);
    if (svgTORef.current) clearTimeout(svgTORef.current);
    svgTORef.current = setTimeout(() => setSvgDone(false), 1600);
  };

  const onImportFile = (file: File | undefined) => {
    if (!file) return;
    setConfigError(null);
    file.text()
      .then(text => {
        const result = parseConfig(text, currentYear);
        if (!result.ok) { setConfigError(result.error); return; }
        setUsername(result.options.user);
        applyOptions(result.options);
      })
      .catch(() => setConfigError("That file couldn't be read."));
  };

  return (
    <div className={themeClass} ref={rootRef} style={{ position: 'relative', minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--text)', overflowX: 'hidden', transition: 'background-color .5s ease,color .5s ease' }}>

      <canvas ref={gridRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* TICKER */}
        <div style={{ width: '100%', borderBottom: '1px solid var(--line2)', background: 'var(--surface)', backdropFilter: 'blur(10px)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', height: '34px', width: 'max-content', animation: 'sf-ticker 46s linear infinite' }}>
            {[0, 1].map(i => (
              <div key={i} className="ui" aria-hidden={i === 1 ? true : undefined} style={{ display: 'flex', alignItems: 'center', gap: '34px', paddingRight: '34px', fontSize: '12.5px', letterSpacing: '.01em', color: 'var(--soft)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '9px' }}><span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent)', animation: 'sf-pulse 1.6s ease-in-out infinite' }}></span><span><span className="mono">30+</span> tunable parameters</span></span>
                <span style={{ opacity: .4 }}>/</span><span>Themes · palettes · fonts · layout · scaling</span>
                <span style={{ opacity: .4 }}>/</span><span>Every setting lives in the URL — shareable &amp; reproducible</span>
                <span style={{ opacity: .4 }}>/</span><span>Export to Markdown · HTML · React · GitHub Action</span>
              </div>
            ))}
          </div>
        </div>

        {/* NAV */}
        <header style={{ position: 'sticky', top: 0, zIndex: 40 }}>
          <div style={{ background: 'var(--surface)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line2)' }}>
            <nav style={{ maxWidth: '1240px', margin: '0 auto', padding: '14px clamp(16px,4vw,40px)', display: 'flex', alignItems: 'center', gap: '28px' }}>
              <a href="/" style={{ display: 'flex', alignItems: 'center', flex: 'none' }}>{Logo}</a>
              <div className="nav-links ui" style={{ display: 'flex', alignItems: 'center', gap: '30px', marginLeft: '14px', fontSize: '14.5px', color: 'var(--soft)' }}>
                <a className="sf-link" href="/generator" style={{ transition: 'color .2s' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')} onMouseLeave={e => (e.currentTarget.style.color = '')}>Generator</a>
                <a className="sf-link" href="/compare" style={{ transition: 'color .2s' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')} onMouseLeave={e => (e.currentTarget.style.color = '')}>Compare</a>
                <a className="sf-link" href="/burnout-analyzer" style={{ transition: 'color .2s' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')} onMouseLeave={e => (e.currentTarget.style.color = '')}>Burnout Radar</a>
                <a href="#top" style={{ color: 'var(--text)', transition: 'color .2s' }}>Customization Studio</a>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <a className="nav-repo ui" href="https://github.com/Subhooo5/StreakForge" target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 500, padding: '9px 15px', border: '1px solid var(--line)', borderRadius: '11px', background: 'var(--surface2)', transition: 'transform .18s ease,border-color .18s ease,box-shadow .18s ease' }} onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = 'translateY(-1px)'; el.style.borderColor = 'var(--accent)'; el.style.boxShadow = '0 6px 20px -10px var(--accent)'; }} onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = ''; el.style.borderColor = RESTING_BORDER; el.style.boxShadow = ''; }}>
                  <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.52.56.83 1.28.83 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" /></svg>
                  GitHub Repo
                </a>
                <button onClick={toggleTheme} aria-label="Toggle theme" style={{ width: '40px', height: '40px', display: 'grid', placeItems: 'center', border: '1px solid var(--line)', borderRadius: '11px', background: 'var(--surface2)', transition: 'transform .18s,border-color .18s' }} onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-1px)'; el.style.borderColor = 'var(--accent)'; }} onMouseLeave={e => { const el = e.currentTarget; el.style.transform = ''; el.style.borderColor = RESTING_BORDER; }}>
                  {themeIcon}
                </button>
                <button className="nav-burger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu" style={{ width: '40px', height: '40px', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)', borderRadius: '11px', background: 'var(--surface2)' }}>
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
              <a href="#top" onClick={() => setMenuOpen(false)} style={{ padding: '13px 4px', borderBottom: '1px solid var(--line2)', fontSize: '15px' }}>Customization Studio</a>
              <a href="https://github.com/Subhooo5/StreakForge" target="_blank" rel="noopener" style={{ marginTop: '12px', textAlign: 'center', padding: '12px', border: '1px solid var(--line)', borderRadius: '11px', fontSize: '14px', fontWeight: 500 }}>GitHub Repo →</a>
            </div>
          </div>
        </header>

        <main id="top" style={{ maxWidth: '1320px', margin: '0 auto', padding: 'clamp(28px,4vw,52px) clamp(16px,4vw,40px) 0' }}>

          {/* HEADER A1 */}
          <div data-reveal style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <a href="/" className="ui" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '13.5px', fontWeight: 500, color: 'var(--soft)', transition: 'color .2s' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')} onMouseLeave={e => (e.currentTarget.style.color = '')}>
              <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M10 3 5 8l5 5" /></svg>Back to Home
            </a>
            <span style={{ width: '1px', height: '16px', background: 'var(--line)' }}></span>
            <span className="ui" style={{ fontSize: '12px', letterSpacing: '.16em', color: 'var(--accent-ink)', textTransform: 'uppercase', fontWeight: 700 }}>Customization Studio</span>
          </div>
          <h1 data-reveal style={{ margin: '20px 0 0', fontWeight: 500, letterSpacing: '-.025em', lineHeight: 1.02, fontSize: 'clamp(36px,5.6vw,62px)' }}>Dial in your <span style={{ background: 'linear-gradient(100deg,var(--accent-ink),var(--accent))', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>monolith</span>.</h1>
          <p data-reveal style={{ maxWidth: '560px', margin: '18px 0 0', fontSize: 'clamp(16px,2vw,19px)', lineHeight: 1.6, color: 'var(--soft)', transitionDelay: '.06s' }}>Every control updates the preview instantly. When it looks right, grab the export snippet — paste, ship, done.</p>

          {/* 3-COLUMN GRID */}
          <div className="studio-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,360px) 1fr minmax(280px,340px)', gap: '18px', marginTop: 'clamp(28px,4vw,44px)' }}>

            {/* CONTROLS A2 */}
            <div data-reveal style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '22px', padding: 'clamp(18px,2.4vw,26px)', boxShadow: 'var(--shadow)', alignSelf: 'start' }}>
              <div className="ui" style={{ fontSize: '12px', letterSpacing: '.12em', color: 'var(--accent-ink)', textTransform: 'uppercase', fontWeight: 700 }}>Customization Studio</div>

              <div className="ui" style={{ fontSize: '11px', letterSpacing: '.08em', color: 'var(--soft)', textTransform: 'uppercase', fontWeight: 600, margin: '22px 0 10px' }}>GitHub Username</div>
              <input className="sf-input mono" value={username} onInput={e => setUsername((e.target as HTMLInputElement).value)} onChange={() => {}} placeholder="enter username…" style={{ width: '100%', padding: '14px 16px', border: '1px solid var(--line)', borderRadius: '12px', background: 'var(--surface2)', fontSize: '15px', fontWeight: 500 }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '26px 0 12px' }}>
                <span className="ui" style={{ fontSize: '11px', letterSpacing: '.08em', color: 'var(--soft)', textTransform: 'uppercase', fontWeight: 600 }}>Theme Preset</span>
                <button onClick={onShuffle} className="ui" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--soft)', transition: 'color .2s' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-ink)')} onMouseLeave={e => (e.currentTarget.style.color = '')}>
                  <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M2 4h3l6 8h3M2 12h3l2-2.6M11 4h3M12 2.5 14 4l-2 1.5M12 10.5 14 12l-2 1.5" /></svg>Shuffle
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '8px' }}>
                {THEME_PRESETS.map(p => (
                  <ThemeTile key={p.key} preset={p} selected={p.key === options.theme} onClick={() => setOption('theme', p.key)} />
                ))}
              </div>
              <div className="ui" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', padding: '13px 15px', border: '1px solid var(--line)', borderRadius: '12px', background: 'var(--surface2)' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>{preset.label}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span style={{ width: '16px', height: '16px', borderRadius: '5px', background: preset.bg, border: '1px solid var(--line)' }}></span>
                  <span style={{ width: '16px', height: '16px', borderRadius: '5px', background: preset.accent }}></span>
                  <span style={{ width: '16px', height: '16px', borderRadius: '5px', background: preset.text, border: '1px solid var(--line)' }}></span>
                  <span className="mono" style={{ fontSize: '10px', color: 'var(--faint)', marginLeft: '3px' }}>bg·accent·text</span>
                </span>
              </div>

              <div className="ui" style={{ fontSize: '11px', letterSpacing: '.08em', color: 'var(--soft)', textTransform: 'uppercase', fontWeight: 600, margin: '26px 0 10px' }}>Sync Year</div>
              <SelectField value={options.year} onChange={v => setOption('year', v)}>
                {yearOptions.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
              </SelectField>

              <div className="ui" style={{ fontSize: '11px', letterSpacing: '.08em', color: 'var(--soft)', textTransform: 'uppercase', fontWeight: 600, margin: '24px 0 10px' }}>Animation Speed</div>
              <SelectField value={options.speed} onChange={v => setOption('speed', v)}>
                {SPEEDS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </SelectField>

              <div className="ui" style={{ fontSize: '11px', letterSpacing: '.08em', color: 'var(--soft)', textTransform: 'uppercase', fontWeight: 600, margin: '24px 0 10px' }}>Font</div>
              <SelectField value={options.font} onChange={v => setOption('font', v)}>
                {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </SelectField>

              <div className="ui" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 0 10px' }}>
                <span style={{ fontSize: '11px', letterSpacing: '.08em', color: 'var(--soft)', textTransform: 'uppercase', fontWeight: 600 }}>Corner Radius</span>
                <span className="mono" style={{ fontSize: '12px', color: 'var(--accent-ink)', fontWeight: 700 }}>{options.radius}px</span>
              </div>
              <input type="range" min={0} max={50} value={options.radius} onInput={e => onRadiusInput(+(e.target as HTMLInputElement).value)} onChange={() => {}} />
              <div className="ui mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--faint)', marginTop: '6px' }}><span>0</span><span>50</span></div>

              <div className="ui" style={{ fontSize: '11px', letterSpacing: '.08em', color: 'var(--soft)', textTransform: 'uppercase', fontWeight: 600, margin: '24px 0 10px' }}>Badge Size</div>
              <SelectField value={options.size} onChange={v => setOption('size', v)}>
                {SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </SelectField>
            </div>

            {/* LIVE PREVIEW A3 */}
            <div data-reveal style={{ alignSelf: 'start', transitionDelay: '.06s' }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '22px', padding: 'clamp(18px,2.4vw,26px)', boxShadow: 'var(--shadow)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div className="ui" style={{ fontSize: '12px', letterSpacing: '.12em', color: 'var(--accent-ink)', textTransform: 'uppercase', fontWeight: 700 }}>Live Preview</div>
                  {/* The badge paints its own background, so this switches the
                      surface it is previewed against — the only place this
                      control exists. */}
                  <div className="ui" style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '4px', border: '1px solid var(--line)', borderRadius: '12px', background: 'var(--surface2)' }}>
                    <span style={{ fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--faint)', fontWeight: 700, padding: '0 8px' }}>BG Simulator</span>
                    {PREVIEW_BGS.map(b => (
                      <SegButton key={b.value} label={b.label} {...seg(previewBg, b.value)} onClick={() => setPreviewBg(b.value)} flex="none" fontSize="12.5px" padding="7px 13px" />
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '18px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--stage-line)', background: previewSurface, minHeight: '300px', display: 'grid', placeItems: 'center', padding: 'clamp(18px,3vw,34px)' }}>
                  {hasUser ? (
                    badge.src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={badge.src} alt={`StreakForge badge for ${options.user}`} style={{ width: '100%', maxWidth: '600px', height: 'auto', display: 'block', opacity: badge.loading ? 0.55 : 1, transition: 'opacity .2s ease' }} />
                    ) : (
                      <div className="ui" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--stage-soft)' }}>
                        <svg width={26} height={26} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ animation: 'sf-spin 1s linear infinite' }}><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" strokeLinecap="round" /></svg>
                        <span style={{ fontSize: '13px' }}>Rendering your badge…</span>
                      </div>
                    )
                  ) : (
                    <div style={{ textAlign: 'center', maxWidth: '300px' }}>
                      <div style={{ width: '58px', height: '58px', borderRadius: '16px', margin: '0 auto', display: 'grid', placeItems: 'center', background: 'var(--surface2)', border: '1px solid var(--line)', color: 'var(--accent-ink)' }}>
                        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M12 19V6M6 12l6-6 6 6" /></svg>
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 600, marginTop: '18px', color: 'var(--text)' }}>Ready to see it move?</div>
                      <p className="ui" style={{ margin: '10px 0 0', fontSize: '14px', color: 'var(--soft)', lineHeight: 1.5 }}>Type a GitHub handle on the left and your badge renders here in real time.</p>
                    </div>
                  )}
                </div>
                {badge.error && (
                  <div className="ui" style={{ marginTop: '12px', padding: '10px 14px', border: '1px solid color-mix(in srgb,var(--bad) 40%,var(--line))', borderRadius: '11px', background: 'color-mix(in srgb,var(--bad) 10%,transparent)', fontSize: '13px', color: 'var(--bad)' }}>{badge.error}</div>
                )}
                <div className="ui" style={{ textAlign: 'center', marginTop: '14px', fontSize: '12px', color: 'var(--faint)' }}>{previewHint}</div>
              </div>

              {/* export */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
                <div className="ui" style={{ display: 'flex', gap: '2px', padding: '5px', border: '1px solid var(--line)', borderRadius: '13px', background: 'var(--surface)', flex: 1, minWidth: '240px' }}>
                  {EXPORT_FORMATS.map(f => {
                    const active = exportFmt === f.value;
                    return (
                      <button key={f.value} onClick={() => setExportFmt(f.value)} style={{ flex: 1, padding: '10px 6px', borderRadius: '9px', fontSize: '12.5px', fontWeight: 600, background: active ? 'color-mix(in srgb,var(--accent) 16%,transparent)' : 'transparent', color: active ? 'var(--accent-ink)' : 'var(--soft)', transition: 'background .16s', whiteSpace: 'nowrap', fontFamily: "'Space Grotesk',system-ui,sans-serif" }}>{f.label}</button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
                <button onClick={downloadSvg} disabled={!badge.svg} className="ui" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 18px', border: '1px solid var(--line)', borderRadius: '12px', background: 'var(--surface2)', fontSize: '13.5px', fontWeight: 600, opacity: badge.svg ? 1 : .5, cursor: badge.svg ? 'pointer' : 'not-allowed', transition: 'transform .16s,border-color .16s' }} onMouseEnter={e => { const el = e.currentTarget; if (!el.disabled) { el.style.transform = 'translateY(-1px)'; el.style.borderColor = 'var(--accent)'; } }} onMouseLeave={e => { const el = e.currentTarget; el.style.transform = ''; el.style.borderColor = RESTING_BORDER; }}>
                  <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M8 2v8M5 7l3 3 3-3M3 13h10" /></svg>
                  {svgDone ? 'Saved ✓' : 'Download SVG'}
                </button>
                <button onClick={() => downloadConfig(options)} className="ui" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 18px', border: '1px solid var(--line)', borderRadius: '12px', background: 'var(--surface2)', fontSize: '13.5px', fontWeight: 600, transition: 'transform .16s,border-color .16s' }} onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-1px)'; el.style.borderColor = 'var(--accent)'; }} onMouseLeave={e => { const el = e.currentTarget; el.style.transform = ''; el.style.borderColor = RESTING_BORDER; }}>
                  <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M3 2h7l3 3v9H3V2ZM9.5 2v3.5H13" /><path d="M8 8v4M6.4 10.4 8 12l1.6-1.6" /></svg>
                  Export Config
                </button>
                <button onClick={() => fileRef.current?.click()} className="ui" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 18px', border: '1px solid var(--line)', borderRadius: '12px', background: 'var(--surface2)', fontSize: '13.5px', fontWeight: 600, transition: 'transform .16s,border-color .16s' }} onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-1px)'; el.style.borderColor = 'var(--accent)'; }} onMouseLeave={e => { const el = e.currentTarget; el.style.transform = ''; el.style.borderColor = RESTING_BORDER; }}>
                  <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M3 2h7l3 3v9H3V2ZM9.5 2v3.5H13" /><path d="M8 12V8M6.4 9.6 8 8l1.6 1.6" /></svg>
                  Import Config
                </button>
                <input ref={fileRef} type="file" accept="application/json,.json" onChange={e => { onImportFile(e.target.files?.[0]); e.target.value = ''; }} style={{ display: 'none' }} />
                <button onClick={onCopy} className="ui" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 18px', borderRadius: '12px', background: 'var(--accent)', color: '#fff', fontSize: '13.5px', fontWeight: 600, boxShadow: '0 8px 20px -10px var(--accent)', transition: 'transform .16s' }} onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')} onMouseLeave={e => (e.currentTarget.style.transform = '')}>
                  <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth={1.5}><rect x={5} y={5} width={8} height={8} rx={1.6} /><path d="M3 11V4a1 1 0 0 1 1-1h7" /></svg>
                  {copied ? 'Copied!' : `Copy ${formatLabel}`}
                </button>
              </div>
              {configError && (
                <div className="ui" style={{ marginTop: '10px', padding: '10px 14px', border: '1px solid color-mix(in srgb,var(--bad) 40%,var(--line))', borderRadius: '11px', background: 'color-mix(in srgb,var(--bad) 10%,transparent)', fontSize: '13px', color: 'var(--bad)' }}>{configError}</div>
              )}

              {/* Raw shows the snippet itself; Preview renders what that
                  snippet produces once GitHub has embedded it. */}
              {exportFmt === 'markdown' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
                  <div className="ui" style={{ display: 'flex', gap: '2px', padding: '4px', border: '1px solid var(--line)', borderRadius: '11px', background: 'var(--surface)' }}>
                    <SegButton label="Raw" {...seg(rawView ? 'raw' : 'rendered', 'raw')} onClick={() => setRawView(true)} flex="none" fontSize="12px" padding="6px 14px" />
                    <SegButton label="Preview" {...seg(rawView ? 'raw' : 'rendered', 'rendered')} onClick={() => setRawView(false)} flex="none" fontSize="12px" padding="6px 14px" />
                  </div>
                </div>
              )}

              <div style={{ position: 'relative', marginTop: '14px', border: '1px solid var(--line)', borderRadius: '14px', background: 'var(--surface)', padding: '18px 18px' }}>
                {exportFmt === 'markdown' && !rawView ? (
                  hasUser && badge.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={badge.src} alt={`StreakForge badge for ${options.user}`} style={{ width: '100%', maxWidth: '520px', height: 'auto', display: 'block', margin: '0 auto' }} />
                  ) : (
                    <p className="ui" style={{ margin: 0, textAlign: 'center', fontSize: '13px', color: 'var(--faint)' }}>Add a GitHub username to preview the rendered badge.</p>
                  )
                ) : (
                  <>
                    <button onClick={onCopy} className="ui" style={{ position: 'absolute', top: '12px', right: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', border: '1px solid var(--line)', borderRadius: '9px', background: 'var(--surface2)', fontSize: '11.5px', fontWeight: 600, color: 'var(--accent-ink)', transition: 'border-color .16s' }} onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')} onMouseLeave={e => (e.currentTarget.style.borderColor = RESTING_BORDER)}>
                      <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x={5} y={5} width={8} height={8} rx={1.6} /><path d="M3 11V4a1 1 0 0 1 1-1h7" /></svg>
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    {/* Clears the absolutely-positioned Copy button (its width at the
                        longest label, "Copied!", plus a gutter) so a long single-line
                        snippet wraps beside the button instead of running under it. */}
                    <pre className="mono" style={{ margin: 0, paddingRight: '104px', fontSize: '12.5px', lineHeight: 1.7, color: 'var(--accent-ink)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{snippet}</pre>
                  </>
                )}
              </div>
              <p className="ui" style={{ margin: '14px 2px 0', fontSize: '14px', color: 'var(--soft)', lineHeight: 1.55 }}>Paste this into your GitHub profile&apos;s <span className="mono">README.md</span>. The badge renders server-side, no script required.</p>

              <div style={{ marginTop: '16px', border: '1px solid var(--line)', borderRadius: '16px', background: 'var(--surface)', padding: '20px' }}>
                <div className="ui" style={{ fontSize: '12px', letterSpacing: '.12em', color: 'var(--soft)', textTransform: 'uppercase', fontWeight: 700 }}>Active Parameters</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '9px', marginTop: '14px' }}>
                  {chips.map(p => (
                    <span key={p.k} className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '7px 12px', borderRadius: '9px', border: '1px solid var(--line)', background: 'var(--surface2)', fontSize: '12.5px' }}>
                      <span style={{ color: 'var(--accent-ink)' }}>{p.k}</span>
                      <span style={{ color: 'var(--faint)' }}>=</span>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{p.v}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ADVANCED A4 */}
            <div data-reveal style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '22px', padding: 'clamp(18px,2.4vw,26px)', boxShadow: 'var(--shadow)', alignSelf: 'start', transitionDelay: '.12s' }}>
              <div className="ui" style={{ fontSize: '12px', letterSpacing: '.12em', color: 'var(--accent-ink)', textTransform: 'uppercase', fontWeight: 700 }}>Advanced Settings</div>

              <div className="ui" style={{ fontSize: '11px', letterSpacing: '.08em', color: 'var(--soft)', textTransform: 'uppercase', fontWeight: 600, margin: '22px 0 12px' }}>Visibility Options</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <ToggleRow label="Hide title" checked={options.hideTitle} onClick={() => setOption('hideTitle', !options.hideTitle)} />
                <ToggleRow label="Hide background" checked={options.hideBackground} onClick={() => setOption('hideBackground', !options.hideBackground)} />
                <ToggleRow label="Hide stats" checked={options.hideStats} onClick={() => setOption('hideStats', !options.hideStats)} />
              </div>

              <div className="ui" style={{ fontSize: '11px', letterSpacing: '.08em', color: 'var(--soft)', textTransform: 'uppercase', fontWeight: 600, margin: '24px 0 10px' }}>View Layout</div>
              <SelectField value={options.view} onChange={v => setOption('view', v)}>
                {VIEW_MODES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </SelectField>

              <div className="ui" style={{ fontSize: '11px', letterSpacing: '.08em', color: 'var(--soft)', textTransform: 'uppercase', fontWeight: 600, margin: '24px 0 10px' }}>Language</div>
              <SelectField value={options.lang} onChange={v => setOption('lang', v)}>
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </SelectField>

              <div className="ui" style={{ fontSize: '11px', letterSpacing: '.08em', color: 'var(--soft)', textTransform: 'uppercase', fontWeight: 600, margin: '24px 0 10px' }}>Timezone</div>
              <SelectField value={options.tz} onChange={v => setOption('tz', v)}>
                {TIMEZONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </SelectField>
            </div>


          </div>

          {/* FOOTER A5 */}
          <footer className="ui" style={{ margin: '0 auto', padding: 'clamp(40px,6vw,80px) 0 40px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: '30px' }}>
              <div style={{ minWidth: '180px' }}>
                <a href="/" style={{ display: 'inline-flex', alignItems: 'center' }}>{FooterLogo}</a>
                <p style={{ margin: '16px 0 0', color: 'var(--soft)', fontSize: '13.5px', lineHeight: 1.6, maxWidth: '240px' }}>GitHub contribution data, forged into premium 3D isometric monoliths. Real-time. Embeddable. Yours.</p>
              </div>
              <div>
                <div style={{ fontSize: '12px', letterSpacing: '.08em', color: 'var(--faint)', textTransform: 'uppercase', fontWeight: 600 }}>Product</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', marginTop: '16px', fontSize: '14px', color: 'var(--soft)' }}>
                  {[['Generator', '/generator'], ['Compare', '/compare'], ['Burnout Radar', '/burnout-analyzer'], ['Customization Studio', '#top']].map(([label, href]) => (
                    <a key={label} className="sf-link" href={href} style={{ transition: 'color .2s' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')} onMouseLeave={e => (e.currentTarget.style.color = '')}>{label}</a>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', letterSpacing: '.08em', color: 'var(--faint)', textTransform: 'uppercase', fontWeight: 600 }}>Resources</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', marginTop: '16px', fontSize: '14px', color: 'var(--soft)' }}>
                  <a className="sf-link" href="#" style={{ transition: 'color .2s' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')} onMouseLeave={e => (e.currentTarget.style.color = '')}>Documentation</a>
                  <a className="sf-link" href="https://github.com/Subhooo5/StreakForge" target="_blank" rel="noopener" style={{ transition: 'color .2s' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')} onMouseLeave={e => (e.currentTarget.style.color = '')}>Repository</a>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', letterSpacing: '.08em', color: 'var(--faint)', textTransform: 'uppercase', fontWeight: 600 }}>Connect</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', marginTop: '16px', fontSize: '14px', color: 'var(--soft)' }}>
                  {[['GitHub', 'https://github.com/Subhooo5', true], ['Discord', 'https://discordapp.com/users/488670412096667648', true], ['Twitter', 'https://x.com/SiMpL36969', true], ['LinkedIn', 'https://www.linkedin.com/in/subho1817/', true]].map(([label, href, external]) => (
                    <a key={label as string} className="sf-link" href={href as string} {...(external ? { target: '_blank', rel: 'noopener' } : {})} style={{ transition: 'color .2s' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')} onMouseLeave={e => (e.currentTarget.style.color = '')}>{label as string}</a>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginTop: '48px', paddingTop: '24px', borderTop: '1px solid var(--line)' }}>
              <span style={{ fontSize: '13px', color: 'var(--faint)' }} className="mono">© {new Date().getFullYear()} StreakForge · Made with ❤️‍🔥 for Devs</span>
              <div style={{ display: 'flex', gap: '14px', color: 'var(--soft)' }}>
                <a href="https://github.com/Subhooo5" target="_blank" rel="noopener" aria-label="GitHub" style={{ transition: 'color .2s' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-ink)')} onMouseLeave={e => (e.currentTarget.style.color = '')}><svg width={19} height={19} viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.52.56.83 1.28.83 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" /></svg></a>
                <a href="https://x.com/SiMpL36969" target="_blank" rel="noopener" aria-label="X" style={{ transition: 'color .2s' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-ink)')} onMouseLeave={e => (e.currentTarget.style.color = '')}><svg width={18} height={18} viewBox="0 0 16 16" fill="currentColor"><path d="M12.6 1h2.1L10 6.4 15.5 15h-4.3L7.9 9.9 3.9 15H1.8l4.9-5.8L1.5 1h4.4l3 4.6L12.6 1Zm-.7 12.6h1.1L4.6 2.3H3.4l8.5 11.3Z" /></svg></a>
                <a href="https://www.linkedin.com/in/subho1817/" target="_blank" rel="noopener" aria-label="LinkedIn" style={{ transition: 'color .2s' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-ink)')} onMouseLeave={e => (e.currentTarget.style.color = '')}><svg width={18} height={18} viewBox="0 0 16 16" fill="currentColor"><path d="M3.4 1.5a1.4 1.4 0 1 1-.01 2.81A1.4 1.4 0 0 1 3.4 1.5ZM1.9 5.5h3V14h-3V5.5Zm5 0h2.9v1.16h.04c.4-.74 1.39-1.52 2.86-1.52 3.06 0 3.62 2 3.62 4.62V14h-3v-3.7c0-.88-.02-2.02-1.23-2.02-1.23 0-1.42.96-1.42 1.95V14h-3V5.5Z" /></svg></a>
              </div>
            </div>
          </footer>

        </main>
      </div>
    </div>
  );
}
