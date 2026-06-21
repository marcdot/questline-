import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Questline",
};

/* Public privacy notice (GDPR Art. 13). Reachable without auth — see proxy.ts. */
export default function PrivacyPage() {
  const body = { fontFamily: "var(--font-body)" } as const;
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12">
      <header className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted" style={body}>
          § Questline
        </span>
        <h1 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink" style={{ fontFamily: "var(--font-display)" }}>
          Privacy Policy
        </h1>
        <p className="text-[13px] text-ink-muted" style={body}>Last updated: 21/06/2026</p>
      </header>

      <div className="mt-8 space-y-7 text-[15px] leading-[1.6] text-ink" style={body}>
        <section className="space-y-2">
          <h2 className="text-[17px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>Who we are</h2>
          <p>
            Questline (&quot;we&quot;, &quot;the app&quot;) is operated by Marc Andersson, based in Denmark. We are the
            <strong> data controller</strong> for your personal data. Contact:{" "}
            <a href="mailto:marclandersson@gmail.com" className="text-accent underline">marclandersson@gmail.com</a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[17px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>What data we collect and why</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line text-left text-ink-muted">
                  <th className="py-2 pr-3 font-semibold">Data</th>
                  <th className="py-2 pr-3 font-semibold">Why</th>
                  <th className="py-2 font-semibold">Legal basis</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Email address", "Create and secure your account, sign you in, send confirmation emails", "Contract — Art. 6(1)(b)"],
                  ["Password (stored hashed)", "Authenticate you", "Contract — Art. 6(1)(b)"],
                  ["Display name, optional avatar", "Personalise the app", "Contract — Art. 6(1)(b)"],
                  ["Habits, quests, schedules, progress, XP, streaks", "This is the habit-tracking service", "Contract — Art. 6(1)(b)"],
                  ["Sleep logs, weight (health-related)", "Show sleep/wellness stats and estimate calories", "Explicit consent — Art. 9(2)(a)"],
                  ["Google Calendar connection (event IDs, sync state)", "Sync quests to your calendar if you connect it", "Consent — Art. 6(1)(a)"],
                  ["IP address & device signals at login (Cloudflare Turnstile)", "Block bots and abusive sign-ups", "Legitimate interest — Art. 6(1)(f)"],
                ].map(([d, w, b]) => (
                  <tr key={d} className="border-b border-line/60 align-top">
                    <td className="py-2 pr-3">{d}</td>
                    <td className="py-2 pr-3 text-ink-muted">{w}</td>
                    <td className="py-2 text-ink-muted">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>We do <strong>not</strong> use advertising, analytics, or tracking cookies, and we do not sell your data.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-[17px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>Cookies</h2>
          <p>
            We set only <strong>strictly necessary</strong> authentication cookies (<code>sb-*-auth-token</code>) so you can stay
            signed in. These are exempt from consent under the ePrivacy rules. We use no analytics or marketing cookies, so there
            is no cookie banner.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-[17px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>Bot protection (Cloudflare Turnstile)</h2>
          <p>
            Our sign-in page uses <strong>Cloudflare Turnstile</strong> to tell humans from bots. Turnstile processes your
            <strong> IP address and browser/behavioural signals</strong> for this purpose, based on our legitimate interest in
            protecting the service. See Cloudflare&apos;s privacy documentation for details.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-[17px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>Automated processing</h2>
          <p>
            Questline automatically calculates your XP, levels, and streaks from your activity. This is part of the game mechanics
            and has <strong>no legal or otherwise significant effect</strong> on you. We do not carry out automated decision-making
            in the sense of Art. 22 GDPR.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-[17px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>Who we share data with (processors)</h2>
          <p>We use these service providers, who process data on our behalf under data-processing agreements:</p>
          <ul className="list-disc space-y-1 pl-5 text-ink-muted">
            <li><strong className="text-ink">Supabase</strong> — database and authentication. Region: EU.</li>
            <li><strong className="text-ink">Vercel</strong> — application hosting.</li>
            <li><strong className="text-ink">Cloudflare</strong> — bot protection (Turnstile).</li>
            <li><strong className="text-ink">Resend</strong> — sending account emails.</li>
            <li><strong className="text-ink">Google</strong> — Google Calendar sync and Google sign-in (only if you use them).</li>
          </ul>
          <p>
            Where any provider processes data outside the EU/EEA, transfers are protected by <strong>Standard Contractual Clauses</strong>{" "}
            and/or the <strong>EU–US Data Privacy Framework</strong>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-[17px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>How long we keep your data</h2>
          <p>
            We keep your data while your account is active. If your account is <strong>inactive for 12 months</strong>, we email
            you a warning; if there is still no activity about <strong>30 days</strong> later, we permanently delete your account
            and all associated data. When you delete your account yourself, all your data is erased immediately. Google refresh
            tokens are deleted when you disconnect Calendar or delete your account.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-[17px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>Your rights</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Access</strong> — use &quot;Download my data&quot; in Settings for a full JSON copy (Art. 15).</li>
            <li><strong>Portability</strong> — that export is machine-readable (Art. 20).</li>
            <li><strong>Rectification</strong> — edit your name, habits, quests, sleep entries, and settings in the app (Art. 16).</li>
            <li><strong>Erasure</strong> — use &quot;Delete account&quot; in Settings to permanently delete everything (Art. 17).</li>
            <li><strong>Withdraw consent</strong> — disconnect Calendar, or turn off health-data processing in Settings → Health, at any time, as easily as you gave it (Art. 7(3)).</li>
            <li><strong>Restriction / objection</strong> — contact us by email (Art. 18, 21).</li>
          </ul>
          <p>
            To exercise any right that isn&apos;t self-service, email{" "}
            <a href="mailto:marclandersson@gmail.com" className="text-accent underline">marclandersson@gmail.com</a>. We respond within one month.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-[17px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>Health data</h2>
          <p>
            Sleep and weight are treated as <strong>health-related (special-category) data</strong>. We only process them
            <strong> with your explicit consent</strong>, which you give in Settings before entering them and can withdraw at any
            time. If you withdraw consent, we stop processing this data and delete what we hold.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-[17px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>Age</h2>
          <p>Questline is intended for users <strong>aged 16 and over</strong>. We do not knowingly collect data from children under 16.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-[17px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>Complaints</h2>
          <p>
            You can lodge a complaint with the Danish Data Protection Agency,{" "}
            <a href="https://www.datatilsynet.dk/" className="text-accent underline" target="_blank" rel="noopener noreferrer">Datatilsynet</a>, or your local supervisory authority.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-[17px] font-semibold" style={{ fontFamily: "var(--font-display)" }}>Changes</h2>
          <p>We will update this notice as the app changes and post the new version here with a new date.</p>
        </section>

        <p className="pt-4">
          <a href="/login" className="text-accent underline">← Back to Questline</a>
        </p>
      </div>
    </main>
  );
}
