import type { Metadata } from "next";
import { CapitalCitiesRoute } from "@/components/capital-cities/CapitalCitiesRoute";

export const metadata: Metadata = {
  title: "Match Capital Cities | Puzzler",
  description: "Match countries with their capitals as quickly as you can in Puzzler.",
};

export default function CapitalCitiesPage() {
  return <CapitalCitiesRoute />;
}
