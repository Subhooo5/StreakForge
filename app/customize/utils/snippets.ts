// Export snippets for the configured badge.
//
// Every format embeds the same URL — the one `toQuery` builds — so whatever
// the Live Preview shows is exactly what a reader of the README will get.

import type { ExportFormat } from "../types";

/**
 * Public origin the copied snippets point at. Same canonical host the
 * Generator's README builder uses (`app/generator/utils/readme.ts`); the live
 * preview instead hits the relative `/api/streak` on whatever origin the app
 * is running on.
 */
export const SITE_BASE = "https://streakforge.dev";
export const BADGE_BASE = `${SITE_BASE}/api/streak`;

/** Handle shown in a snippet before a real one has been typed. */
export const PLACEHOLDER_USER = "your-handle";

/** Full public badge URL for a query string built by `toQuery`. */
export function badgeUrl(query: string): string {
  return query ? `${BADGE_BASE}?${query}` : BADGE_BASE;
}

function altText(user: string): string {
  return `StreakForge Contribution Graph for ${user}`;
}

/**
 * @param format which snippet the output box is showing
 * @param query  badge query string from `toQuery`
 * @param user   handle for the alt text (already defaulted to the placeholder)
 */
export function exportSnippet(format: ExportFormat, query: string, user: string): string {
  const url = badgeUrl(query);
  const alt = altText(user);

  if (format === "html") {
    return `<img src="${url}"\n     alt="${alt}" />`;
  }

  if (format === "tsx") {
    return [
      "export function StreakForgeBadge({ className }: { className?: string }) {",
      "  return (",
      "    <img",
      `      src="${url}"`,
      `      alt="${alt}"`,
      "      className={className}",
      "    />",
      "  );",
      "}",
    ].join("\n");
  }

  if (format === "action") {
    return [
      "name: StreakForge Badge",
      "",
      "on:",
      "  schedule:",
      "    - cron: '0 0 * * *' # daily at UTC midnight",
      "  workflow_dispatch:",
      "",
      "jobs:",
      "  update-badge:",
      "    runs-on: ubuntu-latest",
      "    permissions:",
      "      contents: write",
      "    steps:",
      "      - uses: actions/checkout@v4",
      "      - name: Fetch StreakForge badge",
      `        run: curl -sS -o streakforge.svg "${url}"`,
      "      - name: Commit badge",
      "        uses: stefanzweifel/git-auto-commit-action@v5",
      "        with:",
      "          commit_message: 'chore: update StreakForge badge'",
      "          file_pattern: streakforge.svg",
    ].join("\n");
  }

  return `![${alt}](${url})`;
}
