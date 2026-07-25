import { describe, expect, it } from "vitest";
import {
  CAMPAIGN_STORAGE_KEY,
  FIRST_COMPLETION_STORAGE_KEY,
  createFacebookPixelQueue,
  createAnalyticsClient,
  extractCampaignAttribution,
  sanitizePostHogEvent,
  type AnalyticsDependencies,
  type FacebookPixelHost,
} from "./analytics";

function createMemoryStorage() {
  const values = new Map<string, string>();
  const reads: string[] = [];

  return {
    getItem: (key: string) => {
      reads.push(key);
      return values.get(key) ?? null;
    },
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    reads,
  };
}

function createTestAnalytics() {
  const posthogCalls: Array<{ type: string; event?: string; properties?: Record<string, string | number | boolean>; options?: unknown }> = [];
  const metaCalls: Array<{ type: string; game?: string }> = [];
  const storage = createMemoryStorage();
  let posthogLoads = 0;
  let metaLoads = 0;

  const dependencies: AnalyticsDependencies = {
    storage,
    loadPostHog: async () => {
      posthogLoads += 1;
      return {
        init: (_token, options) => posthogCalls.push({ type: "init", options }),
        capture: (event, properties) => posthogCalls.push({ type: "capture", event, properties }),
        opt_in_capturing: () => posthogCalls.push({ type: "opt_in" }),
        reset: () => posthogCalls.push({ type: "reset" }),
        opt_out_capturing: () => posthogCalls.push({ type: "opt_out" }),
      };
    },
    loadMetaPixel: async () => {
      metaLoads += 1;
      return {
        pageView: () => metaCalls.push({ type: "page_view" }),
        firstGameCompleted: (game) => metaCalls.push({ type: "first_game_completed", game }),
        revoke: () => metaCalls.push({ type: "revoke" }),
        grant: () => metaCalls.push({ type: "grant" }),
      };
    },
  };

  const client = createAnalyticsClient({
    enabled: true,
    posthogToken: "test-token",
    posthogHost: "https://example.invalid",
    metaPixelId: "test-pixel",
  }, dependencies);

  return {
    client,
    storage,
    posthogCalls,
    metaCalls,
    getPosthogLoads: () => posthogLoads,
    getMetaLoads: () => metaLoads,
  };
}

describe("analytics consent gates", () => {
  it("does not initialize PostHog or Meta before consent", async () => {
    const analytics = createTestAnalytics();

    await analytics.client.track("game_selected", { game: "flag_blitz" });
    await analytics.client.trackMetaPageView("/");

    expect(analytics.getPosthogLoads()).toBe(0);
    expect(analytics.getMetaLoads()).toBe(0);
  });

  it("loads only PostHog for Analytics-only consent", async () => {
    const analytics = createTestAnalytics();

    await analytics.client.setConsent({ analytics: true, marketing: false });
    await analytics.client.track("game_selected", { game: "flag_blitz" });
    await analytics.client.trackMetaPageView("/");

    expect(analytics.getPosthogLoads()).toBe(1);
    expect(analytics.getMetaLoads()).toBe(0);
    expect(analytics.posthogCalls.some((call) => call.event === "game_selected")).toBe(true);
  });

  it("loads only Meta for Marketing-only consent", async () => {
    const analytics = createTestAnalytics();

    await analytics.client.setConsent({ analytics: false, marketing: true });
    await analytics.client.track("game_selected", { game: "capital_cities" });
    await analytics.client.trackMetaPageView("/");

    expect(analytics.getPosthogLoads()).toBe(0);
    expect(analytics.getMetaLoads()).toBe(1);
    expect(analytics.metaCalls).toContainEqual({ type: "page_view" });
  });

  it("loads neither service when non-essential consent is rejected", async () => {
    const analytics = createTestAnalytics();

    await analytics.client.setConsent({ analytics: false, marketing: false });
    await analytics.client.track("game_selected", { game: "flag_blitz" });
    await analytics.client.trackMetaPageView("/");

    expect(analytics.getPosthogLoads()).toBe(0);
    expect(analytics.getMetaLoads()).toBe(0);
  });

  it("stops later tracking and resets PostHog when Analytics consent is revoked", async () => {
    const analytics = createTestAnalytics();

    await analytics.client.setConsent({ analytics: true, marketing: false });
    await analytics.client.track("game_selected", { game: "flag_blitz" });
    await analytics.client.setConsent({ analytics: false, marketing: false });
    await analytics.client.track("game_selected", { game: "capital_cities" });

    expect(analytics.posthogCalls.filter((call) => call.event === "game_selected")).toHaveLength(1);
    expect(analytics.posthogCalls.some((call) => call.type === "reset")).toBe(true);
    expect(analytics.posthogCalls.some((call) => call.type === "opt_out")).toBe(true);
  });

  it("revokes Meta and does not send a later page view when Marketing consent is withdrawn", async () => {
    const analytics = createTestAnalytics();

    await analytics.client.setConsent({ analytics: false, marketing: true });
    await analytics.client.trackMetaPageView("/");
    await analytics.client.setConsent({ analytics: false, marketing: false });
    await analytics.client.trackMetaPageView("/flag-blitz");

    expect(analytics.metaCalls.filter((call) => call.type === "page_view")).toHaveLength(1);
    expect(analytics.metaCalls.some((call) => call.type === "revoke")).toBe(true);
  });
});

describe("analytics data minimisation", () => {
  it("only extracts the allowlisted UTM parameters", () => {
    expect(extractCampaignAttribution("?utm_source=facebook&utm_medium=paid&utm_campaign=summer&utm_content=video&utm_term=flags&email=not-allowed&answer=France")).toEqual({
      utm_source: "facebook",
      utm_medium: "paid",
      utm_campaign: "summer",
      utm_content: "video",
      utm_term: "flags",
    });
  });

  it("stores campaign attribution only after Analytics consent", async () => {
    const analytics = createTestAnalytics();

    analytics.client.storeCampaignAttribution("?utm_source=facebook&ignored=value");
    expect(analytics.storage.getItem(CAMPAIGN_STORAGE_KEY)).toBeNull();

    await analytics.client.setConsent({ analytics: true, marketing: false });
    analytics.client.storeCampaignAttribution("?utm_source=facebook&ignored=value");

    expect(analytics.storage.getItem(CAMPAIGN_STORAGE_KEY)).toBe(JSON.stringify({ utm_source: "facebook" }));
  });

  it("rejects arbitrary query values rather than treating them as campaign attribution", () => {
    expect(extractCampaignAttribution("?utm_source=facebook&utm_campaign=summer%20sale&email=not-allowed")).toEqual({
      utm_source: "facebook",
    });
  });

  it("removes SDK-added browser data and undeclared events before PostHog delivery", async () => {
    const analytics = createTestAnalytics();

    await analytics.client.setConsent({ analytics: true, marketing: false });
    const initCall = analytics.posthogCalls.find((call) => call.type === "init");
    const options = initCall?.options as {
      autocapture: boolean;
      capture_pageview: boolean;
      capture_performance: boolean;
      persistence: string;
      disable_persistence: boolean;
      save_campaign_params: boolean;
      save_referrer: boolean;
      before_send: typeof sanitizePostHogEvent;
    };

    expect(options).toMatchObject({
      autocapture: false,
      capture_pageview: false,
      capture_performance: false,
      persistence: "memory",
      disable_persistence: true,
      save_campaign_params: false,
      save_referrer: false,
    });
    expect(options.before_send({
      event: "game_completed",
      properties: {
        token: "project-token",
        game: "flag_blitz",
        score: 10,
        "$current_url": "https://puzzler.example/?email=not-allowed",
        "$referrer": "https://referrer.example/?secret=no",
        "$browser": "Browser name",
        arbitrary: "not allowed",
      },
    })).toEqual({
      event: "game_completed",
      properties: { token: "project-token", game: "flag_blitz", score: 10 },
    });
    expect(options.before_send({ event: "$opt_in", properties: { token: "project-token" } })).toBeNull();
  });
});

describe("analytics event delivery guards", () => {
  it("delivers first_game_completed once per destination", async () => {
    const analytics = createTestAnalytics();

    await analytics.client.setConsent({ analytics: true, marketing: true });
    await Promise.all([
      analytics.client.trackFirstGameCompleted("flag_blitz"),
      analytics.client.trackFirstGameCompleted("capital_cities"),
    ]);

    expect(analytics.posthogCalls.filter((call) => call.event === "first_game_completed")).toHaveLength(1);
    expect(analytics.metaCalls.filter((call) => call.type === "first_game_completed")).toHaveLength(1);
    expect(analytics.storage.getItem(FIRST_COMPLETION_STORAGE_KEY)).toBe(JSON.stringify({ posthog: true, meta: true }));
  });

  it("keeps first-completion delivery flags separate when consent changes", async () => {
    const analytics = createTestAnalytics();

    await analytics.client.setConsent({ analytics: true, marketing: false });
    await analytics.client.trackFirstGameCompleted("flag_blitz");
    await analytics.client.setConsent({ analytics: true, marketing: true });
    await analytics.client.trackFirstGameCompleted("capital_cities");

    expect(analytics.posthogCalls.filter((call) => call.event === "first_game_completed")).toHaveLength(1);
    expect(analytics.metaCalls.filter((call) => call.type === "first_game_completed")).toHaveLength(1);
  });

  it("removes each optional first-completion flag when its consent is withdrawn", async () => {
    const analytics = createTestAnalytics();

    await analytics.client.setConsent({ analytics: true, marketing: true });
    await analytics.client.trackFirstGameCompleted("flag_blitz");
    await analytics.client.setConsent({ analytics: false, marketing: true });

    expect(analytics.storage.getItem(FIRST_COMPLETION_STORAGE_KEY)).toBe(JSON.stringify({ meta: true }));

    await analytics.client.setConsent({ analytics: false, marketing: false });
    expect(analytics.storage.getItem(FIRST_COMPLETION_STORAGE_KEY)).toBeNull();
  });

  it("does not create first-completion storage without relevant consent", async () => {
    const analytics = createTestAnalytics();

    analytics.storage.setItem(FIRST_COMPLETION_STORAGE_KEY, JSON.stringify({ posthog: true }));
    await analytics.client.setConsent({ analytics: false, marketing: false });
    await analytics.client.trackFirstGameCompleted("flag_blitz");

    expect(analytics.storage.reads).not.toContain(FIRST_COMPLETION_STORAGE_KEY);
  });

  it("does not duplicate landing or page-view events on repeated renders", async () => {
    const analytics = createTestAnalytics();

    await analytics.client.setConsent({ analytics: true, marketing: true });
    await Promise.all([
      analytics.client.trackAdLanding("/flag-blitz", "?utm_source=facebook&utm_campaign=summer"),
      analytics.client.trackAdLanding("/flag-blitz", "?utm_source=facebook&utm_campaign=summer"),
    ]);
    await Promise.all([
      analytics.client.trackMetaPageView("/flag-blitz"),
      analytics.client.trackMetaPageView("/flag-blitz"),
    ]);

    expect(analytics.posthogCalls.filter((call) => call.event === "ad_landing_viewed")).toHaveLength(1);
    expect(analytics.metaCalls.filter((call) => call.type === "page_view")).toHaveLength(1);
  });
});

describe("Meta Pixel browser queue", () => {
  it("uses Meta's standard queue aliases before the consent-gated script loads", () => {
    const pixelHost: FacebookPixelHost = {};
    const fbq = createFacebookPixelQueue(pixelHost);

    fbq("init", "pixel-id");
    fbq("track", "PageView");

    expect(pixelHost.fbq).toBe(fbq);
    expect(pixelHost._fbq).toBe(fbq);
    expect(fbq.push).toBe(fbq);
    expect(fbq.queue).toEqual([
      ["init", "pixel-id"],
      ["track", "PageView"],
    ]);
  });
});
