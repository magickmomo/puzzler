import Link from "next/link";

const PROVIDERS = [
  {
    provider: "PostHog, EU-hosted",
    purpose: "Pseudonymous product usage, game completions, campaign attribution, and site-performance measurement.",
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
        <p className="mt-2 text-xs font-semibold text-slate-500">Last updated: 25 July 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-slate-300">
          <section>
            <h2 className="text-lg font-black text-white">Who runs Puzzler</h2>
            <p className="mt-2">Puzzler is a personal project operated under the Pocket Arcade name. For privacy questions or to exercise a privacy right, contact the Pocket Arcade Facebook Page, currently identified by Page ID 1277338905453734.</p>
            <p className="mt-3 text-slate-400">The individual operator&apos;s legal name, establishment country, and postal contact are not published on this site. Those details are needed to identify a specific data controller and the applicable supervisory authority, and will be added before this notice is relied on as a launch-ready privacy notice.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white">Optional measurement</h2>
            <p className="mt-2">With your permission, we use PostHog to understand how visitors use our games and how the website performs. We use Meta Pixel separately to measure the results of our advertising. These services remain disabled until you consent to the relevant category. You can change or withdraw your choices at any time through Cookie settings.</p>
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
            <p className="mt-2">When the relevant option is accepted, this can include pseudonymous visitor or session identifiers, page paths, the game events listed below, device and browser information, and the allowlisted UTM campaign parameters in an advertising link. Puzzler only retains campaign parameters after Analytics consent.</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-400">
              <li>PostHog receives selected game, game mode, difficulty, timer setting, aggregate score, duration, mistakes, progress, permitted campaign attribution, and the project token needed to accept the event. Puzzler removes SDK-added URLs, referrers, device details, and session IDs before delivery.</li>
              <li>Meta receives PageView events and a FirstGameCompleted event containing only the game name while Marketing consent remains granted. Meta&apos;s Pixel may process browser and page information as described in Meta&apos;s own notice.</li>
            </ul>
            <p className="mt-3">Puzzler does not send names, email addresses, typed answers, country-level attempts, country names or codes, age information, or player profiles to PostHog. It does not use session replay, heatmaps, broad interaction autocapture, user identification, or Meta automatic advanced matching. Pseudonymous identifiers can still be personal data.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white">Cookies and browser storage</h2>
            <p className="mt-2">Puzzler uses browser storage, not only traditional cookies. Necessary local storage keeps your saved Cookie settings and local game records. Those records stay on this device and are not sent to Pocket Arcade. Optional services do not load or access their browser storage until you choose the relevant category.</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-400">
              <li>Consent and local game records remain in your browser until you change your choice, clear Puzzler&apos;s site data, or your browser removes them.</li>
              <li>Campaign attribution and the relevant first-completion delivery flag are removed when Analytics or Marketing consent is withdrawn. The delivery flag is read only while the related optional consent is active.</li>
              <li>Puzzler configures PostHog for memory-only operation with provider persistence disabled. Meta may set its own cookies or browser-storage identifiers after Marketing consent; see Meta&apos;s information linked below for its current details and durations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-white">Retention and international transfers</h2>
            <p className="mt-2">Pocket Arcade does not keep a server-side player profile or copy of game records. Local records and the saved consent choice remain on the device until the player clears site data or changes the choice. PostHog event retention is controlled in Pocket Arcade&apos;s PostHog project and must be published here before launch; it cannot be derived from this website&apos;s code. Meta&apos;s Business Tools terms state that it may retain event data for up to two years.</p>
            <p className="mt-3">Puzzler uses PostHog&apos;s EU host, but provider processing or approved subprocessors may involve transfers outside the EEA. Meta states that non-user information may be processed in the United States and other countries. The providers describe their current transfer safeguards, including standard contractual clauses where applicable, in their privacy and data-processing terms linked below.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white">Your choices and rights</h2>
            <p className="mt-2">You can choose <strong className="font-black text-white">Reject non-essential</strong> when the banner appears, or use <strong className="font-black text-white">Cookie settings</strong> in the footer at any time to change or withdraw Analytics and Marketing consent. You can delete local player records and Puzzler&apos;s privacy preferences in your browser&apos;s site-data controls. For a request or question, contact Pocket Arcade using the contact route above.</p>
            <p className="mt-3">Depending on where you live, you may also have the right to complain to your local data-protection supervisory authority. The authority applicable to Pocket Arcade depends on the operator&apos;s legal establishment, which has not yet been published above.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white">Younger players</h2>
            <p className="mt-2">Puzzler is designed to avoid unnecessary identifiers and profiling. We do not knowingly collect age, names, or email addresses, and do not use session replay. If you are a parent or guardian with a question about a child&apos;s use of Puzzler, please contact Pocket Arcade.</p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <h2 className="text-base font-black text-white">Provider information</h2>
            <p className="mt-2 text-slate-400">Read the providers&apos; current terms and privacy information: {PROVIDERS.map((provider, index) => (
              <span key={provider.provider}>{index > 0 ? " · " : ""}<a href={provider.href} target="_blank" rel="noreferrer" className="font-bold text-cyan-300 underline underline-offset-2 hover:text-cyan-100">{provider.linkLabel}</a></span>
            ))}.</p>
          </section>
        </div>
      </article>
    </main>
  );
}
