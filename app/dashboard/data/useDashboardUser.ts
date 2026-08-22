"use client";

import { useUrlBackedState } from "@/hooks/useUrlParams";

export interface DashboardUser {
  username: string;
}

/**
 * Resolves the GitHub handle whose dashboard is being viewed.
 *
 * `?user=` wins; otherwise the deployment's default handle is used
 * (`NEXT_PUBLIC_DEFAULT_DASHBOARD_USER`). The query param is read after mount
 * so SSR and the first client render agree, and Back/Forward switch the
 * dashboard between handles.
 *
 * StreakForge addresses users by query param on every route rather than by a
 * dynamic path segment, so this route stays `app/dashboard/page.tsx` — see
 * `hooks/useUrlParams.ts`.
 */
const DEFAULT_USER = process.env.NEXT_PUBLIC_DEFAULT_DASHBOARD_USER ?? "Subhooo5";

export function useDashboardUser(): DashboardUser {
  const [username] = useUrlBackedState("user", DEFAULT_USER);
  return { username: username.trim() || DEFAULT_USER };
}
