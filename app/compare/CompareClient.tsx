"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useUrlParams } from "@/hooks/useUrlParams";
import { useRecentList } from "@/hooks/useRecentList";
import ContributionHeatmap, { buildHeatmapGrid } from "@/components/ContributionHeatmap";
import LoadingPanel from "@/components/LoadingPanel";
import { classifyFailure } from "@/utils/emptyState";
import ProfileCard from "./components/ProfileCard";
import StatRow from "./components/StatRow";
import LangRow from "./components/LangRow";
import LegendCard from "./components/LegendCard";
import TrendCard from "./components/TrendCard";
import { avatarFor, buildProfile, deriveRadar, deriveWinner, hash } from "./data/compareData";
import { compareBadgeSrc, useArena, useBattle } from "./hooks/useCompare";
import type { CompareActivityPayload } from "@/types/compare";
import { Hover } from "@/components/Hover";

const gridReactivity = 1.2;
const COMPARE_PARAMS = ["user1", "user2"];

interface RecentBattle {
  a: string;
  b: string;
}
const recentBattleKey = (m: RecentBattle) => `${m.a}|${m.b}`;
const GUESS_SECONDS = 10;
const PREDICTION_MS = 7000;

function ic(name: string, stroke = "currentColor") {
  const pp = { fill: "none" as const, stroke, strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "fire":
      return (
        <svg width={16} height={16} viewBox="0 0 16 16">
          <path d="M8 1c1 2.5-1 3.5-1 5.5C7 8 8 8.6 8 8.6S9.2 7.8 9.5 6c1.3 1 2.5 2.6 2.5 4.6A4 4 0 0 1 4 10.6C4 7 7 5 8 1Z" fill={stroke} />
        </svg>
      );
    case "trend":
      return (
        <svg width={16} height={16} viewBox="0 0 16 16">
          <path d="M2 11l4-4 3 3 5-6" {...pp} />
          <path d="M11 4h3v3" {...pp} />
        </svg>
      );
    case "contrib":
      return (
        <svg width={16} height={16} viewBox="0 0 16 16">
          <circle cx={5} cy={4} r={2} fill="none" stroke={stroke} strokeWidth={1.5} />
          <circle cx={5} cy={12} r={2} fill="none" stroke={stroke} strokeWidth={1.5} />
          <circle cx={11} cy={8} r={2} fill="none" stroke={stroke} strokeWidth={1.5} />
          <path d="M7 4h2a2 2 0 0 1 2 2M7 12h2a2 2 0 0 0 2-2" {...pp} />
        </svg>
      );
    case "repo":
      return (
        <svg width={16} height={16} viewBox="0 0 16 16">
          <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5h4.5A1.5 1.5 0 0 1 14 6v5.5A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5v-7Z" {...pp} />
        </svg>
      );
    case "star":
      return (
        <svg width={16} height={16} viewBox="0 0 16 16">
          <path d="m8 2 1.8 3.7 4.2.6-3 3 .7 4.1L8 11.5 4.3 13.4l.7-4.1-3-3 4.2-.6L8 2Z" {...pp} />
        </svg>
      );
    case "users":
      return (
        <svg width={16} height={16} viewBox="0 0 16 16">
          <circle cx={8} cy={5} r={2.4} fill="none" stroke={stroke} strokeWidth={1.5} />
          <path d="M3 13a5 5 0 0 1 10 0" {...pp} />
        </svg>
      );
    case "pr":
      return (
        <svg width={16} height={16} viewBox="0 0 16 16">
          <circle cx={4} cy={4} r={1.6} fill="none" stroke={stroke} strokeWidth={1.5} />
          <circle cx={4} cy={12} r={1.6} fill="none" stroke={stroke} strokeWidth={1.5} />
          <circle cx={12} cy={12} r={1.6} fill="none" stroke={stroke} strokeWidth={1.5} />
          <path d="M4 5.6v4.8M12 10.4V8a2 2 0 0 0-2-2H7" {...pp} />
        </svg>
      );
    case "issue":
      return (
        <svg width={16} height={16} viewBox="0 0 16 16">
          <circle cx={8} cy={8} r={5.5} fill="none" stroke={stroke} strokeWidth={1.5} />
          <circle cx={8} cy={8} r={1.4} fill={stroke} />
        </svg>
      );
    case "code":
      return (
        <svg width={16} height={16} viewBox="0 0 16 16">
          <path d="M6 4 2 8l4 4M10 4l4 4-4 4" {...pp} />
        </svg>
      );
    case "pkg":
      return (
        <svg width={16} height={16} viewBox="0 0 16 16">
          <path d="M8 1.6 14 5v6l-6 3.4L2 11V5l6-3.4ZM2 5l6 3.4L14 5M8 8.4V15" {...pp} />
        </svg>
      );
    default:
      return (
        <svg width={16} height={16} viewBox="0 0 16 16">
          <circle cx={8} cy={8} r={5} fill="none" stroke={stroke} strokeWidth={1.5} />
        </svg>
      );
  }
}

function ThemeIcon({ theme }: { theme: "light" | "dark" }) {
  if (theme === "dark") {
    return (
      <svg width={18} height={18} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} fill="none">
        <circle cx={12} cy={12} r={4.2} />
        <path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M19.4 4.6l-1.7 1.7M6.3 17.7l-1.7 1.7" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

const LABEL_NUDGE_X: Record<number, number> = { 1: 12, 4: -12 };

function RadarChart({ a, b }: { a: number[]; b: number[] }) {
  const cx = 150,
    cy = 150,
    R = 104;
  const axes = ["Volume", "Consistency", "Impact", "Collaboration", "Versatility"];
  const pt = (i: number, rad: number): [number, number] => {
    const ang = ((-90 + i * 72) * Math.PI) / 180;
    return [cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad];
  };
  const poly = (vals: number[]) =>
    vals
      .map((v, i) =>
        pt(i, Math.max(0.08, v) * R)
          .map((n) => Math.round(n * 10) / 10)
          .join(","),
      )
      .join(" ");
  return (
    <svg viewBox="0 0 300 300" width="100%" style={{ display: "block", overflow: "visible" }}>
      {[0.25, 0.5, 0.75, 1].map((rr, k) => (
        <polygon key={"r" + k} points={axes.map((_, i) => pt(i, rr * R).join(",")).join(" ")} fill="none" stroke="var(--line)" strokeWidth={1} />
      ))}
      {axes.map((_, i) => {
        const p = pt(i, R);
        return <line key={"s" + i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="var(--line2)" strokeWidth={1} />;
      })}
      <polygon points={poly(b)} fill="color-mix(in srgb, var(--pb) 22%, transparent)" stroke="var(--pb)" strokeWidth={2} strokeLinejoin="round" />
      <polygon points={poly(a)} fill="color-mix(in srgb, var(--pa) 26%, transparent)" stroke="var(--pa)" strokeWidth={2} strokeLinejoin="round" />
      {axes.map((ax, i) => {
        const p = pt(i, R + 18);
        return (
          <text key={"t" + i} x={p[0] + (LABEL_NUDGE_X[i] ?? 0)} y={p[1]} fill="var(--soft)" fontSize={10} fontFamily="'Space Grotesk',sans-serif" textAnchor="middle" dominantBaseline="middle">
            {ax}
          </text>
        );
      })}
    </svg>
  );
}

const GH_SCALE_LIGHT = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
const GH_SCALE_DARK = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];
const WEEKS = 53;

function HeatMap({ activity, dark }: { activity: CompareActivityPayload[]; dark: boolean }) {
  const scale = dark ? GH_SCALE_DARK : GH_SCALE_LIGHT;
  const grid = buildHeatmapGrid(activity, WEEKS);
  return (
    <div style={{ overflowX: "auto", paddingBottom: "4px" }}>
      <ContributionHeatmap grid={grid} showLabels minWidth="max-content" colorFor={(level) => scale[level] ?? scale[0]} />
    </div>
  );
}

function barFor(av: number, bv: number): [number, number, boolean] {
  const t = av + bv || 1;
  const ap = Math.round((av / t) * 100);
  return [ap, 100 - ap, av >= bv];
}

function Logo() {
  return (
    <svg viewBox="0 0 545 150" xmlns="http://www.w3.org/2000/svg" style={{ height: "41px", width: "150px", display: "block" }}>
      <defs>
        <radialGradient id="sparkN" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE8B8" />
          <stop offset="45%" stopColor="#FFB627" />
          <stop offset="100%" stopColor="#FF7A1A" stopOpacity="0" />
        </radialGradient>
      </defs>
      <polygon points="25.16,60.45 42.32,69.03 25.16,77.61 8.0,69.03" fill="#E0AAFF" />
      <polygon points="42.32,69.03 25.16,77.61 25.16,96.33 42.32,87.75" fill="#B14AED" />
      <polygon points="8.0,69.03 25.16,77.61 25.16,96.33 8.0,87.75" fill="#6A0DAD" />
      <polygon points="53.24,51.09 70.4,59.67 53.24,68.25 36.08,59.67" fill="#E0AAFF" />
      <polygon points="70.4,59.67 53.24,68.25 53.24,107.25 70.4,98.67" fill="#B14AED" />
      <polygon points="36.08,59.67 53.24,68.25 53.24,107.25 36.08,98.67" fill="#6A0DAD" />
      <polygon points="81.32,41.73 98.48,50.31 81.32,58.89 64.16,50.31" fill="#E0AAFF" />
      <polygon points="98.48,50.31 81.32,58.89 81.32,121.29 98.48,112.71" fill="#B14AED" />
      <polygon points="64.16,50.31 81.32,58.89 81.32,121.29 64.16,112.71" fill="#6A0DAD" />
      <circle cx="81.32" cy="41.73" r="13.26" fill="url(#sparkN)" />
      <circle cx="81.32" cy="41.73" r="3.51" fill="#FFE8B8" />
      <text x="114" y="91" fontFamily="'Space Grotesk','Styrene B',sans-serif" fontSize="62" fontWeight="700" letterSpacing="-1" fill="var(--text)">
        streakforge
      </text>
    </svg>
  );
}

function FooterLogo() {
  return (
    <svg viewBox="0 0 545 150" xmlns="http://www.w3.org/2000/svg" style={{ height: "52px", width: "156px", display: "block" }}>
      <defs>
        <radialGradient id="sparkF" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE8B8" />
          <stop offset="45%" stopColor="#FFB627" />
          <stop offset="100%" stopColor="#FF7A1A" stopOpacity="0" />
        </radialGradient>
      </defs>
      <polygon points="25.16,60.45 42.32,69.03 25.16,77.61 8.0,69.03" fill="#E0AAFF" />
      <polygon points="42.32,69.03 25.16,77.61 25.16,96.33 42.32,87.75" fill="#B14AED" />
      <polygon points="8.0,69.03 25.16,77.61 25.16,96.33 8.0,87.75" fill="#6A0DAD" />
      <polygon points="53.24,51.09 70.4,59.67 53.24,68.25 36.08,59.67" fill="#E0AAFF" />
      <polygon points="70.4,59.67 53.24,68.25 53.24,107.25 70.4,98.67" fill="#B14AED" />
      <polygon points="36.08,59.67 53.24,68.25 53.24,107.25 36.08,98.67" fill="#6A0DAD" />
      <polygon points="81.32,41.73 98.48,50.31 81.32,58.89 64.16,50.31" fill="#E0AAFF" />
      <polygon points="98.48,50.31 81.32,58.89 81.32,121.29 98.48,112.71" fill="#B14AED" />
      <polygon points="64.16,50.31 81.32,58.89 81.32,121.29 64.16,112.71" fill="#6A0DAD" />
      <circle cx="81.32" cy="41.73" r="13.26" fill="url(#sparkF)" />
      <circle cx="81.32" cy="41.73" r="3.51" fill="#FFE8B8" />
      <text x="114" y="91" fontFamily="'Space Grotesk','Styrene B',sans-serif" fontSize="62" fontWeight="700" letterSpacing="-1" fill="var(--text)">
        streakforge
      </text>
    </svg>
  );
}

export default function CompareClient() {
  const [theme, toggleTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userA, setUserA] = useState("");
  const [userB, setUserB] = useState("");
  const [guessRevealed, setGuessRevealed] = useState(false);
  const [guessIndex, setGuessIndex] = useState(0);
  const [guessCountdown, setGuessCountdown] = useState(GUESS_SECONDS);
  const [guessPaused, setGuessPaused] = useState(false);
  const [predIndex, setPredIndex] = useState(0);
  const [showdownPaused, setShowdownPaused] = useState(false);
  const [famePaused, setFamePaused] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const reduceRef = useRef(false);
  const readGridColorsRef = useRef<(() => void) | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    reduceRef.current = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const canvas = gridRef.current;
    if (!canvas) return;
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
      hotColor = "#2f5fff";
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
      const react = gridReactivity;
      ctx.clearRect(0, 0, w, h);
      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].t += 7;
        if (ripples[i].t > Math.hypot(w, h) + 80) ripples.splice(i, 1);
      }
      const off = spacing / 2;
      for (let gx = off; gx < w; gx += spacing)
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
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    if (reduceRef.current) {
      draw();
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(draw);
    }

    const root = rootRef.current;
    if (!root) return;
    const els = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
    if (reduceRef.current) {
      els.forEach((e) => e.classList.add("in"));
    } else {
      const reveal = (e: HTMLElement) => e.classList.add("in");
      const inView = (e: HTMLElement) => {
        const r = e.getBoundingClientRect();
        return r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight) * 0.96;
      };
      requestAnimationFrame(() =>
        els.forEach((e) => {
          if (inView(e)) reveal(e);
        }),
      );
      const io = new IntersectionObserver(
        (ents) => {
          ents.forEach((en) => {
            if (en.isIntersecting) {
              reveal(en.target as HTMLElement);
              io.unobserve(en.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
      );
      els.forEach((e) => {
        if (!e.classList.contains("in")) io.observe(e);
      });
      const to = setTimeout(() => els.forEach(reveal), 1200);
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseout", onLeave);
        window.removeEventListener("click", onClick);
        window.removeEventListener("touchmove", onTouch);
        io.disconnect();
        clearTimeout(to);
      };
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      window.removeEventListener("click", onClick);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  useEffect(() => {
    readGridColorsRef.current?.();
  }, [theme]);

  const runReveal = () => {
    const root = rootRef.current;
    if (!root) return;
    const els = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
    if (reduceRef.current) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (ents) => {
        ents.forEach((en) => {
          if (en.isIntersecting) {
            (en.target as HTMLElement).classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
    );
    requestAnimationFrame(() =>
      els.forEach((e) => {
        const r = e.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight * 0.96) e.classList.add("in");
        else if (!e.classList.contains("in")) io.observe(e);
      }),
    );
    if (revealTimer.current) clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => {
      els.forEach((e) => e.classList.add("in"));
      io.disconnect();
    }, 1400);
  };
  const runRevealRef = useRef(runReveal);
  runRevealRef.current = runReveal;

  const arena = useArena();
  const { recent: recentBattles, remember: rememberBattle, clear: clearRecentBattles } = useRecentList<RecentBattle>("sf-recent-comparisons", recentBattleKey);
  const onBattleComplete = useCallback(() => {
    arena.reload();
    requestAnimationFrame(() => {
      runRevealRef.current?.();
      const el = resultsRef.current;
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 76, behavior: "smooth" });
    });
  }, [arena]);
  const battle = useBattle(onBattleComplete);

  const [urlParams, writeUrl] = useUrlParams(COMPARE_PARAMS);
  const urlUserA = urlParams.user1 ?? "";
  const urlUserB = urlParams.user2 ?? "";
  const lastRunRef = useRef<string | null>(null);
  const battleRunRef = useRef(battle.run);
  battleRunRef.current = battle.run;
  const battleResetRef = useRef(battle.reset);
  battleResetRef.current = battle.reset;

  useEffect(() => {
    if (!urlUserA || !urlUserB) {
      lastRunRef.current = null;
      battleResetRef.current();
      setUserA("");
      setUserB("");
      setGuessRevealed(false);
      return;
    }
    const key = `${urlUserA.toLowerCase()}|${urlUserB.toLowerCase()}`;
    if (lastRunRef.current === key) return;
    lastRunRef.current = key;
    setUserA(urlUserA);
    setUserB(urlUserB);
    void battleRunRef.current(urlUserA, urlUserB);
  }, [urlUserA, urlUserB]);

  const compared = battle.data !== null || (battle.loading && !!urlUserA && !!urlUserB);

  useEffect(() => {
    const id = requestAnimationFrame(() => runRevealRef.current?.());
    return () => cancelAnimationFrame(id);
  }, [compared]);

  useEffect(() => {
    if (!battle.data) return;
    rememberBattle({ a: battle.data.user1.profile.username, b: battle.data.user2.profile.username });
  }, [battle.data, rememberBattle]);

  const a = battle.data ? buildProfile(battle.data.user1) : null;
  const b = battle.data ? buildProfile(battle.data.user2) : null;
  const winner = a && b ? deriveWinner(a, b) : null;
  const winnerLine = winner ? `${winner.handle} wins the showdown!` : "It's a dead heat — perfectly matched!";
  const [radarA, radarB] = battle.data ? deriveRadar(battle.data.user1, battle.data.user2) : [[], []];

  const statRows =
    a && b
      ? (
          [
            ["Current Streak", "fire", a.streak, b.streak],
            ["Peak Streak", "trend", a.peak, b.peak],
            ["Total Contributions", "contrib", a.contrib, b.contrib],
            ["Repositories", "repo", a.repos, b.repos],
            ["Stars", "star", a.stars, b.stars],
            ["Followers", "users", a.followers, b.followers],
            ["Pull Requests", "pr", a.prs, b.prs],
            ["Issues", "issue", a.issues, b.issues],
          ] as [string, string, number, number][]
        ).map(([label, iconName, av, bv]) => {
          const [ap, bp, aWin] = barFor(av, bv);
          return { label, icon: ic(iconName), aVal: (aWin ? "★ " : "") + av.toLocaleString("en-US"), bVal: (!aWin && bv > av ? "★ " : "") + bv.toLocaleString("en-US"), aColor: aWin ? "var(--accent-ink)" : "var(--text)", bColor: !aWin && bv > av ? "var(--accent-ink)" : "var(--text)", aWidthPct: ap, bWidthPct: bp, aBg: aWin ? "var(--accent)" : "var(--line)", bBg: bv > av ? "var(--accent)" : "var(--line)" };
        })
      : [];

  const langRows =
    a && b
      ? (() => {
          const pctA = new Map(a.langs.map((l) => [l.name, l.percentage]));
          const pctB = new Map(b.langs.map((l) => [l.name, l.percentage]));
          const colors = new Map([...b.langs, ...a.langs].map((l) => [l.name, l.color]));
          return [...new Set([...pctA.keys(), ...pctB.keys()])]
            .sort((x, y) => (pctA.get(y) ?? 0) + (pctB.get(y) ?? 0) - ((pctA.get(x) ?? 0) + (pctB.get(x) ?? 0)))
            .slice(0, 6)
            .map((name) => ({
              name,
              color: colors.get(name) || "var(--accent)",
              aLabel: a.user + ": " + (pctA.get(name) ?? 0) + "%",
              bLabel: b.user + ": " + (pctB.get(name) ?? 0) + "%",
              aWidthPct: pctA.get(name) ?? 0,
              bWidthPct: pctB.get(name) ?? 0,
            }));
        })()
      : [];

  const HOT_COLORS = ["#e0567a", "#d9a323", "#e0567a", "#e0567a", "#a855f7", "#d9a323"];
  const trend = (arena.data?.showdowns ?? []).map((s, i) => ({
    cat: s.cat,
    a: "@" + s.a,
    b: "@" + s.b,
    sub: s.sub,
    hot: s.hot,
    hotColor: HOT_COLORS[i % HOT_COLORS.length],
    go: () => doCompare(s.a, s.b),
    warm: () => battle.prefetch(s.a, s.b),
  }));

  const legends = (arena.data?.legends ?? []).map((l) => ({
    name: l.name,
    handle: "@" + l.login,
    role: l.role,
    followers: l.followersLabel,
    lang: l.lang,
    initial: (l.name[0] || l.login[0] || "?").toUpperCase(),
    avatarUrl: l.avatarUrl,
    avatar: avatarFor(hash(l.login.toLowerCase())),
  }));

  const tickerShowdowns = [0, 1, 2].map((i) => trend[i] ?? { a: "", b: "", sub: "" });

  const counters = arena.data?.counters;
  const countersPending = !arena.data && arena.loading;
  const STRIP_DEFS: [string, string, string, string][] = [
    [(counters?.developersCompared ?? 0).toLocaleString("en-US"), "Developers Compared", "users", "var(--accent-ink)"],
    [(counters?.reposAnalyzed ?? 0).toLocaleString("en-US"), "Repos Analysed", "repo", "var(--accent-ink)"],
    [(counters?.languagesTracked ?? 0).toLocaleString("en-US"), "Languages Tracked", "code", "var(--accent-ink)"],
    [(counters?.comparisonsToday ?? 0).toLocaleString("en-US"), "Comparisons Today", "fire", "var(--accent-ink)"],
  ];

  useEffect(() => {
    if (compared || guessRevealed || guessPaused) return;
    const id = setInterval(() => {
      setGuessCountdown((prev) => {
        if (prev <= 1) {
          setGuessIndex((i) => i + 1);
          return GUESS_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [compared, guessRevealed, guessPaused]);

  useEffect(() => {
    if (compared) return;
    const id = setInterval(() => setPredIndex((i) => i + 1), PREDICTION_MS);
    return () => clearInterval(id);
  }, [compared]);

  const guesses = arena.data?.guesses ?? [];
  const guess = guesses.length ? guesses[guessIndex % guesses.length] : null;
  const guessIcons = ["star", "pkg", "code"];
  const guessStats = (guess?.hints ?? []).map((text, i) => ({ icon: ic(guessIcons[i] ?? "code", "var(--accent-ink)"), text }));

  const predictions = arena.data?.predictions ?? [];
  const pred = predictions.length ? predictions[predIndex % predictions.length] : null;

  const doCompare = (ua: string, ub: string) => {
    const nextA = ua.trim() || userA.trim();
    const nextB = ub.trim() || userB.trim();
    setUserA(nextA);
    setUserB(nextB);
    if (!nextA || !nextB) {
      void battle.run(nextA, nextB);
      return;
    }
    writeUrl({ user1: nextA, user2: nextB }, "push");
  };
  const onCompare = () => doCompare(userA, userB);
  const onKeyCompare = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onCompare();
  };
  const tryExample = () => doCompare("torvalds", "gaearon");
  const toggleMenu = () => setMenuOpen((o) => !o);
  const onReveal = () => setGuessRevealed((v) => !v);
  const onSkip = () => {
    setGuessRevealed(false);
    setGuessCountdown(GUESS_SECONDS);
    setGuessIndex((i) => i + 1);
  };
  const onRefreshPred = () => setPredIndex((i) => i + 1);
  const onStartPred = () => {
    if (pred) doCompare(pred.a.replace("@", ""), pred.b.replace("@", ""));
  };
  const warmPred = () => {
    if (pred) battle.prefetch(pred.a.replace("@", ""), pred.b.replace("@", ""));
  };
  const year = new Date().getFullYear();

  return (
    <div ref={rootRef} className={theme === "dark" ? "sf dark" : "sf"} style={{ position: "relative", minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text)", overflowX: "hidden", transition: "background-color .5s ease,color .5s ease" }}>
      <canvas ref={gridRef} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 2 }}>
        {}
        <div className="marq" style={{ width: "100%", borderBottom: "1px solid var(--line2)", background: "var(--surface)", backdropFilter: "blur(10px)", overflow: "hidden" }}>
          <div className="marq-track" style={{ display: "flex", alignItems: "center", height: "34px", width: "max-content", animation: "sf-ticker 40s linear infinite" }}>
            {[0, 1].map((k) => (
              <div key={k} className="ui" style={{ display: "flex", alignItems: "center", gap: "34px", paddingRight: "34px", fontSize: "12.5px", letterSpacing: ".01em", color: "var(--soft)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "9px" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--accent)", animation: "sf-pulse 1.6s ease-in-out infinite" }} />
                  <span>
                    <strong style={{ color: "var(--text)", fontWeight: 600 }}>{tickerShowdowns[0].a}</strong> vs <strong style={{ color: "var(--text)", fontWeight: 600 }}>{tickerShowdowns[0].b}</strong> — {tickerShowdowns[0].sub}
                  </span>
                </span>
                <span style={{ opacity: 0.4 }}>/</span>
                <span>
                  <strong style={{ color: "var(--text)", fontWeight: 600 }}>{tickerShowdowns[1].a}</strong> vs <strong style={{ color: "var(--text)", fontWeight: 600 }}>{tickerShowdowns[1].b}</strong> — {tickerShowdowns[1].sub}
                </span>
                <span style={{ opacity: 0.4 }}>/</span>
                <span>
                  <span className="mono">{(counters?.comparisonsToday ?? 0).toLocaleString("en-US")}</span> showdowns settled today
                </span>
                <span style={{ opacity: 0.4 }}>/</span>
                <span>
                  <strong style={{ color: "var(--text)", fontWeight: 600 }}>{tickerShowdowns[2].a}</strong> vs <strong style={{ color: "var(--text)", fontWeight: 600 }}>{tickerShowdowns[2].b}</strong> — {tickerShowdowns[2].sub}
                </span>
                <span style={{ opacity: 0.4 }}>/</span>
                <span>
                  <span className="mono">{(counters?.languagesTracked ?? 0).toLocaleString("en-US")}</span> languages tracked
                </span>
              </div>
            ))}
          </div>
        </div>

        {}
        <header style={{ position: "sticky", top: 0, zIndex: 40 }}>
          <div style={{ background: "var(--surface)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--line2)" }}>
            <nav style={{ maxWidth: "1240px", margin: "0 auto", padding: "14px clamp(16px,4vw,40px)", display: "flex", alignItems: "center", gap: "28px" }}>
              <a href="/" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                <Logo />
              </a>
              <div className="nav-links ui" style={{ display: "flex", alignItems: "center", gap: "30px", marginLeft: "14px", fontSize: "14.5px", color: "var(--soft)" }}>
                <Hover as="a" href="/generator" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }} className="sf-link">
                  Generator
                </Hover>
                <a className="sf-link" href="#top" style={{ color: "var(--text)", transition: "color .2s" }}>
                  Compare
                </a>
                <Hover as="a" href="/burnout-analyzer" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }} className="sf-link">
                  Burnout Radar
                </Hover>
                <Hover as="a" href="/customize" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }} className="sf-link">
                  Customization Studio
                </Hover>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
                <Hover as="a" href="https://github.com/Subhooo5/StreakForge" target="_blank" rel="noopener" className="nav-repo ui" base={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13.5px", fontWeight: 500, padding: "9px 15px", border: "1px solid var(--line)", borderRadius: "11px", background: "var(--surface2)", transition: "transform .18s ease,border-color .18s ease,box-shadow .18s ease" }} hover={{ transform: "translateY(-1px)", border: "1px solid var(--accent)", boxShadow: "0 6px 20px -10px var(--accent)" }}>
                  <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.52.56.83 1.28.83 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                  </svg>
                  GitHub Repo
                </Hover>
                <Hover as="button" onClick={toggleTheme} aria-label="Toggle theme" base={{ width: "40px", height: "40px", display: "grid", placeItems: "center", border: "1px solid var(--line)", borderRadius: "11px", background: "var(--surface2)", transition: "transform .18s,border-color .18s" }} hover={{ transform: "translateY(-1px)", border: "1px solid var(--accent)" }}>
                  <ThemeIcon theme={theme} />
                </Hover>
                <button className="nav-burger" onClick={toggleMenu} aria-label="Menu" style={{ width: "40px", height: "40px", alignItems: "center", justifyContent: "center", border: "1px solid var(--line)", borderRadius: "11px", background: "var(--surface2)" }}>
                  <svg width={18} height={18} viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.6}>
                    <path d="M2 5h14M2 9h14M2 13h14" />
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
              <a href="#top" onClick={toggleMenu} style={{ padding: "13px 4px", borderBottom: "1px solid var(--line2)", fontSize: "15px" }}>
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

        <main id="top">
          {}
          <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "clamp(44px,7vw,86px) clamp(16px,4vw,40px) clamp(24px,3vw,38px)", textAlign: "center" }}>
            <div className="ui" data-reveal style={{ display: "inline-flex", alignItems: "center", gap: "9px", padding: "7px 15px", border: "1px solid var(--line)", borderRadius: "100px", background: "var(--surface)", fontSize: "12px", letterSpacing: ".14em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 600 }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" strokeWidth={1.8}>
                <path d="m14.5 17.5 5-5M5 7l4 4M3 21l6-6M21 3l-6 6M3 3l8 8M21 21l-8-8" strokeLinecap="round" />
              </svg>
              Developer Showdown
            </div>
            <h1 style={{ margin: "22px 0 0", fontWeight: 500, letterSpacing: "-.025em", lineHeight: 1.02, fontSize: "clamp(40px,7.4vw,80px)" }}>
              <span style={{ display: "inline-block", animation: "sf-fadeup .8s .05s both" }}>Compare</span> <span style={{ display: "inline-block", background: "linear-gradient(100deg,var(--pa),var(--pb) 50%,var(--pa))", backgroundSize: "200% auto", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent", animation: "sf-fadeup .8s .16s both, sf-shimmer 6s linear infinite" }}>Developers</span>
            </h1>
            <p data-reveal style={{ maxWidth: "560px", margin: "22px auto 0", fontSize: "clamp(16px,2vw,19px)", lineHeight: 1.6, color: "var(--soft)", transitionDelay: ".1s" }}>
              Put two GitHub profiles head-to-head. Streaks, contributions, languages — who comes out on top?
            </p>
            <div className="ui" data-reveal style={{ display: "flex", alignItems: "center", gap: "13px", flexWrap: "wrap", justifyContent: "center", marginTop: "32px", transitionDelay: ".16s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "11px", flex: 1, minWidth: "230px", maxWidth: "340px", background: "var(--surface2)", border: "1px solid var(--line)", borderRadius: "14px", padding: "0 16px", height: "54px" }}>
                <svg width={17} height={17} viewBox="0 0 16 16" fill="none" stroke="var(--faint)" strokeWidth={1.5}>
                  <circle cx={7} cy={7} r={4.5} />
                  <path d="m11 11 3 3" strokeLinecap="round" />
                </svg>
                <input className="sf-input" value={userA} onChange={(e) => setUserA(e.target.value)} onKeyDown={onKeyCompare} placeholder="GitHub username #1" style={{ flex: 1, minWidth: 0, fontSize: "15px", fontWeight: 500 }} />
              </div>
              <span className="mono" style={{ fontSize: "13px", fontWeight: 700, letterSpacing: ".1em", color: "var(--accent-ink)", flexShrink: 0 }}>
                VS
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "11px", flex: 1, minWidth: "230px", maxWidth: "340px", background: "var(--surface2)", border: "1px solid var(--line)", borderRadius: "14px", padding: "0 16px", height: "54px" }}>
                <svg width={17} height={17} viewBox="0 0 16 16" fill="none" stroke="var(--faint)" strokeWidth={1.5}>
                  <circle cx={7} cy={7} r={4.5} />
                  <path d="m11 11 3 3" strokeLinecap="round" />
                </svg>
                <input className="sf-input" value={userB} onChange={(e) => setUserB(e.target.value)} onKeyDown={onKeyCompare} placeholder="GitHub username #2" style={{ flex: 1, minWidth: 0, fontSize: "15px", fontWeight: 500 }} />
              </div>
              <Hover as="button" onClick={onCompare} base={{ display: "inline-flex", alignItems: "center", gap: "9px", height: "54px", padding: "0 26px", borderRadius: "14px", background: "var(--accent)", color: "#fff", fontSize: "15px", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, boxShadow: "0 10px 28px -10px var(--accent)", transition: "transform .18s,box-shadow .18s" }} hover={{ transform: "translateY(-2px)", boxShadow: "0 16px 38px -10px var(--accent)" }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.9}>
                  <path d="m14.5 17.5 5-5M5 7l4 4M3 21l6-6M21 3l-6 6" strokeLinecap="round" />
                </svg>
                {battle.loading ? "Comparing…" : "Compare"}
              </Hover>
            </div>
            {}
            {battle.error && (() => {
              const state = classifyFailure(battle.error, [userA, userB].filter(Boolean).join(" and ") || "those accounts");
              return (
                <div className="ui" data-reveal role="alert" style={{ margin: "16px auto 0", maxWidth: "560px", padding: "11px 15px", borderRadius: "12px", border: "1px solid color-mix(in srgb,var(--bad) 45%,var(--line))", background: "color-mix(in srgb,var(--bad) 9%,transparent)", color: "var(--bad)", fontSize: "13.5px" }}>
                  <strong style={{ fontWeight: 600 }}>{state.title}.</strong> {state.body}
                </div>
              );
            })()}
            <div className="ui" style={{ marginTop: "14px", fontSize: "12.5px", color: "var(--faint)" }}>
              Try{" "}
              <button onClick={tryExample} style={{ color: "var(--accent-ink)", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "3px" }}>
                torvalds vs gaearon
              </button>
            </div>

            {}
            {recentBattles.length > 0 && (
              <div className="ui" style={{ maxWidth: "560px", margin: "8px auto 0", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
                <span style={{ fontSize: "10.5px", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", fontWeight: 700, flex: "none" }}>Recent:</span>
                {recentBattles.map((m) => (
                  <Hover as="button" key={recentBattleKey(m)} onClick={() => doCompare(m.a, m.b)} onMouseEnter={() => battle.prefetch(m.a, m.b)} onFocus={() => battle.prefetch(m.a, m.b)} base={{ fontSize: "12px", fontWeight: 500, padding: "3px 11px", borderRadius: "100px", borderWidth: "1px", borderStyle: "solid", borderColor: "var(--line)", background: "var(--surface2)", color: "var(--text)", transition: "border-color .16s,transform .16s" }} hover={{ borderColor: "var(--accent)", transform: "translateY(-1px)" }}>
                    {m.a} vs {m.b}
                  </Hover>
                ))}
                <Hover as="button" onClick={clearRecentBattles} base={{ fontSize: "11px", fontWeight: 600, color: "var(--soft)", padding: "3px 6px", transition: "color .16s" }} hover={{ color: "var(--bad)" }}>
                  Clear
                </Hover>
              </div>
            )}
          </section>

          {}
          {battle.loading && !a && !b && (
            <section style={{ maxWidth: "1180px", margin: "0 auto", padding: "clamp(8px,2vw,20px) clamp(16px,4vw,40px) clamp(20px,3vw,30px)" }}>
              <LoadingPanel
                title={`Comparing ${urlUserA} vs ${urlUserB}`}
                description="Pulling both profiles, contribution streaks, languages and repository stats from GitHub in parallel."
              />
            </section>
          )}

          {}
          {compared && a && b && (
            <section ref={resultsRef} style={{ maxWidth: "1180px", margin: "0 auto", padding: "clamp(8px,2vw,20px) clamp(16px,4vw,40px) clamp(20px,3vw,30px)", scrollMarginTop: "80px" }}>
              {}
              <div data-reveal style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "11px", padding: "16px", borderRadius: "16px", border: "1px solid color-mix(in srgb,var(--accent) 45%,var(--line))", background: "color-mix(in srgb,var(--accent) 9%,var(--surface))", boxShadow: "0 14px 40px -22px var(--accent)" }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" strokeWidth={1.7}>
                  <path d="M7 4h10v3a5 5 0 0 1-10 0V4Z" />
                  <path d="M7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3M9 14h6M8 20h8M10 14v6M14 14v6" />
                </svg>
                <span style={{ fontSize: "clamp(17px,2.4vw,22px)", fontWeight: 600, color: "var(--accent-ink)" }}>{winnerLine}</span>
              </div>

              {}
              <div className="vs-stack" data-reveal style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", marginTop: "20px", position: "relative" }}>
                <ProfileCard profile={a} palette="pa" />
                <ProfileCard profile={b} palette="pb" />
                <div className="vs-mid mono" style={{ position: "absolute", left: "50%", top: "108px", transform: "translate(-50%,-50%)", width: "46px", height: "46px", borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--bg)", border: "1px solid color-mix(in srgb,var(--accent) 50%,var(--line))", color: "var(--accent-ink)", fontSize: "13px", fontWeight: 700, letterSpacing: ".05em", boxShadow: "0 8px 20px -8px var(--accent)" }}>
                  VS
                </div>
              </div>

              {}
              <div data-reveal style={{ marginTop: "clamp(30px,4vw,46px)" }}>
                <div className="ui" style={{ fontSize: "12px", letterSpacing: ".14em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 600, marginBottom: "16px" }}>
                  Stats Showdown
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "14px" }}>
                  {statRows.map((row, i) => (
                    <StatRow key={i} {...row} />
                  ))}
                </div>
              </div>

              {}
              <div data-reveal style={{ marginTop: "clamp(30px,4vw,46px)" }}>
                <div className="ui" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", letterSpacing: ".14em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 600, marginBottom: "16px" }}>
                  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--accent-2)" strokeWidth={1.6}>
                    <path d="M7 4h10v3a5 5 0 0 1-10 0V4Z" />
                    <path d="M9 14h6M8 20h8M10 14v6M14 14v6" />
                  </svg>
                  Developer Skills Radar
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "clamp(18px,3vw,30px)" }}>
                  <div className="ui" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "24px", fontSize: "13px", color: "var(--soft)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
                      <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "var(--pa)" }} />
                      {a.handle}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
                      <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "var(--pb)" }} />
                      {b.handle}
                    </span>
                  </div>
                  <div style={{ maxWidth: "380px", margin: "10px auto 0" }}>
                    <RadarChart a={radarA} b={radarB} />
                  </div>
                </div>
              </div>

              {}
              <div data-reveal style={{ marginTop: "clamp(30px,4vw,46px)" }}>
                <div className="ui" style={{ fontSize: "12px", letterSpacing: ".14em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 600, marginBottom: "16px" }}>
                  Language Breakdown
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "clamp(20px,3vw,32px)", display: "flex", flexDirection: "column", gap: "18px" }}>
                  {langRows.map((lr, i) => (
                    <LangRow key={i} {...lr} />
                  ))}
                </div>
              </div>

              {}
              <div data-reveal style={{ marginTop: "clamp(30px,4vw,46px)" }}>
                <div className="vs-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  {[a, b].map((p) => (
                    <div key={p.user} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "18px", padding: "20px", minWidth: 0 }}>
                      <div className="ui" style={{ fontSize: "11.5px", letterSpacing: ".07em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 600 }}>
                        {p.handleUpper}'s Activity · Last 12 Months
                      </div>
                      <div style={{ marginTop: "14px" }}>
                        <HeatMap activity={p.activity} dark={theme === "dark"} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {}
              <div data-reveal style={{ marginTop: "clamp(30px,4vw,46px)" }}>
                <div className="ui" style={{ fontSize: "12px", letterSpacing: ".14em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 600, marginBottom: "16px" }}>
                  3D Monolith Comparison
                </div>
                <div className="vs-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  {[a, b].map((p) => (
                    <div key={p.user} style={{ borderRadius: "20px", overflow: "hidden", border: "1px solid var(--stage-line)", background: "radial-gradient(120% 90% at 50% 8%,var(--stage),var(--stage2))" }}>
                      <div className="mono" style={{ padding: "12px 16px", fontSize: "11px", letterSpacing: ".06em", color: "var(--stage-soft)", borderBottom: "1px solid var(--stage-line)" }}>
                        {p.handle}
                      </div>
                      <div style={{ padding: "18px 16px 22px" }}>
                        {}
                        {/* eslint-disable-next-line @next/next/no-img-element -- same-origin generated SVG, sized by its own viewBox like the Home preview */}
                        <img src={compareBadgeSrc(p.user)} alt={`${p.user} streak badge`} style={{ width: "100%", height: "auto", display: "block" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {}
          {!compared && (
            <>
              <section style={{ maxWidth: "1180px", margin: "0 auto", padding: "clamp(24px,4vw,44px) clamp(16px,4vw,40px) clamp(20px,3vw,30px)" }}>
                <div data-reveal style={{ position: "relative", overflow: "hidden", borderRadius: "26px", border: "1px solid var(--line)", background: "linear-gradient(160deg,var(--bg2),var(--surface))", boxShadow: "var(--shadow)", padding: "clamp(26px,5vw,56px) clamp(18px,4vw,44px) clamp(30px,4vw,48px)" }}>
                  <div style={{ position: "absolute", left: "50%", top: "-60px", width: "300px", height: "300px", transform: "translateX(-50%)", background: "radial-gradient(circle,color-mix(in srgb,var(--accent) 22%,transparent),transparent 65%)", filter: "blur(30px)", pointerEvents: "none" }} />
                  <div style={{ position: "relative", textAlign: "center", maxWidth: "620px", margin: "0 auto" }}>
                    <div className="ui" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "7px 15px", border: "1px solid color-mix(in srgb,var(--accent) 40%,var(--line))", borderRadius: "100px", background: "color-mix(in srgb,var(--accent) 8%,transparent)", fontSize: "11.5px", letterSpacing: ".14em", color: "var(--accent-ink)", textTransform: "uppercase", fontWeight: 600 }}>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5L13 3Z" strokeLinejoin="round" />
                      </svg>
                      Developer Battleground
                    </div>
                    <h2 style={{ margin: "16px 0 0", fontWeight: 500, letterSpacing: "-.02em", fontSize: "clamp(26px,4.4vw,44px)", lineHeight: 1.08 }}>Step Into the Esports Arena</h2>
                    <p style={{ margin: "14px 0 0", color: "var(--soft)", lineHeight: 1.6, fontSize: "16px" }}>Select a trending showdown, test your open-source trivia skills, or look up predictions before starting your custom battle.</p>
                  </div>

                  {}
                  <div style={{ position: "relative", marginTop: "clamp(28px,4vw,44px)" }}>
                    <div className="ui" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "9px", fontSize: "12.5px", letterSpacing: ".1em", color: "var(--text)", textTransform: "uppercase", fontWeight: 700 }}>
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" strokeWidth={1.8}>
                          <path d="m14.5 17.5 5-5M5 7l4 4M3 21l6-6M21 3l-6 6" strokeLinecap="round" />
                        </svg>
                        Trending Showdowns
                      </span>
                      <span className="mono" style={{ fontSize: "11px", color: "var(--faint)" }}>
                        click to battle
                      </span>
                    </div>
                    <div className="marq" onMouseEnter={() => setShowdownPaused(true)} onMouseLeave={() => setShowdownPaused(false)} style={{ overflow: "hidden", WebkitMaskImage: "linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)", maskImage: "linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)" }}>
                      <div className="marq-track" style={{ display: "flex", gap: "14px", width: "max-content", animation: "sf-ticker 32s linear infinite", animationPlayState: showdownPaused ? "paused" : "running" }}>
                        {[...trend, ...trend].map((t, i) => (
                          <TrendCard key={i} {...t} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {}
                  <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "clamp(20px,3vw,28px)" }}>
                    {}
                    <div onMouseEnter={() => setGuessPaused(true)} onMouseLeave={() => setGuessPaused(false)} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "20px", padding: "24px", display: "flex", flexDirection: "column" }}>
                      <div className="ui" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "9px", fontSize: "12.5px", letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 700 }}>
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" strokeWidth={1.7}>
                            <circle cx={12} cy={12} r={9} />
                            <path d="M9.5 9a2.5 2.5 0 0 1 4.8.9c0 1.7-2.5 2.1-2.5 4M12 17h.01" />
                          </svg>
                          Guess the Developer
                        </span>
                        <span className="ui" style={{ fontSize: "11px", color: "var(--accent-ink)", border: "1px solid color-mix(in srgb,var(--accent) 40%,var(--line))", borderRadius: "100px", padding: "4px 10px" }}>
                          Autoplays in {guessCountdown}s
                        </span>
                      </div>
                      <div className="ui" style={{ marginTop: "20px", fontSize: "11.5px", letterSpacing: ".08em", color: "var(--faint)", textTransform: "uppercase" }}>
                        Anonymous stats:
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "14px" }}>
                        {guessStats.map((g, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: "11px", color: "var(--soft)", fontSize: "15px" }}>
                            <span style={{ color: "var(--accent-ink)", display: "inline-flex" }}>{g.icon}</span>
                            {g.text}
                          </div>
                        ))}
                      </div>
                      {guessRevealed && guess && (
                        <div className="ui" style={{ marginTop: "16px", padding: "14px", borderRadius: "14px", border: "1px solid color-mix(in srgb,var(--accent) 40%,var(--line))", background: "color-mix(in srgb,var(--accent) 9%,transparent)", textAlign: "center" }}>
                          <div style={{ fontSize: "18px", fontWeight: 600 }}>{guess.name}</div>
                          <div className="mono" style={{ fontSize: "13px", color: "var(--accent-ink)", marginTop: "4px" }}>
                            @{guess.login}
                          </div>
                        </div>
                      )}
                      <div style={{ marginTop: "auto", paddingTop: "20px" }}>
                        <div style={{ height: "4px", borderRadius: "3px", background: "var(--line)", overflow: "hidden" }}>
                          <div style={{ height: "100%", background: "linear-gradient(90deg,var(--pa),var(--accent))", transformOrigin: "left", animation: `sf-fill ${GUESS_SECONDS}s linear infinite`, animationPlayState: guessRevealed || guessPaused ? "paused" : "running" }} />
                        </div>
                        <div className="ui" style={{ display: "flex", gap: "11px", marginTop: "18px" }}>
                          <Hover as="button" onClick={onReveal} base={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "13px", borderRadius: "13px", background: "var(--accent)", color: "#fff", fontSize: "14px", fontWeight: 600, boxShadow: "0 8px 22px -12px var(--accent)", transition: "transform .18s" }} hover={{ transform: "translateY(-2px)" }}>
                            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth={1.6}>
                              <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z" />
                              <circle cx={8} cy={8} r={2} />
                            </svg>
                            {guessRevealed ? "Hide Developer" : "Reveal Developer"}
                          </Hover>
                          <Hover as="button" onClick={onSkip} base={{ padding: "13px 22px", borderRadius: "13px", border: "1px solid var(--line)", background: "var(--surface2)", fontSize: "14px", fontWeight: 600, transition: "border-color .18s" }} hover={{ border: "1px solid var(--accent)" }}>
                            Skip
                          </Hover>
                        </div>
                      </div>
                    </div>

                    {}
                    <div style={{ position: "relative", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "20px", padding: "24px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "2px", background: "linear-gradient(90deg,var(--pa),var(--pb))" }} />
                      <div className="ui" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "9px", fontSize: "12.5px", letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 700 }}>
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--pa)" strokeWidth={1.7}>
                            <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5L13 3Z" strokeLinejoin="round" />
                          </svg>
                          AI Showdown Predictions
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--pa)" }}>
                          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--pa)", animation: "sf-pulse 1.6s ease-in-out infinite" }} />
                          LIVE DATA
                        </span>
                      </div>
                      <div className="ui" style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "20px", fontSize: "13px" }}>
                        <span style={{ color: "var(--faint)" }}>CAT:</span>
                        <span className="mono" style={{ fontWeight: 700, letterSpacing: ".04em", padding: "5px 11px", borderRadius: "8px", background: "var(--surface2)", border: "1px solid var(--line)" }}>
                          {pred?.cat ?? "—"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "11px", marginTop: "16px", fontSize: "18px", fontWeight: 600 }}>
                        <span style={{ color: "var(--pa)" }}>{pred?.a ?? ""}</span>
                        <span className="mono" style={{ fontSize: "12px", color: "var(--soft)" }}>
                          vs
                        </span>
                        <span style={{ color: "var(--pb)" }}>{pred?.b ?? ""}</span>
                      </div>
                      <div style={{ marginTop: "16px", padding: "16px", borderRadius: "14px", background: "var(--surface2)", border: "1px solid var(--line2)", color: "var(--soft)", fontSize: "14.5px", lineHeight: 1.55 }}>{pred?.text ?? "Reading live GitHub figures for the next matchup…"}</div>
                      <div className="ui" style={{ display: "flex", gap: "11px", marginTop: "auto", paddingTop: "20px" }}>
                        <Hover as="button" onClick={onStartPred} onMouseEnter={warmPred} onFocus={warmPred} base={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "13px", borderRadius: "13px", border: "1px solid color-mix(in srgb,var(--pa) 50%,var(--line))", background: "color-mix(in srgb,var(--pa) 12%,transparent)", color: "var(--pa)", fontSize: "14px", fontWeight: 600, transition: "transform .18s" }} hover={{ transform: "translateY(-2px)" }}>
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
                            <path d="m14.5 17.5 5-5M5 7l4 4M3 21l6-6M21 3l-6 6" strokeLinecap="round" />
                          </svg>
                          Start Predicted Battle
                        </Hover>
                        <Hover as="button" onClick={onRefreshPred} aria-label="Refresh" base={{ width: "48px", borderRadius: "13px", border: "1px solid var(--line)", background: "var(--surface2)", display: "grid", placeItems: "center", transition: "border-color .18s,transform .3s" }} hover={{ border: "1px solid var(--pa)" }}>
                          <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
                            <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3h-3" />
                          </svg>
                        </Hover>
                      </div>
                    </div>
                  </div>

                  {}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "14px", marginTop: "clamp(20px,3vw,28px)" }}>
                    {STRIP_DEFS.map(([val, label, iconName, iconColor]) => (
                      <div key={label} className="hov-card" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "18px", padding: "22px 16px", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", color: "var(--accent-ink)" }}>{ic(iconName, iconColor)}</div>
                        {}
                        <div className="mono" style={{ fontSize: "clamp(26px,3.6vw,34px)", fontWeight: 700, marginTop: "10px", color: "var(--text)", minHeight: "1.2em", display: "grid", placeItems: "center" }}>
                          {countersPending ? (
                            <span aria-hidden="true" style={{ display: "block", width: "62px", height: "0.72em", borderRadius: "7px", background: "color-mix(in srgb,var(--soft) 18%,transparent)", animation: "sf-pulse 1.4s ease-in-out infinite" }} />
                          ) : (
                            val
                          )}
                        </div>
                        <div className="ui" style={{ fontSize: "10.5px", letterSpacing: ".08em", color: "var(--faint)", textTransform: "uppercase", marginTop: "4px", fontWeight: 600 }}>
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {}
              <section style={{ maxWidth: "1180px", margin: "0 auto", padding: "clamp(20px,3vw,30px) clamp(16px,4vw,40px) clamp(40px,6vw,70px)" }}>
                <div data-reveal style={{ position: "relative", overflow: "hidden", borderRadius: "26px", border: "1px solid var(--line)", background: "linear-gradient(160deg,var(--surface),var(--bg2))", padding: "clamp(24px,3.5vw,38px) 0" }}>
                  <div className="ui" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 clamp(18px,3vw,34px)", marginBottom: "18px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "10px", fontSize: "12.5px", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 700 }}>
                      <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#d9a323" strokeWidth={1.7}>
                        <path d="M7 4h10v3a5 5 0 0 1-10 0V4Z" />
                        <path d="M7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3M9 14h6M8 20h8M10 14v6M14 14v6" />
                      </svg>
                      GitHub Legends Walk of Fame
                    </span>
                    <span className="mono" style={{ fontSize: "11px", color: "var(--faint)" }}>
                      hover to pause
                    </span>
                  </div>
                  <div className="marq" onMouseEnter={() => setFamePaused(true)} onMouseLeave={() => setFamePaused(false)} style={{ overflow: "hidden", WebkitMaskImage: "linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent)", maskImage: "linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent)" }}>
                    <div className="marq-track" style={{ display: "flex", gap: "16px", width: "max-content", padding: "0 17px", animation: "sf-ticker 44s linear infinite", animationPlayState: famePaused ? "paused" : "running" }}>
                      {[...legends, ...legends].map((L, i) => (
                        <LegendCard key={i} {...L} />
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {}
          <footer className="ui" style={{ maxWidth: "1180px", margin: "0 auto", padding: "clamp(20px,4vw,40px) clamp(16px,4vw,40px) 40px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: "30px" }}>
              <div style={{ minWidth: "180px" }}>
                <a href="/" style={{ display: "inline-flex", alignItems: "center" }}>
                  <FooterLogo />
                </a>
                <p style={{ margin: "16px 0 0", color: "var(--soft)", fontSize: "13.5px", lineHeight: 1.6, maxWidth: "240px" }}>GitHub contribution data, forged into premium 3D isometric monoliths. Real-time. Embeddable. Yours.</p>
              </div>
              <div>
                <div style={{ fontSize: "12px", letterSpacing: ".08em", color: "var(--faint)", textTransform: "uppercase", fontWeight: 600 }}>Product</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "11px", marginTop: "16px", fontSize: "14px", color: "var(--soft)" }}>
                  <Hover as="a" href="/generator" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }} className="sf-link">
                    Generator
                  </Hover>
                  <Hover as="a" href="/compare" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }} className="sf-link">
                    Compare
                  </Hover>
                  <Hover as="a" href="/burnout-analyzer" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }} className="sf-link">
                    Burnout Radar
                  </Hover>
                  <Hover as="a" href="/customize" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }} className="sf-link">
                    Customization Studio
                  </Hover>
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", letterSpacing: ".08em", color: "var(--faint)", textTransform: "uppercase", fontWeight: 600 }}>Resources</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "11px", marginTop: "16px", fontSize: "14px", color: "var(--soft)" }}>
                  <Hover as="a" href="#" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }} className="sf-link">
                    Documentation
                  </Hover>
                  <Hover as="a" href="https://github.com/Subhooo5/StreakForge" target="_blank" rel="noopener" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }} className="sf-link">
                    Repository
                  </Hover>
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", letterSpacing: ".08em", color: "var(--faint)", textTransform: "uppercase", fontWeight: 600 }}>Connect</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "11px", marginTop: "16px", fontSize: "14px", color: "var(--soft)" }}>
                  <Hover as="a" href="https://github.com/Subhooo5" target="_blank" rel="noopener" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }} className="sf-link">
                    GitHub
                  </Hover>
                  <Hover as="a" href="https://discordapp.com/users/488670412096667648" target="_blank" rel="noopener" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }} className="sf-link">
                    Discord
                  </Hover>
                  <Hover as="a" href="https://x.com/SiMpL36969" target="_blank" rel="noopener" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }} className="sf-link">
                    Twitter
                  </Hover>
                  <Hover as="a" href="https://www.linkedin.com/in/subho1817/" target="_blank" rel="noopener" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }} className="sf-link">
                    LinkedIn
                  </Hover>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "14px", marginTop: "48px", paddingTop: "24px", borderTop: "1px solid var(--line)" }}>
              <span className="mono" style={{ fontSize: "13px", color: "var(--faint)" }}>
                © {year} StreakForge · Made with ❤️‍🔥 for Devs
              </span>
              <div style={{ display: "flex", gap: "14px", color: "var(--soft)" }}>
                <Hover as="a" href="https://github.com/Subhooo5" target="_blank" rel="noopener" aria-label="GitHub" base={{ transition: "color .2s" }} hover={{ color: "var(--accent-ink)" }}>
                  <svg width={19} height={19} viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.52.56.83 1.28.83 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                  </svg>
                </Hover>
                <Hover as="a" href="https://x.com/SiMpL36969" target="_blank" rel="noopener" aria-label="X" base={{ transition: "color .2s" }} hover={{ color: "var(--accent-ink)" }}>
                  <svg width={18} height={18} viewBox="0 0 16 16" fill="currentColor">
                    <path d="M12.6 1h2.1L10 6.4 15.5 15h-4.3L7.9 9.9 3.9 15H1.8l4.9-5.8L1.5 1h4.4l3 4.6L12.6 1Zm-.7 12.6h1.1L4.6 2.3H3.4l8.5 11.3Z" />
                  </svg>
                </Hover>
                <Hover as="a" href="https://www.linkedin.com/in/subho1817/" target="_blank" rel="noopener" aria-label="LinkedIn" base={{ transition: "color .2s" }} hover={{ color: "var(--accent-ink)" }}>
                  <svg width={18} height={18} viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3.4 1.5a1.4 1.4 0 1 1-.01 2.81A1.4 1.4 0 0 1 3.4 1.5ZM1.9 5.5h3V14h-3V5.5Zm5 0h2.9v1.16h.04c.4-.74 1.39-1.52 2.86-1.52 3.06 0 3.62 2 3.62 4.62V14h-3v-3.7c0-.88-.02-2.02-1.23-2.02-1.23 0-1.42.96-1.42 1.95V14h-3V5.5Z" />
                  </svg>
                </Hover>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
