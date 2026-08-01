import type { Metadata } from "next";
import { CountrySilhouettesRoute } from "@/components/country-silhouettes/CountrySilhouettesRoute";

export const metadata: Metadata = {
  title: "Country Silhouettes | Puzzler",
  description: "Identify sovereign states from their outlines in Puzzler.",
};

export default function CountrySilhouettesPage() {
  return <CountrySilhouettesRoute />;
}
