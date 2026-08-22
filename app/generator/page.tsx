import type { Metadata } from "next";
import GeneratorClient from "./GeneratorClient";

export const metadata: Metadata = {
  title: "Generator — StreakForge",
  description: "Generate your 3D isometric monolith badge.",
};

export default function Page() {
  return <GeneratorClient />;
}
