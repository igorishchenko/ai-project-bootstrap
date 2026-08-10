"use client";

import { TerminalShell, Caret } from "@/components/shared/Terminal";
import { useCastReveal } from "@/lib/useCastReveal";
import { howItWorksSteps, howItWorksCastLines } from "@/content/landing";
import section from "@/styles/section.module.css";
import terminalStyles from "@/components/shared/Terminal.module.css";
import styles from "./HowItWorks.module.css";

function WizardCast() {
  const { ref, revealed } = useCastReveal<HTMLDivElement>(howItWorksCastLines.length + 1);
  return (
    <TerminalShell ref={ref} dotSize={11} padding="26px 28px">
      <div style={{ fontSize: 13.5, lineHeight: 1.95 }}>
        <div className={`${terminalStyles.line} ${terminalStyles.visible}`}>
          <span style={{ color: "var(--term-prompt)" }}>$</span> npx ai-project-bootstrap
        </div>
        {howItWorksCastLines.map((line, i) => {
          const idx = i + 1;
          const isLast = i === howItWorksCastLines.length - 1;
          return (
            <div
              key={i}
              className={`${terminalStyles.line} ${idx < revealed ? terminalStyles.visible : ""}`}
              style={{ color: line.color, marginTop: line.marginTop }}
            >
              {line.text}
              {isLast ? <Caret color="var(--term-green)" /> : null}
            </div>
          );
        })}
      </div>
    </TerminalShell>
  );
}

export function HowItWorks() {
  return (
    <section className={section.section}>
      <div className={section.container}>
        <div className={section.eyebrow}>How it works</div>
        <h2 className={section.h2} style={{ marginBottom: 52, maxWidth: "20ch" }}>
          Three questions in, a repo out
        </h2>

        <div className={styles.grid}>
          {howItWorksSteps.map((step) => (
            <div key={step.n} className={styles.card}>
              <div className={styles.num}>{step.n}</div>
              <strong className={styles.title}>{step.title}</strong>
              <p className={styles.body}>{step.body}</p>
              <div className={styles.hint}>
                {step.hint.map((part, i) =>
                  i % 2 === 1 ? (
                    <span key={i} className={styles.hintAccent}>
                      {part}
                    </span>
                  ) : (
                    <span key={i}>{part}</span>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>

        <WizardCast />
      </div>
    </section>
  );
}
