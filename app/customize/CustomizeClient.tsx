"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useUrlBackedState, useUrlParams } from "@/hooks/useUrlParams";
import SegButton from "./components/SegButton";
import ToggleRow from "./components/ToggleRow";
import SelectField from "./components/SelectField";
import ColorField from "./components/ColorField";
import ThemeTile from "./components/ThemeTile";
import { THEME_PRESETS, themePreset } from "./data/themes";
import { useBadgeSvg } from "./hooks/useBadgeSvg";
import { BG_TYPES, EXPORT_FORMATS, FONTS, LANGUAGES, PREVIEW_BGS, SIZES, SPEEDS, TIMEZONES, VIEW_MODES, syncYearOptions } from "./types";
import type { CustomizeOptions, ExportFormat, PreviewBg } from "./types";
import { PARAM_KEYS, activeParams, cleanHex, fromParams, isValidHex, toParams, toQuery } from "./utils/params";
import { PLACEHOLDER_USER, exportSnippet } from "./utils/snippets";
import { downloadConfig, parseConfig } from "./utils/config";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const GRID_REACTIVITY = 1.2;

const OPTION_KEYS: string[] = PARAM_KEYS.filter((key) => key !== 'user');

// Never reset to '' — falls back to currentColor
const RESTING_BORDER = 'var(--line)';

const RADIUS_COMMIT_MS = 400;

export default function CustomizeClient() {
  const [theme, toggleTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [username, setUsername] = useUrlBackedState('user');
  const [params, writeParams] = useUrlParams(OPTION_KEYS);
  const [radiusDraft, setRadiusDraft] = useState<number | null>(null);
  const [colorText, setColorText] = useState({ bg: '', accent: '', text: '' });
  const [colorPending, setColorPending] = useState(false);
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
  const colorTORef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      if (colorTORef.current) clearTimeout(colorTORef.current);
    };
  }, [initReveal]);

  useEffect(() => {
    readGridColorsRef.current?.();
  }, [theme]);

  const themeClass = theme === 'dark' ? 'sf customize dark' : 'sf customize';

  const currentYear = new Date().getFullYear();
  const sanitizeColor = (raw: string) => (isValidHex(raw) ? cleanHex(raw).toLowerCase() : '');

  const colorOverrides = useMemo(
    () => ({ bg: sanitizeColor(colorText.bg), accent: sanitizeColor(colorText.accent), text: sanitizeColor(colorText.text) }),
    [colorText],
  );

  const urlColors = useMemo(() => {
    const fromUrl = fromParams({ ...params, user: username }, currentYear);
    return { bg: fromUrl.bg, accent: fromUrl.accent, text: fromUrl.text };
  }, [params, username, currentYear]);

  useEffect(() => {
    if (colorPending) return;
    setColorText((current) => {
      const next = { ...current };
      let changed = false;
      for (const key of ['bg', 'accent', 'text'] as const) {
        if (sanitizeColor(current[key]) !== urlColors[key]) {
          next[key] = urlColors[key];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [urlColors, colorPending]);

  const options = useMemo(() => {
    const fromUrl = fromParams({ ...params, user: username }, currentYear);
    const withRadius = radiusDraft === null ? fromUrl : { ...fromUrl, radius: radiusDraft };
    return { ...withRadius, ...colorOverrides };
  }, [params, username, currentYear, radiusDraft, colorOverrides]);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const applyOptions = useCallback((next: CustomizeOptions) => {
    const written = toParams(next);
    delete written.user;
    writeParams(written);
  }, [writeParams]);

  const setOption = useCallback(<K extends keyof CustomizeOptions>(key: K, value: CustomizeOptions[K]) => {
    applyOptions({ ...options, [key]: value });
  }, [applyOptions, options]);

  const preset = themePreset(options.theme);
  const effectiveColor = (override: string, fallback: string) => (isValidHex(override) ? `#${cleanHex(override)}` : fallback);
  const backgroundSwatch = effectiveColor(options.bg, preset.bg);
  const accentSwatch = effectiveColor(options.accent, preset.accent);
  const textSwatch = effectiveColor(options.text, preset.text);
  const hasCustomColors = Boolean(colorText.bg || colorText.accent || colorText.text);
  const hasUser = !!options.user;

  const seg = (cur: string, val: string) => ({ activeBg: cur === val ? 'var(--accent)' : 'transparent', activeColor: cur === val ? '#fff' : 'var(--soft)' });

  const query = toQuery(options);
  const badge = useBadgeSvg(query, hasUser);

  const snippetUser = options.user || PLACEHOLDER_USER;
  const snippetOptions = hasUser ? options : { ...options, user: PLACEHOLDER_USER };
  const snippet = exportSnippet(exportFmt, toQuery(snippetOptions), snippetUser);
  const chips = activeParams(snippetOptions);
  const formatLabel = EXPORT_FORMATS.find(f => f.value === exportFmt)?.label ?? 'Markdown';

  const yearOptions = syncYearOptions(currentYear);

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

  const onColorInput = (key: 'bg' | 'accent' | 'text', value: string) => {
    const typed = cleanHex(value);
    setColorText((current) => ({ ...current, [key]: typed }));
    setColorPending(true);
    if (colorTORef.current) clearTimeout(colorTORef.current);
    colorTORef.current = setTimeout(() => {
      applyOptions({ ...optionsRef.current, [key]: sanitizeColor(typed) });
      setColorPending(false);
    }, RADIUS_COMMIT_MS);
  };

  const clearCustomColors = () => {
    if (colorTORef.current) clearTimeout(colorTORef.current);
    setColorPending(false);
    setColorText({ bg: '', accent: '', text: '' });
    applyOptions({ ...optionsRef.current, bg: '', accent: '', text: '' });
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

        {}
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

        {}
        <Navbar theme={theme} toggleTheme={toggleTheme} active="customize" />

        <main id="top" style={{ maxWidth: '1320px', margin: '0 auto', padding: 'clamp(28px,4vw,52px) clamp(16px,4vw,40px) 0' }}>

          {}
          <div data-reveal style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <a href="/" className="ui" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '13.5px', fontWeight: 500, color: 'var(--soft)', transition: 'color .2s' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')} onMouseLeave={e => (e.currentTarget.style.color = '')}>
              <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M10 3 5 8l5 5" /></svg>Back to Home
            </a>
            <span style={{ width: '1px', height: '16px', background: 'var(--line)' }}></span>
            <span className="ui" style={{ fontSize: '12px', letterSpacing: '.16em', color: 'var(--accent-ink)', textTransform: 'uppercase', fontWeight: 700 }}>Customization Studio</span>
          </div>
          <h1 data-reveal style={{ margin: '20px 0 0', fontWeight: 500, letterSpacing: '-.025em', lineHeight: 1.02, fontSize: 'clamp(36px,5.6vw,62px)' }}>Dial in your <span style={{ background: 'linear-gradient(100deg,var(--accent-ink),var(--accent))', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>monolith</span>.</h1>
          <p data-reveal style={{ maxWidth: '560px', margin: '18px 0 0', fontSize: 'clamp(16px,2vw,19px)', lineHeight: 1.6, color: 'var(--soft)', transitionDelay: '.06s' }}>Every control updates the preview instantly. When it looks right, grab the export snippet — paste, ship, done.</p>

          {}
          <div className="studio-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,360px) 1fr minmax(280px,340px)', gap: '18px', marginTop: 'clamp(28px,4vw,44px)' }}>

            {}
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

              <div style={{ height: '1px', background: 'var(--line2)', margin: '24px 0' }}></div>
              <div className="ui" style={{ fontSize: '11px', letterSpacing: '.08em', color: 'var(--soft)', textTransform: 'uppercase', fontWeight: 600 }}>Custom Color Overrides</div>
              <p className="ui" style={{ margin: '8px 0 14px', fontSize: '12px', color: 'var(--faint)', lineHeight: 1.5 }}>These override the theme preset above. Enter HEX values without #.</p>
              <div className="ui" style={{ display: 'flex', gap: '6px', padding: '4px', border: '1px solid var(--line)', borderRadius: '12px', background: 'var(--surface2)' }}>
                {BG_TYPES.map(m => (
                  <SegButton key={m.value} label={m.label} {...seg(options.bgType, m.value)} onClick={() => setOption('bgType', m.value)} fontSize="13px" padding="9px" />
                ))}
              </div>

              <ColorField label="Custom Background" value={colorText.bg} effective={backgroundSwatch} placeholder="e.g. 0a0a0a" onChange={v => onColorInput('bg', v)} marginTop="18px" />
              <ColorField label="Custom Accent" value={colorText.accent} effective={accentSwatch} placeholder="e.g. 00ffaa" onChange={v => onColorInput('accent', v)} />
              <ColorField label="Custom Text" value={colorText.text} effective={textSwatch} placeholder="e.g. ffffff" onChange={v => onColorInput('text', v)} />

              {hasCustomColors && (
                <button onClick={clearCustomColors} className="ui" style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', fontWeight: 600, color: 'var(--bad)', cursor: 'pointer', background: 'none', transition: 'opacity .16s' }} onMouseEnter={e => (e.currentTarget.style.opacity = '0.72')} onMouseLeave={e => (e.currentTarget.style.opacity = '')}>
                  <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                  Clear Custom Colours
                </button>
              )}

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

            {}
            <div data-reveal style={{ alignSelf: 'start', transitionDelay: '.06s' }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '22px', padding: 'clamp(18px,2.4vw,26px)', boxShadow: 'var(--shadow)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div className="ui" style={{ fontSize: '12px', letterSpacing: '.12em', color: 'var(--accent-ink)', textTransform: 'uppercase', fontWeight: 700 }}>Live Preview</div>
                  {}
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

              {}
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

              {}
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
                    {}
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

            {}
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

          {}
          <Footer active="customize" docsHref="/docs#customization-studio" />

        </main>
      </div>
    </div>
  );
}
