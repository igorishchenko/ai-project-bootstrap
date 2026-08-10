import { quickstart } from "@/content/landing";
import section from "@/styles/section.module.css";
import styles from "./Quickstart.module.css";

export function Quickstart() {
  return (
    <section id="quickstart" className={section.section}>
      <div className={section.containerNarrow} style={{ textAlign: "center" }}>
        <h2 className={section.h2} style={{ marginBottom: 16 }}>
          Start now
        </h2>
        <p style={{ color: "var(--muted)", margin: "0 0 40px", fontSize: 17.5 }}>
          Nothing to install. Nothing to sign up for.
        </p>
        <div className={styles.list}>
          {quickstart.map((q) => (
            <div key={q.cmd} className={styles.row}>
              <span className={styles.cmd}>
                <span style={{ color: "var(--faint)" }}>$ </span>
                {q.cmd}
              </span>
              <span className={styles.label}>{q.label}</span>
            </div>
          ))}
        </div>
        <div className={styles.actions}>
          <a
            href="https://www.npmjs.com/package/ai-project-bootstrap"
            target="_blank"
            rel="noreferrer"
            data-lift=""
            className={styles.primary}
          >
            View on npm
          </a>
          <a
            href="https://github.com/igorishchenko/ai-project-bootstrap"
            target="_blank"
            rel="noreferrer"
            data-lift=""
            className={styles.secondary}
          >
            Star on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
