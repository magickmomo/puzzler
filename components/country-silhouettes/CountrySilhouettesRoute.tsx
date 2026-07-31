"use client";

import { useRouter } from "next/navigation";
import { CountrySilhouettes } from "./CountrySilhouettes";

export function CountrySilhouettesRoute() {
  const router = useRouter();
  return <CountrySilhouettes onBack={() => router.push("/")} />;
}
