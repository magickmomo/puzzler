import type { Metadata } from "next";
import { FlagBlitzRoute } from "@/components/flag-blitz/FlagBlitzRoute";

export const metadata: Metadata = {
  title: "Flag Report | Puzzler",
  description: "Review your hardest flags and improve your Flag Blitz results.",
};

export default function FlagReportPage() {
  return <FlagBlitzRoute view="report" />;
}
