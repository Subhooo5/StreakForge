import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StreakForge",
  description: "StreakForge",
};

// Runs before first paint: applies the persisted theme to <html> so a dark
// session renders dark from frame 0 (no light→dark flash on navigation). The
// per-page wrapper still carries its own `sf dark` class via useTheme; this
// only seeds the cascade early. Keep in sync with the `sf-theme` key + `dark`
// class used by hooks/useTheme.ts.
const themeBootScript = `(function(){try{var t=localStorage.getItem('sf-theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
