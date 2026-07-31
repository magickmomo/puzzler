import Link from "next/link";

const PROVIDERS = [
  {
    provider: "PostHog, EU-hosted",
    purpose: "Explicit page, game, campaign, and Web Vitals events using a pseudonymous browser ID to recognise returning visitors.",
    category: "Analytics",
    href: "https://posthog.com/privacy",
    linkLabel: "PostHog Privacy Policy",
  },
  {
    provider: "Meta Platforms",
    purpose: "Advertising attribution using PageView and FirstGameCompleted events.",
    category: "Marketing",
    href: "https://www.facebook.com/privacy/explanation/",
    linkLabel: "Meta Privacy Center",
  },
] as const;

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-3xl px-5 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
      <Link href="/" className="inline-flex min-h-12 items-center rounded-xl px-2 text-sm font-bold text-slate-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
        <span aria-hidden="true">←</span>&nbsp; Back to Hub
      </Link>

      <article className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Pocket Arcade</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Privacy notice</h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">This is a plain-language implementation notice about how Puzzler currently works. It is not a claim of blanket legal compliance.</p>
        <p className="mt-2 text-xs font-semibold text-slate-500">Last updated: 30 July 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-slate-300">
          <section>
            <h2 className="text-lg font-black text-white">Who runs Puzzler</h2>
            <p className="mt-2">Puzzler is a personal project operated by M. Amer in the United Kingdom under the Pocket Arcade name.</p>
            <p className="mt-3">M. Amer is the data controller for the optional analytics and advertising measurement described in this privacy notice.</p>
            <p className="mt-3">For privacy questions or requests, contact <a href="mailto:browse-emporia-4v@icloud.com" className="font-bold text-cyan-300 underline underline-offset-2 hover:text-cyan-100">browse-emporia-4v@icloud.com</a>.</p>
            <p className="mt-3 text-slate-400">You also have the right to complain to the UK Information Commissioner&apos;s Office (ICO). Information about making a complaint is available at <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noreferrer" className="font-bold text-cyan-300 underline underline-offset-2 hover:text-cyan-100">ico.org.uk/make-a-complaint</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white">Optional measurement</h2>
            <p className="mt-2">With your permission, we use PostHog to understand which pages, games, campaign links, and Web Vitals are working well. We use Meta Pixel separately to measure the results of our advertising. These services remain disabled until you consent to the relevant category. You can change or withdraw your choices at any time through Cookie settings.</p>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800">
              <table className="min-w-[640px] w-full border-collapse text-left text-xs leading-5 sm:text-sm">
                <thead className="bg-slate-950/70 text-slate-300">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-black">Provider</th>
                    <th scope="col" className="px-4 py-3 font-black">Purpose</th>
                    <th scope="col" className="px-4 py-3 font-black">Consent category</th>
                  </tr>
                </thead>
                <tbody>
                  {PROVIDERS.map((provider) => (
                    <tr key={provider.provider} className="border-t border-slate-800 align-top">
                      <td className="px-4 py-3 font-bold text-white"><a href={provider.href} target="_blank" rel="noreferrer" className="text-cyan-300 underline underline-offset-2 hover:text-cyan-100">{provider.provider}</a></td>
                      <td className="px-4 py-3 text-slate-300">{provider.purpose}</td>
                      <td className="px-4 py-3 text-slate-300">{provider.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-black text-white">What optional measurement can collect</h2>
            <p className="mt-2">When Analytics is accepted, PostHog receives only explicit page, game, campaign, and Web Vitals events, a sanitised origin and route path without a query string or fragment, allowlisted UTM campaign parameters, and a random pseudonymous browser ID. Puzzler uses that ID only to recognise returning browsers that continue to consent to Analytics. Puzzler only retains campaign parameters and this browser ID after Analytics consent.</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-400">
              <li>PostHog receives a sanitised origin and route path for page and per-page performance reporting, selected game, game mode, difficulty, timer setting, aggregate score, attempts, duration, mistakes, run outcome or exit reason, local per-game run number, permitted campaign attribution, its project token, and the pseudonymous browser ID.</li>
              <li>PostHog also receives only the numeric LCP, CLS, FCP, and INP Web Vitals values. It does not receive raw full URLs, query strings, fragments, referrers, device data, browser data, session IDs, Web Vitals attribution, network timing, or screen recordings from Puzzler.</li>
              <li>Meta receives PageView events and a FirstGameCompleted event containing only the game name while Marketing consent remains granted. Meta&apos;s Pixel may process browser and page information as described in Meta&apos;s own notice.</li>
            </ul>
            <p className="mt-3">Puzzler does not send names, email addresses, typed answers, country-level attempts, country names or codes, age information, or player profiles to PostHog. It does not use session replay, heatmaps, broad interaction autocapture, account-based identification, or Meta automatic advanced matching. Pseudonymous identifiers can still be personal data.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white">Cookies and browser storage</h2>
            <p className="mt-2">Puzzler uses browser storage, not only traditional cookies. Necessary local storage keeps your saved Cookie settings and local game records. Those records stay on this device and are not sent to Pocket Arcade. Optional services do not load or access their browser storage until you choose the relevant category.</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-400">
              <li>Consent and local game records remain in your browser until you change your choice, clear Puzzler&apos;s site data, or your browser removes them.</li>
              <li>The random Analytics browser ID and campaign attribution are removed when Analytics consent is withdrawn. Each first-completion delivery flag is removed when its related optional consent is withdrawn, and is read only while that consent remains active.</li>
              <li>Puzzler configures PostHog for memory-only operation with provider persistence disabled. The Analytics browser ID is stored by Puzzler, not PostHog, so it can recognise a returning browser while Analytics consent remains granted. Meta may set its own cookies or browser-storage identifiers after Marketing consent; see Meta&apos;s information linked below for its current details and durations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-white">Retention and international transfers</h2>
            <p className="mt-2">Pocket Arcade does not keep a server-side player profile or copy of game records. Local records and the saved consent choice remain on the device until the player clears site data or changes the choice. PostHog analytics and Web Vitals events are retained for one year within Pocket Arcade&apos;s PostHog project before automatic deletion. Meta&apos;s Business Tools terms state that it may retain event data for up to two years.</p>
            <p className="mt-3">Puzzler uses PostHog&apos;s EU host, but provider processing or approved subprocessors may involve transfers outside the EEA. Meta states that non-user information may be processed in the United States and other countries. The providers describe their current transfer safeguards, including standard contractual clauses where applicable, in their privacy and data-processing terms linked below.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white">Your choices and rights</h2>
            <p className="mt-2">You can choose <strong className="font-black text-white">Reject non-essential</strong> when the banner appears, or use <strong className="font-black text-white">Cookie settings</strong> in the footer at any time to change or withdraw Analytics and Marketing consent. You can delete local player records and Puzzler&apos;s privacy preferences in your browser&apos;s site-data controls. For a request or question, contact M. Amer at <a href="mailto:browse-emporia-4v@icloud.com" className="font-bold text-cyan-300 underline underline-offset-2 hover:text-cyan-100">browse-emporia-4v@icloud.com</a>.</p>
            <p className="mt-3">You may also complain to the UK Information Commissioner&apos;s Office (ICO). Details are available at <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noreferrer" className="font-bold text-cyan-300 underline underline-offset-2 hover:text-cyan-100">ico.org.uk/make-a-complaint</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white">Younger players</h2>
            <p className="mt-2">Puzzler is designed to avoid unnecessary identifiers and profiling. We do not knowingly collect age, names, or email addresses, and do not use session replay. If you are a parent or guardian with a question about a child&apos;s use of Puzzler, please contact <a href="mailto:browse-emporia-4v@icloud.com" className="font-bold text-cyan-300 underline underline-offset-2 hover:text-cyan-100">browse-emporia-4v@icloud.com</a>.</p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <h2 className="text-base font-black text-white">Provider information</h2>
            <p className="mt-2 text-slate-400">Read the providers&apos; current terms and privacy information: {PROVIDERS.map((provider, index) => (
              <span key={provider.provider}>{index > 0 ? " · " : ""}<a href={provider.href} target="_blank" rel="noreferrer" className="font-bold text-cyan-300 underline underline-offset-2 hover:text-cyan-100">{provider.linkLabel}</a></span>
            ))}.</p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <h2 className="text-base font-black text-white">Map data attribution</h2>
            <p className="mt-2 text-slate-400">Country Silhouettes uses Natural Earth data. Monaco, San Marino, and Vatican City boundaries use <a href="https://www.geoboundaries.org/" target="_blank" rel="noreferrer" className="font-bold text-cyan-300 underline underline-offset-2 hover:text-cyan-100">geoBoundaries</a> data under CC BY 4.0.</p>
          </section>
        </div>
      </article>
    </main>
  );
}
