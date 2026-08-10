import Link from "next/link";
import styles from "./PageHeader.module.css";

export function PageHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead: string;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.back}>
          ← back to the overview
        </Link>
        <div className={styles.eyebrow}>{eyebrow}</div>
        <h1 className={styles.h1}>{title}</h1>
        <p className={styles.lead}>{lead}</p>
      </div>
    </header>
  );
}
