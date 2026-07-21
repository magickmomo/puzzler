# Puzzler

Puzzler is a mobile-first arcade of quick games. The current live game is Flag Blitz: identify country flags in a 10-question Classic run, an Unlimited streak run, a 60-second Speed Match board, or Speed Match Unlimited—a continuously replenished board with nine active flags and three faded previews for 60 seconds.

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

## Vercel configuration

By default, the dashboard only shows Flag Blitz. To reveal the upcoming Word Grid and Number Drop cards in a development deployment, set this Vercel environment variable and redeploy:

```text
NEXT_PUBLIC_PUZZLER_MODE=dev
```

`NEXT_PUBLIC_` variables are embedded at build time, so a redeploy is required after changing the value.

## Player records

Completed runs are stored in the browser using Zustand persistence. The dashboard shows total runs, best Classic score, best Unlimited streak, and best Speed Match score. Records remain local to the browser and are not synced between devices.
