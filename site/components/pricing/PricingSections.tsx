import Link from "next/link";
import { TierCard } from "@/components/shared/TierCard";
import { tiers, compare, faq, locks } from "@/content/pricing";
import section from "@/styles/section.module.css";
import styles from "./PricingSections.module.css";

export function TiersSection() {
  return (
    <section className={section.section} style={{ padding: "64px 28px 88px" }}>
      <div className={section.container}>
        <div className={styles.tierGrid}>
          {tiers.map((t) => (
            <TierCard key={t.name} {...t} />
          ))}
        </div>
        <div className={styles.callout}>
          <div className={styles.calloutTitle}>Why there&apos;s no trial</div>
          <p className={styles.calloutBody}>
            A trial of Pro is a stranger spending our OpenAI budget. One tier, priced to cover
            the calls, is the honest version of that — and the free CLI is not a sample of it.
            It is the product, complete, and it stays that way whether or not you ever
            subscribe.
          </p>
        </div>
      </div>
    </section>
  );
}

export function CompareSection() {
  return (
    <section className={section.sectionRaised}>
      <div className={section.container}>
        <h2 className={section.h2} style={{ marginBottom: 40 }}>
          Line by line
        </h2>
        <div className={styles.compareCard}>
          <div className={styles.compareHead}>
            <div className={styles.compareHeadCell} style={{ flex: 2 }}>
              Capability
            </div>
            <div className={styles.compareHeadCell} style={{ flex: 1 }}>
              Free
            </div>
            <div className={styles.compareHeadCell} style={{ flex: 1 }}>
              Pro
            </div>
          </div>
          {compare.map((c) => (
            <div key={c.what} className={styles.compareRow}>
              <div className={styles.compareCell} style={{ flex: 2, color: "var(--ink)" }}>
                {c.what}
              </div>
              <div className={styles.compareCell} style={{ flex: 1, color: `var(--${c.freeTone ?? "ink"})` }}>
                {c.free}
              </div>
              <div className={styles.compareCell} style={{ flex: 1, color: `var(--${c.proTone})` }}>
                {c.pro}
              </div>
            </div>
          ))}
        </div>
        <p className={styles.footnote}>
          Subscribing emails a licence key. Where the CLI reads it from — env var, a login
          command, or both — is still being decided.
        </p>
      </div>
    </section>
  );
}

export function FaqSection() {
  return (
    <section className={section.section}>
      <div className={section.container}>
        <h2 className={section.h2} style={{ marginBottom: 40 }}>
          Questions people actually ask
        </h2>
        <div className={styles.faqGrid}>
          {faq.map((f) => (
            <div key={f.q} className={styles.faqCard}>
              <div className={styles.faqQ}>{f.q}</div>
              <p className={styles.faqA}>{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LocksSection() {
  return (
    <section className={section.section}>
      <div className={section.container}>
        <h2 className={section.h2} style={{ marginBottom: 16 }}>
          What --idea says when you&apos;re not subscribed
        </h2>
        <p className={section.lead} style={{ maxWidth: "66ch" }}>
          The licence is checked before a request is made, so an unsubscribed run costs nothing
          and fails instantly. Neither of these is styled as an error — you have not done
          anything wrong.
        </p>
        <div className={styles.lockGrid}>
          {locks.map((l) => (
            <div key={l.title} className={styles.lockCard}>
              <div className={styles.lockHead}>
                <span className={styles.lockPill}>Pro</span>
                <span className={styles.lockTitle}>{l.title}</span>
              </div>
              <p className={styles.lockBody}>{l.body}</p>
              <p className={styles.lockCode}>{l.code}</p>
            </div>
          ))}
        </div>
        <p className={styles.footnote}>
          The three genuine failures — unreachable, model error, rejected proposal — are
          documented on the <Link href="/docs/describe-your-idea">--idea docs page</Link>.
        </p>
      </div>
    </section>
  );
}
