"use client";

/**
 * Consent-gated, anonymous product analytics for Puzzler.
 *
 * This module deliberately has a narrow event schema. Do not add player answers,
 * country names/codes, query strings, emails, or other free-form user input here.
 */

export const CONSENT_STORAGE_KEY = "puzzler-consent-v1";
export const CAMPAIGN_STORAGE_KEY = "puzzler-campaign-v1";
export const FIRST_COMPLETION_STORAGE_KEY = "puzzler-first-game-completed-v1";
export const ANALYTICS_VISITOR_STORAGE_KEY = "puzzler-analytics-visitor-v1";

export type ConsentPreferences = {
  analytics: boolean;
  marketing: boolean;
};

type StoredConsent = ConsentPreferences & {
  version: 1;
};

export type CampaignAttribution = Partial<{
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
}>;

export type AnalyticsGame = "flag_blitz" | "capital_cities" | "country_silhouettes";
export type FlagBlitzMode = "classic" | "unlimited" | "speed-match" | "flag-match-unlimited";
export type AnalyticsDifficulty = "easy" | "medium" | "hard";
export type GameEndReason = "cleared" | "wrong_answer" | "timeout" | "saved";
export type GameExitReason = "hub" | "restart";

export type AnalyticsEventProperties = {
  ad_landing_viewed: { landing_path: string } & CampaignAttribution;
  game_selected: { game: AnalyticsGame };
  game_mode_selected: { game: "flag_blitz"; mode: FlagBlitzMode };
  game_started: {
    game: AnalyticsGame;
    mode?: FlagBlitzMode;
    difficulty?: AnalyticsDifficulty;
    timer_enabled?: boolean;
    game_run_number: number;
  };
  game_completed: {
    game: AnalyticsGame;
    mode?: FlagBlitzMode;
    difficulty?: AnalyticsDifficulty;
    timer_enabled?: boolean;
    score: number;
    duration_ms: number;
    attempts: number;
    mistakes: number;
    game_run_number: number;
    end_reason: GameEndReason;
  };
  game_abandoned: {
    game: AnalyticsGame;
    mode?: FlagBlitzMode;
    difficulty?: AnalyticsDifficulty;
    timer_enabled?: boolean;
    duration_ms: number;
    attempts: number;
    mistakes: number;
    game_run_number: number;
    exit_reason: GameExitReason;
  };
  replay_started: {
    game: AnalyticsGame;
    mode?: FlagBlitzMode;
    difficulty?: AnalyticsDifficulty;
    timer_enabled?: boolean;
  };
  flag_match_challenge_opened: { pool_size: number; challenger_score: number };
  flag_match_challenge_started: { pool_size: number; challenger_score: number };
  flag_match_challenge_completed: {
    pool_size: number;
    score: number;
    duration_ms: number;
    mistakes: number;
    challenge_outcome: "win" | "loss" | "draw";
  };
  flag_match_challenge_shared: {
    pool_size: number;
    score: number;
    duration_ms: number;
    mistakes: number;
    share_method: "native" | "copy";
  };
  flag_match_challenge_reshared: {
    pool_size: number;
    score: number;
    duration_ms: number;
    mistakes: number;
    share_method: "native" | "copy";
  };
  first_game_completed: { game: AnalyticsGame };
};

export type AnalyticsEventName = keyof AnalyticsEventProperties;

export type AnalyticsConfig = {
  enabled: boolean;
  posthogToken?: string;
  posthogHost?: string;
  metaPixelId?: string;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type AnalyticsPropertyValue = string | number | boolean;
type PostHogCapturePayload = {
  event: string;
  properties: Record<string, unknown>;
};

type PostHogOptions = {
  api_host: string;
  autocapture: false;
  capture_pageview: false;
  capture_performance: {
    web_vitals: true;
    web_vitals_allowed_metrics: ["LCP", "CLS", "FCP", "INP"];
    web_vitals_attribution: false;
    network_timing: false;
  };
  disable_session_recording: true;
  disable_external_dependency_loading: true;
  disable_surveys: true;
  disable_conversations: true;
  disable_product_tours: true;
  advanced_disable_flags: true;
  save_campaign_params: false;
  save_referrer: false;
  persistence: "memory";
  disable_persistence: true;
  person_profiles: "never";
  bootstrap?: {
    distinctID: string;
    isIdentifiedID: false;
  };
  before_send: (payload: PostHogCapturePayload) => PostHogCapturePayload | null;
};

type PostHogClient = {
  init: (token: string, options: PostHogOptions) => unknown;
  capture: (event: string, properties: Record<string, AnalyticsPropertyValue>) => unknown;
  opt_out_capturing: () => void;
  reset: (resetDeviceId?: boolean) => void;
};

type MetaClient = {
  pageView: () => void;
  firstGameCompleted: (game: AnalyticsGame) => void;
  revoke: () => void;
  grant: () => void;
};

export type AnalyticsDependencies = {
  storage?: StorageLike;
  loadPostHog?: () => Promise<PostHogClient>;
  loadMetaPixel?: (pixelId: string) => Promise<MetaClient>;
  getPageOrigin?: () => string | undefined;
  generateVisitorId?: () => string | null;
};

type CompletionDelivery = Partial<Record<"posthog" | "meta", true>>;

const CAMPAIGN_PARAMETERS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

const ANALYTICS_EVENT_NAMES = [
  "ad_landing_viewed",
  "game_selected",
  "game_mode_selected",
  "game_started",
  "game_completed",
  "game_abandoned",
  "replay_started",
  "flag_match_challenge_opened",
  "flag_match_challenge_started",
  "flag_match_challenge_completed",
  "flag_match_challenge_shared",
  "flag_match_challenge_reshared",
  "first_game_completed",
] as const satisfies readonly AnalyticsEventName[];

type PostHogEventName = AnalyticsEventName | "$pageview" | "$web_vitals";
const POSTHOG_EVENT_NAMES = new Set<PostHogEventName>([
  ...ANALYTICS_EVENT_NAMES,
  "$pageview",
  "$web_vitals",
]);

const ANALYTICS_EVENT_PROPERTY_KEYS = new Set<string>([
  "game",
  "mode",
  "difficulty",
  "timer_enabled",
  "score",
  "duration_ms",
  "mistakes",
  "attempts",
  "game_run_number",
  "end_reason",
  "exit_reason",
  "pool_size",
  "challenger_score",
  "challenge_outcome",
  "share_method",
  "landing_path",
  ...CAMPAIGN_PARAMETERS,
]);

// PostHog requires its project token and anonymous distinct ID to ingest an
// event. The explicit false value prevents anonymous events from creating a
// person profile. All other SDK-added properties are removed before delivery.
const POSTHOG_REQUIRED_TRANSPORT_PROPERTY_KEYS = new Set([
  "token",
  "distinct_id",
  "$process_person_profile",
]);
const SAFE_UTM_VALUE = /^[a-zA-Z0-9._~-]{1,100}$/;
const SAFE_LANDING_PATH = /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?\/?$/;
const SAFE_VISITOR_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ANALYTICS_GAMES = new Set<AnalyticsGame>(["flag_blitz", "capital_cities", "country_silhouettes"]);
const FLAG_BLITZ_MODES = new Set<FlagBlitzMode>(["classic", "unlimited", "speed-match", "flag-match-unlimited"]);
const ANALYTICS_DIFFICULTIES = new Set<AnalyticsDifficulty>(["easy", "medium", "hard"]);
const WEB_VITAL_PROPERTY_KEYS = new Set([
  "$web_vitals_LCP_value",
  "$web_vitals_CLS_value",
  "$web_vitals_FCP_value",
  "$web_vitals_INP_value",
]);
const PAGE_VIEW_PROPERTY_KEYS = new Set(["$current_url"]);
const WEB_VITAL_EVENT_PROPERTY_KEYS = [
  "$web_vitals_LCP_event",
  "$web_vitals_CLS_event",
  "$web_vitals_FCP_event",
  "$web_vitals_INP_event",
] as const;

function getBrowserStorage(): StorageLike | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function readJson<T>(storage: StorageLike | undefined, key: string): T | null {
  if (!storage) return null;

  try {
    const value = storage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(storage: StorageLike | undefined, key: string, value: unknown): void {
  if (!storage) return;

  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or a full storage quota should not affect gameplay.
  }
}

function removeStoredValue(storage: StorageLike | undefined, key: string): void {
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch {
    // Storage failures are safely ignored for the same reason as write failures.
  }
}

function createBrowserVisitorId(): string | null {
  try {
    return globalThis.crypto?.randomUUID?.() ?? null;
  } catch {
    return null;
  }
}

function readAnalyticsVisitorId(storage: StorageLike | undefined): string | null {
  if (!storage) return null;

  try {
    const visitorId = storage.getItem(ANALYTICS_VISITOR_STORAGE_KEY);
    return visitorId && SAFE_VISITOR_ID.test(visitorId) ? visitorId : null;
  } catch {
    return null;
  }
}

function getOrCreateAnalyticsVisitorId(
  storage: StorageLike | undefined,
  generateVisitorId: () => string | null,
): string | null {
  const existingVisitorId = readAnalyticsVisitorId(storage);
  if (existingVisitorId) return existingVisitorId;

  const visitorId = generateVisitorId();
  if (!visitorId || !SAFE_VISITOR_ID.test(visitorId)) return null;

  try {
    storage?.setItem(ANALYTICS_VISITOR_STORAGE_KEY, visitorId);
  } catch {
    // Tracking can still work for this visit if browser storage is unavailable.
  }

  return visitorId;
}

function hasCampaign(attribution: CampaignAttribution): boolean {
  return Object.keys(attribution).length > 0;
}

function toProperties(properties: Record<string, string | number | boolean | undefined>): Record<string, string | number | boolean> {
  const safeProperties: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (value !== undefined) safeProperties[key] = value;
  }

  return safeProperties;
}

function isPostHogEventName(value: string): value is PostHogEventName {
  return POSTHOG_EVENT_NAMES.has(value as PostHogEventName);
}

function isSafeAnalyticsProperty(key: string, value: unknown): value is AnalyticsPropertyValue {
  if (key === "token") return typeof value === "string" && value.trim().length > 0;
  if (key === "distinct_id") return typeof value === "string" && value.trim().length > 0;
  if (key === "$process_person_profile") return value === false;
  if (CAMPAIGN_PARAMETERS.includes(key as (typeof CAMPAIGN_PARAMETERS)[number])) return typeof value === "string" && SAFE_UTM_VALUE.test(value);
  if (key === "game") return typeof value === "string" && ANALYTICS_GAMES.has(value as AnalyticsGame);
  if (key === "mode") return typeof value === "string" && FLAG_BLITZ_MODES.has(value as FlagBlitzMode);
  if (key === "difficulty") return typeof value === "string" && ANALYTICS_DIFFICULTIES.has(value as AnalyticsDifficulty);
  if (key === "landing_path" || key === "page_path") return typeof value === "string" && SAFE_LANDING_PATH.test(value);
  if (key === "timer_enabled") return typeof value === "boolean";
  if (key === "end_reason") return value === "cleared" || value === "wrong_answer" || value === "timeout" || value === "saved";
  if (key === "exit_reason") return value === "hub" || value === "restart";
  if (key === "challenge_outcome") return value === "win" || value === "loss" || value === "draw";
  if (key === "share_method") return value === "native" || value === "copy";
  if (key === "score" || key === "duration_ms" || key === "mistakes" || key === "attempts" || key === "game_run_number" || key === "pool_size" || key === "challenger_score") {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  }
  if (WEB_VITAL_PROPERTY_KEYS.has(key)) return typeof value === "number" && Number.isFinite(value) && value >= 0;

  return false;
}

function toSanitizedCurrentUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || !SAFE_LANDING_PATH.test(url.pathname)) return null;
    return `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}

function getWebVitalsCurrentUrl(properties: Record<string, unknown>): string | null {
  const directUrl = toSanitizedCurrentUrl(properties.$current_url);
  if (directUrl) return directUrl;

  for (const metricEventKey of WEB_VITAL_EVENT_PROPERTY_KEYS) {
    const metricEvent = properties[metricEventKey];
    if (!metricEvent || typeof metricEvent !== "object") continue;

    const metricUrl = toSanitizedCurrentUrl((metricEvent as Record<string, unknown>).$current_url);
    if (metricUrl) return metricUrl;
  }

  return null;
}

function hasRequiredAnonymousTransportFields(properties: Record<string, unknown>): boolean {
  return (
    isSafeAnalyticsProperty("token", properties.token)
    && isSafeAnalyticsProperty("distinct_id", properties.distinct_id)
    && isSafeAnalyticsProperty("$process_person_profile", properties.$process_person_profile)
  );
}

/**
 * Last-mile PostHog protection. The SDK enriches events with browser data by
 * default, so this keeps only Puzzler's declared event fields and the project
 * token PostHog needs to accept the event.
 */
export function sanitizePostHogEvent(payload: PostHogCapturePayload): PostHogCapturePayload | null {
  if (!isPostHogEventName(payload.event) || !hasRequiredAnonymousTransportFields(payload.properties)) return null;

  const properties: Record<string, AnalyticsPropertyValue> = {};
  const eventPropertyKeys = payload.event === "$web_vitals"
    ? WEB_VITAL_PROPERTY_KEYS
    : payload.event === "$pageview"
      ? PAGE_VIEW_PROPERTY_KEYS
      : ANALYTICS_EVENT_PROPERTY_KEYS;

  for (const [key, value] of Object.entries(payload.properties)) {
    if (!eventPropertyKeys.has(key) && !POSTHOG_REQUIRED_TRANSPORT_PROPERTY_KEYS.has(key)) continue;
    if (key === "$current_url") {
      const currentUrl = toSanitizedCurrentUrl(value);
      if (currentUrl) properties[key] = currentUrl;
      continue;
    }
    if (!isSafeAnalyticsProperty(key, value)) continue;
    properties[key] = value;
  }

  if (payload.event === "$web_vitals") {
    const currentUrl = getWebVitalsCurrentUrl(payload.properties);
    if (currentUrl) properties.$current_url = currentUrl;
  }

  return { ...payload, properties };
}

export function extractCampaignAttribution(search: string): CampaignAttribution {
  const params = new URLSearchParams(search);
  const attribution: CampaignAttribution = {};

  for (const parameter of CAMPAIGN_PARAMETERS) {
    const value = params.get(parameter);
    if (value && SAFE_UTM_VALUE.test(value)) attribution[parameter] = value;
  }

  return attribution;
}

export function readStoredConsent(storage = getBrowserStorage()): ConsentPreferences | null {
  const stored = readJson<StoredConsent>(storage, CONSENT_STORAGE_KEY);
  if (!stored || stored.version !== 1 || typeof stored.analytics !== "boolean" || typeof stored.marketing !== "boolean") return null;

  return { analytics: stored.analytics, marketing: stored.marketing };
}

export function persistConsent(preferences: ConsentPreferences, storage = getBrowserStorage()): void {
  writeJson(storage, CONSENT_STORAGE_KEY, { version: 1, ...preferences } satisfies StoredConsent);
}

function readCampaign(storage: StorageLike | undefined): CampaignAttribution {
  const stored = readJson<CampaignAttribution>(storage, CAMPAIGN_STORAGE_KEY);
  if (!stored) return {};

  return extractCampaignAttribution(new URLSearchParams(stored).toString());
}

function readCompletionDelivery(storage: StorageLike | undefined): CompletionDelivery {
  const stored = readJson<CompletionDelivery>(storage, FIRST_COMPLETION_STORAGE_KEY);
  return {
    ...(stored?.posthog === true ? { posthog: true } : {}),
    ...(stored?.meta === true ? { meta: true } : {}),
  };
}

function writeCompletionDelivery(storage: StorageLike | undefined, deliveries: CompletionDelivery): void {
  if (!deliveries.posthog && !deliveries.meta) {
    removeStoredValue(storage, FIRST_COMPLETION_STORAGE_KEY);
    return;
  }

  writeJson(storage, FIRST_COMPLETION_STORAGE_KEY, deliveries);
}

async function loadBrowserPostHog(): Promise<PostHogClient> {
  // The no-external core deliberately does not fetch optional extensions. Load
  // PostHog's local Web Vitals callbacks first, then keep all other extension
  // requests disabled in the SDK configuration below.
  await import("posthog-js/dist/web-vitals");
  const module = await import("posthog-js/dist/module.no-external");
  return module.default as unknown as PostHogClient;
}

type FacebookPixelQueue = ((...arguments_: unknown[]) => void) & {
  callMethod?: (...arguments_: unknown[]) => void;
  queue: unknown[][];
  push: FacebookPixelQueue;
  loaded?: boolean;
  version?: string;
};

export type FacebookPixelHost = {
  fbq?: FacebookPixelQueue;
  _fbq?: FacebookPixelQueue;
};

/**
 * This mirrors Meta's standard browser queue. It remains intentionally
 * separate from script injection so the queue can be verified without
 * contacting Meta.
 */
export function createFacebookPixelQueue(windowObject: FacebookPixelHost): FacebookPixelQueue {
  if (windowObject.fbq) return windowObject.fbq;

  const fbq = ((...arguments_: unknown[]) => {
    if (fbq.callMethod) {
      fbq.callMethod.apply(fbq, arguments_);
      return;
    }

    fbq.queue.push(arguments_);
  }) as FacebookPixelQueue;
  fbq.queue = [];
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  windowObject._fbq ??= fbq;
  windowObject.fbq = fbq;
  return fbq;
}

async function loadBrowserMetaPixel(pixelId: string): Promise<MetaClient> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Meta Pixel can only load in a browser");
  }

  const pixelWindow = window as Window & FacebookPixelHost;
  const fbq = createFacebookPixelQueue(pixelWindow);
  fbq("init", pixelId);

  const existingScript = document.getElementById("puzzler-meta-pixel") as HTMLScriptElement | null;
  if (!existingScript) {
    const script = document.createElement("script");
    script.id = "puzzler-meta-pixel";
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  return {
    pageView: () => fbq("track", "PageView"),
    firstGameCompleted: (game) => fbq("trackCustom", "FirstGameCompleted", { game }),
    revoke: () => fbq("consent", "revoke"),
    grant: () => fbq("consent", "grant"),
  };
}

export function createAnalyticsClient(
  config: AnalyticsConfig,
  dependencies: AnalyticsDependencies = {},
) {
  const storage = dependencies.storage ?? getBrowserStorage();
  const loadPostHog = dependencies.loadPostHog ?? loadBrowserPostHog;
  const loadMetaPixel = dependencies.loadMetaPixel ?? loadBrowserMetaPixel;
  const getPageOrigin = dependencies.getPageOrigin ?? (() => (typeof window === "undefined" ? undefined : window.location.origin));
  const generateVisitorId = dependencies.generateVisitorId ?? createBrowserVisitorId;
  let consent: ConsentPreferences = { analytics: false, marketing: false };
  let posthog: PostHogClient | null = null;
  let metaPixel: MetaClient | null = null;
  let posthogPromise: Promise<PostHogClient | null> | null = null;
  let metaPixelPromise: Promise<MetaClient | null> | null = null;
  let firstCompletionPromise: Promise<void> | null = null;
  let lastAdLandingSignature: string | null = null;
  let lastPostHogPagePath: string | null = null;
  let lastMetaPagePath: string | null = null;

  const posthogAllowed = () => config.enabled && consent.analytics && Boolean(config.posthogToken && config.posthogHost);
  const metaAllowed = () => config.enabled && consent.marketing && Boolean(config.metaPixelId);

  async function ensurePostHog(): Promise<PostHogClient | null> {
    if (!posthogAllowed()) return null;
    if (posthog) return posthog;
    if (posthogPromise) return posthogPromise;

    posthogPromise = loadPostHog()
      .then((client) => {
        if (!posthogAllowed()) {
          client.reset(true);
          client.opt_out_capturing();
          return null;
        }

        const visitorId = getOrCreateAnalyticsVisitorId(storage, generateVisitorId);
        client.init(config.posthogToken!, {
          api_host: config.posthogHost!,
          autocapture: false,
          capture_pageview: false,
          capture_performance: {
            web_vitals: true,
            web_vitals_allowed_metrics: ["LCP", "CLS", "FCP", "INP"],
            web_vitals_attribution: false,
            network_timing: false,
          },
          disable_session_recording: true,
          disable_external_dependency_loading: true,
          disable_surveys: true,
          disable_conversations: true,
          disable_product_tours: true,
          advanced_disable_flags: true,
          save_campaign_params: false,
          save_referrer: false,
          persistence: "memory",
          disable_persistence: true,
          person_profiles: "never",
          ...(visitorId ? {
            bootstrap: {
              distinctID: visitorId,
              isIdentifiedID: false,
            },
          } : {}),
          before_send: sanitizePostHogEvent,
        });
        posthog = client;
        return client;
      })
      .catch(() => null)
      .finally(() => {
        posthogPromise = null;
      });

    return posthogPromise;
  }

  async function ensureMetaPixel(): Promise<MetaClient | null> {
    if (!metaAllowed()) return null;
    if (metaPixel) {
      metaPixel.grant();
      return metaPixel;
    }
    if (metaPixelPromise) return metaPixelPromise;

    metaPixelPromise = loadMetaPixel(config.metaPixelId!)
      .then((client) => {
        if (!metaAllowed()) {
          client.revoke();
          return null;
        }

        client.grant();
        metaPixel = client;
        return client;
      })
      .catch(() => null)
      .finally(() => {
        metaPixelPromise = null;
      });

    return metaPixelPromise;
  }

  async function track<Name extends AnalyticsEventName>(event: Name, properties: AnalyticsEventProperties[Name]): Promise<void> {
    if (!posthogAllowed()) return;
    const client = await ensurePostHog();
    if (!client || !posthogAllowed() || client !== posthog) return;

    const campaign = readCampaign(storage);
    client.capture(event, toProperties({ ...campaign, ...properties }));
  }

  function storeCampaignAttribution(search: string): CampaignAttribution {
    if (!posthogAllowed()) return {};
    const campaign = extractCampaignAttribution(search);
    if (hasCampaign(campaign)) writeJson(storage, CAMPAIGN_STORAGE_KEY, campaign);
    return campaign;
  }

  function createPageViewUrl(path: string): string | null {
    if (!SAFE_LANDING_PATH.test(path)) return null;
    const origin = getPageOrigin();
    if (!origin) return null;

    try {
      return toSanitizedCurrentUrl(new URL(path, origin).toString());
    } catch {
      return null;
    }
  }

  async function trackFirstGameCompleted(game: AnalyticsGame): Promise<void> {
    if (!posthogAllowed() && !metaAllowed()) return;

    if (firstCompletionPromise) return firstCompletionPromise;

    const deliverFirstCompletion = async () => {
      const deliveries = readCompletionDelivery(storage);

      if (posthogAllowed() && !deliveries.posthog) {
        const client = await ensurePostHog();
        if (client && posthogAllowed() && client === posthog) {
          client.capture("first_game_completed", toProperties({ ...readCampaign(storage), game }));
          deliveries.posthog = true;
        }
      }

      if (metaAllowed() && !deliveries.meta) {
        const client = await ensureMetaPixel();
        if (client && metaAllowed() && client === metaPixel) {
          client.firstGameCompleted(game);
          deliveries.meta = true;
        }
      }

      if (!posthogAllowed()) delete deliveries.posthog;
      if (!metaAllowed()) delete deliveries.meta;
      writeCompletionDelivery(storage, deliveries);
    };

    firstCompletionPromise = deliverFirstCompletion().finally(() => {
      firstCompletionPromise = null;
    });

    return firstCompletionPromise;
  }

  return {
    async setConsent(nextConsent: ConsentPreferences): Promise<void> {
      const analyticsWasEnabled = consent.analytics;
      const marketingWasEnabled = consent.marketing;
      consent = nextConsent;

      if (!nextConsent.analytics) {
        removeStoredValue(storage, CAMPAIGN_STORAGE_KEY);
        removeStoredValue(storage, ANALYTICS_VISITOR_STORAGE_KEY);
        lastPostHogPagePath = null;
        if (analyticsWasEnabled) {
          const deliveries = readCompletionDelivery(storage);
          delete deliveries.posthog;
          writeCompletionDelivery(storage, deliveries);
        }
        if (posthog) {
          posthog.reset(true);
          posthog.opt_out_capturing();
          posthog = null;
        }
      } else if (!analyticsWasEnabled) {
        await ensurePostHog();
      }

      if (!nextConsent.marketing) {
        if (marketingWasEnabled) {
          const deliveries = readCompletionDelivery(storage);
          delete deliveries.meta;
          writeCompletionDelivery(storage, deliveries);
        }
        if (metaPixel) metaPixel.revoke();
        lastMetaPagePath = null;
      } else if (!marketingWasEnabled) {
        await ensureMetaPixel();
      }
    },

    storeCampaignAttribution,

    async trackAdLanding(path: string, search: string): Promise<void> {
      if (!posthogAllowed()) return;
      const campaign = storeCampaignAttribution(search);
      if (!hasCampaign(campaign)) return;

      const signature = `${path}?${new URLSearchParams(campaign).toString()}`;
      if (signature === lastAdLandingSignature) return;
      lastAdLandingSignature = signature;
      await track("ad_landing_viewed", { landing_path: path, ...campaign });
    },

    async trackPageView(path: string): Promise<void> {
      if (!posthogAllowed() || path === lastPostHogPagePath) return;
      const currentUrl = createPageViewUrl(path);
      if (!currentUrl) return;
      lastPostHogPagePath = path;
      const client = await ensurePostHog();
      if (!client || !posthogAllowed() || client !== posthog) {
        if (lastPostHogPagePath === path) lastPostHogPagePath = null;
        return;
      }
      client.capture("$pageview", { $current_url: currentUrl });
    },

    async trackMetaPageView(path: string): Promise<void> {
      if (!metaAllowed() || path === lastMetaPagePath) return;
      lastMetaPagePath = path;
      const client = await ensureMetaPixel();
      if (!client || !metaAllowed() || client !== metaPixel) {
        if (lastMetaPagePath === path) lastMetaPagePath = null;
        return;
      }
      client.pageView();
    },

    track,
    trackFirstGameCompleted,

    // This is intentionally exposed for focused tests only; it contains no user data.
    getConsent: (): ConsentPreferences => ({ ...consent }),
  };
}

function browserAnalyticsConfig(): AnalyticsConfig {
  return {
    enabled: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true",
    posthogToken: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
    posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID,
  };
}

const browserAnalytics = createAnalyticsClient(browserAnalyticsConfig());

export function setAnalyticsConsent(consent: ConsentPreferences): Promise<void> {
  return browserAnalytics.setConsent(consent);
}

export function captureAdLanding(path: string, search: string): Promise<void> {
  return browserAnalytics.trackAdLanding(path, search);
}

export function capturePageView(path: string): Promise<void> {
  return browserAnalytics.trackPageView(path);
}

export function captureMetaPageView(path: string): Promise<void> {
  return browserAnalytics.trackMetaPageView(path);
}

export function trackGameSelected(game: AnalyticsGame): Promise<void> {
  return browserAnalytics.track("game_selected", { game });
}

export function trackGameModeSelected(mode: FlagBlitzMode): Promise<void> {
  return browserAnalytics.track("game_mode_selected", { game: "flag_blitz", mode });
}

export function trackGameStarted(properties: AnalyticsEventProperties["game_started"]): Promise<void> {
  return browserAnalytics.track("game_started", properties);
}

export function trackGameCompleted(properties: AnalyticsEventProperties["game_completed"]): Promise<void> {
  return browserAnalytics.track("game_completed", properties);
}

export function trackGameAbandoned(properties: AnalyticsEventProperties["game_abandoned"]): Promise<void> {
  return browserAnalytics.track("game_abandoned", properties);
}

export function trackReplayStarted(properties: AnalyticsEventProperties["replay_started"]): Promise<void> {
  return browserAnalytics.track("replay_started", properties);
}

export function trackFlagMatchChallengeOpened(properties: AnalyticsEventProperties["flag_match_challenge_opened"]): Promise<void> {
  return browserAnalytics.track("flag_match_challenge_opened", properties);
}

export function trackFlagMatchChallengeStarted(properties: AnalyticsEventProperties["flag_match_challenge_started"]): Promise<void> {
  return browserAnalytics.track("flag_match_challenge_started", properties);
}

export function trackFlagMatchChallengeCompleted(properties: AnalyticsEventProperties["flag_match_challenge_completed"]): Promise<void> {
  return browserAnalytics.track("flag_match_challenge_completed", properties);
}

export function trackFlagMatchChallengeShared(properties: AnalyticsEventProperties["flag_match_challenge_shared"]): Promise<void> {
  return browserAnalytics.track("flag_match_challenge_shared", properties);
}

export function trackFlagMatchChallengeReshared(properties: AnalyticsEventProperties["flag_match_challenge_reshared"]): Promise<void> {
  return browserAnalytics.track("flag_match_challenge_reshared", properties);
}

export function trackFirstGameCompletion(game: AnalyticsGame): Promise<void> {
  return browserAnalytics.trackFirstGameCompleted(game);
}
