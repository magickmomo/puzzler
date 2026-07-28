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
    getPageOrigin: () => "https://puzzler.example",
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
  it("accepts the daily country game without permitting typed answers", () => {
    expect(sanitizePostHogEvent({
      event: "game_completed",
      properties: {
        token: "test-token",
        distinct_id: "visitor",
        $process_person_profile: false,
        game: "daily_country",
        score: 4,
        duration_ms: 1_000,
        progress: 3,
        answer: "France",
      },
    })).toEqual({
      event: "game_completed",
      properties: {
        token: "test-token",
        distinct_id: "visitor",
        $process_person_profile: false,
        game: "daily_country",
        score: 4,
        duration_ms: 1_000,
        progress: 3,
      },
    });
  });

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

  it("keeps the required anonymous transport fields while removing SDK-added browser data", async () => {
    const analytics = createTestAnalytics();

    await analytics.client.setConsent({ analytics: true, marketing: false });
    const initCall = analytics.posthogCalls.find((call) => call.type === "init");
    const options = initCall?.options as {
      autocapture: boolean;
      capture_pageview: boolean;
      capture_performance: {
        web_vitals: boolean;
        web_vitals_allowed_metrics: string[];
        web_vitals_attribution: boolean;
        network_timing: boolean;
      };
      persistence: string;
      disable_persistence: boolean;
      disable_external_dependency_loading: boolean;
      save_campaign_params: boolean;
      save_referrer: boolean;
      before_send: typeof sanitizePostHogEvent;
    };

    expect(options).toMatchObject({
      autocapture: false,
      capture_pageview: false,
      capture_performance: {
        web_vitals: true,
        web_vitals_allowed_metrics: ["LCP", "CLS", "FCP", "INP"],
        web_vitals_attribution: false,
        network_timing: false,
      },
      persistence: "memory",
      disable_persistence: true,
      disable_external_dependency_loading: true,
      save_campaign_params: false,
      save_referrer: false,
    });
    expect(options.before_send({
      event: "game_completed",
      properties: {
        token: "project-token",
        distinct_id: "0199da17-863d-7c90-8cff-940f8f5adf20",
        "$process_person_profile": false,
        game: "flag_blitz",
        score: 10,
        "$current_url": "https://puzzler.example/?email=not-allowed",
        "$referrer": "https://referrer.example/?secret=no",
        "$browser": "Browser name",
        "$session_id": "session-id",
        arbitrary: "not allowed",
      },
    })).toEqual({
      event: "game_completed",
      properties: {
        token: "project-token",
        distinct_id: "0199da17-863d-7c90-8cff-940f8f5adf20",
        "$process_person_profile": false,
        game: "flag_blitz",
        score: 10,
      },
    });
    expect(options.before_send({ event: "$opt_in", properties: { token: "project-token" } })).toBeNull();
  });

  it("keeps real Next.js landing paths without their query string", () => {
    expect(sanitizePostHogEvent({
      event: "ad_landing_viewed",
      properties: {
        token: "project-token",
        distinct_id: "anonymous-id",
        "$process_person_profile": false,
        landing_path: "/flag-blitz",
      },
    })?.properties.landing_path).toBe("/flag-blitz");

    expect(sanitizePostHogEvent({
      event: "ad_landing_viewed",
      properties: {
        token: "project-token",
        distinct_id: "anonymous-id",
        "$process_person_profile": false,
        landing_path: "/capital-cities",
      },
    })?.properties.landing_path).toBe("/capital-cities");
  });

  it("fails closed when any required anonymous transport value is invalid", () => {
    expect(sanitizePostHogEvent({
      event: "game_selected",
      properties: {
        token: "project-token",
        distinct_id: "   ",
        "$process_person_profile": true,
        game: "flag_blitz",
      },
    })).toBeNull();

    expect(sanitizePostHogEvent({
      event: "game_selected",
      properties: {
        token: "   ",
        distinct_id: "anonymous-id",
        "$process_person_profile": false,
        game: "flag_blitz",
      },
    })).toBeNull();
  });

  it("keeps only numeric Web Vitals and a sanitised page URL alongside anonymous transport fields", () => {
    expect(sanitizePostHogEvent({
      event: "$web_vitals",
      properties: {
        token: "project-token",
        distinct_id: "anonymous-id",
        "$process_person_profile": false,
        "$web_vitals_LCP_value": 2100,
        "$web_vitals_CLS_value": 0.04,
        "$web_vitals_FCP_value": 900,
        "$web_vitals_INP_value": 120,
        "$web_vitals_LCP_event": { $current_url: "https://puzzler.example/flag-blitz?email=not-allowed#results" },
        "$session_id": "session-id",
      },
    })).toEqual({
      event: "$web_vitals",
      properties: {
        token: "project-token",
        distinct_id: "anonymous-id",
        "$process_person_profile": false,
        "$web_vitals_LCP_value": 2100,
        "$web_vitals_CLS_value": 0.04,
        "$web_vitals_FCP_value": 900,
        "$web_vitals_INP_value": 120,
        "$current_url": "https://puzzler.example/flag-blitz",
      },
    });
  });

  it("keeps the reserved pageview event with only a sanitised origin and path", () => {
    expect(sanitizePostHogEvent({
      event: "$pageview",
      properties: {
        token: "project-token",
        distinct_id: "anonymous-id",
        "$process_person_profile": false,
        "$current_url": "https://puzzler.example/capital-cities?utm_campaign=ad#game",
        "$referrer": "https://referrer.example/?secret=no",
        "page_path": "/capital-cities",
      },
    })).toEqual({
      event: "$pageview",
      properties: {
        token: "project-token",
        distinct_id: "anonymous-id",
        "$process_person_profile": false,
        "$current_url": "https://puzzler.example/capital-cities",
      },
    });
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
      analytics.client.trackPageView("/flag-blitz"),
      analytics.client.trackPageView("/flag-blitz"),
    ]);
    await Promise.all([
      analytics.client.trackMetaPageView("/flag-blitz"),
      analytics.client.trackMetaPageView("/flag-blitz"),
    ]);

    expect(analytics.posthogCalls.filter((call) => call.event === "ad_landing_viewed")).toHaveLength(1);
    expect(analytics.posthogCalls.filter((call) => call.event === "$pageview")).toEqual([
      {
        type: "capture",
        event: "$pageview",
        properties: { $current_url: "https://puzzler.example/flag-blitz" },
      },
    ]);
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
