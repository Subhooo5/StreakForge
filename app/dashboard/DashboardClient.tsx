"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useDashboardUser } from "./hooks/useDashboardUser";
import { useCIAnalytics, useDashboardOverview, usePRInsights, useRefreshNonce } from "./hooks/useDashboardData";
import TabLoader from "./components/TabLoader";
import { RANGE_DAYS, bucketLabel, toActivityBuckets, toFame, toGraphNodes, toHeatmapGrid, toHist, toLangs, toMiniBars, toProfile } from "./data/overview";
import ContributionHeatmap from "@/components/ContributionHeatmap";
import type { HeatmapGrid } from "./data/overview";
import { toCIData } from "./data/ci";
import { toPRData } from "./data/pr";
import type { CIData, GraphNode, HistData, LangSlice, DonutSegment, PRData, Profile } from "./types";
import { resolveDashboardPeriod, shiftDashboardPeriod, type DashboardPeriod } from "@/utils/dashboardPeriod";
import DeployCard from "./components/DeployCard";
import FameCard from "./components/FameCard";
import StatCard from "./components/StatCard";
import ProfileStatTile from "./components/ProfileStatTile";
import StreakStatCard from "./components/StreakStatCard";
import InsightRow from "./components/InsightRow";
import PopularRepoCard from "./components/PopularRepoCard";
import InactiveRepoRow from "./components/InactiveRepoRow";
import HistStatTile from "./components/HistStatTile";
import CIHighlightCard from "./components/CIHighlightCard";
import PRHighlightCard from "./components/PRHighlightCard";
import ContributionCity from "./components/ContributionCity";
import { Hover } from "@/components/Hover";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const gridReactivity = 1.2;

type Filters = { Personal: boolean; Contributions: boolean; Forks: boolean };
type Pt = [number, number];

const ICONS: Record<string, string> = {
  trend: "M2 11l4-4 3 3 5-6M11 4h3v3",
  tree: "M3 4h4l1.5 1.5H13v7H3V4Z",
  trophy: "M5 3h6v2a3 3 0 0 1-6 0V3ZM4 4H2.5v.5A1.5 1.5 0 0 0 4 6M12 4h1.5v.5A1.5 1.5 0 0 1 12 6M6 12h4M7 9h2v3H7z",
  compare: "M8 2v12M4 6 2 9h4L4 6Zm8 0-2 3h4l-2-3Z",
  refresh: "M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3h-3",
  share: "M4 8a2 2 0 1 0 0 .01M12 4a2 2 0 1 0 0 .01M12 12a2 2 0 1 0 0 .01M5.6 7.1 10.4 4.9M5.6 8.9l4.8 2.2",
  bolt: "M9 1 3 9h4l-1 6 6-8H8l1-6Z",
  star: "m8 1.5 1.9 4 4.3.6-3.1 3 .8 4.3L8 11.4 4.1 13.4l.8-4.3-3.1-3 4.3-.6L8 1.5Z",
  fire: "M8 1c1 2.5-1 3.5-1 5.5C7 8 8 8.6 8 8.6S9.2 7.8 9.5 6c1.3 1 2.5 2.6 2.5 4.6A4 4 0 0 1 4 10.6C4 7 7 5 8 1Z",
  code: "M6 4 2 8l4 4M10 4l4 4-4 4",
  lang: "M2 4h8M6 2v2M4 4s0 4-2 6M5 7s2 2 5 2M9 14l3-7 3 7M10.2 11.5h3.6",
  check: "M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2M5.4 8l1.8 1.8L10.6 6",
  x: "M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4",
  ban: "M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2M4 4l8 8",
  clock2: "M8 1.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13M8 4.5V8l2.5 1.6",
  merge: "M4 3.5a1.4 1.4 0 1 0 0 .01M4 5v6M4 12.5a1.4 1.4 0 1 0 0 .01M11.5 4.5a1.4 1.4 0 1 0 0 .01M11.5 6c0 3.2-3.5 2.5-7.5 5",
  branch: "M4.5 3.5a1.4 1.4 0 1 0 0 .01M4.5 5v6M4.5 12.5a1.4 1.4 0 1 0 0 .01M11.5 4.5a1.4 1.4 0 1 0 0 .01M11.5 6c0 3-3.5 2.2-7 5",
  eye: "M1.5 8S4 3.8 8 3.8 14.5 8 14.5 8 12 12.2 8 12.2 1.5 8 1.5 8ZM8 6.1a1.9 1.9 0 1 0 0 3.8a1.9 1.9 0 0 0 0-3.8",
  comment: "M2 3.5h12v7H8l-3 2.3V10.5H2v-7Z",
  box: "M8 1.6 14 5v6l-6 3.4L2 11V5l6-3.4ZM2 5l6 3.4L14 5M8 8.4V15",
  arrow: "M3 8h9M8 4l4 4-4 4",
};

function ic(name: string, col?: string) {
  return (
    <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke={col || "currentColor"} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name] || ICONS.star} />
    </svg>
  );
}

const INSIGHT_ICON: Record<string, string> = {
  Flame: "fire",
  Code: "code",
  Zap: "bolt",
  Star: "trend",
};

const EMPTY_PROFILE: Profile = {
  user: "",
  handle: "@—",
  name: "—",
  initial: "",
  avatar: "linear-gradient(135deg,var(--pa),var(--accent))",
  bio: "",
  loc: "—",
  joined: "—",
  score: 0,
  reposStr: "0",
  starsStr: "0",
  followersStr: "0",
  followingStr: "0",
  streakStr: "0",
  peakStr: "0",
  contribStr: "0",
  repos: 0,
  stars: 0,
  contrib: 0,
};

const EMPTY_HIST: HistData = {
  contributions: 0,
  activeDays: 0,
  windowDays: 0,
  windowLabel: "Last 12 months",
  current: 0,
  longest: 0,
  peak: "No activity",
  deployments: [],
  avg: "0.0",
  trendVals: [],
  monthly: [],
  yearly: [],
  popular: [],
  inactive: [],
  atOldestWindow: true,
};

const EMPTY_CI: CIData = {
  stats: [],
  donut: [{ v: 1, color: "var(--line)" }],
  donutTotal: 0,
  trendVals: [],
  trendXl: [],
  highlights: [],
  runs: [],
  health: [],
  success: 0,
  failed: 0,
  cancelled: 0,
};

const EMPTY_PR: PRData = {
  stats: [],
  trendVals: [],
  trendXl: [],
  donut: [{ v: 1, color: "var(--line)" }],
  donutTotal: 0,
  merged: 0,
  open: 0,
  closed: 0,
  highlights: [],
  review: { given: 0, received: 0, fastest: "0.0h", slowest: "0.0h" },
  repos: [],
  sizes: [],
};

export default function DashboardClient() {
  const { username } = useDashboardUser();

  const [theme, toggleTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState("Overview");
  const [range, setRange] = useState("3M");
  const [filters, setFilters] = useState<Filters>({ Personal: true, Contributions: true, Forks: true });
  const [hover, setHover] = useState<number | null>(null);
  const [shared, setShared] = useState(false);
  const [hoverBar, setHoverBar] = useState(-1);
  const [ciRange, setCiRange] = useState("Daily");
  const [prRange, setPrRange] = useState("Monthly");
  const [ciShown, setCiShown] = useState(12);
  const [cityMode, setCityMode] = useState(false);
  const [period, setPeriod] = useState<DashboardPeriod>(() => resolveDashboardPeriod({}));
  const [monthInput, setMonthInput] = useState("");
  const [yearInput, setYearInput] = useState("");
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [inactiveDays, setInactiveDays] = useState(90);
  const [nonce, bump] = useRefreshNonce(username);

  const overview = useDashboardOverview(username, nonce);
  const ciRes = useCIAnalytics(username, tab === "CI Analytics", nonce);
  const prRes = usePRInsights(username, tab === "PR Insights", nonce);

  const overviewPending = overview.loading && !overview.data && !overview.error;
  const ciPending = ciRes.loading && !ciRes.data && !ciRes.error;
  const prPending = prRes.loading && !prRes.data && !prRes.error;

  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const graphWrapRef = useRef<HTMLDivElement>(null);

  const panRef = useRef({ x: 0, y: 0, z: 1 });
  const draggingRef = useRef(false);
  const dragRef = useRef({ x: 0, y: 0 });
  const ioRef = useRef<IntersectionObserver | null>(null);
  const revealTORef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceRef = useRef(false);
  const readGridColorsRef = useRef<(() => void) | null>(null);
  const shareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyPan = useCallback(() => {
    if (gRef.current) gRef.current.setAttribute("transform", "translate(" + panRef.current.x + " " + panRef.current.y + ") scale(" + panRef.current.z + ")");
  }, []);

  const graphMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const svg = gRef.current && gRef.current.ownerSVGElement;
      let sx = 1,
        sy = 1;
      if (svg) {
        const r = svg.getBoundingClientRect();
        sx = 600 / r.width;
        sy = 460 / r.height;
      }
      panRef.current.x += (e.clientX - dragRef.current.x) * sx;
      panRef.current.y += (e.clientY - dragRef.current.y) * sy;
      dragRef.current = { x: e.clientX, y: e.clientY };
      applyPan();
    },
    [applyPan],
  );

  const graphUp = useCallback(() => {
    if (draggingRef.current) {
      draggingRef.current = false;
      const svg = gRef.current && gRef.current.ownerSVGElement;
      if (svg) svg.style.cursor = "grab";
    }
  }, []);

  const graphDown = (e: React.MouseEvent) => {
    draggingRef.current = true;
    dragRef.current = { x: e.clientX, y: e.clientY };
    const svg = e.currentTarget as unknown as SVGSVGElement;
    if (svg) svg.style.cursor = "grabbing";
  };

  const graphReset = () => {
    panRef.current = { x: 0, y: 0, z: 1 };
    applyPan();
  };

  const initReveal = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    if (ioRef.current) ioRef.current.disconnect();
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (reduceRef.current) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const reveal = (e: Element) => e.classList.add("in");
    const inView = (e: Element) => {
      const r = e.getBoundingClientRect();
      return r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight) * 0.96;
    };
    requestAnimationFrame(() =>
      els.forEach((e) => {
        if (inView(e)) reveal(e);
      }),
    );
    ioRef.current = new IntersectionObserver(
      (ents) => {
        ents.forEach((en) => {
          if (en.isIntersecting) {
            reveal(en.target);
            ioRef.current!.unobserve(en.target);
          }
        });
      },
      { threshold: 0.06, rootMargin: "0px 0px -4% 0px" },
    );
    els.forEach((e) => {
      if (!e.classList.contains("in")) ioRef.current!.observe(e);
    });
    if (revealTORef.current) clearTimeout(revealTORef.current);
    revealTORef.current = setTimeout(() => els.forEach(reveal), 1200);
  }, []);

  useEffect(() => {
    reduceRef.current = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

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
      const R = 150;
      const draw = () => {
        const react = gridReactivity || 0.9;
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
              size = 1.05,
              hot = 0;
            if (dist < R) {
              const fc = 1 - dist / R;
              px = gx + dx * fc * 0.3 * react;
              py = gy + dy * fc * 0.3 * react;
              size = 1.05 + fc * fc * 2.4 * react;
              hot = fc;
            }
            for (let k = 0; k < ripples.length; k++) {
              const rp = ripples[k];
              const rd = Math.abs(Math.hypot(rp.x - gx, rp.y - gy) - rp.t);
              if (rd < 22) {
                const rf = (1 - rd / 22) * Math.max(0, 1 - rp.t / 520);
                size += rf * 2.2;
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
      if (reduceRef.current) {
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

    window.addEventListener("mousemove", graphMove, { passive: true });
    window.addEventListener("mouseup", graphUp);

    return () => {
      gridCleanup?.();
      ioRef.current?.disconnect();
      window.removeEventListener("mousemove", graphMove);
      window.removeEventListener("mouseup", graphUp);
      if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
      if (revealTORef.current) clearTimeout(revealTORef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    readGridColorsRef.current?.();
  }, [theme]);

  useEffect(() => {
    initReveal();
  }, [tab, initReveal, overviewPending, ciPending, prPending]);

  useEffect(() => {
    if (tab !== "Overview") return;
    const el = graphWrapRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const f = e.deltaY < 0 ? 1.04 : 0.962;
      panRef.current.z = Math.max(0.5, Math.min(2.8, panRef.current.z * f));
      applyPan();
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [tab, applyPan]);

  const smoothPath = (pts: Pt[]) => {
    if (pts.length < 2) return "";
    let d = "M" + pts[0][0] + " " + pts[0][1];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i],
        p1 = pts[i],
        p2 = pts[i + 1],
        p3 = pts[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6,
        c1y = p1[1] + (p2[1] - p0[1]) / 6,
        c2x = p2[0] - (p3[0] - p1[0]) / 6,
        c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += " C" + c1x.toFixed(1) + " " + c1y.toFixed(1) + " " + c2x.toFixed(1) + " " + c2y.toFixed(1) + " " + p2[0].toFixed(1) + " " + p2[1].toFixed(1);
    }
    return d;
  };

  const donutEl = (langs: LangSlice[]) => {
    const R = 58,
      sw = 18,
      cx = 80,
      cy = 80,
      C = 2 * Math.PI * R;
    let off = 0;
    const segs = langs.map((l, i) => {
      const len = C * l.v;
      const el = <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={l.color} strokeWidth={sw} strokeDasharray={len + " " + (C - len)} strokeDashoffset={-off} transform={"rotate(-90 " + cx + " " + cy + ")"} />;
      off += len;
      return el;
    });
    const top = langs[0];
    return (
      <svg viewBox="0 0 160 160" width="100%" style={{ display: "block" }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--line)" strokeWidth={sw} />
        {segs}
        <text x={cx} y={cy - 2} textAnchor="middle" fontFamily="'JetBrains Mono',monospace" fontSize={26} fontWeight={700} fill="var(--text)">
          {top ? top.pct : "0%"}
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" fontFamily="'Space Grotesk',sans-serif" fontSize={10} letterSpacing="1" fill="var(--soft)">
          {top ? top.name.toUpperCase() : "NO DATA"}
        </text>
      </svg>
    );
  };

  const donutChart = (segs: DonutSegment[], total: number, label: string) => {
    const R = 58,
      sw = 18,
      cx = 80,
      cy = 80,
      C = 2 * Math.PI * R;
    let off = 0;
    const tot = segs.reduce((a, b) => a + b.v, 0) || 1;
    const arcs = segs.map((sg, i) => {
      const len = C * (sg.v / tot);
      const el = <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={sg.color} strokeWidth={sw} strokeDasharray={(len - 2).toFixed(1) + " " + (C - len + 2).toFixed(1)} strokeDashoffset={(-off).toFixed(1)} transform={"rotate(-90 " + cx + " " + cy + ")"} strokeLinecap="round" />;
      off += len;
      return el;
    });
    return (
      <svg viewBox="0 0 160 160" width="100%" style={{ display: "block" }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--line)" strokeWidth={sw} />
        {arcs}
        <text x={cx} y={cy - 1} textAnchor="middle" fontFamily="'JetBrains Mono',monospace" fontSize={26} fontWeight={700} fill="var(--text)">
          {String(total)}
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" fontFamily="'Space Grotesk',sans-serif" fontSize={9} letterSpacing="1" fill="var(--soft)">
          {label}
        </text>
      </svg>
    );
  };

  const areaChart = (id: string, vals: number[], xlabels: string[], color: string) => {
    const W = 640,
      H = 240,
      padL = 36,
      padB = 26,
      padT = 12;
    const pw = W - padL - 6,
      ph = H - padB - padT;
    const mx = Math.max(...vals, 1);
    const pts: Pt[] = vals.map((v, i) => [padL + (vals.length < 2 ? 0 : (i / (vals.length - 1)) * pw), padT + (1 - v / mx) * ph]);
    const line = smoothPath(pts);
    const area = pts.length > 0 ? line + " L" + pts[pts.length - 1][0].toFixed(1) + " " + (padT + ph) + " L" + padL + " " + (padT + ph) + " Z" : "";
    const grid: React.ReactNode[] = [];
    for (let k = 0; k <= 4; k++) {
      const y = padT + (ph * k) / 4;
      const val = Math.round(mx * (1 - k / 4));
      grid.push(<line key={"g" + k} x1={padL} y1={y} x2={W - 6} y2={y} stroke="var(--line2)" strokeWidth={1} />);
      grid.push(
        <text key={"gt" + k} x={padL - 8} y={y + 3} textAnchor="end" fontFamily="'JetBrains Mono',monospace" fontSize={10} fill="var(--faint)">
          {String(val)}
        </text>,
      );
    }
    const xl: React.ReactNode[] = [];
    const step = Math.max(1, Math.floor(xlabels.length / 4));
    for (let i = 0; i < xlabels.length; i += step) {
      const x = padL + (xlabels.length < 2 ? 0 : (i / (xlabels.length - 1)) * pw);
      xl.push(
        <text key={"x" + i} x={Math.min(W - 20, Math.max(padL, x))} y={H - 8} textAnchor="middle" fontFamily="'Space Grotesk',sans-serif" fontSize={10} fill="var(--faint)">
          {xlabels[i]}
        </text>,
      );
    }
    return (
      <svg viewBox={"0 0 " + W + " " + H} width="100%" style={{ display: "block" }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {grid}
        <path d={area} fill={"url(#" + id + ")"} />
        <path d={line} fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (i === pts.length - 1 ? <circle key={"pt" + i} cx={p[0]} cy={p[1]} r={3.5} fill={color} /> : null))}
        {xl}
      </svg>
    );
  };

  const clockEl = (clock: { day: string; commits: number }[]) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const cx = 130,
      cy = 130;
    const rIn = 58,
      rOut = 104;
    const vals = days.map((d) => clock.find((c) => c.day === d)?.commits ?? 0);
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    const peakIdx = vals.indexOf(max);
    const r3 = (n: number) => Math.round(n * 1000) / 1000;
    const ticks: React.ReactNode[] = [];
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const r1 = rIn - 3,
        r2 = rIn - 7;
      ticks.push(<line key={"tk" + i} x1={r3(cx + Math.cos(a) * r1)} y1={r3(cy + Math.sin(a) * r1)} x2={r3(cx + Math.cos(a) * r2)} y2={r3(cy + Math.sin(a) * r2)} stroke="var(--line)" strokeWidth={1} opacity={0.5} />);
    }
    const spokes = days.map((d, i) => {
      const ang = ((-90 + i * (360 / 7)) * Math.PI) / 180;
      const t = (vals[i] - min) / (max - min || 1);
      const len = rIn + 10 + t * (rOut - rIn - 10);
      const x1 = r3(cx + Math.cos(ang) * rIn),
        y1 = r3(cy + Math.sin(ang) * rIn),
        x2 = r3(cx + Math.cos(ang) * len),
        y2 = r3(cy + Math.sin(ang) * len);
      const lx = r3(cx + Math.cos(ang) * (rOut + 16)),
        ly = r3(cy + Math.sin(ang) * (rOut + 16));
      const top = i === peakIdx;
      return (
        <g key={i}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--accent)" strokeWidth={6} strokeLinecap="round" opacity={r3(0.45 + t * 0.5)} />
          {top ? <circle cx={x2} cy={y2} r={3.4} fill="var(--accent-ink)" /> : null}
          <text x={lx} y={ly - 2} textAnchor="middle" fontFamily="'Space Grotesk',sans-serif" fontSize={11} fontWeight={600} fill={top ? "var(--text)" : "var(--soft)"}>
            {d}
          </text>
          <text x={lx} y={ly + 12} textAnchor="middle" fontFamily="'JetBrains Mono',monospace" fontSize={11} fontWeight={700} fill="var(--soft)">
            {String(vals[i])}
          </text>
        </g>
      );
    });
    return (
      <svg viewBox="0 0 260 260" width="100%" style={{ display: "block", overflow: "visible" }}>
        <circle cx={cx} cy={cy} r={rOut} fill="none" stroke="var(--line2)" strokeWidth={1} />
        <circle cx={cx} cy={cy} r={rIn} fill="color-mix(in srgb,var(--text) 4%,transparent)" stroke="var(--line)" strokeWidth={1} />
        {ticks}
        {spokes}
        <text x={cx} y={cy - 6} textAnchor="middle" fontFamily="'Space Grotesk',sans-serif" fontSize={10} letterSpacing="2" fill="var(--soft)">
          CYCLE
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" fontFamily="'JetBrains Mono',monospace" fontSize={22} fontWeight={700} fill="var(--text)">
          7d
        </text>
      </svg>
    );
  };

  const heatmapEl = (grid: HeatmapGrid) => <ContributionHeatmap grid={grid} showLabels minWidth="770px" colorFor={(l) => (l === 0 ? "var(--line)" : "color-mix(in srgb,var(--accent) " + (l * 20 + 14) + "%,transparent)")} />;

  const graphEl = (nodes: GraphNode[]) => {
    const cx = 300,
      cy = 230;
    const f = filters;
    const vis = nodes.filter((n) => f[n.type]);
    const flow = reduceRef.current ? undefined : { animation: "sf-flow 1.1s linear infinite" };
    const links = vis.map((n, i) => {
      const active = hover === n.i;
      return <line key={"l" + i} x1={cx} y1={cy} x2={n.x} y2={n.y} stroke={n.color} strokeWidth={active ? 2 : 1.3} strokeDasharray="3 7" strokeLinecap="round" opacity={hover == null ? 0.5 : active ? 0.95 : 0.12} style={flow} />;
    });
    const dots = vis.map((n) => {
      const active = hover === n.i;
      const dim = hover != null && !active;
      return (
        <g key={"n" + n.i}>
          {active ? <circle cx={n.x} cy={n.y} r={n.rr + 8} fill={n.color} opacity={0.18} /> : null}
          <circle className="gnode" cx={n.x} cy={n.y} r={active ? n.rr + 4 : n.rr} fill={n.color} opacity={dim ? 0.32 : 1} onMouseEnter={() => setHover(n.i)} onMouseLeave={() => setHover(null)} />
        </g>
      );
    });
    const center = (
      <g key="c">
        <circle cx={cx} cy={cy} r={18} fill="var(--accent)" opacity={0.16} />
        <circle cx={cx} cy={cy} r={11} fill="var(--accent)" />
        <text x={cx} y={cy + 32} textAnchor="middle" fontFamily="'Space Grotesk',sans-serif" fontSize={12} fontWeight={600} fill="var(--text)">
          {username}
        </text>
      </g>
    );
    let tip: React.ReactNode = null;
    if (hover != null) {
      const n = nodes.find((x) => x.i === hover);
      if (n) {
        const lx = Math.min(Math.max(n.x - 60, 6), 474),
          ly = n.y < 70 ? n.y + 16 : n.y - 46;
        tip = (
          <g key="tip" style={{ pointerEvents: "none" }}>
            <rect x={lx} y={ly} width={120} height={38} rx={9} fill="var(--bg2)" stroke={n.color} strokeWidth={1} />
            <text x={lx + 10} y={ly + 16} fontFamily="'JetBrains Mono',monospace" fontSize={11} fontWeight={700} fill="var(--text)">
              {n.name.slice(0, 15)}
            </text>
            <text x={lx + 10} y={ly + 29} fontFamily="'Space Grotesk',sans-serif" fontSize={9} fill="var(--soft)">
              {n.stars.toLocaleString() + "★ · " + n.commits + " commits"}
            </text>
          </g>
        );
      }
    }
    return (
      <svg viewBox="0 0 600 460" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" onMouseDown={graphDown} style={{ display: "block", width: "100%", height: "100%", minHeight: "460px", cursor: "grab", touchAction: "none" }}>
        <g ref={gRef} transform={"translate(" + panRef.current.x + " " + panRef.current.y + ") scale(" + panRef.current.z + ")"}>
          {links}
          {center}
          {dots}
          {tip}
        </g>
      </svg>
    );
  };

  const ov = overview.data;
  const p = useMemo(() => (ov ? toProfile(ov) : EMPTY_PROFILE), [ov]);
  const activity = useMemo(() => ov?.activity ?? [], [ov]);
  const hist = useMemo(() => (ov ? toHist(ov, period, inactiveDays) : EMPTY_HIST), [ov, period, inactiveDays]);
  const seg = (cur: string, val: string, c2?: string) => ({ bg: cur === val ? c2 || "var(--accent)" : "transparent", color: cur === val ? "#fff" : "var(--soft)" });

  const actionDefs: [string, string][] = [
    ["Profile Optimizer", "trend"],
    ["Architecture Visualizer", "tree"],
    ["Achievements", "trophy"],
    ["Compare Profile", "compare"],
    ["Refresh Data", "refresh"],
    ["Share", "share"],
    ["Generate Your Own", "bolt"],
  ];
  const actions = actionDefs.map(([label, icon], i) => ({
    key: i,
    label,
    icon: ic(icon),
    border: "var(--line)",
    bg: "var(--surface)",
    color: "var(--text)",
    go: () => {
      if (label === "Compare Profile") window.location.href = "/compare";
      else if (label === "Generate Your Own") window.location.href = "/generator";
      else if (label === "Refresh Data") bump();
    },
  }));

  const tabs = ["CI Analytics", "Overview", "PR Insights"].map((t, i) => {
    const active = tab === t;
    return { key: i, label: t, go: () => setTab(t), bg: active ? "var(--text)" : "transparent", color: active ? "var(--bg)" : "var(--soft)" };
  });

  const ranges = ["1W", "1M", "3M", "1Y"].map((m, i) => ({ key: i, label: m, go: () => setRange(m), ...seg(range, m) }));

  const buckets = useMemo(() => toActivityBuckets(activity, range), [activity, range]);
  const nb = buckets.length;
  const unit = "contributions";
  const valueOf = (b: (typeof buckets)[number]) => b.count;
  const bmx = Math.max(...buckets.map(valueOf), 1);
  const peakI = buckets.findIndex((b) => valueOf(b) === bmx);
  const bars = buckets.map((b, i) => {
    const v = valueOf(b);
    const hov = hoverBar === i;
    const near = peakI >= 0 && Math.abs(i - peakI) <= 1;
    return {
      key: i,
      heightPct: Math.max(4, Math.round((v / bmx) * 100)),
      bg: hov ? "var(--accent-ink)" : near ? "var(--accent)" : "color-mix(in srgb,var(--text) 24%,transparent)",
      enter: () => setHoverBar(i),
      leave: () => setHoverBar(-1),
      dateLabel: bucketLabel(b),
      count: v.toLocaleString() + " " + unit,
      span: b.days > 1 ? "Across " + b.days + " days" : "Single day",
    };
  });
  let barTip: React.ReactNode = null;
  if (hoverBar >= 0 && bars[hoverBar]) {
    const b = bars[hoverBar];
    const pct = Math.min(86, Math.max(14, ((hoverBar + 0.5) / nb) * 100));
    barTip = (
      <div style={{ position: "absolute", left: pct + "%", top: "0", transform: "translate(-50%,-112%)", background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: "12px", padding: "11px 14px", boxShadow: "var(--shadow)", whiteSpace: "nowrap", zIndex: 6, pointerEvents: "none" }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{b.dateLabel}</div>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "12px", color: "var(--accent-ink)", marginTop: "4px" }}>{b.count}</div>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "11.5px", color: "var(--soft)", marginTop: "2px" }}>{b.span}</div>
      </div>
    );
  }

  const langs = useMemo(() => (ov ? toLangs(ov) : []), [ov]);
  const donut = donutEl(langs);

  const miniA = useMemo(() => toMiniBars(activity, 1), [activity]);
  const miniB = useMemo(() => toMiniBars(activity, 7), [activity]);
  const miniC = useMemo(() => toMiniBars(activity, 30), [activity]);

  const nodes = useMemo(() => (ov ? toGraphNodes(ov) : []), [ov]);
  const graph = graphEl(nodes);
  const filterColorOf: Record<string, string> = { Personal: "var(--pb)", Contributions: "var(--pc)", Forks: "var(--pe)" };
  const filterList = (["Personal", "Contributions", "Forks"] as const).map((t, i) => {
    const colorOf = filterColorOf[t];
    const on = filters[t];
    return {
      key: i,
      label: t,
      dot: colorOf,
      go: () => setFilters((st) => ({ ...st, [t]: !st[t] })),
      bg: on ? "color-mix(in srgb," + colorOf + " 16%,transparent)" : "var(--surface2)",
      color: on ? colorOf : "var(--faint)",
      border: on ? "color-mix(in srgb," + colorOf + " 40%,var(--line))" : "var(--line)",
    };
  });
  const vis = nodes.filter((n) => filters[n.type]);
  const topStar = vis.slice().sort((a, b) => b.stars - a.stars)[0];
  const topCon = vis.slice().sort((a, b) => b.commits - a.commits)[0];
  const g = {
    size: vis.length,
    topStar: topStar?.name ?? "—",
    topStarCount: (topStar?.stars ?? 0).toLocaleString(),
    topContrib: topCon?.name ?? "—",
    topContribCount: (topCon?.commits ?? 0).toLocaleString(),
    hint: "Hover any node for repo detail · click to focus.",
  };

  const fame = useMemo(() => (ov ? toFame(ov) : []), [ov]);

  const insights = (ov?.insights ?? []).map((i, idx) => ({
    key: idx,
    icon: ic(INSIGHT_ICON[i.icon] ?? "fire", "var(--accent-ink)"),
    text: i.text,
  }));

  const isOverview = tab === "Overview",
    isCI = tab === "CI Analytics",
    isPR = tab === "PR Insights";
  const ci = useMemo(() => (ciRes.data ? toCIData(ciRes.data, ciRange) : EMPTY_CI), [ciRes.data, ciRange]);
  const pr = useMemo(() => (prRes.data ? toPRData(prRes.data, prRange) : EMPTY_PR), [prRes.data, prRange]);
  const ciRanges = ["Daily", "Weekly", "Monthly"].map((m, i) => ({ key: i, label: m, go: () => setCiRange(m), ...seg(ciRange, m) }));
  const prRanges = ["Weekly", "Monthly"].map((m, i) => ({ key: i, label: m, go: () => setPrRange(m), ...seg(prRange, m) }));
  const ciRunsShown = ci.runs.slice(0, ciShown);
  const ciDonut = donutChart(ci.donut, ci.donutTotal, "RUNS");
  const prDonut = donutChart(pr.donut, pr.donutTotal, "TOTAL");
  const ciHasMore = ciShown < ci.runs.length;
  const heatGrid = useMemo(() => toHeatmapGrid(activity), [activity]);

  const chartCaption = "Commit frequency · " + range;
  const shareLabel = shared ? "Link copied!" : "Share Your Pulse";
  const cityBtnBorder = cityMode ? "transparent" : "color-mix(in srgb,var(--pa) 45%,var(--line))";
  const cityBtnBg = cityMode ? "var(--pa)" : "color-mix(in srgb,var(--pa) 10%,transparent)";
  const cityBtnColor = cityMode ? "#fff" : "var(--pa)";
  const activeRes = isCI ? ciRes : isPR ? prRes : overview;
  const statusError = activeRes.error;
  const tabPending = isCI ? ciPending : isPR ? prPending : overviewPending;
  const statusLoading = activeRes.loading && !activeRes.data && !tabPending;

  const onShare = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
    } catch {
    }
    setShared(true);
    if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
    shareTimerRef.current = setTimeout(() => setShared(false), 1600);
  };
  const year = new Date().getFullYear();

  return (
    <div className={theme === "dark" ? "sf dashboard dark" : "sf dashboard"} ref={rootRef} style={{ position: "relative", minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text)", overflowX: "hidden", transition: "background-color .5s ease,color .5s ease" }}>
      <canvas ref={gridRef} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 2 }}>
        {}
        <div style={{ width: "100%", borderBottom: "1px solid var(--line2)", background: "var(--surface)", backdropFilter: "blur(10px)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", height: "34px", width: "max-content", animation: "sf-ticker 44s linear infinite" }}>
            {[0, 1].map((dup) => (
              <div key={dup} className="ui" aria-hidden={dup === 1 ? "true" : undefined} style={{ display: "flex", alignItems: "center", gap: "34px", paddingRight: "34px", fontSize: "12.5px", letterSpacing: ".01em", color: "var(--soft)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "9px" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--accent)", animation: "sf-pulse 1.6s ease-in-out infinite" }} />
                  <span>Live developer dashboards</span>
                </span>
                <span style={{ opacity: 0.4 }}>/</span>
                <span>Ecosystem graph · activity landscape · hall of fame</span>
                <span style={{ opacity: 0.4 }}>/</span>
                <span>
                  <span className="mono">{p.contribStr}</span> contributions this year
                </span>
                <span style={{ opacity: 0.4 }}>/</span>
                <span>Real-time GraphQL sync</span>
              </div>
            ))}
          </div>
        </div>

        {}
        <Navbar theme={theme} toggleTheme={toggleTheme} active="dashboard" />

        <main id="top" data-screen-label="User Dashboard" style={{ maxWidth: "1320px", margin: "0 auto", padding: "clamp(22px,3vw,38px) clamp(16px,4vw,40px) 0" }}>
          {}
          <div className="ui" data-reveal style={{ display: "flex", justifyContent: "center", marginTop: "22px" }}>
            <div style={{ display: "flex", gap: "4px", padding: "5px", border: "1px solid var(--line)", borderRadius: "14px", background: "var(--surface)" }}>
              {tabs.map((t) => (
                <button key={t.key} onClick={t.go} style={{ padding: "10px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: 600, background: t.bg, color: t.color, transition: "background .16s" }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {}
          {(statusError || statusLoading) && (
            <div className="ui" data-reveal style={{ display: "flex", justifyContent: "center", marginTop: "18px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "9px", padding: "9px 16px", borderRadius: "100px", border: "1px solid " + (statusError ? "color-mix(in srgb,var(--bad) 40%,var(--line))" : "var(--line)"), background: statusError ? "color-mix(in srgb,var(--bad) 10%,transparent)" : "var(--surface)", fontSize: "13px", color: statusError ? "var(--bad)" : "var(--soft)" }}>
                {statusError ? null : <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--accent)", animation: "sf-pulse 1.6s ease-in-out infinite" }} />}
                {statusError ?? "Loading live GitHub data…"}
              </span>
            </div>
          )}

          {isOverview && overviewPending && <TabLoader label="Fetching Dashboard Data" />}

          {isOverview && !overviewPending && (
            <>
              {}
              <div className="dash-grid" data-reveal style={{ display: "grid", gridTemplateColumns: "300px 1fr 300px", gap: "18px", marginTop: "clamp(22px,3vw,36px)" }}>
                {}
                <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "26px", textAlign: "center", boxShadow: "var(--shadow)" }}>
                    <div style={{ width: "96px", height: "96px", borderRadius: "50%", margin: "0 auto", background: p.avatar, display: "grid", placeItems: "center", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "38px", color: "#fff", boxShadow: "0 0 0 4px color-mix(in srgb,var(--pa) 28%,transparent)" }}>{p.initial}</div>
                    <div style={{ fontSize: "23px", fontWeight: 600, letterSpacing: "-.01em", marginTop: "16px" }}>{p.name}</div>
                    <div className="mono" style={{ fontSize: "14px", color: "var(--accent-ink)", marginTop: "5px" }}>
                      {p.handle}
                    </div>
                    <div style={{ color: "var(--soft)", fontSize: "14.5px", marginTop: "10px" }}>{p.bio}</div>
                    <div className="ui" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "18px", marginTop: "12px", fontSize: "12.5px", color: "var(--faint)" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                        <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4}>
                          <path d="M8 1.5c2.5 0 4.5 2 4.5 4.5 0 3-4.5 8.5-4.5 8.5S3.5 9 3.5 6A4.5 4.5 0 0 1 8 1.5Z" />
                          <circle cx="8" cy="6" r="1.6" />
                        </svg>
                        {p.loc}
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                        <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4}>
                          <rect x="2.5" y="3" width="11" height="11" rx="2" />
                          <path d="M2.5 6h11M6 1.5v3M10 1.5v3" />
                        </svg>
                        {p.joined}
                      </span>
                    </div>
                    <div style={{ marginTop: "20px", textAlign: "left" }}>
                      <div className="ui" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontSize: "11px", letterSpacing: ".1em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 600 }}>Developer Score</span>
                        <span className="mono" style={{ fontSize: "20px", fontWeight: 700 }}>
                          {p.score}
                        </span>
                      </div>
                      <div style={{ marginTop: "8px", height: "8px", borderRadius: "5px", background: "var(--line)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: "5px", background: "linear-gradient(90deg,var(--pa),var(--accent))", width: `${p.score}%` }} />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "11px", marginTop: "16px" }}>
                      <ProfileStatTile
                        value={p.reposStr}
                        label="Repos"
                        icon={
                          <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4}>
                            <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5h4.5A1.5 1.5 0 0 1 14 6v5.5A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5v-7Z" />
                          </svg>
                        }
                      />
                      <ProfileStatTile
                        value={p.starsStr}
                        label="Stars"
                        icon={
                          <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4}>
                            <path d="m8 2 1.8 3.7 4.2.6-3 3 .7 4.1L8 11.5 4.3 13.4l.7-4.1-3-3 4.2-.6L8 2Z" />
                          </svg>
                        }
                      />
                      <ProfileStatTile
                        value={p.followersStr}
                        label="Followers"
                        icon={
                          <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4}>
                            <circle cx="8" cy="5" r="2.4" />
                            <path d="M3 13a5 5 0 0 1 10 0" />
                          </svg>
                        }
                      />
                      <ProfileStatTile
                        value={p.followingStr}
                        label="Following"
                        icon={
                          <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4}>
                            <circle cx="8" cy="5" r="2.4" />
                            <path d="M3 13a5 5 0 0 1 10 0M12 6.5h3M13.5 5v3" />
                          </svg>
                        }
                      />
                    </div>
                  </div>

                  {}
                  <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "24px" }}>
                    <div className="ui" style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "13px", letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 700 }}>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--pa)" strokeWidth={1.7}>
                        <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5L13 3Z" strokeLinejoin="round" />
                      </svg>
                      AI Insights
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
                      {insights.map((i) => (
                        <InsightRow key={i.key} icon={i.icon} text={i.text} />
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    {}
                    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "clamp(18px,2.2vw,24px)", boxShadow: "var(--shadow)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "16px", fontWeight: 600, letterSpacing: "-.01em" }}>
                        <span style={{ display: "inline-flex", color: "var(--accent-ink)" }}>
                          <svg width={19} height={19} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4}>
                            <path d="M8 1.5c2.6 1 4 3.4 4 6 0 1.4-.5 2.6-1.2 3.4L8 13l-2.8-2.1C4.5 10.1 4 8.9 4 7.5c0-2.6 1.4-5 4-6Z" />
                            <circle cx="8" cy="6.5" r="1.4" />
                            <path d="M5.4 11 4 14l2.5-.8M10.6 11 12 14l-2.5-.8" strokeLinecap="round" />
                          </svg>
                        </span>
                        Production Deployments
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "11px", marginTop: "16px" }}>
                        {hist.deployments.map((d) => (
                          <DeployCard key={d.key} name={d.name} url={d.url} ago={d.ago} status={d.status} statusColor={d.statusColor} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {}
                <div style={{ display: "flex", flexDirection: "column", gap: "18px", minWidth: 0 }}>
                  {}
                  <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "clamp(18px,2.4vw,26px)", boxShadow: "var(--shadow)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: "21px", fontWeight: 600, letterSpacing: "-.01em" }}>Activity Landscape</div>
                        <div className="ui" style={{ fontSize: "13px", color: "var(--soft)", marginTop: "3px" }}>
                          {chartCaption}
                        </div>
                      </div>
                      <div className="ui" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", gap: "2px", padding: "4px", border: "1px solid var(--line)", borderRadius: "11px", background: "var(--surface2)" }}>
                          {ranges.map((r) => (
                            <button key={r.key} onClick={r.go} style={{ padding: "8px 12px", borderRadius: "8px", fontSize: "12.5px", fontWeight: 600, background: r.bg, color: r.color }}>
                              {r.label}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => setCityMode((c) => !c)} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "9px 15px", borderRadius: "11px", fontSize: "12.5px", fontWeight: 600, border: "1px solid " + cityBtnBorder, background: cityBtnBg, color: cityBtnColor, transition: "all .18s" }}>
                          <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
                            <path d="M8 1.6 14 5v6l-6 3.4L2 11V5l6-3.4Z" />
                          </svg>
                          3D City
                        </button>
                      </div>
                    </div>
                    {!cityMode && (
                      <div style={{ position: "relative", marginTop: "24px" }}>
                        {barTip}
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "200px" }}>
                          {bars.map((b) => (
                            <div key={b.key} onMouseEnter={b.enter} onMouseLeave={b.leave} style={{ flex: 1, borderRadius: "3px 3px 1px 1px", background: b.bg, cursor: "pointer", transformOrigin: "bottom", animation: "sf-grow .5s cubic-bezier(.2,.8,.2,1) both", height: `${b.heightPct}%` }} />
                          ))}
                        </div>
                      </div>
                    )}
                    {cityMode && (
                      <div style={{ position: "relative", marginTop: "18px", borderRadius: "18px", overflow: "hidden", background: "radial-gradient(130% 110% at 50% 0%,#10182b,#070a12 70%)", border: "1px solid rgba(120,150,220,0.16)", minHeight: "420px" }}>
                        <ContributionCity data={activity} />
                      </div>
                    )}
                  </div>

                  {}
                  <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
                    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "24px" }}>
                      <div style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-.01em" }}>Top Languages</div>
                      <div style={{ maxWidth: "200px", margin: "18px auto 0" }}>{donut}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "9px", marginTop: "18px" }}>
                        {langs.map((l, i) => (
                          <div key={i} className="ui" style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px" }}>
                            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: l.color }} />
                            <span style={{ flex: 1 }}>{l.name}</span>
                            <span className="mono" style={{ color: "var(--soft)" }}>
                              {l.pct}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "24px" }}>
                      <div style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-.01em" }}>Commit Clock</div>
                      <div className="ui" style={{ fontSize: "13px", color: "var(--soft)", marginTop: "3px" }}>
                        Weekly activity rhythm
                      </div>
                      <div style={{ maxWidth: "230px", margin: "14px auto 0" }}>{clockEl(ov?.commitClock ?? [])}</div>
                    </div>
                  </div>

                  {}
                  <div data-reveal style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "clamp(18px,2.4vw,26px)", boxShadow: "var(--shadow)" }}>
                    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                      <div>
                        <div style={{ fontSize: "20px", fontWeight: 600, letterSpacing: "-.01em" }}>Historical Heatmap</div>
                        <div className="ui" style={{ fontSize: "13px", color: "var(--soft)", marginTop: "3px" }}>
                          Contribution density · last 12 months
                        </div>
                      </div>
                      <div className="ui mono" style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "11px", color: "var(--faint)" }}>
                        Less
                        <span style={{ display: "inline-flex", gap: "3px" }}>
                          <span style={{ width: "12px", height: "12px", borderRadius: "2.5px", background: "var(--line)" }} />
                          <span style={{ width: "12px", height: "12px", borderRadius: "2.5px", background: "color-mix(in srgb,var(--accent) 34%,transparent)" }} />
                          <span style={{ width: "12px", height: "12px", borderRadius: "2.5px", background: "color-mix(in srgb,var(--accent) 54%,transparent)" }} />
                          <span style={{ width: "12px", height: "12px", borderRadius: "2.5px", background: "color-mix(in srgb,var(--accent) 74%,transparent)" }} />
                          <span style={{ width: "12px", height: "12px", borderRadius: "2.5px", background: "var(--accent)" }} />
                        </span>
                        More
                      </div>
                    </div>
                    <div style={{ overflowX: "auto", marginTop: "20px", paddingBottom: "4px" }}>{heatmapEl(heatGrid)}</div>
                  </div>

                  {}
                  <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "clamp(18px,2.4vw,26px)", boxShadow: "var(--shadow)", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" }}>
                      <div>
                        <span className="ui" style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "5px 12px", borderRadius: "100px", border: "1px solid color-mix(in srgb,var(--accent) 32%,var(--line))", background: "color-mix(in srgb,var(--accent) 9%,transparent)", fontSize: "10.5px", letterSpacing: ".1em", color: "var(--accent-ink)", textTransform: "uppercase", fontWeight: 700 }}>
                          <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
                            <rect x="2.5" y="3" width="11" height="11" rx="2" />
                            <path d="M2.5 6h11M6 1.5v3M10 1.5v3" />
                          </svg>
                          Historical Trend View
                        </span>
                        <div style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-.01em", marginTop: "12px", maxWidth: "380px", textWrap: "pretty" }}>Explore long-term activity patterns across months and years</div>
                        <div className="ui" style={{ fontSize: "12.5px", color: "var(--soft)", marginTop: "5px" }}>
                          {hist.windowLabel} · {hist.windowDays} days
                        </div>
                      </div>
                      <div className="ui" style={{ display: "flex", gap: "8px" }}>
                        <Hover as="button" onClick={() => setPeriod((pd) => shiftDashboardPeriod(pd, "prev"))} base={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 13px", borderRadius: "10px", borderWidth: "1px", borderStyle: "solid", borderColor: "var(--line)", background: "var(--surface2)", fontSize: "12.5px", fontWeight: 600, color: "var(--soft)", transition: "border-color .18s" }} hover={{ borderColor: "var(--accent)", color: "var(--text)" }}>
                          <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7}>
                            <path d="M10 3 5 8l5 5" />
                          </svg>
                          Previous
                        </Hover>
                        <Hover as="button" onClick={() => setPeriod((pd) => shiftDashboardPeriod(pd, "next"))} base={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 13px", borderRadius: "10px", borderWidth: "1px", borderStyle: "solid", borderColor: "var(--line)", background: "var(--surface2)", fontSize: "12.5px", fontWeight: 600, color: "var(--soft)", transition: "border-color .18s" }} hover={{ borderColor: "var(--accent)", color: "var(--text)" }}>
                          Next
                          <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7}>
                            <path d="M6 3l5 5-5 5" />
                          </svg>
                        </Hover>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: "11px", marginTop: "18px" }}>
                      <HistStatTile
                        valueColor="var(--accent-ink)"
                        value={String(hist.contributions)}
                        sub={"Peak day: " + hist.peak}
                        label={
                          <div className="ui" style={{ fontSize: "10px", letterSpacing: ".08em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 600 }}>
                            Contributions
                          </div>
                        }
                      />
                      <HistStatTile
                        value={String(hist.activeDays)}
                        sub={"of " + hist.windowDays + " days"}
                        label={
                          <div className="ui" style={{ fontSize: "10px", letterSpacing: ".08em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 600 }}>
                            Active Days
                          </div>
                        }
                      />
                      <HistStatTile
                        value={String(hist.current)}
                        sub="days"
                        label={
                          <div className="ui" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", letterSpacing: ".08em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 600 }}>
                            <svg width={11} height={11} viewBox="0 0 16 16" fill="currentColor" style={{ color: "var(--accent-2)" }}>
                              <path d="M8 1c1 2.5-1 3.5-1 5.5C7 8 8 8.6 8 8.6S9.2 7.8 9.5 6c1.3 1 2.5 2.6 2.5 4.6A4 4 0 0 1 4 10.6C4 7 7 5 8 1Z" />
                            </svg>
                            Current Streak
                          </div>
                        }
                      />
                      <HistStatTile
                        value={String(hist.longest)}
                        sub="days"
                        label={
                          <div className="ui" style={{ fontSize: "10px", letterSpacing: ".08em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 600 }}>
                            Longest Streak
                          </div>
                        }
                      />
                    </div>

                    <div style={{ marginTop: "16px", padding: "16px", border: "1px solid var(--line2)", borderRadius: "16px", background: "var(--surface2)" }}>
                      <div className="ui" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600 }}>Streak Trend</span>
                        <span style={{ fontSize: "12px", color: "var(--soft)" }}>
                          Avg/day{" "}
                          <span className="mono" style={{ color: "var(--text)", fontWeight: 600 }}>
                            {hist.avg}
                          </span>
                        </span>
                      </div>
                      <div style={{ marginTop: "12px" }}>{areaChart("histTrend", hist.trendVals.length ? hist.trendVals : [0], Array(52).fill(""), "var(--accent)")}</div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "18px" }}>
                      <div>
                        <div className="ui" style={{ fontSize: "12px", letterSpacing: ".06em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 700 }}>
                          Monthly Summary
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "13px" }}>
                          {hist.monthly.map((m, i) => (
                            <div key={i} className="ui" style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11.5px" }}>
                              <span style={{ width: "54px", flex: "none", color: "var(--soft)" }}>{m.m}</span>
                              <span style={{ flex: 1, height: "7px", borderRadius: "5px", background: "var(--line)", overflow: "hidden" }}>
                                <span style={{ display: "block", height: "100%", borderRadius: "5px", background: "var(--accent)", width: `${m.widthPct}%` }} />
                              </span>
                              <span className="mono" style={{ width: "24px", textAlign: "right", color: "var(--soft)" }}>
                                {m.v}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="ui" style={{ fontSize: "12px", letterSpacing: ".06em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 700 }}>
                          Yearly Summary
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "13px" }}>
                          {hist.yearly.map((y, i) => (
                            <div key={i} className="ui" style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11.5px" }}>
                              <span style={{ width: "40px", flex: "none", color: "var(--soft)" }}>{y.y}</span>
                              <span style={{ flex: 1, height: "7px", borderRadius: "5px", background: "var(--line)", overflow: "hidden" }}>
                                <span style={{ display: "block", height: "100%", borderRadius: "5px", background: "var(--accent-2)", width: `${y.widthPct}%` }} />
                              </span>
                              <span className="mono" style={{ width: "30px", textAlign: "right", color: "var(--soft)" }}>
                                {y.v}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {}
                {}
                <div style={{ display: "flex", flexDirection: "column", gap: "18px", minHeight: 0 }}>
                  <StreakStatCard
                    label="Current Streak"
                    iconColor="var(--accent-2)"
                    value={p.streakStr}
                    sub="consecutive days"
                    mini={miniA}
                    icon={
                      <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 1c1 2.5-1 3.5-1 5.5C7 8 8 8.6 8 8.6S9.2 7.8 9.5 6c1.3 1 2.5 2.6 2.5 4.6A4 4 0 0 1 4 10.6C4 7 7 5 8 1Z" />
                      </svg>
                    }
                  />
                  <StreakStatCard
                    label="Peak Streak"
                    iconColor="var(--accent-ink)"
                    value={p.peakStr}
                    sub="longest run"
                    mini={miniB}
                    icon={
                      <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
                        <path d="M2 11l4-4 3 3 5-6M11 4h3v3" />
                      </svg>
                    }
                  />
                  <StreakStatCard
                    label="Contributions"
                    iconColor="var(--accent-ink)"
                    value={p.contribStr}
                    sub="last 12 months"
                    mini={miniC}
                    icon={
                      <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <circle cx="4" cy="8" r="1.6" />
                        <circle cx="12" cy="8" r="1.6" />
                        <path d="M5.6 8h4.8" />
                      </svg>
                    }
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: "18px", flex: 1, minHeight: 0 }}>
                    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "clamp(18px,2.2vw,24px)", boxShadow: "var(--shadow)", flex: "none" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "10px", fontSize: "16px", fontWeight: 600, letterSpacing: "-.01em" }}>
                          <span style={{ color: "var(--accent-ink)" }}>
                            <svg width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
                              <path d="M3 2.5h7A1.5 1.5 0 0 1 11.5 4v9.5H4A1 1 0 0 1 3 12.5V2.5Z" />
                              <path d="M11.5 11.5H4a1 1 0 0 0-1 1" />
                            </svg>
                          </span>
                          Popular Repositories
                        </span>
                        <span className="ui" style={{ padding: "4px 10px", borderRadius: "100px", border: "1px solid var(--line2)", background: "var(--surface2)", fontSize: "10px", letterSpacing: ".06em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 600 }}>
                          Popular
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "11px", marginTop: "16px" }}>
                        {hist.popular.map((r) => (
                          <PopularRepoCard key={r.key} name={r.name} stars={r.stars} desc={r.desc} />
                        ))}
                      </div>
                    </div>

                    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "clamp(18px,2.2vw,24px)", boxShadow: "var(--shadow)", flex: 1, minHeight: "220px", display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ display: "inline-flex", color: "var(--accent-2)" }}>
                          <svg width={20} height={20} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4}>
                            <path d="M3 3h4L3 7h4M8.5 6h3l-3 3h3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <div style={{ fontSize: "15.5px", fontWeight: 600, letterSpacing: "-.01em", lineHeight: 1.15 }}>Inactive Repository Reminder</div>
                      </div>
                      <p className="ui" style={{ margin: "12px 0 0", fontSize: "12px", lineHeight: 1.45, color: "var(--soft)" }}>
                        Repositories without recent pushes in your selected window.
                      </p>
                      <div className="ui" style={{ display: "flex", gap: "8px", marginTop: "13px" }}>
                        <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", border: "1px solid var(--line)", borderRadius: "10px", background: "var(--surface2)", padding: "9px 13px", fontSize: "12.5px", color: "var(--soft)" }}>
                          <select value={inactiveDays} onChange={(e) => setInactiveDays(Number(e.target.value))} style={{ flex: 1, minWidth: 0, background: "transparent", color: "var(--soft)", fontSize: "12.5px", border: "none", padding: 0 }}>
                            {[30, 60, 90, 180, 365].map((d) => (
                              <option key={d} value={d}>
                                {d} Days
                              </option>
                            ))}
                          </select>
                          <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ flex: "none", pointerEvents: "none" }}>
                            <path d="M4 6l4 4 4-4" />
                          </svg>
                        </div>
                        <Hover as="button" onClick={bump} aria-label="Refresh" base={{ width: "38px", height: "38px", flex: "none", borderRadius: "10px", borderWidth: "1px", borderStyle: "solid", borderColor: "var(--line)", background: "var(--surface2)", display: "grid", placeItems: "center", color: "var(--soft)", transition: "border-color .18s" }} hover={{ borderColor: "var(--accent)", color: "var(--text)" }}>
                          <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
                            <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3h-3" />
                          </svg>
                        </Hover>
                      </div>
                      {}
                      <div style={{ position: "relative", flex: 1, minHeight: "120px", marginTop: "14px" }}>
                        <div className="list-scroll" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", gap: "9px", maxHeight: "none", overflowY: "auto" }}>
                          {hist.inactive.length === 0 ? (
                            <div className="ui" style={{ fontSize: "12px", color: "var(--faint)" }}>
                              No repositories have gone quiet in this window.
                            </div>
                          ) : (
                            hist.inactive.map((r) => <InactiveRepoRow key={r.key} name={r.name} date={r.date} days={r.days} />)
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {}
              <div data-reveal style={{ marginTop: "clamp(34px,5vw,56px)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "11px", fontSize: "clamp(22px,3vw,30px)", fontWeight: 600, letterSpacing: "-.02em" }}>
                      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" strokeWidth={1.6}>
                        <circle cx="12" cy="12" r="9" />
                        <path d="M3 12h18M12 3c2.5 2.4 2.5 15.6 0 18M12 3c-2.5 2.4-2.5 15.6 0 18" />
                      </svg>
                      Repository Ecosystem
                    </div>
                    <p className="ui" style={{ margin: "8px 0 0", color: "var(--soft)", fontSize: "15px" }}>
                      {"A force-directed map of every repo in this developer's orbit."}
                    </p>
                  </div>
                  <div className="ui" style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
                    {filterList.map((f) => (
                      <button key={f.key} onClick={f.go} style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "8px 15px", borderRadius: "100px", fontSize: "12.5px", fontWeight: 700, background: f.bg, color: f.color, border: "1px solid " + f.border }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: f.dot }} />
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="graph-grid" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "18px", marginTop: "22px" }}>
                  <div ref={graphWrapRef} style={{ position: "relative", background: "radial-gradient(120% 100% at 50% 0%,var(--bg2),var(--surface))", border: "1px solid var(--line)", borderRadius: "22px", overflow: "hidden", minHeight: "460px" }}>
                    {graph}
                    <Hover as="button" onClick={graphReset} className="ui" base={{ position: "absolute", right: "14px", top: "14px", display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 13px", borderRadius: "10px", borderWidth: "1px", borderStyle: "solid", borderColor: "var(--line)", background: "var(--surface2)", fontSize: "12px", fontWeight: 600, color: "var(--soft)", transition: "border-color .18s" }} hover={{ borderColor: "var(--accent)", color: "var(--text)" }}>
                      <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
                        <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3h-3" />
                      </svg>
                      Reset view
                    </Hover>
                    <div className="ui" style={{ position: "absolute", left: "14px", bottom: "12px", fontSize: "11.5px", color: "var(--faint)", pointerEvents: "none" }}>
                      Drag to pan · scroll to zoom · hover a node
                    </div>
                  </div>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "26px", alignSelf: "start" }}>
                    <div className="ui" style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 700 }}>
                      <span style={{ width: "28px", height: "28px", borderRadius: "8px", display: "grid", placeItems: "center", background: "color-mix(in srgb,var(--accent) 16%,transparent)", color: "var(--accent-ink)" }}>
                        <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
                          <path d="M8 1.6 14 5v6l-6 3.4L2 11V5l6-3.4ZM2 5l6 3.4L14 5M8 8.4V15" />
                        </svg>
                      </span>
                      Graph Insights
                    </div>
                    <div style={{ marginTop: "22px" }}>
                      <div className="ui" style={{ fontSize: "11px", letterSpacing: ".08em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 600 }}>
                        Ecosystem Size
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: 600, marginTop: "6px" }}>
                        {g.size}{" "}
                        <span className="ui" style={{ fontSize: "14px", color: "var(--soft)", fontWeight: 400 }}>
                          repositories
                        </span>
                      </div>
                    </div>
                    <div style={{ height: "1px", background: "var(--line2)", margin: "20px 0" }} />
                    <div>
                      <div className="ui" style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "11px", letterSpacing: ".08em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 600 }}>
                        <svg width={13} height={13} viewBox="0 0 16 16" fill="var(--accent-2)">
                          <path d="m8 1.5 1.9 4 4.3.6-3.1 3 .8 4.3L8 14.4 4.1 16.4l.8-4.3-3.1-3 4.3-.6L8 1.5Z" />
                        </svg>
                        Most Starred
                      </div>
                      <div style={{ fontSize: "18px", fontWeight: 600, marginTop: "8px" }}>{g.topStar}</div>
                      <div className="mono" style={{ fontSize: "12.5px", color: "var(--soft)", marginTop: "3px" }}>
                        {g.topStarCount} stars
                      </div>
                    </div>
                    <div style={{ height: "1px", background: "var(--line2)", margin: "20px 0" }} />
                    <div>
                      <div className="ui" style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "11px", letterSpacing: ".08em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 600 }}>
                        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="var(--pa)" strokeWidth={1.8}>
                          <path d="M13 3 4 14h7l-1 7 9-11h-7l1-7Z" strokeLinejoin="round" />
                        </svg>
                        Top Contribution
                      </div>
                      <div style={{ fontSize: "18px", fontWeight: 600, marginTop: "8px" }}>{g.topContrib}</div>
                      <div className="mono" style={{ fontSize: "12.5px", color: "var(--soft)", marginTop: "3px" }}>
                        {g.topContribCount} commits
                      </div>
                    </div>
                    <div style={{ height: "1px", background: "var(--line2)", margin: "20px 0" }} />
                    <p className="ui" style={{ margin: 0, fontSize: "12.5px", color: "var(--faint)", lineHeight: 1.5, textAlign: "center" }}>
                      {g.hint}
                    </p>
                  </div>
                </div>
              </div>

              {}
              <div data-reveal style={{ marginTop: "clamp(34px,5vw,56px)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "11px", fontSize: "clamp(22px,3vw,30px)", fontWeight: 600, letterSpacing: "-.02em" }}>
                  <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#d9a323" strokeWidth={1.6}>
                    <path d="M7 4h10v3a5 5 0 0 1-10 0V4Z" />
                    <path d="M7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3M9 14h6M8 20h8M10 14v6M14 14v6" />
                  </svg>
                  GitHub Hall of Fame
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: "16px", marginTop: "22px" }}>
                  {fame.map((f) => (
                    <FameCard key={f.key} badge={f.badge} color={f.color} icon={ic(f.iconName, f.color)} metricLabel={f.metricLabel} metric={f.metric} sub={f.sub} repo={f.repo} repoNote={f.repoNote} avatar={f.avatar} initial="" />
                  ))}
                </div>
              </div>
            </>
          )}
          {}
          {isCI && ciPending && <TabLoader label="Fetching CI Analytics" />}

          {isCI && !ciPending && (
            <div style={{ marginTop: "clamp(22px,3vw,36px)", display: "flex", flexDirection: "column", gap: "18px" }}>
              {}
              <div data-reveal style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "14px" }}>
                {ci.stats.map((c) => (
                  <StatCard key={c.key} icon={ic(c.iconName, c.color)} label={c.label} value={c.value} color={c.color} />
                ))}
              </div>

              {}
              <div className="two-col" data-reveal style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "18px" }}>
                <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "24px", boxShadow: "var(--shadow)" }}>
                  <div style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-.01em" }}>Workflow Status</div>
                  <div className="ui" style={{ fontSize: "13px", color: "var(--soft)", marginTop: "3px" }}>
                    Breakdown of pipeline results
                  </div>
                  <div style={{ maxWidth: "200px", margin: "20px auto 0" }}>{ciDonut}</div>
                  <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap", marginTop: "18px" }}>
                    <span className="ui" style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "12.5px", color: "var(--soft)" }}>
                      <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "var(--pc)" }} />
                      Success ({ci.success})
                    </span>
                    <span className="ui" style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "12.5px", color: "var(--soft)" }}>
                      <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "var(--pd)" }} />
                      Failed ({ci.failed})
                    </span>
                    <span className="ui" style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "12.5px", color: "var(--soft)" }}>
                      <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "var(--pe)" }} />
                      Cancelled ({ci.cancelled})
                    </span>
                  </div>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "24px", boxShadow: "var(--shadow)", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-.01em" }}>Run Volume</div>
                      <div className="ui" style={{ fontSize: "13px", color: "var(--soft)", marginTop: "3px" }}>
                        Workflow runs over time
                      </div>
                    </div>
                    <div className="ui" style={{ display: "flex", gap: "2px", padding: "4px", border: "1px solid var(--line)", borderRadius: "11px", background: "var(--surface2)" }}>
                      {ciRanges.map((r) => (
                        <button key={r.key} onClick={r.go} style={{ padding: "8px 13px", borderRadius: "8px", fontSize: "12.5px", fontWeight: 600, background: r.bg, color: r.color }}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: "18px" }}>{areaChart("ciTrend", ci.trendVals, ci.trendXl, "var(--pb)")}</div>
                </div>
              </div>

              {}
              <div data-reveal style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: "14px" }}>
                {ci.highlights.map((h) => (
                  <CIHighlightCard key={h.key} icon={ic(h.iconName, h.color)} color={h.color} label={h.label} value={h.value} sub={h.sub} />
                ))}
              </div>

              {}
              <div className="two-col" data-reveal style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: "18px" }}>
                <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "clamp(18px,2.2vw,24px)", boxShadow: "var(--shadow)" }}>
                  <div style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-.01em" }}>Recent Workflow Runs</div>
                  <div className="ui" style={{ fontSize: "13px", color: "var(--soft)", marginTop: "3px" }}>
                    Latest pipeline executions
                  </div>
                  <div style={{ overflowX: "auto", marginTop: "18px" }}>
                    <div style={{ minWidth: "560px" }}>
                      <div className="ui" style={{ display: "grid", gridTemplateColumns: "1.5fr 1.6fr .8fr .9fr .7fr .9fr", gap: "10px", padding: "0 4px 12px", borderBottom: "1px solid var(--line)", fontSize: "10.5px", letterSpacing: ".06em", color: "var(--faint)", textTransform: "uppercase", fontWeight: 600 }}>
                        <span>Workflow</span>
                        <span>Repository</span>
                        <span>Branch</span>
                        <span>Status</span>
                        <span>Time</span>
                        <span>Event</span>
                      </div>
                      {ciRunsShown.map((r) => (
                        <div key={r.key} style={{ display: "grid", gridTemplateColumns: "1.5fr 1.6fr .8fr .9fr .7fr .9fr", gap: "10px", alignItems: "center", padding: "12px 4px", borderBottom: "1px solid var(--line2)" }}>
                          <span style={{ fontSize: "13px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.workflow}</span>
                          <span className="mono" style={{ fontSize: "12px", color: "var(--soft)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {r.repo}
                          </span>
                          <span className="mono" style={{ fontSize: "11px", color: "var(--faint)" }}>
                            {r.branch}
                          </span>
                          <span>
                            <span className="ui" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "100px", background: "color-mix(in srgb," + r.statusColor + " 14%,transparent)", color: r.statusColor, fontSize: "11px", fontWeight: 600 }}>
                              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: r.statusColor }} />
                              {r.status}
                            </span>
                          </span>
                          <span className="mono" style={{ fontSize: "12px", color: "var(--soft)" }}>
                            {r.duration}
                          </span>
                          <span className="mono" style={{ fontSize: "11px", color: "var(--faint)" }}>
                            {r.event}
                          </span>
                        </div>
                      ))}
                      {ciHasMore && (
                        <Hover as="button" onClick={() => setCiShown((c) => c + 12)} className="ui" base={{ width: "100%", marginTop: "14px", padding: "12px", borderRadius: "12px", borderWidth: "1px", borderStyle: "solid", borderColor: "var(--line)", background: "var(--surface2)", fontSize: "13px", fontWeight: 600, color: "var(--accent-ink)", transition: "border-color .18s" }} hover={{ borderColor: "var(--accent)" }}>
                          Show more runs
                        </Hover>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "clamp(18px,2.2vw,24px)", boxShadow: "var(--shadow)" }}>
                  <div style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-.01em" }}>Repository CI Health</div>
                  <div className="ui" style={{ fontSize: "13px", color: "var(--soft)", marginTop: "3px" }}>
                    Ranked by success rate
                  </div>
                  <div style={{ overflowX: "auto", marginTop: "18px" }}>
                    <div style={{ minWidth: "440px" }}>
                      <div className="ui" style={{ display: "grid", gridTemplateColumns: "1.3fr 1.4fr .7fr .8fr .8fr", gap: "10px", padding: "0 4px 12px", borderBottom: "1px solid var(--line)", fontSize: "10.5px", letterSpacing: ".06em", color: "var(--faint)", textTransform: "uppercase", fontWeight: 600 }}>
                        <span>Repository</span>
                        <span>Success</span>
                        <span>Runs</span>
                        <span>Avg</span>
                        <span>Last</span>
                      </div>
                      {ci.health.map((h) => (
                        <div key={h.key} style={{ display: "grid", gridTemplateColumns: "1.3fr 1.4fr .7fr .8fr .8fr", gap: "10px", alignItems: "center", padding: "13px 4px", borderBottom: "1px solid var(--line2)" }}>
                          <span className="mono" style={{ fontSize: "12.5px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {h.repo}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ flex: 1, height: "6px", borderRadius: "4px", background: "var(--line)", overflow: "hidden" }}>
                              <span style={{ display: "block", height: "100%", borderRadius: "4px", background: h.barColor, width: `${h.widthPct}%` }} />
                            </span>
                            <span className="mono" style={{ fontSize: "11.5px", color: "var(--soft)" }}>
                              {h.rateStr}
                            </span>
                          </span>
                          <span className="mono" style={{ fontSize: "12px", color: "var(--soft)" }}>
                            {h.runs}
                          </span>
                          <span className="mono" style={{ fontSize: "12px", color: "var(--soft)" }}>
                            {h.avg}
                          </span>
                          <span>
                            <span className="ui" style={{ display: "inline-flex", padding: "3px 9px", borderRadius: "100px", background: "color-mix(in srgb," + h.lastColor + " 14%,transparent)", color: h.lastColor, fontSize: "10.5px", fontWeight: 600 }}>
                              {h.last}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {}
          {isPR && prPending && <TabLoader label="Fetching PR Insights" />}

          {isPR && !prPending && (
            <div style={{ marginTop: "clamp(22px,3vw,36px)", display: "flex", flexDirection: "column", gap: "18px" }}>
              {}
              <div data-reveal style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: "14px" }}>
                {pr.stats.map((c) => (
                  <div key={c.key} className="hov-card" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "18px", padding: "22px", boxShadow: "var(--shadow)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                      <span style={{ display: "inline-flex", flex: "none", color: c.color, transform: "scale(1.35)", transformOrigin: "center" }}>{ic(c.iconName, c.color)}</span>
                      <span className="ui" style={{ fontSize: "11px", letterSpacing: ".06em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 600 }}>
                        {c.label}
                      </span>
                    </div>
                    <div className="mono" style={{ fontSize: "34px", fontWeight: 700, marginTop: "14px", lineHeight: 1, color: c.color }}>
                      {c.value}
                    </div>
                    {c.delta && (
                      <div className="ui" style={{ display: "inline-block", marginTop: "10px", padding: "4px 10px", borderRadius: "100px", background: "color-mix(in srgb,var(--pc) 14%,transparent)", color: "var(--pc)", fontSize: "11.5px", fontWeight: 600 }}>
                        {c.delta}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {}
              <div className="two-col" data-reveal style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "18px" }}>
                <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "24px", boxShadow: "var(--shadow)", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-.01em" }}>Activity Trends</div>
                      <div className="ui" style={{ fontSize: "13px", color: "var(--soft)", marginTop: "3px" }}>
                        Pull requests over time
                      </div>
                    </div>
                    <div className="ui" style={{ display: "flex", gap: "2px", padding: "4px", border: "1px solid var(--line)", borderRadius: "11px", background: "var(--surface2)" }}>
                      {prRanges.map((r) => (
                        <button key={r.key} onClick={r.go} style={{ padding: "8px 13px", borderRadius: "8px", fontSize: "12.5px", fontWeight: 600, background: r.bg, color: r.color }}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: "18px" }}>{areaChart("prTrend", pr.trendVals, pr.trendXl, "var(--pb)")}</div>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "24px", boxShadow: "var(--shadow)" }}>
                  <div style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-.01em" }}>Status Distribution</div>
                  <div className="ui" style={{ fontSize: "13px", color: "var(--soft)", marginTop: "3px" }}>
                    Breakdown of PR states
                  </div>
                  <div style={{ maxWidth: "190px", margin: "20px auto 0" }}>{prDonut}</div>
                  <div style={{ display: "flex", justifyContent: "center", gap: "14px", flexWrap: "wrap", marginTop: "18px" }}>
                    <span className="ui" style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "12.5px", color: "var(--soft)" }}>
                      <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "var(--pc)" }} />
                      Merged ({pr.merged})
                    </span>
                    <span className="ui" style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "12.5px", color: "var(--soft)" }}>
                      <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "var(--pb)" }} />
                      Open ({pr.open})
                    </span>
                    <span className="ui" style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "12.5px", color: "var(--soft)" }}>
                      <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "var(--pd)" }} />
                      Closed ({pr.closed})
                    </span>
                  </div>
                </div>
              </div>

              {}
              <div data-reveal style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "14px" }}>
                {pr.highlights.map((h) => (
                  <PRHighlightCard key={h.key} icon={ic(h.iconName, h.color)} color={h.color} label={h.label} metric={h.metric} desc={h.desc} />
                ))}
              </div>

              {}
              <div className="two-col" data-reveal style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "18px" }}>
                <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "clamp(18px,2.2vw,24px)", boxShadow: "var(--shadow)" }}>
                  <div style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-.01em" }}>Review Analytics</div>
                  <div className="ui" style={{ fontSize: "13px", color: "var(--soft)", marginTop: "3px" }}>
                    Peer review participation &amp; speed
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "18px" }}>
                    <div style={{ background: "var(--surface2)", border: "1px solid var(--line2)", borderRadius: "14px", padding: "18px" }}>
                      <div className="ui" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", letterSpacing: ".06em", color: "var(--pa)", textTransform: "uppercase", fontWeight: 600 }}>
                        <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
                          <path d="M1.5 8S4 3.8 8 3.8 14.5 8 14.5 8 12 12.2 8 12.2 1.5 8 1.5 8Z" />
                          <circle cx="8" cy="8" r="1.9" />
                        </svg>
                        Reviews Given
                      </div>
                      <div className="mono" style={{ fontSize: "32px", fontWeight: 700, marginTop: "10px" }}>
                        {pr.review.given}
                      </div>
                    </div>
                    <div style={{ background: "var(--surface2)", border: "1px solid var(--line2)", borderRadius: "14px", padding: "18px" }}>
                      <div className="ui" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", letterSpacing: ".06em", color: "var(--pd)", textTransform: "uppercase", fontWeight: 600 }}>
                        <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
                          <path d="M2 3.5h12v7H8l-3 2.3V10.5H2v-7Z" />
                        </svg>
                        Reviews Received
                      </div>
                      <div className="mono" style={{ fontSize: "32px", fontWeight: 700, marginTop: "10px" }}>
                        {pr.review.received}
                      </div>
                    </div>
                    <div style={{ background: "var(--surface2)", border: "1px solid var(--line2)", borderRadius: "14px", padding: "18px" }}>
                      <div className="ui" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", letterSpacing: ".06em", color: "var(--pc)", textTransform: "uppercase", fontWeight: 600 }}>
                        <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
                          <path d="M2 11l4-4 3 3 5-6" />
                        </svg>
                        Fastest Review
                      </div>
                      <div className="mono" style={{ fontSize: "32px", fontWeight: 700, marginTop: "10px" }}>
                        {pr.review.fastest}
                      </div>
                    </div>
                    <div style={{ background: "var(--surface2)", border: "1px solid var(--line2)", borderRadius: "14px", padding: "18px" }}>
                      <div className="ui" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", letterSpacing: ".06em", color: "var(--pe)", textTransform: "uppercase", fontWeight: 600 }}>
                        <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
                          <path d="M8 4.5V8l2.5 1.6M8 1.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13" />
                        </svg>
                        Slowest Review
                      </div>
                      <div className="mono" style={{ fontSize: "32px", fontWeight: 700, marginTop: "10px" }}>
                        {pr.review.slowest}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "clamp(18px,2.2vw,24px)", boxShadow: "var(--shadow)" }}>
                  <div style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-.01em" }}>Repository Performance</div>
                  <div className="ui" style={{ fontSize: "13px", color: "var(--soft)", marginTop: "3px" }}>
                    PR metrics by repository
                  </div>
                  <div style={{ overflowX: "auto", marginTop: "18px" }}>
                    <div style={{ minWidth: "440px" }}>
                      <div className="ui" style={{ display: "grid", gridTemplateColumns: "1.7fr .6fr 1.3fr .7fr", gap: "10px", padding: "0 4px 12px", borderBottom: "1px solid var(--line)", fontSize: "10.5px", letterSpacing: ".06em", color: "var(--faint)", textTransform: "uppercase", fontWeight: 600 }}>
                        <span>Repository</span>
                        <span>PRs</span>
                        <span>Merge Rate</span>
                        <span>Reviews</span>
                      </div>
                      {pr.repos.map((r) => (
                        <div key={r.key} style={{ display: "grid", gridTemplateColumns: "1.7fr .6fr 1.3fr .7fr", gap: "10px", alignItems: "center", padding: "13px 4px", borderBottom: "1px solid var(--line2)" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "13.5px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.repo}</div>
                            <div className="ui mono" style={{ fontSize: "11px", color: "var(--faint)" }}>
                              {r.owner}
                            </div>
                          </div>
                          <span className="mono" style={{ fontSize: "13px" }}>
                            {r.prs}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ flex: 1, height: "6px", borderRadius: "4px", background: "var(--line)", overflow: "hidden" }}>
                              <span style={{ display: "block", height: "100%", borderRadius: "4px", background: r.barColor, width: `${r.widthPct}%` }} />
                            </span>
                            <span className="mono" style={{ fontSize: "11.5px", color: "var(--soft)" }}>
                              {r.mergeStr}
                            </span>
                          </span>
                          <span className="mono" style={{ fontSize: "13px", color: "var(--soft)" }}>
                            {r.reviews}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {}
          <Footer theme={theme} active="dashboard" docsHref="/docs" />
        </main>
      </div>
    </div>
  );
}
