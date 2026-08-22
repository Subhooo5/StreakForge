import type { Metadata } from "next";
import CompareClient from "./CompareClient";

const BASE_TITLE = "Compare — StreakForge";
const BASE_DESCRIPTION = "Compare GitHub contribution streaks side by side.";

/** Loose sanity check before echoing a param into page metadata. */
const HANDLE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/**
 * `/compare` is the battleground; `/compare?user1=X&user2=Y` is one showdown.
 * A shared link therefore carries the matchup in its title and description.
 *
 * Next 16: `searchParams` is async and must be awaited.
 */
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const params = await searchParams;
  const read = (key: string) => {
    const raw = params[key];
    const value = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
    return HANDLE.test(value) ? value : "";
  };

  const user1 = read("user1");
  const user2 = read("user2");
  if (!user1 || !user2) return { title: BASE_TITLE, description: BASE_DESCRIPTION };

  return {
    title: `${user1} vs ${user2} — Compare — StreakForge`,
    description: `Head-to-head GitHub showdown: @${user1} against @${user2} on streaks, contributions, stars and languages.`,
  };
}

export default function Page() {
  return <CompareClient />;
}
