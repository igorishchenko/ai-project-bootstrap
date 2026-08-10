import Link from "next/link";
import { TierCard } from "@/components/shared/TierCard";
import { landingTiers } from "@/content/landing";
import section from "@/styles/section.module.css";

export function PricingBand() {
  return (
    <section id="pricing" className={section.sectionRaised}>
      <div className={section.container}>
        <div className={section.eyebrow}>Pricing</div>
        <h2 className={section.h2} style={{ maxWidth: "22ch" }}>
          Free is the whole CLI. Paid is one flag.
        </h2>
        <p className={section.lead} style={{ maxWidth: "66ch" }}>
          There is no free tier of Pro and no trial, because every Pro request spends real API
          budget. There is also no crippled free version — the line is simply whether a command
          talks to a server.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {landingTiers.map((t) => (
            <TierCard key={t.name} {...t} />
          ))}
        </div>
        <p style={{ fontFamily: "var(--font-plex-mono), monospace", fontSize: 12, color: "var(--faint)", margin: "18px 0 0" }}>
          <Link href="/pricing">Full comparison →</Link>
        </p>
      </div>
    </section>
  );
}
