import type { Metadata } from "next";
import BurnoutAnalyzerClient from "./BurnoutAnalyzerClient";

export const metadata: Metadata = {
  title: "Burnout Radar — StreakForge",
  description: "Detect contribution burnout patterns in your GitHub history.",
};

export default function Page() {
  return <BurnoutAnalyzerClient />;
}
