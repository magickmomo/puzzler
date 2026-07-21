import Image from "next/image";
import type { Country } from "@/app/data/countries";

export function FlagImage({ country }: { country: Country }) {
  return (
    <div className="relative mx-auto aspect-[8/5] w-full max-w-sm overflow-hidden border border-white/10 bg-slate-900 shadow-glow">
      <Image
        src={`https://flagcdn.com/${country.code}.svg`}
        alt="Flag to identify for this question"
        fill
        unoptimized
        priority
        sizes="(max-width: 640px) calc(100vw - 40px), 384px"
        className="object-contain"
      />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
    </div>
  );
}
