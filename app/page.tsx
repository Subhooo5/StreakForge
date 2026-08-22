import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "StreakForge — Live 3D GitHub contribution badges",
  description:
    "Turn any GitHub contribution history into a live isometric monolith badge. Type a username to preview real streak stats, then embed the SVG anywhere.",
};

export default function Page() {
  return <HomeClient />;
}
