"use client";

import { useUrlBackedState } from "@/hooks/useUrlParams";

export interface DashboardUser {
  username: string;
}

const DEFAULT_USER = process.env.NEXT_PUBLIC_DEFAULT_DASHBOARD_USER ?? "Subhooo5";

export function useDashboardUser(): DashboardUser {
  const [username] = useUrlBackedState("user", DEFAULT_USER);
  return { username: username.trim() || DEFAULT_USER };
}
