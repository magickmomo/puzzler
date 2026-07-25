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

type PostHogClient = {
  init: (token: string, options: {
    api_host: string;
    autocapture: false;
    capture_pageview: false;
    disable_session_recording: true;
  }) => unknown;
  capture: (event: string, properties: Record<string, string | number | boolean>) => unknown;
  opt_in_capturing: () => void;
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

type CompletionDelivery = {
  posthog: boolean;
  meta: boolean;
};

const CAMPAIGN_PARAMETERS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
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

export function extractCampaignAttribution(search: string): CampaignAttribution {
  const params = new URLSearchParams(search);
  const attribution: CampaignAttribution = {};

  for (const parameter of CAMPAIGN_PARAMETERS) {
    const value = params.get(parameter);
    if (value) attribution[parameter] = value;
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
  return { posthog: stored?.posthog === true, meta: stored?.meta === true };
}

async function loadBrowserPostHog(): Promise<PostHogClient> {
  // Use PostHog's no-external bundle: Puzzler only needs explicit event capture,
  // not remotely loaded extensions such as replay, surveys, or heatmaps.
  const module = await import("posthog-js/dist/module.no-external");
  return module.default as unknown as PostHogClient;
}

type FacebookPixelQueue = ((...arguments_: unknown[]) => void) & {
  callMethod?: (...arguments_: unknown[]) => void;
  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
};

type FacebookWindow = Window & { fbq?: FacebookPixelQueue };

function getFacebookPixel(windowObject: FacebookWindow): FacebookPixelQueue {
  if (windowObject.fbq) return windowObject.fbq;

  const queue = ((...arguments_: unknown[]) => {
    if (queue.callMethod) {
      queue.callMethod(...arguments_);
      return;
    }

    queue.queue?.push(arguments_);
  }) as FacebookPixelQueue;
  queue.queue = [];
  queue.loaded = true;
  queue.version = "2.0";
  windowObject.fbq = queue;
  return queue;
}

async function loadBrowserMetaPixel(pixelId: string): Promise<MetaClient> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Meta Pixel can only load in a browser");
  }

  const pixelWindow = window as FacebookWindow;
  const fbq = getFacebookPixel(pixelWindow);
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
          disable_session_recording: true,
        });
        client.opt_in_capturing();
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

    if (deliveries.posthog || deliveries.meta) writeJson(storage, FIRST_COMPLETION_STORAGE_KEY, deliveries);
  }

  return {
    async setConsent(nextConsent: ConsentPreferences): Promise<void> {
      const analyticsWasEnabled = consent.analytics;
      const marketingWasEnabled = consent.marketing;
      consent = nextConsent;

      if (!nextConsent.analytics) {
        removeStoredValue(storage, CAMPAIGN_STORAGE_KEY);
        if (posthog) {
          posthog.reset(true);
          posthog.opt_out_capturing();
          posthog = null;
        }
      } else if (!analyticsWasEnabled) {
        await ensurePostHog();
      }

      if (!nextConsent.marketing) {
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
