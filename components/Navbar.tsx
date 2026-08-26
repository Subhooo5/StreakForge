"use client";

import { useState } from "react";
import { Hover } from "./Hover";
import type { Theme } from "@/hooks/useTheme";

export const NAV_LINKS = [
  { key: "generator", label: "Generator", href: "/generator" },
  { key: "compare", label: "Compare", href: "/compare" },
  { key: "burnout-analyzer", label: "Burnout Radar", href: "/burnout-analyzer" },
  { key: "customize", label: "Customization Studio", href: "/customize" },
] as const;

export type NavKey = "home" | "dashboard" | "docs" | (typeof NAV_LINKS)[number]["key"];

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

export const REPO_URL = "https://github.com/Subhooo5/StreakForge";

const GITHUB_MARK = (
  <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.52.56.83 1.28.83 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
);

export function themeToggleIcon(theme: Theme) {
  return theme === "dark" ? (
    <svg width={18} height={18} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} fill="none">
      <circle cx={12} cy={12} r={4.2} />
      <path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M19.4 4.6l-1.7 1.7M6.3 17.7l-1.7 1.7" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

export function logoSrcFor(theme: Theme) {
  return theme === "dark" ? "/streakforge-logo-dark.svg" : "/streakforge-logo-light.svg";
}

export function homeHrefFor(active: NavKey) {
  return active === "home" ? "#top" : "/";
}

export default function Navbar({ theme, toggleTheme, active }: { theme: Theme; toggleTheme: () => void; active: NavKey }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = () => setMenuOpen((m) => !m);

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 40 }}>
      <div style={{ background: "var(--surface)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--line2)" }}>
        <nav style={{ maxWidth: "1240px", margin: "0 auto", padding: "14px clamp(16px,4vw,40px)", display: "flex", alignItems: "center", gap: "28px" }}>
          <a href={homeHrefFor(active)} style={{ display: "flex", alignItems: "center", flex: "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrcFor(theme)} alt="StreakForge" style={{ height: "41px", width: "150px", display: "block" }} />
          </a>

          <div className="nav-links ui" style={{ display: "flex", alignItems: "center", gap: "30px", marginLeft: "14px", fontSize: "14.5px", color: "var(--soft)" }}>
            {NAV_LINKS.map(({ key, label, href }) =>
              key === active ? (
                <a key={key} href="#top" style={{ color: "var(--text)", transition: "color .2s" }}>
                  {label}
                </a>
              ) : (
                <Hover key={key} as="a" className="sf-link" href={href} base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }}>
                  {label}
                </Hover>
              ),
            )}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
            <Hover as="a" className="nav-repo ui" href={REPO_URL} target="_blank" rel="noopener" base={NAV_REPO_BASE} hover={NAV_REPO_HOVER}>
              {GITHUB_MARK}
              GitHub Repo
            </Hover>
            <Hover as="button" onClick={toggleTheme} aria-label="Toggle theme" base={NAV_TOGGLE_BASE} hover={NAV_TOGGLE_HOVER}>
              {themeToggleIcon(theme)}
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
          {NAV_LINKS.map(({ key, label, href }) => (
            <a key={key} href={key === active ? "#top" : href} onClick={toggleMenu} style={{ padding: "13px 4px", borderBottom: "1px solid var(--line2)", fontSize: "15px" }}>
              {label}
            </a>
          ))}
          <a href={REPO_URL} target="_blank" rel="noopener" style={{ marginTop: "12px", textAlign: "center", padding: "12px", border: "1px solid var(--line)", borderRadius: "11px", fontSize: "14px", fontWeight: 500 }}>
            GitHub Repo →
          </a>
        </div>
      </div>
    </header>
  );
}
