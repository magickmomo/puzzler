import type { Metadata } from "next";
import { FlagBlitzRoute } from "@/components/flag-blitz/FlagBlitzRoute";

export const metadata: Metadata = {
  title: "Flag Blitz | Puzzler",
  description: "Identify flags, build your streak, and rule the map in Puzzler's Flag Blitz.",
};

export default function FlagBlitzPage() {
  return <FlagBlitzRoute />;
}
