export type ChangelogEntry = {
  date: string;
  title: string;
  summary: string;
  highlights: readonly string[];
  commit: string;
};

export const CHANGELOG_ENTRIES: readonly ChangelogEntry[] = [
  {
    date: "July 22, 2026",
    title: "A personal Flag Report",
    summary: "Puzzler now keeps a private record of the flags that need another look, while Flag Match Unlimited has become a truly untimed live-board challenge.",
    highlights: [
      "Flag Report ranks missed flags by accuracy and can be filtered by game mode.",
      "The report adapts from a compact mobile grid to a wider desktop layout.",
      "Unlimited is now named Classic Unlimited, and every Flag Blitz run can be paused safely.",
      "Flag Blitz now keeps its records, report, and flag settings together, leaving the Hub ready for future games.",
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
