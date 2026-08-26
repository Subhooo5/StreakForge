export type DocsBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "steps"; items: string[] }
  | { kind: "code"; code: string }
  | { kind: "qa"; items: { q: string; a: string }[] };

export interface DocsSubsection {
  id: string;
  title: string;
  blocks: DocsBlock[];
}

export interface DocsSection {
  id: string;
  title: string;
  summary: string;
  subsections: DocsSubsection[];
}

export const DOCS_SECTIONS: DocsSection[] = [
  {
    id: "getting-started",
    title: "Getting started",
    summary: "What a StreakForge badge is, how to make one, and how to put it in a README.",
    subsections: [
      {
        id: "getting-started-badge",
        title: "What a badge is",
        blocks: [
          {
            kind: "p",
            text: "A StreakForge badge is an SVG rendered on demand from your public GitHub contribution history. It shows your current streak, annual total and peak streak on an isometric monolith whose towers are your daily commit counts.",
          },
          {
            kind: "p",
            text: "The image is generated server-side on every request, so it stays current wherever it is embedded. Nothing runs in the reader's browser and no script tag is required.",
          },
        ],
      },
      {
        id: "getting-started-generate",
        title: "Generate one",
        blocks: [
          {
            kind: "steps",
            items: [
              "Enter a GitHub username on the home page.",
              "The live preview renders that account's real badge.",
              "Use Copy Link to grab the Markdown snippet.",
            ],
          },
          {
            kind: "p",
            text: "Only public contribution data is used. Private contributions appear only if the account has enabled \"Include private contributions on my profile\" in GitHub settings.",
          },
        ],
      },
      {
        id: "getting-started-embed",
        title: "Embed in a README",
        blocks: [
          { kind: "p", text: "Paste the snippet into your profile README.md:" },
          { kind: "code", code: "![StreakForge](https://streakforge.dev/api/streak?user=your-handle)" },
          {
            kind: "p",
            text: "Every option in the Customization Studio is a query parameter on that same URL, so a customised badge is still a single line of Markdown.",
          },
        ],
      },
    ],
  },
  {
    id: "generator",
    title: "Generator",
    summary: "Builds a complete profile README around your badge, section by section, with a live preview.",
    subsections: [
      {
        id: "generator-profile-presets",
        title: "Profile presets",
        blocks: [
          {
            kind: "p",
            text: "Presets fill the whole builder with a sensible starting point — Popular, Full-Stack Developer, Open Source Maintainer, AI / ML and Design UI. Pick one, then edit anything it set.",
          },
          { kind: "p", text: "Import from GitHub pulls your display name, bio and top languages from your account instead." },
        ],
      },
      {
        id: "generator-identity",
        title: "Name and description",
        blocks: [
          { kind: "p", text: "Display name is the heading of your README. Bio / tagline is the single line underneath it." },
        ],
      },
      {
        id: "generator-tech-stack",
        title: "Tech stack",
        blocks: [
          {
            kind: "p",
            text: "Pick the technologies you work with, grouped by Languages, Frontend, UI Libraries and more. Icon style switches every badge between Logo Only and Logo + Name.",
          },
        ],
      },
      {
        id: "generator-badge",
        title: "StreakForge badge",
        blocks: [
          {
            kind: "p",
            text: "Toggles the badge into the generated README and sets its accent colour by hex. The preview here is the real /api/streak image, not a mock.",
          },
        ],
      },
      {
        id: "generator-visualizations",
        title: "Contribution visualizations",
        blocks: [
          { kind: "p", text: "Optional animated contribution graphs: Snake and Pac-Man. Each is an independent toggle and both can be off." },
        ],
      },
      {
        id: "generator-repo-spotlight",
        title: "Repository spotlight",
        blocks: [
          {
            kind: "p",
            text: "Features one repository as a card in the README. The picker lists your own public repositories; the card renders from the same badge pipeline.",
          },
        ],
      },
      {
        id: "generator-socials",
        title: "Socials and export",
        blocks: [
          { kind: "p", text: "Socials adds linked icons for the places people can find you." },
          {
            kind: "p",
            text: "The README panel shows the generated Markdown as you build. Copy it, or check the health breakdown for sections still worth filling in.",
          },
        ],
      },
    ],
  },
  {
    id: "compare",
    title: "Compare",
    summary: "Puts two GitHub accounts side by side on contributions, streaks, languages and repository stats.",
    subsections: [
      {
        id: "compare-start",
        title: "Run a comparison",
        blocks: [
          { kind: "p", text: "Enter two usernames and start the battle. The result is addressable — the URL carries both handles:" },
          { kind: "code", code: "/compare?user1=octocat&user2=torvalds" },
          { kind: "p", text: "That link is shareable and reloads to the same showdown. Back returns to the empty battleground." },
        ],
      },
      {
        id: "compare-results",
        title: "Read the results",
        blocks: [
          {
            kind: "p",
            text: "Both profiles are scored across contributions, streaks, languages and repository reach, with a winner banner summarising the outcome.",
          },
          {
            kind: "p",
            text: "The activity heatmap deliberately uses GitHub's own contribution palette so it reads like the grid on a real profile.",
          },
        ],
      },
      {
        id: "compare-showdown",
        title: "Developer showdown",
        blocks: [
          {
            kind: "p",
            text: "The battleground below the form adds trending showdowns, a guess-the-developer round and predicted matchups you can start with one click.",
          },
        ],
      },
    ],
  },
  {
    id: "burnout-analyzer",
    title: "Burnout Radar",
    summary: "Reads a repository's commit rhythm for signs of unsustainable pace and key-person risk.",
    subsections: [
      {
        id: "burnout-analyze",
        title: "Analyse a repository",
        blocks: [
          { kind: "p", text: "Enter a repository as owner/name and analyse. The URL carries it, so a report can be shared:" },
          { kind: "code", code: "/burnout-analyzer?repo=vercel/next.js" },
          { kind: "p", text: "Any public repository works; the suggestions below the field are shortcuts, not limits." },
        ],
      },
      {
        id: "burnout-score",
        title: "Score and risk",
        blocks: [
          {
            kind: "p",
            text: "The sustainability score summarises commit timing, contributor spread and pace. Supporting cards break out bus factor, top-contributor concentration and the share of nights and weekends.",
          },
          {
            kind: "p",
            text: "It measures repository rhythm, not people. A low score on a solo side project usually means one person commits at odd hours, which is expected.",
          },
        ],
      },
      {
        id: "burnout-bots",
        title: "Exclude bot activity",
        blocks: [
          {
            kind: "p",
            text: "Exclude Automated Bot Activity drops Dependabot, Renovate and similar accounts before scoring. On repositories with heavy automation this changes the result noticeably, so compare like with like.",
          },
        ],
      },
    ],
  },
  {
    id: "customization-studio",
    title: "Customization Studio",
    summary: "Tunes every badge parameter against a live preview and hands back the embed snippet.",
    subsections: [
      {
        id: "customization-themes",
        title: "Theme presets",
        blocks: [
          {
            kind: "p",
            text: "Thirty-three themes, each shown as its real background and accent with a concept icon. Dark is the default; Shuffle jumps to a random one.",
          },
        ],
      },
      {
        id: "customization-layout",
        title: "Layout and type",
        blocks: [
          {
            kind: "p",
            text: "View Layout switches the badge between Default, Monthly, Heartbeat Pulse, Skyline Horizon, Top Languages Skyline and Punch Card Heatmap.",
          },
          {
            kind: "list",
            items: [
              "Sync Year — which year the badge covers; the current year is the rolling default.",
              "Animation Speed — 4s to 20s, or the default 8s.",
              "Font — faces bundled into the SVG, so they render anywhere.",
              "Corner Radius and Badge Size — frame shape and scale.",
              "Language — translates the three stat labels inside the badge only.",
            ],
          },
        ],
      },
      {
        id: "customization-visibility",
        title: "Visibility options",
        blocks: [
          {
            kind: "p",
            text: "Hide Title, Hide Background and Hide Stats strip parts of the badge. With the background hidden the badge is transparent — use the Grid setting in the BG Simulator to see exactly what shows through.",
          },
        ],
      },
      {
        id: "customization-export",
        title: "Export",
        blocks: [
          {
            kind: "p",
            text: "The output box switches between Markdown, HTML, React TSX and GitHub Action, all embedding the same URL. Download SVG saves the exact bytes on screen.",
          },
          {
            kind: "p",
            text: "Export Config and Import Config move a whole configuration between machines as a small JSON file.",
          },
        ],
      },
    ],
  },
  {
    id: "faq",
    title: "Questions",
    summary: "The things that most often look like bugs but are not.",
    subsections: [
      {
        id: "faq-common",
        title: "Common points of confusion",
        blocks: [
          {
            kind: "qa",
            items: [
              {
                q: "My badge does not show a commit I just pushed.",
                a: "Badge data is cached server-side for a few minutes, and GitHub's own contribution calendar lags slightly. Wait a moment and reload.",
              },
              {
                q: "My streak looks wrong by a day.",
                a: "Streaks roll over at UTC midnight by default. Set Timezone in the Customization Studio to your own zone.",
              },
              {
                q: "The Dashboard shows data I have seen before, instantly.",
                a: "Dashboard tabs are cached in your browser for 24 hours per user. Refresh Data clears that and re-fetches.",
              },
              {
                q: "Private contributions are missing.",
                a: "Only public data is read. Enable \"Include private contributions on my profile\" in GitHub settings to have them counted.",
              },
              {
                q: "Fonts look different in my README than in the preview.",
                a: "Pick one of the bundled fonts in the Customization Studio. Those are embedded in the SVG; other faces depend on the host allowing external fonts.",
              },
            ],
          },
        ],
      },
    ],
  },
];

export const DOCS_TITLE = "Documentation";
export const DOCS_SUBTITLE = "How StreakForge works, and how to drive each part of it.";
