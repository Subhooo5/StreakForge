import type { Metadata } from "next";
import DocsClient from "./DocsClient";

export const metadata: Metadata = {
  title: "Documentation — StreakForge",
  description: "How StreakForge works: generating and embedding badges, and using the Generator, Compare, Burnout Radar and Customization Studio.",
};

export default function Page() {
  return <DocsClient />;
}
