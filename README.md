# Puzzler

Puzzler is a mobile-first arcade of quick games. Flag Blitz offers a 10-question Classic run, a Classic Unlimited streak run, a 60-second Speed Match board, and untimed Flag Match Unlimited. Match Capital Cities is a ten-pair board where correct country–capital matches clear away and each mistake adds two seconds.

## Stack

- Next.js 15, React 19, TypeScript, Tailwind CSS, and Zustand
- FlagCDN SVG flag assets
- Vitest for game-engine tests

## Local development

Requires Node.js 22 or newer.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000` in your browser.

## Checks

```bash
npm run typecheck
npm test
npm run build
```

GitHub Actions runs these checks for pull requests and pushes to `main`.

## Changelog

The in-app **What's New** screen is curated in `app/data/changelog.ts`. Add the newest player-facing summary first whenever a GitHub change reaches Puzzler, and reference the matching commit hash so players can inspect the technical change if they want to.

## Vercel configuration

By default, the dashboard only shows Flag Blitz. To reveal the upcoming Word Grid and Number Drop cards in a development deployment, set this Vercel environment variable and redeploy:

```text
NEXT_PUBLIC_PUZZLER_MODE=dev
```

`NEXT_PUBLIC_` variables are embedded at build time, so a redeploy is required after changing the value.

## Consent-gated analytics

Puzzler only loads optional tracking after a player makes an explicit choice in the cookie dialog. Necessary browser storage remains enabled for local game records and the saved consent choice.

Required production configuration:

```text
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=your_posthog_project_token
NEXT_PUBLIC_POSTHOG_HOST=your_posthog_host
NEXT_PUBLIC_META_PIXEL_ID=your_meta_pixel_id
```

`NEXT_PUBLIC_ANALYTICS_ENABLED` is a master switch for both destinations. Leave it unset or set it to `false` in local and Vercel preview deployments so test activity cannot contaminate production analytics. These values are public browser configuration values, not secrets; configure real values in Vercel rather than committing them.

When Analytics is accepted, PostHog EU receives explicit page, game, campaign, and Web Vitals events with an ephemeral pseudonymous visitor ID. Autocapture, automatic page-view capture, campaign/referrer capture, feature flags, session recording, heatmaps, console/network recording, `identify`, and known-person profiles are disabled. Puzzler deliberately emits PostHog&apos;s reserved `$pageview` event with only a sanitised origin and route path, and enables only LCP, CLS, FCP, and INP Web Vitals with attribution and network timing disabled. PostHog&apos;s local Web Vitals callbacks are loaded only after Analytics consent; remote extension loading remains disabled. PostHog runs in memory-only mode with provider persistence disabled, and a final `before_send` allowlist fails closed unless the required `token`, `distinct_id`, and `$process_person_profile: false` transport fields are valid. It removes SDK-added raw URLs, referrers, device, browser, and session data, while retaining only the sanitised origin and path needed for page and per-page Web Vitals reporting. When Marketing is accepted, the Meta Pixel receives deliberate `PageView` events and one `FirstGameCompleted` custom conversion while Marketing consent remains granted. Automatic advanced matching is not used. Rejecting non-essential cookies loads neither service. Preferences can be changed or withdrawn from the persistent **Cookie settings** footer control.

### Event taxonomy

PostHog uses these snake-case events: `ad_landing_viewed`, `game_selected`, `game_mode_selected`, `game_started`, `game_completed`, `game_abandoned`, `replay_started`, and `first_game_completed`. Flag Marathon challenges also use `flag_match_challenge_opened`, `flag_match_challenge_started`, `flag_match_challenge_completed`, `flag_match_challenge_shared`, and `flag_match_challenge_reshared`. It also records PostHog&apos;s reserved `$pageview` event with a sanitised `$current_url`, and the `$web_vitals` event with only numeric LCP, CLS, FCP, and INP values plus that same sanitised page URL.

Events use only the relevant values from: game, mode, difficulty, timer enabled, per-game run number, aggregate score, attempts, mistakes, elapsed duration, completion or exit reason, challenge outcome or sharing method, a sanitised origin and path without its query string or fragment, and the allowlisted `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and `utm_term` values. `first_game_completed` is emitted only after at least one attempt. UTM values are limited to short URL-safe campaign labels. Puzzler never sends typed answers, country-level attempts, player names, email addresses, or other player profile data to PostHog. Campaign attribution is stored only after Analytics consent, and PostHog never receives a raw full query string or fragment.

### Verifying production tracking

1. In a production deployment with the variables above, open the site in a fresh browser profile and accept the relevant category.
2. For PostHog, use Live Events and verify the explicit event name, documented event properties, a non-empty `token`, a non-empty `distinct_id`, and `$process_person_profile: false`. Confirm that `$pageview` and `$web_vitals` each contain only a sanitised `$current_url` with its origin and route path; `$web_vitals` may also contain numeric LCP/CLS/FCP/INP values. No query string, fragment, referrer, device, browser, or session properties should be present. Rejecting Analytics must cause no further events.
3. For Meta, use Events Manager → Test Events, accept Marketing, then load a page to see `PageView`. Complete a first game to see `FirstGameCompleted` with only a `game` property.
4. Change Cookie settings to reject the category and confirm that later gameplay produces no additional destination-specific events.

Use a separate PostHog project and Meta Pixel for a staging environment if tracking is required there. Do not enable the production values on preview URLs.

## Player records

Completed runs, Flag Report data, and flag settings are stored in the browser using Zustand persistence. They belong to Flag Blitz itself: its launcher shows total runs, best Classic score, best Classic Unlimited streak, fastest completed Speed Match time, and best Flag Match Unlimited score. Flag Report records attempts, correct answers, and misses for each country in every Flag Blitz mode. Match Capital Cities keeps its own number of starts and fastest completion time. Records remain local to the browser and are not synced between devices, and future games can keep their own separate profiles.

## Flag settings

Flag settings live inside Flag Blitz and let players exclude individual countries from future Flag Blitz runs. At least 12 flags must remain active so the live Flag Match Unlimited board can always fill its nine playable and three queued positions. Changes never alter a run already in progress.
