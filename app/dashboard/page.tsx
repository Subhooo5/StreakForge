import type { Metadata } from "next";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard — StreakForge",
  description: "Your StreakForge contribution dashboard.",
};

export default function Page() {
  return <DashboardClient />;
}
