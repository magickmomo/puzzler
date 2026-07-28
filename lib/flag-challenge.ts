import { COUNTRIES, type Country } from "@/app/data/countries";
import { MINIMUM_ACTIVE_COUNTRIES } from "@/lib/puzzler-settings";

export const FLAG_MATCH_CHALLENGE_VERSION = "1";

// This order is the permanent v1 bit-position contract. Do not reorder, add,
// or remove entries: introduce a new challenge version instead.
export const FLAG_MATCH_CHALLENGE_V1_CATALOGUE = [
  "ad", "ae", "af", "ag", "al", "am", "ao", "ar", "at", "au", "az", "ba", "bb", "bd", "be", "bf", "bg", "bh", "bi", "bj", "bn", "bo", "br", "bs", "bt", "bw", "by", "bz", "ca", "cd", "cf", "cg", "ch", "ci", "cl", "cm", "cn", "co", "cr", "cu", "cv", "cy", "cz", "de", "dj", "dk", "dm", "do", "dz", "ec", "ee", "eg", "er", "es", "et", "fi", "fj", "fm", "fr", "ga", "gb", "gb-eng", "gb-nir", "gb-sct", "gb-wls", "gd", "ge", "gh", "gm", "gn", "gq", "gr", "gt", "gw", "gy", "hn", "hr", "ht", "hu", "id", "ie", "il", "in", "iq", "ir", "is", "it", "jm", "jo", "jp", "ke", "kg", "kh", "ki", "km", "kn", "kp", "kr", "kw", "kz", "la", "lb", "lc", "li", "lk", "lr", "ls", "lt", "lu", "lv", "ly", "ma", "mc", "md", "me", "mg", "mh", "mk", "ml", "mm", "mn", "mr", "mt", "mu", "mv", "mw", "mx", "my", "mz", "na", "ne", "ng", "ni", "nl", "no", "np", "nr", "nz", "om", "pa", "pe", "pg", "ph", "pk", "pl", "ps", "pt", "pw", "py", "qa", "ro", "rs", "ru", "rw", "sa", "sb", "sc", "sd", "se", "sg", "si", "sk", "sl", "sm", "sn", "so", "sr", "ss", "st", "sv", "sy", "sz", "td", "tg", "th", "tj", "tl", "tm", "tn", "to", "tr", "tt", "tv", "tz", "ua", "ug", "us", "uy", "uz", "va", "vc", "ve", "vn", "vu", "ws", "ye", "za", "zm", "zw",
] as const;

/**
 * The parser dispatches through this registry so published versions remain
 * supported when a future catalogue or generator requires a new contract.
 */
export const FLAG_MATCH_CHALLENGE_VERSIONS = {
  [FLAG_MATCH_CHALLENGE_VERSION]: { catalogue: FLAG_MATCH_CHALLENGE_V1_CATALOGUE },
} as const;

const BASE64URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const COUNTRY_BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]));
const V1_COUNTRIES = FLAG_MATCH_CHALLENGE_V1_CATALOGUE.map((code) => {
  const country = COUNTRY_BY_CODE.get(code);
  if (!country) throw new Error(`Flag Match challenge v1 catalogue country is missing: ${code}`);
  return country;
});
const V1_BYTE_LENGTH = Math.ceil(FLAG_MATCH_CHALLENGE_V1_CATALOGUE.length / 8);
const V1_UNUSED_BITS = V1_BYTE_LENGTH * 8 - FLAG_MATCH_CHALLENGE_V1_CATALOGUE.length;

export type FlagMatchChallenge = {
  version: typeof FLAG_MATCH_CHALLENGE_VERSION;
  seed: string;
  challengerScore: number;
  challengerDurationMs: number;
  challengerMistakes: number;
  countryPool: readonly Country[];
};

function encodeBase64Url(bytes: Uint8Array): string {
  let encoded = "";
  let buffer = 0;
  let bits = 0;

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      encoded += BASE64URL_ALPHABET[(buffer >> bits) & 63];
    }
  }

  if (bits > 0) encoded += BASE64URL_ALPHABET[(buffer << (6 - bits)) & 63];
  return encoded;
}

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;

  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const character of value) {
    const index = BASE64URL_ALPHABET.indexOf(character);
    if (index === -1) return null;
    buffer = (buffer << 6) | index;
    bits += 6;
    while (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 255);
    }
  }

  const decoded = new Uint8Array(bytes);
  return encodeBase64Url(decoded) === value ? decoded : null;
}

function encodeV1Pool(countryPool: readonly Country[]): string {
  const activeCodes = new Set(countryPool.map((country) => country.code));
  const bytes = new Uint8Array(V1_BYTE_LENGTH);

  FLAG_MATCH_CHALLENGE_V1_CATALOGUE.forEach((code, index) => {
    if (activeCodes.has(code)) bytes[Math.floor(index / 8)] |= 1 << (7 - (index % 8));
  });

  return encodeBase64Url(bytes);
}

function decodeV1Pool(value: string): Country[] | null {
  const bytes = decodeBase64Url(value);
  if (!bytes || bytes.length !== V1_BYTE_LENGTH) return null;
  if (V1_UNUSED_BITS > 0 && (bytes[bytes.length - 1] & ((1 << V1_UNUSED_BITS) - 1)) !== 0) return null;

  const countryPool = V1_COUNTRIES.filter((_, index) => (
    (bytes[Math.floor(index / 8)] & (1 << (7 - (index % 8)))) !== 0
  ));

  return countryPool.length >= MINIMUM_ACTIVE_COUNTRIES ? countryPool : null;
}

/**
 * Timed Flag Match runs use this order before seeded generation. The player
 * still chooses the pool; the immutable catalogue only fixes the input order
 * so a recipient can recreate the same run from the bitset.
 */
export function orderFlagMatchChallengePool(countryPool: readonly Country[]): Country[] {
  const activeCodes = new Set(countryPool.map((country) => country.code));
  return V1_COUNTRIES.filter((country) => activeCodes.has(country.code));
}

function readNonNegativeInteger(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

export function parseFlagMatchChallenge({
  seed,
  score,
  duration,
  mistakes,
  p,
  v,
}: {
  seed?: unknown;
  score?: unknown;
  duration?: unknown;
  mistakes?: unknown;
  p?: unknown;
  v?: unknown;
}): FlagMatchChallenge | null {
  const version = typeof v === "string" ? FLAG_MATCH_CHALLENGE_VERSIONS[v as keyof typeof FLAG_MATCH_CHALLENGE_VERSIONS] : undefined;
  if (!version || typeof seed !== "string" || !/^[0-9a-f]{16}$/i.test(seed) || typeof p !== "string") return null;

  const challengerScore = readNonNegativeInteger(score);
  const challengerDurationMs = readNonNegativeInteger(duration);
  const challengerMistakes = readNonNegativeInteger(mistakes);
  // v1 is the only registry entry today. Keep this dispatch explicit so a v2
  // decoder can be added without changing how published v1 links are parsed.
  const countryPool = version.catalogue === FLAG_MATCH_CHALLENGE_V1_CATALOGUE ? decodeV1Pool(p) : null;
  if (challengerScore === null || challengerDurationMs === null || challengerMistakes === null || !countryPool || challengerScore > countryPool.length) return null;

  return {
    version: FLAG_MATCH_CHALLENGE_VERSION,
    seed: seed.toLowerCase(),
    challengerScore,
    challengerDurationMs,
    challengerMistakes,
    countryPool,
  };
}

export function createFlagMatchChallengeUrl(origin: string, challenge: FlagMatchChallenge): string {
  const url = new URL("/flag-blitz/challenge", origin);
  url.searchParams.set("seed", challenge.seed);
  url.searchParams.set("score", String(challenge.challengerScore));
  url.searchParams.set("duration", String(challenge.challengerDurationMs));
  url.searchParams.set("mistakes", String(challenge.challengerMistakes));
  url.searchParams.set("p", encodeV1Pool(challenge.countryPool));
  url.searchParams.set("v", challenge.version);
  return url.toString();
}
