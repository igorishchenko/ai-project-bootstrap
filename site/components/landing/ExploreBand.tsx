import Link from "next/link";
import { exploreCards } from "@/content/landing";
import section from "@/styles/section.module.css";
import styles from "./ExploreBand.module.css";

export function ExploreBand() {
  return (
    <section className={section.section}>
      <div className={section.container}>
        <div className={section.eyebrow}>Go deeper</div>
        <h2 className={section.h2} style={{ marginBottom: 44, maxWidth: "20ch" }}>
          The rest of it, on its own pages
        </h2>
        <div className={styles.grid}>
          {exploreCards.map((e) => (
            <Link key={e.href} href={e.href} data-lift="" className={styles.card}>
              <div className={styles.kicker}>{e.kicker}</div>
              <div className={styles.title}>{e.title}</div>
              <p className={styles.body}>{e.body}</p>
              <span className={styles.cta}>{e.cta}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
