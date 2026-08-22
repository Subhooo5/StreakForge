import type { Metadata } from "next";
import CustomizeClient from "./CustomizeClient";

export const metadata: Metadata = {
  title: "Customization Studio — StreakForge",
  description: "Customize your StreakForge badge style and palette.",
};

export default function Page() {
  return <CustomizeClient />;
}
