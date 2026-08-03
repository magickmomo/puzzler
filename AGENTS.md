# Product analytics guardrail

Every new or modified user-facing action must use an existing typed analytics event or explicitly state why it is intentionally untracked.

- Use the central `AnalyticsEvents` catalogue in `lib/analytics.ts`; do not invent ad-hoc event names or property shapes.
- Use `ActionButton` for new meaningful button actions. It requires either a typed `analytics` event or `analytics={false}` plus a specific `analyticsReason`.
- Use the shared `ShareResultButton` for result sharing. Its required analytics context emits the standard `result_shared` funnel event.
- New events require a privacy review: add them to the catalogue, the allowlist/sanitiser, and focused tests. Never send typed answers, country names/codes, or unnecessary personal data.
- The current required funnel is: arrive → choose game → start → complete → share or continue → return home. Track meaningful changes within that funnel; avoid noisy analytics for incidental UI actions.
