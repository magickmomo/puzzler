export type ChangelogEntry = {
  date: string;
  title: string;
  summary: string;
  highlights: readonly string[];
  commit?: string;
};

export const CHANGELOG_ENTRIES: readonly ChangelogEntry[] = [
  {
    date: "July 31, 2026",
    title: "Country Silhouettes and fairer rounds",
    summary: "A new outline-guessing game joins Puzzler, alongside clearer defaults and fairer scoring across the arcade.",
    highlights: [
      "Country Silhouettes challenges you to identify ten sovereign states from their outlines, with no timer.",
      "Sharper outlines now make the smallest states, including Monaco and Vatican City, more recognisable.",
      "Correct and incorrect answer feedback is now consistent between Flag Classic and Country Silhouettes.",
      "Capital Cities now starts when you’re ready and never shows duplicate capital labels in the same board.",
      "Flag Blitz now starts with sovereign states only, while untimed Flag Marathon is clearly marked as unranked practice.",
    ],
  },
  {
    date: "July 30, 2026",
    title: "Improved analytics",
    summary: "Optional, privacy-friendly analytics now provide better insight into how players discover, start, and complete games.",
    highlights: [
      "Analytics remain pseudonymous and only run with your consent, with returning browsers measured while that consent remains enabled.",
      "Better insights help improve game balance, discoverability, and the overall arcade experience.",
    ],
  },
  {
    date: "July 28, 2026",
    title: "Flag Marathon and challenges",
    summary: "Flag Blitz gets more responsive play, clearer settings, and shareable Flag Marathon runs.",
    highlights: [
      "Flag Match Unlimited is now Flag Marathon, with sharper match feedback, mistake counts, clearer run results, and a unified game timer.",
      "Flag settings now separate sovereign nations from other flags, with tabs for faster selection.",
      "Every Flag Blitz run now uses a random run seed, making timed Flag Marathon runs reproducible without preloading boards.",
      "New shareable Flag Marathon challenges send friends the same selected flags and targets, then compare score, mistakes, and time.",
    ],
  },
  {
    date: "July 27, 2026",
    title: "Flag Match time tuning",
    summary: "Timed Flag Match Unlimited now has a tighter pace.",
    highlights: [
      "Each correct flag in a timed Flag Match Unlimited run now adds 2 seconds.",
    ],
  },
  {
    date: "July 26, 2026",
    title: "Flag Match landing and answer refinements",
    summary: "Flag Match gained a direct landing flow, while typed country answers became more forgiving without accepting another country as correct.",
    highlights: [
      "Flag Match now has a dedicated route: ad visitors get a focused 60-second start screen, while the regular launcher keeps the timer choice.",
      "Gameplay and analytics now identify this mode as flag-match-unlimited.",
      "Typed country answers accept small spelling slips, but a different country name can no longer count as correct.",
      "Explore other games/modes from Flag Match results now returns to the Puzzler home page.",
    ],
  },
  {
    date: "July 25, 2026",
    title: "Privacy choices for Puzzler",
    summary: "Optional analytics and ad measurement now with explicit consent.",
    highlights: [
      "Choose Analytics and Marketing separately, reject non-essential tracking, or change your choices later from Cookie settings.",
      "Game records still stay in this browser; Puzzler does not send typed answers or country-level attempts to its optional measurement tools.",
      "Analytics now uses privacy-safe page and Web Vitals reporting: no query strings, fragments, referrers, device, browser, or session data are sent.",
      "A new Privacy page explains the current data choices.",
    ],
  },
  {
    date: "July 24, 2026",
    title: "Direct links for every game",
    summary: "Each live game now has its own shareable page.",
    highlights: [
      "Link directly to Flag Blitz at /flag-blitz or Match Capital Cities at /capital-cities.",
      "Flag Blitz now keeps its Flag Report and settings at their own direct URLs too.",
      "Hub game cards now navigate using real page links instead of internal-only routing.",
    ],
  },
  {
    date: "July 23, 2026",
    title: "Flag Match gets a timer choice",
    summary: "Flag Match Unlimited now supports both a relaxed live board and a 60-second score chase, with a clearer in-game status bar.",
    highlights: [
      "Choose a no-timer run or a 60-second run; every correct flag in the timed mode adds 3 seconds.",
      "Score, timer, and Pause controls have been rebalanced for a cleaner mobile game header.",
      "Pause stays visually solid while a correctly matched flag moves into place.",
      "Back to Hub is now named consistently throughout Puzzler.",
    ],
  },
  {
    date: "July 23, 2026",
    title: "Match Capital Cities arrives",
    summary: "A new board-clearing game challenges you to connect ten countries with their capitals as quickly as you can.",
    highlights: [
      "Choose a country and its capital from two shuffled columns to make a pair.",
      "Correct pairs flash green and clear away; every wrong pair adds 2 seconds.",
      "Your fastest completion time is saved separately from Flag Blitz records.",
      "The capital collection includes the United Kingdom and all four home nations, including Belfast for Northern Ireland.",
    ],
    commit: "75f5584",
  },
  {
    date: "July 22, 2026",
    title: "A personal Flag Report",
    summary: "Puzzler now keeps a private record of the flags that need another look, while Flag Match Unlimited has become a truly untimed live-board challenge.",
    highlights: [
      "Flag Report ranks missed flags by accuracy and can be filtered by game mode.",
      "The report adapts from a compact mobile grid to a wider desktop layout.",
      "Unlimited is now named Classic Unlimited, and every Flag Blitz run can be paused safely.",
      "Choose which flags appear in future Flag Blitz runs; keep at least 12 active for live boards.",
      "The Hub now previews Match Capital Cities as the next game on deck.",
      "England, Scotland, and Wales are now available as individual flags, alongside the United Kingdom.",
      "Speed Match now records the fastest full-board completion time, rather than a score.",
    ],
    commit: "b916333",
  },
  {
    date: "July 21, 2026",
    title: "Flag Match Unlimited",
    summary: "A continuous 60-second Flag Blitz challenge with a live flag board.",
    highlights: [
      "Nine active flags and three upcoming flag previews.",
      "Correct answers promote the next flag in the same column.",
      "New personal best tracking for timed runs.",
    ],
    commit: "2795aef",
  },
  {
    date: "July 21, 2026",
    title: "Fairer Speed Match rounds",
    summary: "Speed Match targets now use their own shuffled order instead of following the flag layout.",
    highlights: [
      "Every flag board remains random.",
      "The target sequence can no longer be solved in grid order.",
    ],
    commit: "067dd25",
  },
  {
    date: "July 21, 2026",
    title: "More ways to play Flag Blitz",
    summary: "Flag Blitz grew into a modular game with Classic, Classic Unlimited, and Speed Match runs.",
    highlights: [
      "Player records are saved locally on your device.",
      "Answers support country aliases, punctuation, and accents.",
      "Gameplay now has automated checks and continuous integration.",
    ],
    commit: "c1cf565",
  },
  {
    date: "July 20, 2026",
    title: "Puzzler launches",
    summary: "The first mobile-first Puzzler arcade experience went live with Flag Blitz.",
    highlights: [
      "Country flags are served as sharp SVG assets.",
      "Classic and Classic Unlimited quiz foundations arrived.",
    ],
    commit: "dbd1c02",
  },
];
