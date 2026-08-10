import Link from "next/link";
import { Hatch } from "@/components/shared/Hatch";
import { InstallButton } from "@/components/shared/InstallButton";
import { heroPill, heroTitle, heroSubhead, heroFootnote } from "@/content/landing";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <header className={styles.hero}>
      <Hatch />
      <div className={styles.stack}>
        <div className={`${styles.pill} ${styles.enter}`} style={{ animationDelay: "90ms" }}>
          <span className={styles.dot} />
          {heroPill}
        </div>
        <h1 className={`${styles.h1} ${styles.enter}`} style={{ animationDelay: "200ms" }}>
          {heroTitle}
        </h1>
        <p className={`${styles.subhead} ${styles.enter}`} style={{ animationDelay: "310ms" }}>
          {heroSubhead}
        </p>
        <div className={`${styles.actions} ${styles.enter}`} style={{ animationDelay: "420ms" }}>
          <InstallButton />
        </div>
        <p className={`${styles.footnote} ${styles.enter}`} style={{ animationDelay: "420ms" }}>
          {heroFootnote}
          <Link href="/docs">read the docs →</Link>
        </p>
      </div>
    </header>
  );
}
