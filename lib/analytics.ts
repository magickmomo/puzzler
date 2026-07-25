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

export type AnalyticsGame = "flag_blitz" | "capital_cities";
export type FlagBlitzMode = "classic" | "unlimited" | "speed-match" | "speed-match-unlimited";
export type AnalyticsDifficulty = "easy" | "medium" | "hard";

export type AnalyticsEventProperties = {
  ad_landing_viewed: { landing_path: string } & CampaignAttribution;
  game_selected: { game: AnalyticsGame };
  game_started: {
    game: AnalyticsGame;
    mode?: FlagBlitzMode;
    difficulty?: AnalyticsDifficulty;
    timer_enabled?: boolean;
  };
  game_completed: {
    game: AnalyticsGame;
    mode?: FlagBlitzMode;
    difficulty?: AnalyticsDifficulty;
    timer_enabled?: boolean;
    score: number;
    duration_ms: number;
    mistakes?: number;
    progress?: number;
  };
  game_abandoned: {
    game: AnalyticsGame;
    mode?: FlagBlitzMode;
    difficulty?: AnalyticsDifficulty;
    timer_enabled?: boolean;
    duration_ms: number;
    mistakes?: number;
    progress?: number;
  };
  replay_started: {
    game: AnalyticsGame;
    mode?: FlagBlitzMode;
    difficulty?: AnalyticsDifficulty;
    timer_enabled?: boolean;
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
  capture_performance: false;
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
  "game_started",
  "game_completed",
  "game_abandoned",
  "replay_started",
  "first_game_completed",
] as const satisfies readonly AnalyticsEventName[];

const ANALYTICS_EVENT_PROPERTY_KEYS = new Set<string>([
  "game",
  "mode",
  "difficulty",
  "timer_enabled",
  "score",
  "duration_ms",
  "mistakes",
  "progress",
  "landing_path",
  ...CAMPAIGN_PARAMETERS,
]);

// PostHog requires its project token to ingest an event. All other SDK-added
// properties, including URLs, referrers, device details, and session IDs, are
// removed just before delivery.
const POSTHOG_REQUIRED_TRANSPORT_PROPERTY_KEYS = new Set(["token"]);
const SAFE_UTM_VALUE = /^[a-zA-Z0-9._~-]{1,100}$/;
const SAFE_LANDING_PATH = /^\/(?:[a-z0-9-]+\/)*$/;
const ANALYTICS_GAMES = new Set<AnalyticsGame>(["flag_blitz", "capital_cities"]);
const FLAG_BLITZ_MODES = new Set<FlagBlitzMode>(["classic", "unlimited", "speed-match", "speed-match-unlimited"]);
const ANALYTICS_DIFFICULTIES = new Set<AnalyticsDifficulty>(["easy", "medium", "hard"]);

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

function isAnalyticsEventName(value: string): value is AnalyticsEventName {
  return ANALYTICS_EVENT_NAMES.includes(value as AnalyticsEventName);
}

function isSafeAnalyticsProperty(key: string, value: unknown): value is AnalyticsPropertyValue {
  if (key === "token") return typeof value === "string";
  if (CAMPAIGN_PARAMETERS.includes(key as (typeof CAMPAIGN_PARAMETERS)[number])) return typeof value === "string" && SAFE_UTM_VALUE.test(value);
  if (key === "game") return typeof value === "string" && ANALYTICS_GAMES.has(value as AnalyticsGame);
  if (key === "mode") return typeof value === "string" && FLAG_BLITZ_MODES.has(value as FlagBlitzMode);
  if (key === "difficulty") return typeof value === "string" && ANALYTICS_DIFFICULTIES.has(value as AnalyticsDifficulty);
  if (key === "landing_path") return typeof value === "string" && SAFE_LANDING_PATH.test(value);
  if (key === "timer_enabled") return typeof value === "boolean";
  if (key === "score" || key === "duration_ms" || key === "mistakes" || key === "progress") {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  }

  return false;
}

/**
 * Last-mile PostHog protection. The SDK enriches events with browser data by
 * default, so this keeps only Puzzler's declared event fields and the project
 * token PostHog needs to accept the event.
 */
export function sanitizePostHogEvent(payload: PostHogCapturePayload): PostHogCapturePayload | null {
  if (!isAnalyticsEventName(payload.event)) return null;

  const properties: Record<string, AnalyticsPropertyValue> = {};

  for (const [key, value] of Object.entries(payload.properties)) {
    if (!ANALYTICS_EVENT_PROPERTY_KEYS.has(key) && !POSTHOG_REQUIRED_TRANSPORT_PROPERTY_KEYS.has(key)) continue;
    if (!isSafeAnalyticsProperty(key, value)) continue;
    properties[key] = value;
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
  // Use PostHog's no-external bundle: Puzzler only needs explicit event capture,
  // not remotely loaded extensions such as replay, surveys, or heatmaps.
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
  let consent: ConsentPreferences = { analytics: false, marketing: false };
  let posthog: PostHogClient | null = null;
  let metaPixel: MetaClient | null = null;
  let posthogPromise: Promise<PostHogClient | null> | null = null;
  let metaPixelPromise: Promise<MetaClient | null> | null = null;
  let firstCompletionPromise: Promise<void> | null = null;
  let lastAdLandingSignature: string | null = null;
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

        client.init(config.posthogToken!, {
          api_host: config.posthogHost!,
          autocapture: false,
          capture_pageview: false,
          capture_performance: false,
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

  async function trackFirstGameCompleted(game: AnalyticsGame): Promise<void> {
    if (!posthogAllowed() && !metaAllowed()) return;

    if (firstCompletionPromise) return firstCompletionPromise;

    const deliverFirstCompletion = async () => {
      const deliveries = readCompletionDelivery(storage);

      if (posthogAllowed() && !deliveries.posthog) {
        const client = await ensurePostHog();
        if (client && posthogAllowed() && client === posthog) {
          client.capture("first_game_completed", { game });
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

export function captureMetaPageView(path: string): Promise<void> {
  return browserAnalytics.trackMetaPageView(path);
}

export function trackGameSelected(game: AnalyticsGame): Promise<void> {
  return browserAnalytics.track("game_selected", { game });
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

export function trackFirstGameCompletion(game: AnalyticsGame): Promise<void> {
  return browserAnalytics.trackFirstGameCompleted(game);
}
