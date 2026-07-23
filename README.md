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

## Player records

Completed runs, Flag Report data, and flag settings are stored in the browser using Zustand persistence. They belong to Flag Blitz itself: its launcher shows total runs, best Classic score, best Classic Unlimited streak, fastest completed Speed Match time, and best Flag Match Unlimited score. Flag Report records attempts, correct answers, and misses for each country in every Flag Blitz mode. Match Capital Cities keeps its own number of starts and fastest completion time. Records remain local to the browser and are not synced between devices, and future games can keep their own separate profiles.

## Flag settings

Flag settings live inside Flag Blitz and let players exclude individual countries from future Flag Blitz runs. At least 12 flags must remain active so the live Flag Match Unlimited board can always fill its nine playable and three queued positions. Changes never alter a run already in progress.
