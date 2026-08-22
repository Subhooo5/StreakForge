"use client";

import { useEffect, useRef, useState } from "react";
import { hash, useHomeStats } from "@/app/data/home";
import { useTheme } from "@/hooks/useTheme";
import { useUrlBackedState } from "@/hooks/useUrlParams";
import { useRecentList } from "@/hooks/useRecentList";
import { Hover } from "@/components/Hover";

const NAV_REPO_BASE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "13.5px",
  fontWeight: 500,
  padding: "9px 15px",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "11px",
  background: "var(--surface2)",
  transition: "transform .18s ease,border-color .18s ease,box-shadow .18s ease",
};
const NAV_REPO_HOVER: React.CSSProperties = {
  transform: "translateY(-1px)",
  borderColor: "var(--accent)",
  boxShadow: "0 6px 20px -10px var(--accent)",
};
const NAV_TOGGLE_BASE: React.CSSProperties = {
  width: "40px",
  height: "40px",
  display: "grid",
  placeItems: "center",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "11px",
  background: "var(--surface2)",
  transition: "transform .18s,border-color .18s",
};
const NAV_TOGGLE_HOVER: React.CSSProperties = {
  transform: "translateY(-1px)",
  borderColor: "var(--accent)",
};

const cityPalette = "Brand";
const monolithHeight = 1.1;
const gridReactivity = 1.2;

type Poly = { pts: number[][]; fill: string; op: number; depth: number };

function CloseButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Hover as="button" onClick={onClick} aria-label={label} title={label} base={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "26px", height: "26px", borderRadius: "50%", color: "var(--soft)", flex: "none", transition: "color .16s,background .16s" }} hover={{ color: "var(--text)", background: "var(--surface)" }}>
      <svg width={13} height={13} viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.8} fill="none">
        <path d="M4 4l8 8M12 4l-8 8"></path>
      </svg>
    </Hover>
  );
}

const recentUserKey = (login: string) => login;

export default function HomeClient() {
  const [theme, toggleTheme] = useTheme();
  const [username, setUsername] = useUrlBackedState("user");
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { recent, remember: rememberRecent, clear: clearRecent } = useRecentList<string>("sf-recent-users", recentUserKey);
  const [showDashPrompt, setShowDashPrompt] = useState(false);
  const inputRef = useRef<HTMLDivElement>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const reduceRef = useRef(false);
  const readGridColorsRef = useRef<(() => void) | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stats = useHomeStats(username);

  const isoPolys = (): Poly[] => {
    const cols = 14,
      rows = 7,
      tw = 24,
      th = 12,
      ox = 180,
      oy = 78;
    const u = (username || "").trim();
    const seed = (hash((u || "streakforge").toLowerCase()) % 1000) / 120;
    const scale = monolithHeight ?? 1;
    const palettes: Record<string, [string, string, string]> = {
      Brand: ["#ff6cbb", "#cf2188", "#7c1a5c"],
      Aurora: ["#7ef0b0", "#19d86b", "#0c7a44"],
      Ice: ["#8fb8ff", "#2f5fff", "#1a3a9c"],
      Ember: ["#ffc06c", "#f0791f", "#9c4a0c"],
    };
    const [top, right, left] = palettes[cityPalette] || palettes.Brand;
    const cells: { c: number; r: number; hv: number; depth: number }[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const base = (c / cols) * 4.0;
        const noise = (Math.sin(c * 1.27 + r * 2.13 + seed) + Math.cos(c * 0.71 - r * 1.69 + seed)) * 1.12;
        let hv = u ? Math.max(0, Math.round(base + noise)) : 0;
        hv = Math.min(6, hv);
        cells.push({ c, r, hv, depth: c + r });
      }
    cells.sort((a, b) => a.depth - b.depth || a.c - b.c);
    const polys: Poly[] = [];
    for (const cell of cells) {
      const { c, r, hv } = cell;
      const h = hv * 7 * scale;
      const sx = ox + (c - r) * tw,
        sy = oy + (c + r) * th;
      const T = [
        [sx, sy - h],
        [sx + tw, sy + th - h],
        [sx, sy + 2 * th - h],
        [sx - tw, sy + th - h],
      ];
      if (hv === 0) {
        polys.push({ pts: T, fill: top, op: 0.14, depth: cell.depth });
        continue;
      }
      const Rg = [
        [sx + tw, sy + th - h],
        [sx, sy + 2 * th - h],
        [sx, sy + 2 * th],
        [sx + tw, sy + th],
      ];
      const Lf = [
        [sx - tw, sy + th - h],
        [sx, sy + 2 * th - h],
        [sx, sy + 2 * th],
        [sx - tw, sy + th],
      ];
      polys.push({ pts: Lf, fill: left, op: 1, depth: cell.depth });
      polys.push({ pts: Rg, fill: right, op: 1, depth: cell.depth });
      polys.push({
        pts: T,
        fill: top,
        op: Math.min(1, 0.6 + hv * 0.07),
        depth: cell.depth,
      });
    }
    return polys;
  };

  const ptsStr = (a: number[][]) => a.map((p) => p.map((n) => Math.round(n * 10) / 10).join(",")).join(" ");

  const cityEl = () => {
    const polys = isoPolys();
    return (
      <svg viewBox="0 0 540 360" width="100%" style={{ display: "block", overflow: "visible" }}>
        {polys.map((p, i) => {
          const style: React.CSSProperties = reduceRef.current
            ? {}
            : {
                animation: "sf-rise .7s cubic-bezier(.2,.85,.25,1) both",
                animationDelay: p.depth * 30 + "ms",
              };
          return <polygon key={i} points={ptsStr(p.pts)} fill={p.fill} fillOpacity={p.op} style={style} />;
        })}
      </svg>
    );
  };

  const downloadSvg = async () => {
    const badgeUser = username.trim() && stats.login ? stats.login : "demo";
    try {
      const res = await fetch(`/api/streak?user=${encodeURIComponent(badgeUser)}&theme=dark`);
      if (!res.ok) return;
      const svg = await res.text();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${badgeUser}-streakforge.svg`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
    }
  };

  const snippetUser = () => stats.login || username.trim() || "YOUR_USERNAME";
  const markdownSnippet = () => `![StreakForge](https://streakforge.dev/api/streak?user=${snippetUser()})`;

  const copyLink = () => {
    try {
      navigator.clipboard.writeText(markdownSnippet());
    } catch {}
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1800);
    setModalOpen(true);
  };

  useEffect(() => {
    if (!stats.login || stats.error) return;
    rememberRecent(stats.login);
  }, [stats.login, stats.error, rememberRecent]);

  useEffect(() => {
    if (username.trim()) setShowDashPrompt(false);
  }, [username]);

  useEffect(() => {
    if (!modalOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [modalOpen]);

  const clearInput = () => setUsername("");

  const goDashboard = (e: React.MouseEvent) => {
    e.preventDefault();
    const u = username.trim();
    if (!u) {
      setShowDashPrompt(true);
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    window.location.href = `/dashboard?user=${encodeURIComponent(u)}`;
  };

  const toggleMenu = () => setMenuOpen((m) => !m);
  const onGenerate = () => {};
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onGenerate();
  };

  const themeIcon = () =>
    theme === "dark" ? (
      <svg width={18} height={18} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} fill="none">
        <circle cx={12} cy={12} r={4.2}></circle>
        <path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M19.4 4.6l-1.7 1.7M6.3 17.7l-1.7 1.7" strokeLinecap="round"></path>
      </svg>
    ) : (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"></path>
      </svg>
    );

  const paramPills = () => {
    const params = ["theme", "glow", "height-scale", "palette", "rotation", "shadow", "grid-gap", "sky", "base-color", "animation", "fps", "density", "grain", "tilt", "radius", "outline", "contrast", "seed"];
    const pills = params.map((p, i) => (
      <span key={i} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12.5px", padding: "7px 12px", borderRadius: "9px", border: "1px solid var(--line)", background: "var(--surface2)", color: i % 4 === 0 ? "var(--accent-ink)" : "var(--soft)", whiteSpace: "nowrap" }}>
        {p}
      </span>
    ));
    pills.push(
      <span key="more" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12.5px", padding: "7px 12px", borderRadius: "9px", color: "var(--faint)" }}>
        + 12 more
      </span>,
    );
    return pills;
  };

  useEffect(() => {
    const reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    reduceRef.current = reduce;

    let gridCleanup: (() => void) | undefined;
    const canvas = gridRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d")!;
      const mouse = { x: -9999, y: -9999 };
      const ripples: { x: number; y: number; t: number }[] = [];
      let w = 0,
        h = 0,
        dpr = 1,
        spacing = 40,
        raf = 0;

      const resize = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = canvas.clientWidth;
        h = canvas.clientHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        spacing = w < 640 ? 30 : w < 1100 ? 36 : 42;
      };
      resize();

      let dotColor = "rgba(0,0,0,.16)",
        hotColor = "#e0218a";
      const readColors = () => {
        const cs = getComputedStyle(rootRef.current || document.body);
        dotColor = (cs.getPropertyValue("--dot") || "").trim() || dotColor;
        hotColor = (cs.getPropertyValue("--dot-hot") || "").trim() || hotColor;
      };
      readColors();
      readGridColorsRef.current = readColors;

      const onMove = (e: MouseEvent) => {
        const r = canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left;
        mouse.y = e.clientY - r.top;
      };
      const onLeave = () => {
        mouse.x = -9999;
        mouse.y = -9999;
      };
      const onClick = (e: MouseEvent) => {
        const r = canvas.getBoundingClientRect();
        ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: 0 });
        if (ripples.length > 5) ripples.shift();
      };
      const onTouch = (e: TouchEvent) => {
        if (e.touches && e.touches[0]) {
          const r = canvas.getBoundingClientRect();
          mouse.x = e.touches[0].clientX - r.left;
          mouse.y = e.touches[0].clientY - r.top;
        }
      };
      window.addEventListener("resize", resize);
      window.addEventListener("mousemove", onMove, { passive: true });
      window.addEventListener("mouseout", onLeave);
      window.addEventListener("click", onClick);
      window.addEventListener("touchmove", onTouch, { passive: true });

      const R = 160;
      const draw = () => {
        const react = gridReactivity || 1;
        ctx.clearRect(0, 0, w, h);
        for (let i = ripples.length - 1; i >= 0; i--) {
          ripples[i].t += 7;
          if (ripples[i].t > Math.hypot(w, h) + 80) ripples.splice(i, 1);
        }
        const off = spacing / 2;
        for (let gx = off; gx < w; gx += spacing) {
          for (let gy = off; gy < h; gy += spacing) {
            const dx = mouse.x - gx,
              dy = mouse.y - gy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            let px = gx,
              py = gy,
              size = 1.1,
              hot = 0;
            if (dist < R) {
              const f = 1 - dist / R;
              px = gx + dx * f * 0.32 * react;
              py = gy + dy * f * 0.32 * react;
              size = 1.1 + f * f * 2.6 * react;
              hot = f;
            }
            for (let k = 0; k < ripples.length; k++) {
              const rp = ripples[k];
              const rd = Math.abs(Math.hypot(rp.x - gx, rp.y - gy) - rp.t);
              if (rd < 24) {
                const rf = (1 - rd / 24) * Math.max(0, 1 - rp.t / 520);
                size += rf * 2.6;
                if (rf > hot) hot = rf;
              }
            }
            if (hot > 0.03) {
              ctx.fillStyle = hotColor;
              ctx.globalAlpha = Math.min(1, 0.3 + hot);
            } else {
              ctx.fillStyle = dotColor;
              ctx.globalAlpha = 1;
            }
            ctx.fillRect(px - size, py - size, size * 2, size * 2);
          }
        }
        ctx.globalAlpha = 1;
        raf = requestAnimationFrame(draw);
      };

      if (reduce) {
        draw();
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(draw);
      }

      gridCleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseout", onLeave);
        window.removeEventListener("click", onClick);
        window.removeEventListener("touchmove", onTouch);
      };
    }

    let io: IntersectionObserver | undefined;
    const root = rootRef.current;
    if (root) {
      const els = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
      if (reduce) {
        els.forEach((e) => e.classList.add("in"));
      } else {
        io = new IntersectionObserver(
          (ents) => {
            ents.forEach((en) => {
              if (en.isIntersecting) {
                en.target.classList.add("in");
                io!.unobserve(en.target);
              }
            });
          },
          { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
        );
        els.forEach((e) => io!.observe(e));
      }
    }

    return () => {
      gridCleanup?.();
      io?.disconnect();
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    readGridColorsRef.current?.();
  }, [theme]);

  const logoSrc = theme === "dark" ? "/streakforge-logo-dark.svg" : "/streakforge-logo-light.svg";

  return (
    <div className={theme === "dark" ? "sf dark" : "sf"} ref={rootRef} style={{ position: "relative", minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text)", overflowX: "hidden", transition: "background-color .5s ease,color .5s ease" }}>
      <canvas ref={gridRef} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}></canvas>

      <div style={{ position: "relative", zIndex: 2 }}>
        {}
        <div style={{ width: "100%", borderBottom: "1px solid var(--line2)", background: "var(--surface)", backdropFilter: "blur(10px)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", height: "34px", width: "max-content", animation: "sf-ticker 38s linear infinite" }}>
            {[0, 1].map((dup) => (
              <div key={dup} className="ui" aria-hidden={dup === 1 ? "true" : undefined} style={{ display: "flex", alignItems: "center", gap: "38px", paddingRight: "38px", fontSize: "12.5px", letterSpacing: ".01em", color: "var(--soft)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "9px" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--accent)", animation: "sf-pulse 1.6s ease-in-out infinite" }}></span>
                  <span>
                    <strong style={{ color: "var(--text)", fontWeight: 600 }}>@torvalds</strong> reached a 400-day streak
                  </span>
                </span>
                <span style={{ opacity: 0.4 }}>/</span>
                <span>
                  <strong style={{ color: "var(--text)", fontWeight: 600 }}>New</strong> — Burnout Radar v2 is live
                </span>
                <span style={{ opacity: 0.4 }}>/</span>
                <span>
                  <span className="mono">1.2M</span> monoliths forged this month
                </span>
                <span style={{ opacity: 0.4 }}>/</span>
                <span>
                  <strong style={{ color: "var(--text)", fontWeight: 600 }}>@gaearon</strong> climbed to PEAK_STREAK <span className="mono">612</span>
                </span>
                <span style={{ opacity: 0.4 }}>/</span>
                <span>
                  Customization Studio — <span className="mono">30+</span> parameters
                </span>
              </div>
            ))}
          </div>
        </div>

        {}
        <header style={{ position: "sticky", top: 0, zIndex: 40 }}>
          <div style={{ background: "var(--surface)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--line2)" }}>
            <nav style={{ maxWidth: "1240px", margin: "0 auto", padding: "14px clamp(16px,4vw,40px)", display: "flex", alignItems: "center", gap: "28px" }}>
              <a href="#top" style={{ display: "flex", alignItems: "center", flex: "none" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoSrc} alt="StreakForge" style={{ height: "41px", width: "150px", display: "block" }} />
              </a>

              <div className="nav-links ui" style={{ display: "flex", alignItems: "center", gap: "30px", marginLeft: "14px", fontSize: "14.5px", color: "var(--soft)" }}>
                <Hover as="a" className="sf-link" href="/generator" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }}>
                  Generator
                </Hover>
                <Hover as="a" className="sf-link" href="/compare" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }}>
                  Compare
                </Hover>
                <Hover as="a" className="sf-link" href="/burnout-analyzer" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }}>
                  Burnout Radar
                </Hover>
                <Hover as="a" className="sf-link" href="/customize" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }}>
                  Customization Studio
                </Hover>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
                <Hover as="a" className="nav-repo ui" href="https://github.com/Subhooo5/StreakForge" target="_blank" rel="noopener" base={NAV_REPO_BASE} hover={NAV_REPO_HOVER}>
                  <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.52.56.83 1.28.83 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z"></path>
                  </svg>
                  GitHub Repo
                </Hover>
                <Hover as="button" onClick={toggleTheme} aria-label="Toggle theme" base={NAV_TOGGLE_BASE} hover={NAV_TOGGLE_HOVER}>
                  {themeIcon()}
                </Hover>
                <button className="nav-burger" onClick={toggleMenu} aria-label="Menu" style={{ width: "40px", height: "40px", alignItems: "center", justifyContent: "center", border: "1px solid var(--line)", borderRadius: "11px", background: "var(--surface2)" }}>
                  <svg width={18} height={18} viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.6}>
                    <path d="M2 5h14M2 9h14M2 13h14"></path>
                  </svg>
                </button>
              </div>
            </nav>
          </div>

          <div className="ui" style={{ display: menuOpen ? "block" : "none", borderBottom: "1px solid var(--line)", background: "var(--bg2)" }}>
            <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "8px clamp(16px,4vw,40px) 18px", display: "flex", flexDirection: "column" }}>
              <a href="/generator" onClick={toggleMenu} style={{ padding: "13px 4px", borderBottom: "1px solid var(--line2)", fontSize: "15px" }}>
                Generator
              </a>
              <a href="/compare" onClick={toggleMenu} style={{ padding: "13px 4px", borderBottom: "1px solid var(--line2)", fontSize: "15px" }}>
                Compare
              </a>
              <a href="/burnout-analyzer" onClick={toggleMenu} style={{ padding: "13px 4px", borderBottom: "1px solid var(--line2)", fontSize: "15px" }}>
                Burnout Radar
              </a>
              <a href="/customize" onClick={toggleMenu} style={{ padding: "13px 4px", borderBottom: "1px solid var(--line2)", fontSize: "15px" }}>
                Customization Studio
              </a>
              <a href="https://github.com/Subhooo5/StreakForge" target="_blank" rel="noopener" style={{ marginTop: "12px", textAlign: "center", padding: "12px", border: "1px solid var(--line)", borderRadius: "11px", fontSize: "14px", fontWeight: 500 }}>
                GitHub Repo →
              </a>
            </div>
          </div>
        </header>

        <main id="top" data-screen-label="StreakForge Home">
          {}
          <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "clamp(56px,9vw,108px) clamp(16px,4vw,40px) clamp(30px,4vw,46px)", textAlign: "center" }}>
            <div className="ui" data-reveal="" style={{ display: "inline-flex", alignItems: "center", gap: "9px", padding: "7px 15px", border: "1px solid var(--line)", borderRadius: "100px", background: "var(--surface)", fontSize: "12.5px", letterSpacing: ".02em", color: "var(--soft)" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 0 4px color-mix(in srgb,var(--accent) 22%,transparent)" }}></span>
              Live 3D commit badges · Real-Time GraphQL
            </div>

            <h1 style={{ margin: "26px 0 0", fontWeight: 500, letterSpacing: "-.025em", lineHeight: 1.02, fontSize: "clamp(40px,7.4vw,82px)" }}>
              <span style={{ display: "inline-block", animation: "sf-fadeup .8s .05s both" }}>Elevate&nbsp;your</span>
              <br />
              <span style={{ display: "inline-block", background: "linear-gradient(100deg,var(--hbase),var(--hsweep) 40%,var(--hlight) 62%,var(--hsweep) 84%,var(--hbase))", backgroundSize: "200% auto", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent", animationName: "sf-fadeup,sf-shimmer", animationDuration: ".8s,6s", animationDelay: ".18s,0s", animationTimingFunction: "ease,linear", animationIterationCount: "1,infinite", animationFillMode: "both,none" }}>Contribution Story</span>
              <span style={{ display: "inline-block", fontStyle: "italic", fontWeight: 400, animation: "sf-fadeup .8s .3s both" }}>.</span>
            </h1>

            <p data-reveal="" style={{ maxWidth: "600px", margin: "26px auto 0", fontSize: "clamp(16.5px,2.1vw,20px)", lineHeight: 1.6, color: "var(--soft)", transitionDelay: ".1s" }}>
              StreakForge converts your GitHub commit history into a live, 3D animated badge. The more you commit, the taller your city grows — embed it in your profile README with a single line.
            </p>

            <div className="ui" data-reveal="" style={{ display: "flex", gap: "13px", justifyContent: "center", flexWrap: "wrap", marginTop: "34px", transitionDelay: ".18s" }}>
              <Hover as="a" href="#generator" base={{ display: "inline-flex", alignItems: "center", gap: "9px", padding: "14px 24px", borderRadius: "13px", background: "var(--accent)", color: "#fff", fontSize: "15px", fontWeight: 600, boxShadow: "0 10px 30px -10px var(--accent)", transition: "transform .18s,box-shadow .18s" }} hover={{ transform: "translateY(-2px)", boxShadow: "0 16px 38px -10px var(--accent)" }}>
                Generate Badge
                <svg width={16} height={16} viewBox="0 0 16 16" stroke="#fff" strokeWidth={1.7} fill="none">
                  <path d="M3 8h9M8 4l4 4-4 4"></path>
                </svg>
              </Hover>
              <Hover as="a" href="/dashboard" onClick={goDashboard} base={{ display: "inline-flex", alignItems: "center", gap: "9px", padding: "14px 24px", borderRadius: "13px", border: "1px solid var(--accent-2)", color: "var(--accent-2)", fontSize: "15px", fontWeight: 600, background: "var(--surface)", transition: "transform .18s,background .18s" }} hover={{ transform: "translateY(-2px)", background: "color-mix(in srgb,var(--accent-2) 9%,transparent)" }}>
                View Dashboard
              </Hover>
            </div>
          </section>

          {}
          <section id="generator" data-screen-label="Generator" style={{ maxWidth: "980px", margin: "0 auto", padding: "clamp(20px,4vw,40px) clamp(16px,4vw,40px) clamp(40px,6vw,72px)" }}>
            <div data-reveal="" style={{ background: "var(--surface)", backdropFilter: "blur(14px)", border: "1px solid var(--line)", borderRadius: "26px", padding: "clamp(20px,3.5vw,40px)", boxShadow: "var(--shadow)" }}>
              <div ref={inputRef} className="ui" style={{ display: "flex", alignItems: "center", gap: "13px", flexWrap: "wrap", background: "var(--surface2)", border: "1px solid var(--line)", borderRadius: "15px", padding: "7px 7px 7px 18px", maxWidth: "560px", margin: "0 auto", scrollMarginTop: "90px" }}>
                <span className="mono" style={{ fontSize: "14px", color: "var(--faint)", whiteSpace: "nowrap" }}>
                  github.com/
                </span>
                <input className="sf-input" value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={onKey} placeholder="username" style={{ flex: 1, minWidth: "120px", fontSize: "15.5px", fontWeight: 500, padding: "8px 0", letterSpacing: "-.01em" }} />
                {username && <CloseButton onClick={clearInput} label="Clear username" />}
                <button onClick={onGenerate} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "11px 20px", borderRadius: "11px", background: "var(--accent)", color: "#fff", fontSize: "14px", fontWeight: 600, whiteSpace: "nowrap", transition: "transform .16s,box-shadow .16s", boxShadow: "0 8px 22px -10px var(--accent)" }}>
                  Forge
                  <svg width={15} height={15} viewBox="0 0 16 16" stroke="#fff" strokeWidth={1.8} fill="none">
                    <path d="M3 8h9M8 4l4 4-4 4"></path>
                  </svg>
                </button>
              </div>

              {}
              {showDashPrompt && !username.trim() && (
                <div className="ui" role="status" style={{ maxWidth: "560px", margin: "10px auto 0", textAlign: "center", fontSize: "13px", fontWeight: 600, color: "var(--accent-ink)" }}>
                  Please enter a GitHub username to access dashboard
                </div>
              )}

              {}
              {username.trim() && (
                <div className="ui" style={{ maxWidth: "560px", margin: "10px auto 0", minHeight: "20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", flexWrap: "wrap", fontSize: "13px" }}>
                  {stats.loading && !stats.login && !stats.error && <span style={{ color: "var(--soft)" }}>Checking…</span>}
                  {stats.login && !stats.error && (
                    <>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--good)", boxShadow: "0 0 8px var(--good)", flex: "none", animation: "sf-pulse 1.8s ease-in-out infinite" }}></span>
                      <span style={{ fontSize: "10.5px", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 700, color: "var(--good)" }}>Verified Profile</span>
                      <span style={{ color: "var(--text)", fontWeight: 600 }}>@{stats.login}</span>
                      {stats.name && stats.name.toLowerCase() !== stats.login.toLowerCase() && <span style={{ color: "var(--soft)" }}>· {stats.name}</span>}
                    </>
                  )}
                  {stats.error === "not_found" && (
                    <>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--bad)", flex: "none" }}></span>
                      <span style={{ color: "var(--bad)", fontWeight: 600 }}>User not found</span>
                      <span style={{ color: "var(--soft)" }}>— check the spelling</span>
                    </>
                  )}
                  {stats.error === "fetch_failed" && <span style={{ color: "var(--bad)", fontWeight: 600 }}>Couldn&apos;t load — please try again</span>}
                </div>
              )}

              {}
              {recent.length > 0 && (
                <div className="ui" style={{ maxWidth: "560px", margin: "8px auto 0", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
                  <span style={{ fontSize: "10.5px", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", fontWeight: 700, flex: "none" }}>Recent:</span>
                  {recent.map((u) => (
                    <Hover as="button" key={u} onClick={() => setUsername(u)} base={{ fontSize: "12px", fontWeight: 500, padding: "3px 11px", borderRadius: "100px", borderWidth: "1px", borderStyle: "solid", borderColor: "var(--line)", background: "var(--surface2)", color: "var(--text)", transition: "border-color .16s,transform .16s" }} hover={{ borderColor: "var(--accent)", transform: "translateY(-1px)" }}>
                      {u}
                    </Hover>
                  ))}
                  <Hover as="button" onClick={clearRecent} base={{ fontSize: "11px", fontWeight: 600, color: "var(--soft)", padding: "3px 6px", transition: "color .16s" }} hover={{ color: "var(--bad)" }}>
                    Clear
                  </Hover>
                </div>
              )}

              {}
              <div style={{ position: "relative", marginTop: "14px", borderRadius: "20px", overflow: "hidden", background: "radial-gradient(120% 90% at 50% 8%,var(--stage),var(--stage2))", border: "1px solid var(--stage-line)" }}>
                <div style={{ position: "relative", padding: "clamp(8px,1.5vw,14px)" }}>
                  {}
                  <div style={{ maxWidth: "560px", margin: "0 auto", animation: "sf-float 8s ease-in-out infinite" }}>
                    <img src={`/api/streak?user=${encodeURIComponent(username.trim() && stats.login ? stats.login : "demo")}&theme=dark`} alt={username.trim() && stats.login ? `${stats.login} streak badge` : "StreakForge demo streak badge"} style={{ width: "100%", height: "auto", display: "block" }} />
                  </div>
                </div>
              </div>

              <div className="ui" style={{ display: "flex", gap: "13px", justifyContent: "center", flexWrap: "wrap", marginTop: "22px" }}>
                <Hover as="button" onClick={downloadSvg} base={{ display: "inline-flex", alignItems: "center", gap: "9px", padding: "13px 24px", borderRadius: "13px", background: "var(--accent)", color: "#fff", fontSize: "14.5px", fontWeight: 600, boxShadow: "0 10px 26px -12px var(--accent)", transition: "transform .18s,box-shadow .18s" }} hover={{ transform: "translateY(-2px)", boxShadow: "0 16px 34px -12px var(--accent)" }}>
                  <svg width={16} height={16} viewBox="0 0 16 16" stroke="#fff" strokeWidth={1.7} fill="none">
                    <path d="M8 2v8M5 7l3 3 3-3M3 13h10"></path>
                  </svg>
                  Download SVG
                </Hover>
                <Hover as="a" href="/dashboard" onClick={goDashboard} base={{ display: "inline-flex", alignItems: "center", gap: "9px", padding: "13px 24px", borderRadius: "13px", border: "1px solid var(--accent-2)", color: "var(--accent-2)", fontSize: "14.5px", fontWeight: 600, background: "var(--surface)", transition: "transform .18s,background .18s" }} hover={{ transform: "translateY(-2px)", background: "color-mix(in srgb,var(--accent-2) 9%,transparent)" }}>
                  <svg width={16} height={16} viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.7} fill="none">
                    <path d="M2 12V8M6 12V4M10 12V6M14 12V3"></path>
                  </svg>
                  Access Dashboard
                </Hover>
              </div>
            </div>

            {}
            <div id="dashboard" style={{ scrollMarginTop: "90px", marginTop: "clamp(34px,5vw,54px)" }}>
              <div className="ui" data-reveal="" style={{ display: "flex", alignItems: "center", gap: "11px", justifyContent: "center", marginBottom: "22px", fontSize: "12.5px", letterSpacing: ".04em", color: "var(--soft)", textTransform: "uppercase" }}>
                <span style={{ height: "1px", width: "34px", background: "var(--line)" }}></span>
                Live dashboard preview
                <span style={{ height: "1px", width: "34px", background: "var(--line)" }}></span>
              </div>

              <div data-reveal="" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "14px" }}>
                {(
                  [
                    {
                      label: "Current Streak",
                      value: String(stats.current),
                      unit: "days",
                      icon: (
                        <svg width={22} height={22} viewBox="0 0 16 16" strokeWidth={1.4} fill="currentColor">
                          <path d="M8 1c1 2.5-1 3.5-1 5.5C7 8 8 8.6 8 8.6S9.2 7.8 9.5 6c1.3 1 2.5 2.6 2.5 4.6A4 4 0 0 1 4 10.6C4 7 7 5 8 1Z"></path>
                        </svg>
                      ),
                    },
                    {
                      label: "Peak Streak",
                      value: String(stats.peak),
                      unit: "days",
                      icon: (
                        <svg width={22} height={22} viewBox="0 0 16 16" strokeWidth={1.4} fill="currentColor">
                          <path d="M4 3h8v2a3 3 0 0 1-2 2.8V9h1v1H5V9h1V7.8A3 3 0 0 1 4 5V3Zm-2 1h1v1.5A1.5 1.5 0 0 1 2 4Zm11 0h1A1.5 1.5 0 0 1 13 5.5V4ZM5 11h6v1H5z"></path>
                        </svg>
                      ),
                    },
                    {
                      label: "Contributions",
                      value: stats.contrib.toLocaleString("en-US"),
                      unit: "commits",
                      icon: (
                        <svg width={22} height={22} viewBox="0 0 16 16" strokeWidth={1.4} stroke="currentColor" fill="none">
                          <circle cx={5} cy={4} r={2}></circle>
                          <circle cx={5} cy={12} r={2}></circle>
                          <circle cx={11} cy={8} r={2}></circle>
                          <path d="M7 4h2a2 2 0 0 1 2 2M7 12h2a2 2 0 0 0 2-2"></path>
                        </svg>
                      ),
                    },
                    {
                      label: "Repositories",
                      value: String(stats.repos),
                      unit: "repos",
                      icon: (
                        <svg width={22} height={22} viewBox="0 0 16 16" strokeWidth={1.4} stroke="currentColor" fill="none">
                          <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5h4.5A1.5 1.5 0 0 1 14 6v5.5A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5v-7Z"></path>
                        </svg>
                      ),
                    },
                  ] as const
                ).map((card) => (
                  <Hover key={card.label} base={{ background: "var(--surface)", borderWidth: "1px", borderStyle: "solid", borderColor: "var(--line)", borderRadius: "18px", padding: "20px", transition: "transform .2s,border-color .2s" }} hover={{ transform: "translateY(-3px)", borderColor: "var(--accent)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span className="ui" style={{ fontSize: "11.5px", letterSpacing: ".06em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 600 }}>
                        {card.label}
                      </span>
                      <span style={{ display: "grid", placeItems: "center", color: "var(--accent-ink)" }}>{card.icon}</span>
                    </div>
                    <div style={{ marginTop: "14px" }}>
                      <span className="mono" style={{ fontSize: "34px", fontWeight: 700, color: "var(--text)" }}>
                        {card.value}
                      </span>{" "}
                      <span className="ui" style={{ fontSize: "13px", color: "var(--soft)" }}>
                        {card.unit}
                      </span>
                    </div>
                  </Hover>
                ))}
              </div>

              <div className="ui" data-reveal="" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginTop: "14px" }}>
                <Hover as="button" onClick={copyLink} base={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "9px", padding: "15px", borderRadius: "14px", borderWidth: "1px", borderStyle: "solid", borderColor: "var(--line)", background: "var(--surface)", fontSize: "14px", fontWeight: 600, color: "var(--accent-2)", transition: "border-color .2s,transform .18s" }} hover={{ borderColor: "var(--accent-2)", transform: "translateY(-2px)" }}>
                  <svg width={15} height={15} viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.6} fill="none">
                    <rect x={5} y={5} width={8} height={8} rx={1.6}></rect>
                    <path d="M3 11V4a1 1 0 0 1 1-1h7"></path>
                  </svg>
                  {copied ? "Copied!" : "Copy Link"}
                </Hover>
                <Hover as="a" href="/dashboard" onClick={goDashboard} base={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "9px", padding: "15px", borderRadius: "14px", border: "1px solid var(--accent)", background: "color-mix(in srgb,var(--accent) 8%,transparent)", fontSize: "14px", fontWeight: 600, color: "var(--accent-ink)", transition: "transform .18s,box-shadow .18s" }} hover={{ transform: "translateY(-2px)", boxShadow: "0 10px 26px -14px var(--accent)" }}>
                  <svg width={15} height={15} viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.6} fill="none">
                    <path d="M2 4h12v8H2zM2 7h12"></path>
                  </svg>
                  Watch Dashboard
                </Hover>
              </div>
            </div>
          </section>

          {}
          <section id="how" style={{ maxWidth: "1180px", margin: "0 auto", padding: "clamp(40px,6vw,80px) clamp(16px,4vw,40px)" }}>
            <div data-reveal="" style={{ maxWidth: "640px" }}>
              <div className="ui" style={{ fontSize: "12.5px", letterSpacing: ".1em", color: "var(--accent-ink)", textTransform: "uppercase", fontWeight: 600 }}>
                How it works
              </div>
              <h2 style={{ margin: "14px 0 0", fontWeight: 500, letterSpacing: "-.02em", fontSize: "clamp(28px,4.4vw,46px)", lineHeight: 1.08 }}>From commit log to a living monolith — in three steps.</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: "18px", marginTop: "clamp(28px,4vw,48px)" }}>
              {(
                [
                  {
                    n: "01",
                    t: "Sync",
                    d: "Connect your handle. We pull your full contribution graph over GraphQL in real time — no stale caches.",
                    delay: "0s",
                  },
                  {
                    n: "02",
                    t: "Forge",
                    d: "Every commit raises a block. Your year compiles into a 3D isometric monolith, rendered with custom SVG filters.",
                    delay: ".12s",
                  },
                  {
                    n: "03",
                    t: "Embed",
                    d: "Drop one line into your README. The badge updates live, forever — your city grows as you ship.",
                    delay: ".24s",
                  },
                ] as const
              ).map((step) => (
                <div key={step.n} data-reveal="" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "20px", padding: "28px", transitionDelay: step.delay }}>
                  <div className="mono" style={{ fontSize: "13px", color: "var(--accent-ink)", fontWeight: 700 }}>
                    {step.n}
                  </div>
                  <div style={{ fontSize: "21px", fontWeight: 600, letterSpacing: "-.01em", marginTop: "16px" }}>{step.t}</div>
                  <p style={{ margin: "10px 0 0", color: "var(--soft)", lineHeight: 1.55, fontSize: "15.5px" }}>{step.d}</p>
                </div>
              ))}
            </div>
          </section>

          {}
          <section id="studio" data-screen-label="Customization Studio" style={{ maxWidth: "1180px", margin: "0 auto", padding: "clamp(20px,3vw,40px) clamp(16px,4vw,40px) clamp(40px,6vw,80px)" }}>
            <div data-reveal="" style={{ position: "relative", overflow: "hidden", borderRadius: "26px", border: "1px solid var(--line)", background: "linear-gradient(140deg,var(--bg2),var(--surface))", boxShadow: "var(--shadow)" }}>
              <div style={{ position: "absolute", right: "-80px", top: "-80px", width: "340px", height: "340px", background: "radial-gradient(circle,color-mix(in srgb,var(--accent) 28%,transparent),transparent 65%)", filter: "blur(20px)", pointerEvents: "none" }}></div>
              <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: "30px", padding: "clamp(26px,4vw,52px)", alignItems: "center" }}>
                <div>
                  <div className="ui" style={{ fontSize: "12.5px", letterSpacing: ".1em", color: "var(--accent-ink)", textTransform: "uppercase", fontWeight: 600 }}>
                    Customization Studio
                  </div>
                  <h2 style={{ margin: "14px 0 0", fontWeight: 500, letterSpacing: "-.02em", fontSize: "clamp(26px,3.8vw,42px)", lineHeight: 1.1 }}>Tune every pixel. Then copy the URL.</h2>
                  <p style={{ margin: "14px 0 0", color: "var(--soft)", lineHeight: 1.6, fontSize: "16px", maxWidth: "440px" }}>30+ URL parameters control palette, glow, height-scale, rotation and grain. Every setting is a query string — shareable, versionable, reproducible.</p>
                  <Hover as="a" href="/customize" className="ui" base={{ display: "inline-flex", alignItems: "center", gap: "9px", marginTop: "24px", padding: "13px 22px", borderRadius: "13px", background: "var(--accent)", color: "#fff", fontSize: "14.5px", fontWeight: 600, boxShadow: "0 10px 28px -12px var(--accent)", transition: "transform .18s" }} hover={{ transform: "translateY(-2px)" }}>
                    Open Customization Studio
                    <svg width={16} height={16} viewBox="0 0 16 16" stroke="#fff" strokeWidth={1.7} fill="none">
                      <path d="M3 8h9M8 4l4 4-4 4"></path>
                    </svg>
                  </Hover>
                </div>
                <div className="mono" style={{ display: "flex", flexWrap: "wrap", gap: "9px", alignContent: "flex-start" }}>
                  {paramPills()}
                </div>
              </div>
            </div>
          </section>

          {}
          <section id="why" style={{ maxWidth: "1180px", margin: "0 auto", padding: "clamp(20px,3vw,40px) clamp(16px,4vw,40px) clamp(44px,6vw,88px)" }}>
            <div data-reveal="" style={{ textAlign: "center", maxWidth: "620px", margin: "0 auto" }}>
              <div className="ui" style={{ fontSize: "12.5px", letterSpacing: ".1em", color: "var(--accent-ink)", textTransform: "uppercase", fontWeight: 600 }}>
                Why StreakForge
              </div>
              <h2 style={{ margin: "14px 0 0", fontWeight: 500, letterSpacing: "-.02em", fontSize: "clamp(28px,4.4vw,46px)", lineHeight: 1.08 }}>Built for people who measure their work in commits.</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: "18px", marginTop: "clamp(30px,4vw,52px)" }}>
              {(
                [
                  {
                    delay: "0s",
                    icon: (
                      <svg width={22} height={22} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} fill="none">
                        <path d="M12 3a9 9 0 1 0 9 9M12 3v4M21 12h-4" strokeLinecap="round"></path>
                        <path d="M12 8v4l3 2"></path>
                      </svg>
                    ),
                    t: "Real-time GraphQL sync",
                    d: "Always current, never cached stale. Your badge reflects the commit you pushed two minutes ago.",
                  },
                  {
                    delay: ".14s",
                    icon: (
                      <svg width={22} height={22} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} fill="none">
                        <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z"></path>
                        <path d="m3 7 9 5 9-5M12 12v10"></path>
                      </svg>
                    ),
                    t: "Custom SVG filters",
                    d: "Glow, depth and grain rendered server-side, so the monolith looks premium in any README — light or dark.",
                  },
                  {
                    delay: ".28s",
                    icon: (
                      <svg width={22} height={22} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} fill="none">
                        <circle cx={12} cy={12} r={3}></circle>
                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"></path>
                      </svg>
                    ),
                    t: "Deep theme control",
                    d: "30+ parameters. Light, dark, or your own palette — encoded entirely in the URL and instantly reproducible.",
                  },
                ] as const
              ).map((card) => (
                <div key={card.t} data-reveal="" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "30px", transitionDelay: card.delay }}>
                  <div style={{ width: "46px", height: "46px", borderRadius: "13px", display: "grid", placeItems: "center", background: "color-mix(in srgb,var(--accent) 14%,transparent)", color: "var(--accent-ink)" }}>{card.icon}</div>
                  <h3 style={{ fontSize: "20px", fontWeight: 600, letterSpacing: "-.01em", margin: "18px 0 0" }}>{card.t}</h3>
                  <p style={{ margin: "10px 0 0", color: "var(--soft)", lineHeight: 1.55, fontSize: "15.5px" }}>{card.d}</p>
                </div>
              ))}
            </div>
          </section>

          {}
          <footer className="ui" style={{ maxWidth: "1180px", margin: "0 auto", padding: "clamp(48px,7vw,90px) clamp(16px,4vw,40px) 40px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: "30px" }}>
              <div style={{ minWidth: "180px" }}>
                <a href="#top" style={{ display: "inline-flex", alignItems: "center" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoSrc} alt="StreakForge" style={{ height: "52px", width: "156px", display: "block" }} />
                </a>
                <p style={{ margin: "16px 0 0", color: "var(--soft)", fontSize: "13.5px", lineHeight: 1.6, maxWidth: "240px" }}>GitHub contribution data, forged into premium 3D isometric monoliths. Real-time. Embeddable. Yours.</p>
              </div>
              <div>
                <div style={{ fontSize: "12px", letterSpacing: ".08em", color: "var(--faint)", textTransform: "uppercase", fontWeight: 600 }}>Product</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "11px", marginTop: "16px", fontSize: "14px", color: "var(--soft)" }}>
                  {(
                    [
                      ["Generator", "/generator"],
                      ["Compare", "/compare"],
                      ["Burnout Radar", "/burnout-analyzer"],
                      ["Customization Studio", "/customize"],
                    ] as const
                  ).map(([label, href]) => (
                    <Hover key={label} as="a" className="sf-link" href={href} base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }}>
                      {label}
                    </Hover>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", letterSpacing: ".08em", color: "var(--faint)", textTransform: "uppercase", fontWeight: 600 }}>Resources</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "11px", marginTop: "16px", fontSize: "14px", color: "var(--soft)" }}>
                  <Hover as="a" className="sf-link" href="#" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }}>
                    Documentation
                  </Hover>
                  <Hover as="a" className="sf-link" href="https://github.com/Subhooo5/StreakForge" target="_blank" rel="noopener" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }}>
                    Repository
                  </Hover>
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", letterSpacing: ".08em", color: "var(--faint)", textTransform: "uppercase", fontWeight: 600 }}>Connect</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "11px", marginTop: "16px", fontSize: "14px", color: "var(--soft)" }}>
                  <Hover as="a" className="sf-link" href="https://github.com/Subhooo5" target="_blank" rel="noopener" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }}>
                    GitHub
                  </Hover>
                  <Hover as="a" className="sf-link" href="https://discordapp.com/users/488670412096667648" target="_blank" rel="noopener" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }}>
                    Discord
                  </Hover>
                  <Hover as="a" className="sf-link" href="https://x.com/SiMpL36969" target="_blank" rel="noopener" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }}>
                    Twitter
                  </Hover>
                  <Hover as="a" className="sf-link" href="https://www.linkedin.com/in/subho1817/" target="_blank" rel="noopener" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }}>
                    LinkedIn
                  </Hover>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "14px", marginTop: "48px", paddingTop: "24px", borderTop: "1px solid var(--line)" }}>
              <span style={{ fontSize: "13px", color: "var(--faint)" }} className="mono">
                © {new Date().getFullYear()} StreakForge · Made with ❤️‍🔥 for Devs
              </span>
              <div style={{ display: "flex", gap: "14px", color: "var(--soft)" }}>
                <Hover as="a" href="https://github.com/Subhooo5" target="_blank" rel="noopener" aria-label="GitHub" base={{ transition: "color .2s" }} hover={{ color: "var(--accent-ink)" }}>
                  <svg width={19} height={19} viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.52.56.83 1.28.83 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z"></path>
                  </svg>
                </Hover>
                <Hover as="a" href="https://x.com/SiMpL36969" target="_blank" rel="noopener" aria-label="X" base={{ transition: "color .2s" }} hover={{ color: "var(--accent-ink)" }}>
                  <svg width={18} height={18} viewBox="0 0 16 16" fill="currentColor">
                    <path d="M12.6 1h2.1L10 6.4 15.5 15h-4.3L7.9 9.9 3.9 15H1.8l4.9-5.8L1.5 1h4.4l3 4.6L12.6 1Zm-.7 12.6h1.1L4.6 2.3H3.4l8.5 11.3Z"></path>
                  </svg>
                </Hover>
                <Hover as="a" href="https://www.linkedin.com/in/subho1817/" target="_blank" rel="noopener" aria-label="LinkedIn" base={{ transition: "color .2s" }} hover={{ color: "var(--accent-ink)" }}>
                  <svg width={18} height={18} viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3.4 1.5a1.4 1.4 0 1 1-.01 2.81A1.4 1.4 0 0 1 3.4 1.5ZM1.9 5.5h3V14h-3V5.5Zm5 0h2.9v1.16h.04c.4-.74 1.39-1.52 2.86-1.52 3.06 0 3.62 2 3.62 4.62V14h-3v-3.7c0-.88-.02-2.02-1.23-2.02-1.23 0-1.42.96-1.42 1.95V14h-3V5.5Z"></path>
                  </svg>
                </Hover>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {modalOpen && (
        <div onClick={() => setModalOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 200, display: "grid", placeItems: "center", padding: "clamp(16px,4vw,40px)", background: "color-mix(in srgb,var(--stage2) 82%,transparent)", backdropFilter: "blur(6px)" }}>
          <div className="ui" role="dialog" aria-modal="true" aria-label="Deploy your monolith" onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: "860px", maxHeight: "90vh", overflowY: "auto", background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: "26px", boxShadow: "var(--shadow)", padding: "clamp(22px,3.5vw,40px)", animation: "sf-fadeup .35s cubic-bezier(.16,1,.3,1)" }}>
            <div style={{ position: "absolute", top: "18px", right: "18px" }}>
              <CloseButton onClick={() => setModalOpen(false)} label="Close" />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--good)", boxShadow: "0 0 8px var(--good)", flex: "none", animation: "sf-pulse 1.8s ease-in-out infinite" }}></span>
              <span style={{ fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 700, color: "var(--accent-ink)" }}>Markdown Copied</span>
            </div>
            <h2 style={{ fontSize: "clamp(21px,3vw,30px)", fontWeight: 700, color: "var(--text)", letterSpacing: "-.01em", lineHeight: 1.15, margin: "0 44px 22px 0" }}>Your Monolith is Ready — Deploy It in 4 Steps</h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(258px,1fr))", gap: "13px" }}>
              {(
                [
                  ["01", "Open Your Profile Repo", "Navigate to github.com/YOUR_USERNAME/repo - your profile repository."],
                  ["02", "Edit README.md", "Click the pencil icon to open the file in GitHub's built-in editor."],
                  ["03", "Paste the Snippet", "Place your cursor wherever you want the monolith to appear, then paste (Ctrl+V / Cmd+V)."],
                  ["04", "Save & Ship It", 'Click "Commit changes" and visit your profile. Your 3D streak is now live.'],
                ] as const
              ).map(([n, t, b]) => (
                <div key={n} style={{ display: "flex", gap: "13px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "16px", padding: "16px 18px" }}>
                  <span className="mono" style={{ flex: "none", width: "34px", height: "34px", borderRadius: "10px", display: "grid", placeItems: "center", background: "var(--surface2)", border: "1px solid var(--line)", fontSize: "13px", fontWeight: 700, color: "var(--soft)" }}>
                    {n}
                  </span>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>{t}</div>
                    <div style={{ fontSize: "13.5px", lineHeight: 1.5, color: "var(--soft)" }}>{b}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "22px" }}>
              <div style={{ fontSize: "10.5px", letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 700, color: "var(--faint)", marginBottom: "9px" }}>Your Copied Snippet</div>
              <div className="mono" style={{ display: "flex", alignItems: "center", gap: "10px", background: "var(--surface2)", border: "1px solid var(--line)", borderRadius: "13px", padding: "14px 16px", fontSize: "13.5px", color: "var(--text)", overflowX: "auto" }}>
                <span style={{ color: "var(--faint)", flex: "none" }}>$</span>
                <span style={{ whiteSpace: "nowrap" }}>{markdownSnippet()}</span>
              </div>
              <div className="ui" style={{ marginTop: "12px", fontSize: "13px", color: "var(--accent-ink)" }}>
                Tip: Add{" "}
                <span className="mono" style={{ color: "var(--accent-ink)" }}>
                  ?accent=808080
                </span>{" "}
                to the URL to change your monolith&apos;s colour palette.
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginTop: "26px" }}>
              <Hover
                as="a"
                href="/dashboard"
                onClick={(e: React.MouseEvent) => {
                  setModalOpen(false);
                  goDashboard(e);
                }}
                base={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "9px", padding: "14px 30px", borderRadius: "13px", background: "var(--accent)", color: "#fff", fontSize: "15px", fontWeight: 600, boxShadow: "0 10px 30px -10px var(--accent)", transition: "transform .18s,box-shadow .18s" }}
                hover={{ transform: "translateY(-2px)", boxShadow: "0 16px 38px -10px var(--accent)" }}
              >
                Watch Your Dashboard
              </Hover>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
