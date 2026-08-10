import {
  beforeFiles,
  afterRows,
  afterUnchanged,
  implementComparison,
  commandCards,
  audienceCards,
} from "@/content/commands";
import section from "@/styles/section.module.css";
import styles from "./CommandsSections.module.css";

export function ProblemSection() {
  return (
    <section className={section.section}>
      <div className={section.container}>
        <div className={section.eyebrow}>The problem</div>
        <h2 className={section.h2} style={{ maxWidth: "22ch" }}>
          An empty repo makes a good assistant guess
        </h2>
        <p className={section.lead} style={{ marginBottom: 52 }}>
          It doesn&apos;t know your auth provider, your folder conventions, or that you never
          scaffold a router. So it invents them — differently every session. Scaffolding
          isn&apos;t optional context; it&apos;s the whole input.
        </p>

        <div className={styles.diffGrid}>
          <div className={styles.diffCard}>
            <div className={styles.diffHead}>
              <span>my-app/ — before</span>
              <span>4 files</span>
            </div>
            <div className={styles.diffBody}>
              {beforeFiles.map((f) => (
                <div key={f}>{f}</div>
              ))}
              <div className={styles.diffEmpty}>nothing for the assistant to read</div>
            </div>
          </div>
          <div className={styles.diffCard}>
            <div className={styles.diffHead}>
              <span style={{ color: "var(--ink)" }}>my-app/ — after one run</span>
              <span style={{ color: "var(--accent)" }}>+40 files</span>
            </div>
            <div className={styles.diffBody}>
              {afterRows.map((r) => (
                <div key={r.path} style={{ color: "var(--ink)" }}>
                  {r.path}
                  <span style={{ color: "var(--faint)" }}> {r.note}</span>
                </div>
              ))}
              <div>{afterUnchanged}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CommandsSection() {
  return (
    <section className={section.section}>
      <div className={section.container}>
        <div className={section.eyebrow}>Beyond generate</div>
        <h2 className={section.h2} style={{ maxWidth: "22ch" }}>
          Day one is the easy part
        </h2>
        <p className={section.lead}>
          Nobody picks their whole stack up front. Six commands keep a generated project current
          without ever overwriting something you edited by hand.
        </p>

        <div className={styles.implementCard}>
          <div className={styles.implementHead}>
            <div className={styles.implementTitleRow}>
              <span className="mono" style={{ fontSize: 17, fontWeight: 500 }}>
                implement &lt;feature&gt;
              </span>
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  color: "var(--signal)",
                  border: "1px solid var(--signal)",
                  borderRadius: 4,
                  padding: "2px 7px",
                }}
              >
                the interesting one
              </span>
            </div>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 15.5, maxWidth: "74ch" }}>
              Writes a plan, prompts, a checklist and skeleton files for one feature — tailored to
              the provider <em>your</em> project selected. Same command, genuinely different
              output.
            </p>
          </div>
          <div className={styles.implementCols}>
            {[implementComparison.supabase, implementComparison.clerk].map((col) => (
              <div key={col.label} className={styles.implementCol}>
                <div className={styles.implementColLabel}>{col.label}</div>
                <div className={styles.implementColBody}>
                  {col.lines.map((line, i) => (
                    <div
                      key={i}
                      style={{
                        color: line.ink ? "var(--ink)" : undefined,
                        marginTop: line.marginTop ? 10 : undefined,
                      }}
                    >
                      {line.text}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.cmdGrid}>
          {commandCards.map((c) => (
            <div key={c.cmd} data-lift="" className={styles.cmdCard}>
              <div className={styles.cmdName}>{c.cmd}</div>
              <p className={styles.cmdDesc}>{c.desc}</p>
              <div className={styles.cmdOut}>{c.out}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AudienceSection() {
  return (
    <section className={section.sectionRaised}>
      <div className={section.container}>
        <h2 className={section.h2} style={{ marginBottom: 44 }}>
          Written for four jobs
        </h2>
        <div className={styles.audienceGrid}>
          {audienceCards.map((a) => (
            <div key={a.job} data-lift="" className={styles.audienceCard}>
              <strong className={styles.audienceTitle}>{a.job}</strong>
              <p className={styles.audienceBody}>{a.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
