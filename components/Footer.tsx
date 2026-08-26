"use client";

import { Hover } from "./Hover";
import { NAV_LINKS, REPO_URL, homeHrefFor, logoSrcFor } from "./Navbar";
import type { NavKey } from "./Navbar";
import type { Theme } from "@/hooks/useTheme";

const SOCIALS = [
  { label: "GitHub", href: "https://github.com/Subhooo5" },
  { label: "Discord", href: "https://discordapp.com/users/488670412096667648" },
  { label: "Twitter", href: "https://x.com/SiMpL36969" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/subho1817/" },
] as const;

const COLUMN_HEADING: React.CSSProperties = {
  fontSize: "12px",
  letterSpacing: ".08em",
  color: "var(--faint)",
  textTransform: "uppercase",
  fontWeight: 600,
};
const COLUMN_LIST: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "11px",
  marginTop: "16px",
  fontSize: "14px",
  color: "var(--soft)",
};

const ICON_LINKS = [
  {
    label: "GitHub",
    href: "https://github.com/Subhooo5",
    size: 19,
    path: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.52.56.83 1.28.83 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z",
  },
  {
    label: "X",
    href: "https://x.com/SiMpL36969",
    size: 18,
    path: "M12.6 1h2.1L10 6.4 15.5 15h-4.3L7.9 9.9 3.9 15H1.8l4.9-5.8L1.5 1h4.4l3 4.6L12.6 1Zm-.7 12.6h1.1L4.6 2.3H3.4l8.5 11.3Z",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/subho1817/",
    size: 18,
    path: "M3.4 1.5a1.4 1.4 0 1 1-.01 2.81A1.4 1.4 0 0 1 3.4 1.5ZM1.9 5.5h3V14h-3V5.5Zm5 0h2.9v1.16h.04c.4-.74 1.39-1.52 2.86-1.52 3.06 0 3.62 2 3.62 4.62V14h-3v-3.7c0-.88-.02-2.02-1.23-2.02-1.23 0-1.42.96-1.42 1.95V14h-3V5.5Z",
  },
] as const;

export default function Footer({ theme, active, docsHref = "/docs" }: { theme: Theme; active: NavKey; docsHref?: string }) {
  return (
    <footer className="ui" style={{ maxWidth: "1180px", margin: "0 auto", padding: "clamp(48px,7vw,90px) clamp(16px,4vw,40px) 40px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: "30px" }}>
        <div style={{ minWidth: "180px" }}>
          <a href={homeHrefFor(active)} style={{ display: "inline-flex", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrcFor(theme)} alt="StreakForge" style={{ height: "52px", width: "156px", display: "block" }} />
          </a>
          <p style={{ margin: "16px 0 0", color: "var(--soft)", fontSize: "13.5px", lineHeight: 1.6, maxWidth: "240px" }}>
            GitHub contribution data, forged into premium 3D isometric monoliths. Real-time. Embeddable. Yours.
          </p>
        </div>

        <div>
          <div style={COLUMN_HEADING}>Product</div>
          <div style={COLUMN_LIST}>
            {NAV_LINKS.map(({ key, label, href }) => (
              <Hover key={key} as="a" className="sf-link" href={href} base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }}>
                {label}
              </Hover>
            ))}
          </div>
        </div>

        <div>
          <div style={COLUMN_HEADING}>Resources</div>
          <div style={COLUMN_LIST}>
            <Hover as="a" className="sf-link" href={docsHref} base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }}>
              Documentation
            </Hover>
            <Hover as="a" className="sf-link" href={REPO_URL} target="_blank" rel="noopener" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }}>
              Repository
            </Hover>
          </div>
        </div>

        <div>
          <div style={COLUMN_HEADING}>Connect</div>
          <div style={COLUMN_LIST}>
            {SOCIALS.map(({ label, href }) => (
              <Hover key={label} as="a" className="sf-link" href={href} target="_blank" rel="noopener" base={{ transition: "color .2s" }} hover={{ color: "var(--text)" }}>
                {label}
              </Hover>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "14px", marginTop: "48px", paddingTop: "24px", borderTop: "1px solid var(--line)" }}>
        <span style={{ fontSize: "13px", color: "var(--faint)" }} className="mono">
          © {new Date().getFullYear()} StreakForge · Made with ❤️‍🔥 for Devs
        </span>
        <div style={{ display: "flex", gap: "14px", color: "var(--soft)" }}>
          {ICON_LINKS.map(({ label, href, size, path }) => (
            <Hover key={label} as="a" href={href} target="_blank" rel="noopener" aria-label={label} base={{ transition: "color .2s" }} hover={{ color: "var(--accent-ink)" }}>
              <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
                <path d={path} />
              </svg>
            </Hover>
          ))}
        </div>
      </div>
    </footer>
  );
}
