import type { Metadata } from "next";
import { FlagBlitzRoute } from "@/components/flag-blitz/FlagBlitzRoute";

export const metadata: Metadata = {
  title: "Flag Blitz Settings | Puzzler",
  description: "Choose which flags appear in future Flag Blitz runs.",
};

export default function FlagBlitzSettingsPage() {
  return <FlagBlitzRoute view="settings" />;
}
