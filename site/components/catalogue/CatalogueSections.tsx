import { catalogue, categoryModules } from "@/lib/catalogue";
import { toolRows, contractCards, architectureFacts, archetypeCard } from "@/content/catalogue";
import section from "@/styles/section.module.css";
import styles from "./CatalogueSections.module.css";

export function CategoriesSection() {
  const moduleCategories = catalogue.categories.filter((c) => !c.gating);
  const { pricedFlat, pricedUsage, featureCount, providerCount, categories, modules } = catalogue.counts;

  const facts = [
    {
      n: `${pricedFlat} + ${pricedUsage}`,
      label: "modules with a flat estimate, and with usage-based pricing — never blended into one number",
    },
    {
      n: `${featureCount} → ${providerCount}`,
      label: "implement features, across providers with genuinely distinct content",
    },
    { n: "0", label: "files under src/ that name a technology — the invariant that keeps the catalogue growable" },
  ];

  return (
    <section className={section.section}>
      <div className={section.container}>
        <div className={section.eyebrow}>All {categories} categories</div>
        <h2 className={section.h2} style={{ maxWidth: "22ch" }}>
          {modules} modules, {categories} categories, zero engine changes
        </h2>
        <p className={section.lead}>
          A module is one folder of content — a manifest, a rule, a setup section, some
          templates. No file in the engine names a technology, which is what lets the catalogue
          grow without the generator changing.
        </p>

        <div className={styles.table}>
          {moduleCategories.map((cat) => (
            <div key={cat.id} className={styles.tableRow}>
              <span className={styles.catName}>{cat.shortLabel ?? cat.label}</span>
              <span className={styles.catMods}>{categoryModules(cat).map((m) => m.name).join(" · ")}</span>
              <span className={styles.catKind}>{cat.kind === "any" ? "any" : "one"}</span>
            </div>
          ))}
        </div>

        <div className={styles.factGrid}>
          {facts.map((f) => (
            <div key={f.label} className={styles.factCard}>
              <div className={styles.factNum}>{f.n}</div>
              <div className={styles.factLabel}>{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ToolMatrixSection() {
  return (
    <section className={section.section}>
      <div className={section.container}>
        <div className={section.eyebrow}>Multi-provider</div>
        <h2 className={section.h2} style={{ maxWidth: "22ch" }}>
          Write the rule once. Every tool gets it.
        </h2>
        <p className={section.lead} style={{ maxWidth: "60ch" }}>
          Your teammate uses Cline, you use Cursor, CI reads AGENTS.md. One source file renders
          into each tool&apos;s own format — nobody maintains six copies that quietly disagree.
        </p>

        <div className={styles.toolGrid}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>SOURCE — written once</div>
            <div className={styles.sourcePath}>
              technologies/supabase/
              <br />
              cursor-rule.mdc
            </div>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14.5 }}>
              A module author writes one rule file. The stack-agnostic set — architecture,
              performance, testing, typescript — ships alongside it.
            </p>
          </div>
          <div className={styles.destCard}>
            <div className={styles.destHead}>RENDERED INTO — pick any combination in the wizard</div>
            {toolRows.map((t) => (
              <div key={t.tool} className={styles.toolRow}>
                <span style={{ fontWeight: 500 }}>{t.tool}</span>
                <span className={styles.toolPath}>{t.path}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ContractSection() {
  return (
    <section className={section.section}>
      <div className={section.container}>
        <div className={section.eyebrow}>The contract</div>
        <h2 className={section.h2} style={{ maxWidth: "22ch" }}>
          Exactly what lands, every time
        </h2>
        <p className={section.lead}>
          Twenty-one builders run in a fixed order into an in-memory tree. Disk is touched only
          once every one of them has succeeded — a failure partway through can&apos;t leave a
          half-written project.
        </p>

        <div className={styles.contractGrid}>
          {contractCards.map((c) => (
            <div key={c.dir} className={styles.contractCard}>
              <div className={styles.contractHead}>
                <strong className="mono" style={{ fontSize: 14.5 }}>
                  {c.dir}
                </strong>
                <span className="mono" style={{ fontSize: 11, color: "var(--faint)" }}>
                  {c.count}
                </span>
              </div>
              <div className={styles.contractItems}>
                {c.items.map((item, i) => (
                  <div key={i}>{item}</div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.archNote}>
          <strong className="heading" style={{ fontSize: 17, fontWeight: 600, display: "block", marginBottom: 14 }}>
            docs/architecture.md is diagrams, not just prose
          </strong>
          <div className={styles.archNoteGrid}>
            {architectureFacts.map((f) => (
              <div key={f.title}>
                <strong style={{ color: "var(--ink)" }}>{f.title}</strong>
                <br />
                {f.body}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ArchetypeSection() {
  const count = catalogue.archetypes.length;
  return (
    <section className={section.sectionRaised}>
      <div className={section.container}>
        <div className={section.eyebrow}>Archetypes</div>
        <h2 className={section.h2} style={{ maxWidth: "24ch" }}>
          A preset picks a stack. An archetype ships an app.
        </h2>
        <p className={section.lead}>
          Real screens wired to a real data model — not a folder of dependencies waiting for you
          to make it do something.
        </p>

        <div className={styles.archCard}>
          <div className={styles.archHead}>
            <div>
              <div className="mono" style={{ fontSize: 15, marginBottom: 5 }}>
                {archetypeCard.command}
              </div>
              <div style={{ color: "var(--muted)", fontSize: 14 }}>{archetypeCard.stack}</div>
            </div>
            <span
              className="mono"
              style={{
                fontSize: 11.5,
                color: "var(--faint)",
                border: "1px solid var(--line)",
                borderRadius: 999,
                padding: "5px 12px",
              }}
            >
              {count} of {count} today — the contract for adding more is documented
            </span>
          </div>
          <div className={styles.archCols}>
            <div className={styles.archCol}>
              <strong className="heading" style={{ fontSize: 16, fontWeight: 600, display: "block", marginBottom: 10 }}>
                Data model
              </strong>
              <div className={styles.archColBody}>
                {archetypeCard.dataModel.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
            <div className={styles.archCol}>
              <strong className="heading" style={{ fontSize: 16, fontWeight: 600, display: "block", marginBottom: 10 }}>
                Screens
              </strong>
              <div className={styles.archColBody}>
                {archetypeCard.screens.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
            <div className={styles.archCol}>
              <strong className="heading" style={{ fontSize: 16, fontWeight: 600, display: "block", marginBottom: 10 }}>
                Deliberately absent
              </strong>
              <div className={styles.archColBody}>
                {archetypeCard.absent.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
