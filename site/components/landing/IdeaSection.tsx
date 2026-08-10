import { Cast, Caret } from "@/components/shared/Terminal";
import { ideaFacts, ideaCast } from "@/content/landing";
import section from "@/styles/section.module.css";
import styles from "./IdeaSection.module.css";

export function IdeaSection() {
  return (
    <section id="idea" className={section.sectionRaised}>
      <div className={section.container}>
        <div className={section.eyebrow}>Pro · --idea</div>
        <h2 className={section.h2} style={{ maxWidth: "20ch" }}>
          The one part that isn&apos;t free, and why
        </h2>
        <p className={section.lead} style={{ maxWidth: "66ch", marginBottom: 48 }}>
          A hosted service reads your sentence against the full catalogue and returns a stack —
          then the CLI shows it for review, exactly like a preset. Nothing is written until you
          say yes. It costs money to run, so it costs money to use: $15/month, no trial, and
          nothing else in the tool is behind it.
        </p>

        <div className={styles.facts}>
          {ideaFacts.map((f) => (
            <div key={f.title} className={styles.card}>
              <div className={styles.cardTitle}>{f.title}</div>
              <p className={styles.cardBody}>{f.body}</p>
            </div>
          ))}
        </div>

        <Cast
          lines={ideaCast}
          caret={
            <>
              ? Generate with this stack? <span style={{ color: "var(--term-ink)" }}>(Y/n)</span>{" "}
              <Caret />
            </>
          }
        />
        <p className={styles.caption}>The proposal is always shown before any file is written.</p>
      </div>
    </section>
  );
}
