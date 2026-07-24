"use client";

import { useRouter } from "next/navigation";
import { CapitalCities } from "./CapitalCities";

export function CapitalCitiesRoute() {
  const router = useRouter();

  return <CapitalCities onBack={() => router.push("/")} />;
}
