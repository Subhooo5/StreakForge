"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Hover } from "@/components/Hover";
import { useTheme } from "@/hooks/useTheme";
import { DOCS_SECTIONS, DOCS_SUBTITLE, DOCS_TITLE } from "@/content/docs";
import type { DocsBlock } from "@/content/docs";

const ANCHOR_OFFSET = "96px";

function Block({ block }: { block: DocsBlock }) {
  if (block.kind === "p") {
    return <p style={{ margin: "0 0 14px", fontSize: "16px", lineHeight: 1.7, color: "var(--soft)" }}>{block.text}</p>;
  }
  if (block.kind === "list" || block.kind === "steps") {
    const Tag = block.kind === "steps" ? "ol" : "ul";
    return (
      <Tag style={{ margin: "0 0 14px", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {block.items.map((item) => (
          <li key={item} style={{ fontSize: "15.5px", lineHeight: 1.65, color: "var(--soft)" }}>
            {item}
          </li>
        ))}
      </Tag>
    );
  }
  if (block.kind === "code") {
    return (
      <pre
        className="mono"
        style={{
          margin: "0 0 16px",
          padding: "14px 16px",
          border: "1px solid var(--line)",
          borderRadius: "12px",
          background: "var(--surface2)",
          color: "var(--accent-ink)",
          fontSize: "13px",
          lineHeight: 1.6,
          overflowX: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}
      >
        {block.code}
      </pre>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginBottom: "14px" }}>
      {block.items.map(({ q, a }) => (
        <div key={q}>
          <div className="ui" style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)", marginBottom: "6px" }}>
            {q}
          </div>
          <p style={{ margin: 0, fontSize: "15.5px", lineHeight: 1.7, color: "var(--soft)" }}>{a}</p>
        </div>
      ))}
    </div>
  );
}

export default function DocsClient() {
  const [theme, toggleTheme] = useTheme();
  const [activeId, setActiveId] = useState<string>(DOCS_SECTIONS[0].id);

  useEffect(() => {
    const ids = DOCS_SECTIONS.flatMap((section) => [section.id, ...section.subsections.map((sub) => sub.id)]);
    const targets = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-100px 0px -70% 0px", threshold: 0 },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={theme === "dark" ? "sf docs dark" : "sf docs"}
      style={{ position: "relative", minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text)", transition: "background-color .5s ease,color .5s ease" }}
    >
      <Navbar theme={theme} toggleTheme={toggleTheme} active="docs" />

      <main id="top" style={{ maxWidth: "1240px", margin: "0 auto", padding: "clamp(28px,4vw,52px) clamp(16px,4vw,40px) 0" }}>
        <div className="docs-grid" style={{ display: "grid", gridTemplateColumns: "244px 1fr", gap: "clamp(28px,4vw,56px)", alignItems: "start" }}>
          <aside className="docs-side" style={{ position: "sticky", top: "88px", maxHeight: "calc(100vh - 110px)", overflowY: "auto", paddingBottom: "24px" }}>
            <div className="ui" style={{ fontSize: "11px", letterSpacing: ".12em", color: "var(--accent-ink)", textTransform: "uppercase", fontWeight: 700, marginBottom: "16px" }}>
              On this page
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {DOCS_SECTIONS.map((section) => {
                const sectionActive = activeId === section.id || section.subsections.some((sub) => sub.id === activeId);
                return (
                  <div key={section.id}>
                    <Hover
                      as="a"
                      href={`#${section.id}`}
                      className="ui"
                      base={{
                        display: "block",
                        fontSize: "13.5px",
                        fontWeight: 600,
                        color: sectionActive ? "var(--text)" : "var(--soft)",
                        transition: "color .2s",
                      }}
                      hover={{ color: "var(--text)" }}
                    >
                      {section.title}
                    </Hover>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "8px", borderLeft: "1px solid var(--line)", paddingLeft: "12px" }}>
                      {section.subsections.map((sub) => (
                        <Hover
                          key={sub.id}
                          as="a"
                          href={`#${sub.id}`}
                          className="ui"
                          base={{
                            fontSize: "13px",
                            lineHeight: 1.5,
                            padding: "4px 0",
                            color: activeId === sub.id ? "var(--accent-ink)" : "var(--faint)",
                            fontWeight: activeId === sub.id ? 600 : 400,
                            transition: "color .2s",
                          }}
                          hover={{ color: "var(--text)" }}
                        >
                          {sub.title}
                        </Hover>
                      ))}
                    </div>
                  </div>
                );
              })}
            </nav>
          </aside>

          <div style={{ minWidth: 0, paddingBottom: "clamp(40px,6vw,80px)" }}>
            <div className="ui" style={{ fontSize: "12px", letterSpacing: ".16em", color: "var(--accent-ink)", textTransform: "uppercase", fontWeight: 700 }}>
              {DOCS_TITLE}
            </div>
            <h1 style={{ margin: "18px 0 0", fontWeight: 500, letterSpacing: "-.025em", lineHeight: 1.05, fontSize: "clamp(32px,4.6vw,52px)" }}>
              Build, compare, and tune your{" "}
              <span style={{ background: "linear-gradient(100deg,var(--accent-ink),var(--accent))", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>
                monolith
              </span>
              .
            </h1>
            <p style={{ maxWidth: "620px", margin: "16px 0 0", fontSize: "clamp(15px,2vw,18px)", lineHeight: 1.6, color: "var(--soft)" }}>{DOCS_SUBTITLE}</p>

            {DOCS_SECTIONS.map((section) => (
              <section key={section.id} style={{ marginTop: "clamp(40px,5vw,64px)" }}>
                <h2 id={section.id} style={{ margin: 0, scrollMarginTop: ANCHOR_OFFSET, fontSize: "clamp(24px,3vw,32px)", fontWeight: 600, letterSpacing: "-.02em" }}>
                  {section.title}
                </h2>
                <p style={{ margin: "10px 0 0", fontSize: "16px", lineHeight: 1.65, color: "var(--soft)" }}>{section.summary}</p>
                <div style={{ height: "1px", background: "var(--line)", margin: "22px 0 0" }} />

                {section.subsections.map((sub) => (
                  <div key={sub.id} style={{ marginTop: "30px" }}>
                    <h3 id={sub.id} style={{ margin: "0 0 12px", scrollMarginTop: ANCHOR_OFFSET, fontSize: "18.5px", fontWeight: 600, letterSpacing: "-.01em" }}>
                      <Hover
                        as="a"
                        href={`#${sub.id}`}
                        base={{ color: "var(--text)", transition: "color .2s" }}
                        hover={{ color: "var(--accent-ink)" }}
                      >
                        {sub.title}
                      </Hover>
                    </h3>
                    {sub.blocks.map((block, i) => (
                      <Block key={i} block={block} />
                    ))}
                  </div>
                ))}
              </section>
            ))}
          </div>
        </div>

        <Footer active="docs" docsHref="/docs" />
      </main>
    </div>
  );
}
