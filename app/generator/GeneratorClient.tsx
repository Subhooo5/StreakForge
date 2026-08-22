'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useUrlMirror } from '@/hooks/useUrlParams';
import { fallbackCopyToClipboard } from '@/utils/clipboard';
import CollapsibleSection from './components/CollapsibleSection';
import SelectableRow from './components/SelectableRow';
import ProfilePresets from './components/ProfilePresets';
import BadgeSection from './components/BadgeSection';
import ContributionGraphSection from './components/ContributionGraphSection';
import RepoSpotlightSection from './components/RepoSpotlightSection';
import ReadmeHealthBreakdown from './components/ReadmeHealthBreakdown';
import ReadmePreview from './components/ReadmePreview';
import { FieldLabel, Hover, Segmented } from './components/ui';
import { TECHS, TECHCATS, PLATS, PLATCATS, TECH_ICONS, SOCIAL_ICONS } from './data/generatorData';
import { useGithubProfile, useUserRepos } from './hooks/useGithubProfile';
import { EMPTY_STATE, type GeneratorState, type TechIconDisplay } from './types';
import { generateReadme, socialPlaceholder } from './utils/readme';
import { computeCompletion, generateTips, getGrade } from './utils/score';
import type { ProfilePreset } from './data/presets';

type OpenState = { name: boolean; desc: boolean; tech: boolean; social: boolean; badge: boolean; viz: boolean; spotlight: boolean };

const SECTION_OPEN_KEY: Record<string, keyof OpenState> = {
  'name-section': 'name',
  'description-section': 'desc',
  'technologies-section': 'tech',
  'socials-section': 'social',
  'badge-section': 'badge',
  'graphs-section': 'viz',
  'spotlight-section': 'spotlight',
};

function monoAbbr(name: string): string {
  const parts = name.replace(/[().]/g, ' ').trim().split(/\s+/);
  let m = parts[0][0];
  if (parts[1] && /[A-Za-z]/.test(parts[1][0])) m += parts[1][0];
  return m.toUpperCase();
}

function monoURI(name: string, bg: string, fg: string): string {
  const m = monoAbbr(name);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28'><rect width='28' height='28' rx='6' fill='${bg}'/><text x='14' y='19' font-family='Space Grotesk,Arial,sans-serif' font-size='12' font-weight='700' fill='${fg}' text-anchor='middle'>${m}</text></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function iconEl(name: string, url: string | undefined, bg: string, fg: string, size = 28) {
  const fb = monoURI(name, bg, fg);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url || fb} width={size} height={size} loading="lazy" decoding="async" alt={name} data-fb={fb} onError={(e) => { const t = e.currentTarget; if (t.getAttribute('data-failed')) return; t.setAttribute('data-failed', '1'); t.src = t.getAttribute('data-fb') || fb; }} style={{ width: size + 'px', height: size + 'px', objectFit: 'contain', display: 'block' }} />;
}

function Logo() {
  return (
    <svg viewBox="0 0 545 150" xmlns="http://www.w3.org/2000/svg" style={{ height: '41px', width: '150px', display: 'block' }}>
      <defs><radialGradient id="sparkNG" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#FFE8B8" /><stop offset="45%" stopColor="#FFB627" /><stop offset="100%" stopColor="#FF7A1A" stopOpacity={0} /></radialGradient></defs>
      <polygon points="25.16,60.45 42.32,69.03 25.16,77.61 8.0,69.03" fill="#E0AAFF" />
      <polygon points="42.32,69.03 25.16,77.61 25.16,96.33 42.32,87.75" fill="#B14AED" />
      <polygon points="8.0,69.03 25.16,77.61 25.16,96.33 8.0,87.75" fill="#6A0DAD" />
      <polygon points="53.24,51.09 70.4,59.67 53.24,68.25 36.08,59.67" fill="#E0AAFF" />
      <polygon points="70.4,59.67 53.24,68.25 53.24,107.25 70.4,98.67" fill="#B14AED" />
      <polygon points="36.08,59.67 53.24,68.25 53.24,107.25 36.08,98.67" fill="#6A0DAD" />
      <polygon points="81.32,41.73 98.48,50.31 81.32,58.89 64.16,50.31" fill="#E0AAFF" />
      <polygon points="98.48,50.31 81.32,58.89 81.32,121.29 98.48,112.71" fill="#B14AED" />
      <polygon points="64.16,50.31 81.32,58.89 81.32,121.29 64.16,112.71" fill="#6A0DAD" />
      <circle cx="81.32" cy="41.73" r="13.26" fill="url(#sparkNG)" />
      <circle cx="81.32" cy="41.73" r="3.51" fill="#FFE8B8" />
      <text x="114" y="91" fontFamily="'Space Grotesk','Styrene B',sans-serif" fontSize={62} fontWeight={700} letterSpacing={-1} fill="var(--text)">streakforge</text>
    </svg>
  );
}

function FooterLogo() {
  return (
    <svg viewBox="0 0 545 150" xmlns="http://www.w3.org/2000/svg" style={{ height: '52px', width: '156px', display: 'block' }}>
      <defs><radialGradient id="sparkNF" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#FFE8B8" /><stop offset="45%" stopColor="#FFB627" /><stop offset="100%" stopColor="#FF7A1A" stopOpacity={0} /></radialGradient></defs>
      <polygon points="25.16,60.45 42.32,69.03 25.16,77.61 8.0,69.03" fill="#E0AAFF" />
      <polygon points="42.32,69.03 25.16,77.61 25.16,96.33 42.32,87.75" fill="#B14AED" />
      <polygon points="8.0,69.03 25.16,77.61 25.16,96.33 8.0,87.75" fill="#6A0DAD" />
      <polygon points="53.24,51.09 70.4,59.67 53.24,68.25 36.08,59.67" fill="#E0AAFF" />
      <polygon points="70.4,59.67 53.24,68.25 53.24,107.25 70.4,98.67" fill="#B14AED" />
      <polygon points="36.08,59.67 53.24,68.25 53.24,107.25 36.08,98.67" fill="#6A0DAD" />
      <polygon points="81.32,41.73 98.48,50.31 81.32,58.89 64.16,50.31" fill="#E0AAFF" />
      <polygon points="98.48,50.31 81.32,58.89 81.32,121.29 98.48,112.71" fill="#B14AED" />
      <polygon points="64.16,50.31 81.32,58.89 81.32,121.29 64.16,112.71" fill="#6A0DAD" />
      <circle cx="81.32" cy="41.73" r="13.26" fill="url(#sparkNF)" />
      <circle cx="81.32" cy="41.73" r="3.51" fill="#FFE8B8" />
      <text x="114" y="91" fontFamily="'Space Grotesk','Styrene B',sans-serif" fontSize={62} fontWeight={700} letterSpacing={-1} fill="var(--text)">streakforge</text>
    </svg>
  );
}

function chip(active: boolean) {
  return {
    border: active ? 'transparent' : 'var(--line)',
    bg: active ? 'var(--accent)' : 'var(--surface2)',
    color: active ? '#fff' : 'var(--soft)',
  };
}

const WARN_I = <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="var(--warn)" strokeWidth={1.6}><circle cx={8} cy={8} r={6.4} /><path d="M8 5v3.4M8 11h.01" strokeLinecap="round" /></svg>;
const OK_I = <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="var(--good)" strokeWidth={1.7}><circle cx={8} cy={8} r={6.4} /><path d="M5.3 8 7 9.7 10.8 6" /></svg>;

export default function GeneratorClient() {
  const [theme, toggleTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const [state, setState] = useState<GeneratorState>(EMPTY_STATE);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const [techSearch, setTechSearch] = useState('');
  const [techCat, setTechCat] = useState('All');
  const [platSearch, setPlatSearch] = useState('');
  const [platCat, setPlatCat] = useState('All');
  const [socialTab, setSocialTab] = useState<'pick' | 'links'>('pick');
  const [open, setOpen] = useState<OpenState>({ name: true, desc: true, tech: true, social: true, badge: true, viz: false, spotlight: false });
  const [previewTab, setPreviewTab] = useState<'preview' | 'markdown'>('preview');
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [imported, setImported] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const readGridColorsRef = useRef<(() => void) | null>(null);
  const cpRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dlRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const impRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patch = useCallback((next: Partial<GeneratorState>) => {
    setState((s) => ({ ...s, ...next }));
    setActivePreset(null);
  }, []);

  function applyPreset(preset: ProfilePreset) {
    setState((s) => ({ ...s, ...preset.state }));
    setActivePreset(preset.id);
    setOpen((o) => ({ ...o, name: true, desc: true, tech: true, badge: true }));
  }

  useUrlMirror(
    'user',
    state.githubUsername,
    useCallback((v: string) => setState((s) => (s.githubUsername === v ? s : { ...s, githubUsername: v })), []),
  );

  const profile = useGithubProfile(state.githubUsername);
  const repos = useUserRepos(state.githubUsername, state.showRepoSpotlight);

  useEffect(() => {
    if (repos.status !== 'ready' || repos.repos.length === 0) return;
    setState((s) => {
      if (s.spotlightRepo && repos.repos.some((r) => r.name === s.spotlightRepo)) return s;
      return { ...s, spotlightRepo: repos.repos[0].name };
    });
  }, [repos.status, repos.repos]);

  function toggleSection(k: keyof OpenState) { setOpen(o => ({ ...o, [k]: !o[k] })); }

  const jumpToSection = useCallback((sectionId: string) => {
    const key = SECTION_OPEN_KEY[sectionId];
    if (key) setOpen(o => ({ ...o, [key]: true }));
    requestAnimationFrame(() => {
      const el = document.getElementById(sectionId);
      if (!el) return;
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  }, []);

  function toggleTech(n: string) {
    patch({ techs: state.techs.includes(n) ? state.techs.filter(x => x !== n) : [...state.techs, n] });
  }
  function togglePlat(n: string) {
    if (state.socials.includes(n)) {
      const links = { ...state.socialLinks };
      delete links[n];
      patch({ socials: state.socials.filter(x => x !== n), socialLinks: links });
    } else {
      patch({ socials: [...state.socials, n] });
    }
  }

  const ftechs = useMemo(() => {
    const q = techSearch.toLowerCase();
    return TECHS.filter(t => (techCat === 'All' || t.cat === techCat) && t.name.toLowerCase().includes(q));
  }, [techSearch, techCat]);

  const fplats = useMemo(() => {
    const q = platSearch.toLowerCase();
    return PLATS.filter(p => (platCat === 'All' || p.cat === platCat) && p.name.toLowerCase().includes(q));
  }, [platSearch, platCat]);

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
          if (dist < R) { const f = 1 - dist / R; px = gx + dx * f * 0.3; py = gy + dy * f * 0.3; size = 1.05 + f * f * 2.4; hot = f; }
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

    let io: IntersectionObserver | undefined;
    let revealTO: ReturnType<typeof setTimeout> | undefined;
    const root = rootRef.current;
    if (root) {
      const els = [...root.querySelectorAll<HTMLElement>('[data-reveal]')];
      if (reduce) {
        els.forEach(e => e.classList.add('in'));
      } else {
        const reveal = (e: HTMLElement) => e.classList.add('in');
        const inView = (e: HTMLElement) => {
          const r = e.getBoundingClientRect();
          return r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight) * 0.96;
        };
        requestAnimationFrame(() => els.forEach(e => { if (inView(e)) reveal(e); }));
        io = new IntersectionObserver(ents => {
          ents.forEach(en => { if (en.isIntersecting) { reveal(en.target as HTMLElement); io!.unobserve(en.target); } });
        }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
        els.forEach(e => { if (!e.classList.contains('in')) io!.observe(e); });
        revealTO = setTimeout(() => els.forEach(reveal), 1200);
      }
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
      window.removeEventListener('click', onClick);
      window.removeEventListener('touchmove', onTouch);
      io?.disconnect();
      if (revealTO) clearTimeout(revealTO);
      if (cpRef.current) clearTimeout(cpRef.current);
      if (dlRef.current) clearTimeout(dlRef.current);
      if (impRef.current) clearTimeout(impRef.current);
    };
  }, []);

  useEffect(() => { readGridColorsRef.current?.(); }, [theme]);

  const md = generateReadme(state);
  const C = computeCompletion(state);
  const grade = getGrade(C.score);
  const insights = generateTips(state);

  const themeClass = theme === 'dark' ? 'sf gen dark' : 'sf gen';

  async function copyMarkdown() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(md);
      ok = true;
    } catch {
      ok = fallbackCopyToClipboard(md);
    }
    if (!ok) return;
    setCopied(true);
    if (cpRef.current) clearTimeout(cpRef.current);
    cpRef.current = setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className={themeClass} ref={rootRef} style={{ position: 'relative', minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--text)', overflowX: 'hidden', transition: 'background-color .5s ease,color .5s ease' }}>
      <canvas ref={gridRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 2 }}>

        {}
        <div style={{ width: '100%', borderBottom: '1px solid var(--line2)', background: 'var(--surface)', backdropFilter: 'blur(10px)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', height: '34px', width: 'max-content', animation: 'sf-ticker 44s linear infinite' }}>
            {[0, 1].map(dup => (
              <div key={dup} className="ui" aria-hidden={dup === 1 ? 'true' : undefined} style={{ display: 'flex', alignItems: 'center', gap: '34px', paddingRight: '34px', fontSize: '12.5px', letterSpacing: '.01em', color: 'var(--soft)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '9px' }}><span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent)', animation: 'sf-pulse 1.6s ease-in-out infinite' }}></span><span>Craft a profile README in minutes — no account needed</span></span>
                <span style={{ opacity: 0.4 }}>/</span>
                <span>Pick from <span className="mono">200+</span> technologies</span>
                <span style={{ opacity: 0.4 }}>/</span>
                <span>Embed your live 3D streak monolith</span>
                <span style={{ opacity: 0.4 }}>/</span>
                <span>Copy, paste, ship</span>
              </div>
            ))}
          </div>
        </div>

        {}
        <header style={{ position: 'sticky', top: 0, zIndex: 40 }}>
          <div style={{ background: 'var(--surface)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line2)' }}>
            <nav style={{ maxWidth: '1240px', margin: '0 auto', padding: '14px clamp(16px,4vw,40px)', display: 'flex', alignItems: 'center', gap: '28px' }}>
              <a href="/" style={{ display: 'flex', alignItems: 'center', flex: 'none' }}><Logo /></a>
              <div className="nav-links ui" style={{ display: 'flex', alignItems: 'center', gap: '30px', marginLeft: '14px', fontSize: '14.5px', color: 'var(--soft)' }}>
                <a className="sf-link" href="/generator" style={{ color: 'var(--text)', transition: 'color .2s' }}>Generator</a>
                <Hover as="a" className="sf-link" href="/compare" base={{ transition: 'color .2s' }} hover={{ color: 'var(--text)' }}>Compare</Hover>
                <Hover as="a" className="sf-link" href="/burnout-analyzer" base={{ transition: 'color .2s' }} hover={{ color: 'var(--text)' }}>Burnout Radar</Hover>
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
            </div>
          </div>
        </header>

        <main style={{ maxWidth: '1320px', margin: '0 auto', padding: '0 clamp(16px,4vw,40px)' }}>

          {}
          <section style={{ textAlign: 'center', padding: 'clamp(48px,7vw,88px) 0 clamp(28px,4vw,44px)' }}>
            <div className="ui" data-reveal style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', padding: '7px 16px', border: '1px solid color-mix(in srgb,var(--accent) 35%,var(--line))', borderRadius: '100px', background: 'color-mix(in srgb,var(--accent) 8%,var(--surface))', fontSize: '12px', letterSpacing: '.12em', color: 'var(--accent-ink)', textTransform: 'uppercase', fontWeight: 600 }}>
              <svg width={13} height={13} viewBox="0 0 16 16" fill="currentColor"><path d="M8 1.2 9.9 5.9 15 6.3l-3.9 3.3 1.2 5L8 12.1 3.7 14.6l1.2-5L1 6.3l5.1-.4L8 1.2Z" /></svg>
              Free · No sign-up · Open source
            </div>
            <h1 data-reveal style={{ margin: '24px auto 0', maxWidth: '880px', fontWeight: 500, letterSpacing: '-.025em', lineHeight: 1.04, fontSize: 'clamp(38px,6.4vw,72px)' }}>
              Forge a profile <span style={{ background: 'linear-gradient(100deg,var(--accent-ink),var(--accent) 55%,var(--accent-2))', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>README</span> worth starring
            </h1>
            <p data-reveal style={{ maxWidth: '600px', margin: '22px auto 0', fontSize: 'clamp(16px,2vw,19px)', lineHeight: 1.6, color: 'var(--soft)', transitionDelay: '.06s' }}>Choose your stack, drop in your links, and export a polished GitHub profile in a single click — markdown ready to paste.</p>
            <div className="ui" data-reveal style={{ display: 'flex', gap: '11px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '30px', transitionDelay: '.12s' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 15px', border: '1px solid var(--line)', borderRadius: '100px', background: 'var(--surface)', fontSize: '13px', color: 'var(--soft)' }}><svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="var(--accent-ink)" strokeWidth={1.5}><path d="M6 4 2 8l4 4M10 4l4 4-4 4" /></svg><span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>200+</span> technologies</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 15px', border: '1px solid var(--line)', borderRadius: '100px', background: 'var(--surface)', fontSize: '13px', color: 'var(--soft)' }}><svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="var(--accent-ink)" strokeWidth={1.5}><circle cx={4} cy={8} r={1.8} /><circle cx={12} cy={4} r={1.8} /><circle cx={12} cy={12} r={1.8} /><path d="M5.6 7.1 10.4 4.9M5.6 8.9l4.8 2.2" /></svg><span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>50+</span> social platforms</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 15px', border: '1px solid var(--line)', borderRadius: '100px', background: 'var(--surface)', fontSize: '13px', color: 'var(--soft)' }}><svg width={14} height={14} viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--accent-2)' }}><path d="M8 1.2 9.9 5.9 15 6.3l-3.9 3.3 1.2 5L8 12.1 3.7 14.6l1.2-5L1 6.3l5.1-.4L8 1.2Z" /></svg>Badge tips</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 15px', border: '1px solid var(--line)', borderRadius: '100px', background: 'var(--surface)', fontSize: '13px', color: 'var(--soft)' }}><span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--good)', boxShadow: '0 0 0 3px color-mix(in srgb,var(--good) 22%,transparent)' }}></span>Live 3D stats</span>
            </div>
          </section>

          {}
          <section className="build-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', paddingBottom: 'clamp(40px,6vw,72px)', alignItems: 'start' }}>

            {}
            {}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>

              {}
              <ProfilePresets activeId={activePreset} onPick={applyPreset} />

              {}
              <Hover as="button" onClick={() => {
                if (profile.status !== 'verified') { setOpen(o => ({ ...o, badge: true })); document.getElementById('badge-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
                patch({ name: profile.name || profile.login, githubUsername: profile.login });
                setImported(true);
                if (impRef.current) clearTimeout(impRef.current);
                impRef.current = setTimeout(() => setImported(false), 1600);
              }} className="ui hov-card" base={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', padding: '18px', border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--surface)', boxShadow: 'var(--shadow)', fontSize: '15px', fontWeight: 600 }}>
                <svg width={18} height={18} viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.52.56.83 1.28.83 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" /></svg>
                {imported ? 'Imported ✓' : profile.status === 'verified' ? `Import from GitHub — @${profile.login}` : 'Import from GitHub'}
              </Hover>

              {}
              <CollapsibleSection id="name-section" open={open.name} onToggle={() => toggleSection('name')} title="Name" subtitle="The display name in your README header" noBorderTopContent>
                <div style={{ padding: '0 22px 22px' }}>
                  <FieldLabel style={{ borderTop: '1px solid var(--line2)', paddingTop: '18px' }}>Display name</FieldLabel>
                  <input className="sf-input ui" value={state.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Subhodeep" style={{ width: '100%', marginTop: '12px', fontSize: '15px', fontWeight: 500, padding: '14px 16px', border: '1px solid var(--line)', borderRadius: '12px', background: 'var(--surface2)' }} />
                  <div className="ui" style={{ marginTop: '10px', fontSize: '12.5px', color: 'var(--faint)' }}>Renders as: 👋 Hi, I&#39;m <span style={{ color: 'var(--soft)', fontWeight: 600 }}>{state.name || 'Your Name'}</span></div>
                </div>
              </CollapsibleSection>

              {}
              <CollapsibleSection id="description-section" open={open.desc} onToggle={() => toggleSection('desc')} title="Description" subtitle="A one-line bio or tagline that's all you" noBorderTopContent>
                <div style={{ padding: '0 22px 22px' }}>
                  <FieldLabel style={{ borderTop: '1px solid var(--line2)', paddingTop: '18px' }}>Bio / tagline</FieldLabel>
                  <textarea className="sf-input ui" value={state.description} onChange={(e) => patch({ description: e.target.value.slice(0, 300) })} placeholder="e.g. Full-stack engineer shipping calm, fast software. Open-source tinkerer and incurable coffee optimist." rows={3} style={{ width: '100%', marginTop: '12px', fontSize: '14.5px', lineHeight: 1.5, padding: '14px 16px', border: '1px solid var(--line)', borderRadius: '12px', background: 'var(--surface2)', resize: 'vertical' }} />
                  <div className="ui" style={{ marginTop: '8px', textAlign: 'right', fontSize: '12px', color: 'var(--faint)' }}>{300 - state.description.length} characters left</div>
                </div>
              </CollapsibleSection>

              {}
              <CollapsibleSection id="technologies-section" open={open.tech} onToggle={() => toggleSection('tech')} title="Technologies" count={state.techs.length} subtitle="Showcase the tools you build with" onReset={state.techs.length ? () => patch({ techs: [] }) : undefined} maxHeightOpen="1500px">
                <div style={{ padding: '0 22px 22px' }}>
                  <div className="ui" style={{ position: 'relative', marginTop: '18px' }}>
                    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="var(--faint)" strokeWidth={1.5} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}><circle cx={7} cy={7} r={4.5} /><path d="m11 11 3 3" strokeLinecap="round" /></svg>
                    <input className="sf-input" value={techSearch} onChange={(e) => setTechSearch(e.target.value)} placeholder="Search technologies…" style={{ width: '100%', fontSize: '14px', padding: '12px 14px 12px 40px', border: '1px solid var(--line)', borderRadius: '11px', background: 'var(--surface2)' }} />
                  </div>

                  {}
                  <FieldLabel style={{ marginTop: '18px', marginBottom: '10px' }}>Icon style</FieldLabel>
                  <Segmented<TechIconDisplay>
                    value={state.techIconDisplay}
                    onChange={(v) => patch({ techIconDisplay: v })}
                    options={[{ value: 'logo', label: 'Logo Only' }, { value: 'logo-name', label: 'Logo + Name' }]}
                  />

                  <div className="ui" style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '18px' }}>
                    {TECHCATS.map((c, i) => {
                      const s = chip(techCat === c);
                      return <button key={i} onClick={() => setTechCat(c)} style={{ padding: '6px 13px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, border: `1px solid ${s.border}`, background: s.bg, color: s.color, transition: 'all .15s' }}>{c}</button>;
                    })}
                  </div>

                  {state.techs.length > 0 && (
                    <>
                      <div className="ui" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '18px' }}>
                        <FieldLabel>Selected ({state.techs.length})</FieldLabel>
                        <Hover as="button" onClick={() => patch({ techs: [] })} base={{ fontSize: '12px', fontWeight: 600, color: 'var(--bad)', transition: 'opacity .18s' }} hover={{ opacity: 0.75 }}>Clear all</Hover>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '11px' }}>
                        {state.techs.map(t => {
                          const d = TECHS.find(x => x.name === t);
                          return (
                            <span key={t} className="ui" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '6px 9px 6px 7px', border: '1px solid var(--line2)', borderRadius: '9px', background: 'var(--surface2)', fontSize: '12.5px', fontWeight: 500 }}>
                              <span style={{ width: '16px', height: '16px', display: 'grid', placeItems: 'center' }}>{iconEl(t, TECH_ICONS[t], d?.color || '#3470ee', d?.fg || '#fff', 16)}</span>
                              {t}
                              <button onClick={() => toggleTech(t)} aria-label={`Remove ${t}`} style={{ display: 'flex', color: 'var(--faint)' }}>
                                <svg width={11} height={11} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </>
                  )}

                  <div className="ui" style={{ marginTop: '18px', fontSize: '11px', letterSpacing: '.08em', color: 'var(--faint)', textTransform: 'uppercase', fontWeight: 600 }}>{ftechs.length} technologies</div>
                  <div className="list-scroll" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                    {ftechs.map(t => <SelectableRow key={t.name} iconEl={iconEl(t.name, TECH_ICONS[t.name], t.color, t.fg, 28)} name={t.name} cat={t.cat} selected={state.techs.includes(t.name)} onToggle={() => toggleTech(t.name)} />)}
                  </div>
                </div>
              </CollapsibleSection>

              {}
              <CollapsibleSection id="socials-section" open={open.social} onToggle={() => toggleSection('social')} title="Socials" count={state.socials.length} subtitle="Link the places people can find you" onReset={state.socials.length ? () => patch({ socials: [], socialLinks: {} }) : undefined} maxHeightOpen="1500px">
                <div style={{ padding: '0 22px 22px' }}>
                  <div className="ui" style={{ display: 'flex', gap: '4px', padding: '5px', border: '1px solid var(--line)', borderRadius: '13px', background: 'var(--surface2)', marginTop: '18px' }}>
                    <button onClick={() => setSocialTab('pick')} style={{ flex: 1, padding: '11px', borderRadius: '9px', fontSize: '13.5px', fontWeight: 600, background: socialTab === 'pick' ? 'var(--surface)' : 'transparent', color: socialTab === 'pick' ? 'var(--text)' : 'var(--soft)', transition: 'all .15s' }}>① Pick platforms</button>
                    <button onClick={() => setSocialTab('links')} style={{ flex: 1, padding: '11px', borderRadius: '9px', fontSize: '13.5px', fontWeight: 600, background: socialTab === 'links' ? 'var(--surface)' : 'transparent', color: socialTab === 'links' ? 'var(--text)' : 'var(--soft)', transition: 'all .15s' }}>② Add links</button>
                  </div>

                  {socialTab === 'pick' && <>
                    <div className="ui" style={{ position: 'relative', marginTop: '16px' }}>
                      <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="var(--faint)" strokeWidth={1.5} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}><circle cx={7} cy={7} r={4.5} /><path d="m11 11 3 3" strokeLinecap="round" /></svg>
                      <input className="sf-input" value={platSearch} onChange={(e) => setPlatSearch(e.target.value)} placeholder="Search platforms…" style={{ width: '100%', fontSize: '14px', padding: '12px 14px 12px 40px', border: '1px solid var(--line)', borderRadius: '11px', background: 'var(--surface2)' }} />
                    </div>
                    <div className="ui" style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '14px' }}>
                      {PLATCATS.map((c, i) => {
                        const lbl = c === 'Competitive Programming' ? 'Competitive' : c;
                        const s = chip(platCat === c);
                        return <button key={i} onClick={() => setPlatCat(c)} style={{ padding: '6px 13px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, border: `1px solid ${s.border}`, background: s.bg, color: s.color, transition: 'all .15s' }}>{lbl}</button>;
                      })}
                    </div>
                    <div className="ui" style={{ marginTop: '16px', fontSize: '11px', letterSpacing: '.08em', color: 'var(--faint)', textTransform: 'uppercase', fontWeight: 600 }}>{fplats.length} platforms</div>
                    <div className="list-scroll" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                      {fplats.slice(0, 60).map(p => {
                        const catLabel = p.cat === 'Competitive Programming' ? 'Competitive' : p.cat;
                        return <SelectableRow key={p.name} iconEl={iconEl(p.name, SOCIAL_ICONS[p.name], p.color, p.fg, 28)} name={p.name} cat={catLabel} selected={state.socials.includes(p.name)} onToggle={() => togglePlat(p.name)} />;
                      })}
                    </div>
                  </>}

                  {socialTab === 'links' && (
                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '11px' }}>
                      {state.socials.length === 0 && <div className="ui" style={{ textAlign: 'center', padding: '28px 16px', border: '1.5px dashed var(--line)', borderRadius: '14px', color: 'var(--soft)', fontSize: '13.5px' }}>Pick a few platforms first, then add your links here.</div>}
                      {state.socials.map(n => {
                        const d = PLATS.find(x => x.name === n) || { color: '#3470ee', fg: '#fff' };
                        return (
                          <div key={n}>
                            <div className="ui" style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px', fontWeight: 600 }}><span style={{ width: '24px', height: '24px', flex: 'none', display: 'grid', placeItems: 'center' }}>{iconEl(n, SOCIAL_ICONS[n], d.color, d.fg, 18)}</span>{n}</div>
                            <input className="sf-input ui" value={state.socialLinks[n] || ''} onChange={(e) => patch({ socialLinks: { ...state.socialLinks, [n]: e.target.value } })} placeholder={socialPlaceholder(n)} style={{ width: '100%', marginTop: '8px', fontSize: '13.5px', padding: '11px 14px', border: '1px solid var(--line)', borderRadius: '11px', background: 'var(--surface2)' }} />
                          </div>
                        );
                      })}
                      {state.socials.length > 0 && (
                        <div className="ui" style={{ fontSize: '12px', color: 'var(--faint)', lineHeight: 1.5 }}>Only platforms with a link filled in are written into the README.</div>
                      )}
                    </div>
                  )}
                </div>
              </CollapsibleSection>

              {}
              <BadgeSection
                open={open.badge}
                onToggle={() => toggleSection('badge')}
                username={state.githubUsername}
                onUsernameChange={(v) => patch({ githubUsername: v.trim() })}
                show={state.showBadge}
                onShowChange={(v) => patch({ showBadge: v })}
                accent={state.badgeAccent}
                onAccentChange={(v) => patch({ badgeAccent: v })}
                profile={profile}
                onReset={() => patch({ showBadge: false, badgeAccent: '', githubUsername: '' })}
              />

              {}
              <ContributionGraphSection
                open={open.viz}
                onToggle={() => toggleSection('viz')}
                username={state.githubUsername}
                onUsernameChange={(v) => patch({ githubUsername: v.trim() })}
                showSnake={state.showSnakeGraph}
                showPacman={state.showPacmanGraph}
                onShowSnakeChange={(v) => patch({ showSnakeGraph: v })}
                onShowPacmanChange={(v) => patch({ showPacmanGraph: v })}
                placement={state.graphPlacement}
                onPlacementChange={(v) => patch({ graphPlacement: v })}
                profile={profile}
                onReset={() => patch({ showSnakeGraph: false, showPacmanGraph: false, graphPlacement: 'bottom' })}
              />

              {}
              <RepoSpotlightSection
                open={open.spotlight}
                onToggle={() => toggleSection('spotlight')}
                username={state.githubUsername}
                show={state.showRepoSpotlight}
                onShowChange={(v) => patch({ showRepoSpotlight: v })}
                repo={state.spotlightRepo}
                onRepoChange={(v) => patch({ spotlightRepo: v })}
                repos={repos}
                onReset={() => patch({ showRepoSpotlight: false, spotlightRepo: '' })}
              />
            </div>

            {}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0, position: 'sticky', top: '96px' }}>

              {}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '18px', boxShadow: 'var(--shadow)', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div className="ui" style={{ display: 'flex', gap: '4px', padding: '5px', border: '1px solid var(--line)', borderRadius: '12px', background: 'var(--surface2)' }}>
                    <button onClick={() => setPreviewTab('preview')} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: previewTab === 'preview' ? 'var(--accent)' : 'transparent', color: previewTab === 'preview' ? '#fff' : 'var(--soft)' }}><svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M1.5 8S4 3.8 8 3.8 14.5 8 14.5 8 12 12.2 8 12.2 1.5 8 1.5 8Z" /><circle cx={8} cy={8} r={1.9} /></svg>Preview</button>
                    <button onClick={() => setPreviewTab('markdown')} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: previewTab === 'markdown' ? 'var(--accent)' : 'transparent', color: previewTab === 'markdown' ? '#fff' : 'var(--soft)' }}><svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M6 4 2 8l4 4M10 4l4 4-4 4" /></svg>Markdown</button>
                  </div>
                  <div className="ui" style={{ display: 'flex', gap: '9px' }}>
                    <Hover as="button" onClick={() => {
                      try { const blob = new Blob([md], { type: 'text/markdown' }); const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = 'README.md'; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); } catch { }
                      setDownloaded(true);
                      if (dlRef.current) clearTimeout(dlRef.current);
                      dlRef.current = setTimeout(() => setDownloaded(false), 1600);
                    }} base={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 16px', borderRadius: '11px', border: '1px solid var(--line)', background: 'var(--surface2)', fontSize: '13px', fontWeight: 600, color: 'var(--soft)', transition: 'border-color .18s' }} hover={{ border: '1px solid var(--accent)', color: 'var(--text)' }}>
                      <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M8 2v8M5 7l3 3 3-3M3 13h10" /></svg>
                      {downloaded ? 'Saved ✓' : 'Download'}
                    </Hover>
                    <Hover as="button" onClick={copyMarkdown} base={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 16px', borderRadius: '11px', background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 600, boxShadow: '0 8px 20px -10px var(--accent)', transition: 'transform .16s' }} hover={{ transform: 'translateY(-1px)' }}>
                      <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth={1.6}><rect x={5} y={5} width={8} height={8} rx={1.6} /><path d="M3 11V4a1 1 0 0 1 1-1h7" /></svg>
                      {copied ? 'Copied!' : 'Copy Markdown'}
                    </Hover>
                  </div>
                </div>
                <div style={{ marginTop: '16px', border: '1px solid var(--line2)', borderRadius: '14px', overflow: 'hidden', background: '#0c0e16' }}>
                  {}
                  {previewTab === 'preview' && <div style={{ padding: 'clamp(20px,3vw,36px)', minHeight: '240px', color: '#e8ecf4' }}><ReadmePreview state={state} /></div>}
                  {previewTab === 'markdown' && <pre className="mono" style={{ margin: 0, padding: '22px', fontSize: '12px', lineHeight: 1.7, color: '#cdd6e6', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', minHeight: '240px' }}>{md}</pre>}
                </div>
                <div className="ui" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', color: 'var(--faint)' }}>
                  <span className="mono">{md.split('\n').length} lines · {md.length} chars</span>
                  <span className="mono" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>README.md</span>
                </div>
              </div>

              {}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '18px', boxShadow: 'var(--shadow)', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 600, letterSpacing: '-.01em' }}><svg width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="var(--accent-ink)" strokeWidth={1.6}><path d="M2 13V3M2 13h12M5 11V7M8 11V4M11 11V9" /></svg>README Completion Score</div>
                  <span className="ui" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '100px', border: `1px solid color-mix(in srgb,${C.levelColor} 35%,var(--line))`, background: `color-mix(in srgb,${C.levelColor} 12%,transparent)`, fontSize: '11.5px', fontWeight: 700, color: C.levelColor }}>
                    <svg width={13} height={13} viewBox="0 0 16 16" fill="currentColor"><path d="M4 3h8v2.5a4 4 0 0 1-8 0V3ZM6 11h4M5 14h6M7.4 8.4h1.2V11H7.4z" /></svg>Level: {C.level}
                  </span>
                </div>
                <div className="ui" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px', fontSize: '13px', color: 'var(--soft)', fontWeight: 600 }}><span>Profile completeness</span><span className="mono" style={{ fontSize: '16px', color: 'var(--text)' }}>{C.score}%</span></div>
                <div style={{ marginTop: '10px', height: '9px', borderRadius: '6px', background: 'var(--line)', overflow: 'hidden' }}><div style={{ height: '100%', borderRadius: '6px', background: C.barColor, width: C.score + '%', transition: 'width .35s cubic-bezier(.2,.8,.2,1),background .3s' }}></div></div>
                <div className="ui" style={{ fontSize: '11px', letterSpacing: '.08em', color: 'var(--faint)', textTransform: 'uppercase', fontWeight: 700, marginTop: '22px' }}>Suggestions &amp; checklist</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', marginTop: '14px' }}>
                  {C.suggestions.map((it) => (
                    <div key={it.id} className="ui" style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', fontSize: '13.5px', color: it.completed ? 'var(--soft)' : 'var(--text)' }}>
                      <span style={{ flex: 'none', marginTop: '1px' }}>{it.completed ? OK_I : WARN_I}</span>
                      <span style={{ lineHeight: 1.4 }}>{it.text}</span>
                    </div>
                  ))}
                </div>
                <div className="ui" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--line2)', fontSize: '13px', color: 'var(--soft)' }}>
                  <svg width={15} height={15} viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--accent-2)' }}><path d="M8 1.2 9.9 5.9 15 6.3l-3.9 3.3 1.2 5L8 12.1 3.7 14.6l1.2-5L1 6.3l5.1-.4L8 1.2Z" /></svg>
                  Estimated profile strength: <span style={{ color: C.strengthColor, fontWeight: 700 }}>{C.strength}</span>
                </div>
              </div>

              {}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '18px', boxShadow: 'var(--shadow)', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 600, letterSpacing: '-.01em' }}><svg width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="var(--accent-2)" strokeWidth={1.5}><path d="M8 1.5a4.5 4.5 0 0 0-2.5 8.3V12h5v-2.2A4.5 4.5 0 0 0 8 1.5ZM6 14h4M6.5 12v2M9.5 12v2" /></svg>README Insights</div>
                  <span className="ui" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '100px', border: `1px solid color-mix(in srgb,${grade.color} 32%,var(--line))`, background: `color-mix(in srgb,${grade.color} 12%,transparent)`, fontSize: '11.5px', color: grade.color, fontWeight: 700 }}>
                    <svg width={12} height={12} viewBox="0 0 16 16" fill="currentColor"><path d="M9.4 1 3 9h4l-.4 6L13 7H9l.4-6Z" /></svg>{grade.label}
                  </span>
                </div>
                <div className="ui" style={{ fontSize: '11px', letterSpacing: '.08em', color: 'var(--faint)', textTransform: 'uppercase', fontWeight: 700, marginTop: '18px' }}>Suggested improvements</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
                  {insights.map((insight, i) => (
                    <div key={i} className="ui" style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', fontSize: '13.5px', color: 'var(--soft)', lineHeight: 1.45 }}>
                      <span style={{ width: '6px', height: '6px', flex: 'none', borderRadius: '50%', background: 'var(--accent)', marginTop: '6px' }}></span>{insight}
                    </div>
                  ))}
                </div>
              </div>

              {}
              <ReadmeHealthBreakdown state={state} onJump={jumpToSection} />
            </div>
          </section>

          {}
          <footer className="ui" style={{ padding: 'clamp(40px,6vw,80px) 0 40px' }}>
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
    </div>
  );
}
