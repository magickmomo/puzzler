import { SOVEREIGN_NATIONS, type Country } from "@/app/data/countries";
import { getDailyCountryFacts, type DailyCountryFacts } from "@/app/data/daily-country-facts";
import { normalizeAnswer } from "./flag-quiz";

export const DAILY_COUNTRY_EPOCH = "2026-07-27";
export const DAILY_COUNTRY_GUESS_LIMIT = 6;
export const DAILY_COUNTRY_CLUE_LIMIT = 3;

export type DailyCountryOutcomeStatus = "in-progress" | "solved" | "failed";

export type DailyCountryOutcome = {
  status: DailyCountryOutcomeStatus;
  guessesUsed: number;
  guesses?: string[];
  selectedClueIds?: DailyCountryClue["id"][];
};

export type DailyCountryPuzzle = {
  dateKey: string;
  puzzleNumber: number;
  country: Country;
  facts: DailyCountryFacts;
};

export type DailyCountryClue = {
  id: "location" | "population" | "language" | "geography" | "capital" | "flag";
  label: string;
  text?: string;
  flagCode?: string;
};

export type DailyCountryGuessFeedback = {
  country: Country | null;
  distanceKm: number | null;
  direction: { label: string; arrow: string } | null;
  proximity: number | null;
};

const DAY_MS = 86_400_000;
const EPOCH_MS = Date.UTC(2026, 6, 27);

// Geographic centres are used only for the Daily Challenge's approximate
// direction and distance feedback. They are intentionally compact so every
// round works offline without loading a separate geography dataset.
const COORDINATE_ROWS = "af,35.23,68.09;al,41.05,20;dz,30.78,2.82;ad,42.53,1.56;ao,-11.08,16.9;ag,17.28,-61.84;ar,-37.06,-64.69;am,40.22,45.15;au,-22.06,134.91;at,47.58,13.57;az,40.13,47.3;bs,25.03,-77.6;bh,25.92,50.66;bd,23.26,90.42;bb,13.17,-59.55;by,53.32,28.31;be,50.51,4.92;bz,17.39,-88.3;bj,9.95,2.31;bt,27.37,90.39;bo,-15.55,-64.9;ba,44.26,17.91;bw,-22.4,24.58;br,-9.8,-51.36;bn,4.56,114.81;bg,42.5,25.21;bf,11.63,-2.28;bi,-3.09,30.01;cv,15.29,-23.58;kh,12.43,104.68;cm,6.28,12.9;ca,60.88,-86.17;cf,6.3,21.23;td,12.86,18.17;cl,-46.69,-73.05;cn,31.85,111.35;co,4.7,-73.94;km,-12,43.79;cg,-0.78,14.64;cd,-3.26,23.43;cr,9.8,-84.31;ci,7.43,-5.61;hr,44.54,16.05;cu,21.85,-79.45;cy,34.96,33.24;cz,49.91,15.29;dk,55.84,10.19;dj,11.7,42.68;dm,15.42,-61.37;do,18.81,-70.4;ec,-1.66,-78.99;eg,28.76,32.33;sv,13.76,-88.65;gq,2.15,9.46;er,15.07,39.8;ee,58.63,24.18;sz,-26.6,31.51;et,9,38.57;fj,-17.14,179.03;fi,62.83,23.79;fr,46.23,2.21;ga,-0.91,11.23;gm,13.42,-15.66;ge,42.08,43.6;de,51.82,10.56;gh,8.3,-1.03;gr,38.3,23.76;gd,12.21,-61.61;gt,15.65,-90.09;gn,10.14,-11.37;gw,11.63,-15.53;gy,4.62,-58.88;ht,18.93,-72.92;hn,14.71,-86.04;hu,47.16,19.2;is,65.22,-19.77;in,21.09,82.48;id,-3.87,133.72;ir,32.43,52.98;iq,33.99,44.98;ie,53.33,-8.66;il,31.92,35.21;it,42.07,11.76;jm,18.11,-77.25;jp,36.02,135.84;jo,31.62,36.2;kz,48.02,64.41;ke,0.22,38.21;ki,1.88,-157.4;kp,39.97,126.8;kr,35.47,126.99;kw,29.42,47.97;kg,40.97,73.2;la,18.29,103.93;lv,56.91,24.61;lb,33.89,35.88;ls,-29.58,28.11;lr,6.61,-9;ly,28.51,17.99;li,47.16,9.53;lt,55.06,23.86;lu,49.81,6.06;mg,-16.57,47.37;mw,-12.89,34.1;my,4.06,115.12;mv,4.16,73.19;ml,14.32,-6.13;mt,35.95,14.38;mh,5.85,169.56;mr,18.54,-12.71;mu,-20.24,57.59;mx,24.66,-105.09;fm,6.87,158.2;md,47.13,28.41;mc,43.74,7.4;mn,47.96,102.19;me,42.67,19.2;ma,29.56,-9.03;mz,-17.3,35.98;mm,17.56,96.94;na,-21.91,18.29;nr,-0.52,166.94;np,28.31,84.17;nl,51.96,5.27;nz,-40.08,173.1;ni,13.14,-84.71;ne,15.6,7.96;ng,7.58,7.73;mk,41.58,21.74;no,61,8;om,21.9,56.76;pk,29.42,68.93;pw,7.38,134.48;pa,8.46,-80.22;pg,-6.55,148.1;py,-23.94,-57.96;pe,-7.89,-74.48;ph,13.53,122.53;pl,51.52,18.86;pt,39.63,-7.95;qa,25.45,51.17;ro,45.91,25.46;ru,62.46,103.26;rw,-1.97,29.98;kn,17.26,-62.68;lc,13.91,-60.98;vc,12.95,-61.27;ws,-13.77,-172.16;sm,43.93,12.45;st,0.19,6.6;sa,23.96,42.45;sn,13.96,-14.66;rs,44.23,20.75;sc,-4.5,55.59;sl,8.41,-12.24;sg,1.35,103.81;sk,48.79,19.71;si,46.14,14.97;sb,-8.43,159.01;so,5.93,46.75;za,-28.91,24.27;ss,6.91,29.76;es,40.74,-3.46;lk,8.26,80.64;sd,15.01,30.81;sr,4.04,-56;se,60.76,17.8;ch,46.78,8.29;sy,34.99,37.36;tj,38.75,70.7;tz,-7.14,36.6;th,12.62,100.46;tl,-8.91,125.46;tg,8.8,0.7;to,-21.22,-175.13;tt,10.61,-61.25;tn,34.9,10.08;tr,38.82,31.91;tm,39.39,57.15;tv,-8.51,179.2;ug,1.52,32.01;ua,48.38,30.94;ae,24.52,54.33;gb,55.38,-4.48;us,36.42,-90.31;uy,-32.61,-56.04;uz,41.01,66.78;vu,-16.17,167.72;va,41.9,12.45;ve,8.41,-65.61;vn,16.35,106.64;ye,14.62,47.08;zm,-13.09,28.26;zw,-19.02,29.79;ps,31.9,35.14;gb-eng,52.35,-1.17;gb-nir,54.65,-6.67;gb-sct,56.82,-4.18;gb-wls,52.35,-3.85";

const COUNTRY_COORDINATES = new Map(COORDINATE_ROWS.split(";").map((row) => {
  const [code, latitude, longitude] = row.split(",");
  return [code, { latitude: Number(latitude), longitude: Number(longitude) }];
}));

const DIRECTION_INDICATORS = [
  { label: "North", arrow: "↑" },
  { label: "North-east", arrow: "↗" },
  { label: "East", arrow: "→" },
  { label: "South-east", arrow: "↘" },
  { label: "South", arrow: "↓" },
  { label: "South-west", arrow: "↙" },
  { label: "West", arrow: "←" },
  { label: "North-west", arrow: "↖" },
] as const;

function getUtcDayStart(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function getUtcDateFromDayIndex(dayIndex: number): Date {
  return new Date(EPOCH_MS + dayIndex * DAY_MS);
}

function hashSeed(value: string): number {
  let hash = 2_166_136_261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

function seededRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function createCountryCycle(cycleIndex: number, countries: readonly Country[]): Country[] {
  const random = seededRandom(hashSeed("daily-country-cycle-" + cycleIndex));
  return [...countries]
    .map((country) => ({ country, order: random() }))
    .sort((left, right) => left.order - right.order)
    .map(({ country }) => country);
}

function degreesToRadians(value: number): number {
  return value * Math.PI / 180;
}

function getRecognisedCountry(value: string): Country | null {
  const answer = normalizeAnswer(value);
  if (!answer) return null;

  return SOVEREIGN_NATIONS.find((country) => (
    [country.name, ...country.aliases].some((name) => normalizeAnswer(name) === answer)
  )) ?? null;
}

export function getDailyCountryGuessFeedback(guess: string, target: Country): DailyCountryGuessFeedback {
  const country = getRecognisedCountry(guess);
  if (!country) return { country: null, distanceKm: null, direction: null, proximity: null };

  const origin = COUNTRY_COORDINATES.get(country.code);
  const destination = COUNTRY_COORDINATES.get(target.code);
  if (!origin || !destination) return { country, distanceKm: null, direction: null, proximity: null };

  const latitudeDifference = degreesToRadians(destination.latitude - origin.latitude);
  const longitudeDifference = degreesToRadians(destination.longitude - origin.longitude);
  const originLatitude = degreesToRadians(origin.latitude);
  const destinationLatitude = degreesToRadians(destination.latitude);
  const haversine = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(originLatitude) * Math.cos(destinationLatitude) * Math.sin(longitudeDifference / 2) ** 2;
  const distanceKm = Math.round(6_371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)));

  if (distanceKm === 0) {
    return { country, distanceKm, direction: { label: "Here", arrow: "•" }, proximity: 100 };
  }

  const bearing = Math.atan2(
    Math.sin(longitudeDifference) * Math.cos(destinationLatitude),
    Math.cos(originLatitude) * Math.sin(destinationLatitude)
      - Math.sin(originLatitude) * Math.cos(destinationLatitude) * Math.cos(longitudeDifference),
  ) * 180 / Math.PI;
  const directionIndex = Math.round(((bearing + 360) % 360) / 45) % DIRECTION_INDICATORS.length;

  return {
    country,
    distanceKm,
    direction: DIRECTION_INDICATORS[directionIndex],
    proximity: Math.max(0, Math.round(100 - distanceKm / 200)),
  };
}

export function getDailyCountryDateKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function getDailyCountryDayIndex(now = new Date()): number {
  return Math.max(0, Math.floor((getUtcDayStart(now) - EPOCH_MS) / DAY_MS));
}

export function getDailyCountryPuzzleNumber(now = new Date()): number {
  return getDailyCountryDayIndex(now) + 1;
}

export function getDailyCountryPuzzle(
  now = new Date(),
  countries: readonly Country[] = SOVEREIGN_NATIONS,
): DailyCountryPuzzle {
  const dayIndex = getDailyCountryDayIndex(now);
  const cycleIndex = Math.floor(dayIndex / countries.length);
  const country = createCountryCycle(cycleIndex, countries)[dayIndex % countries.length];

  return {
    dateKey: getDailyCountryDateKey(now),
    puzzleNumber: dayIndex + 1,
    country,
    facts: getDailyCountryFacts(country),
  };
}

export function getDailyCountryClues(puzzle: DailyCountryPuzzle): readonly DailyCountryClue[] {
  const { country, facts } = puzzle;
  const continentRoot = facts.continent.toLowerCase().replace(/s$/, "");
  const location = facts.region.toLowerCase().includes(continentRoot)
    ? facts.region
    : `${facts.region}, ${facts.continent}`;

  return [
    { id: "location", label: "Location", text: "It is in " + location + "." },
    { id: "population", label: "Population", text: "It has " + facts.populationBand + "." },
    { id: "language", label: "Language", text: "One official language is " + facts.language + "." },
    { id: "geography", label: "Geography", text: facts.geography },
    { id: "capital", label: "Capital", text: "Its capital is " + facts.capital + "." },
    { id: "flag", label: "Flag", flagCode: country.code },
  ];
}

export function getMillisecondsUntilNextDailyCountry(now = new Date()): number {
  return Math.max(0, getUtcDayStart(new Date(getUtcDayStart(now) + DAY_MS)) - now.getTime());
}

export function formatDailyCountryCountdown(milliseconds: number): string {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours + "h " + minutes + "m";
}

export function getDailyCountryOutcomeForDate(
  outcomes: Readonly<Record<string, DailyCountryOutcome>>,
  dateKey: string,
): DailyCountryOutcome | undefined {
  return outcomes[dateKey];
}

export function getCurrentDailyCountryStreak(
  outcomes: Readonly<Record<string, DailyCountryOutcome>>,
  now = new Date(),
): number {
  let dayIndex = getDailyCountryDayIndex(now);
  const todayKey = getDailyCountryDateKey(now);
  const today = outcomes[todayKey];

  if (today?.status === "failed") return 0;
  if (today?.status !== "solved") dayIndex -= 1;

  let streak = 0;

  while (dayIndex >= 0) {
    const dateKey = getDailyCountryDateKey(getUtcDateFromDayIndex(dayIndex));
    if (outcomes[dateKey]?.status !== "solved") break;
    streak += 1;
    dayIndex -= 1;
  }

  return streak;
}
