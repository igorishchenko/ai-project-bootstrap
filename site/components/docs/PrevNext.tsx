import Link from "next/link";
import { PAGES, neighbors } from "@/content/docs/pages";
import styles from "./PrevNext.module.css";

export function PrevNext({ id }: { id: string }) {
  const { prev, next } = neighbors(id);
  if (!prev && !next) return null;
  return (
    <div className={styles.grid}>
      {prev ? (
        <Link href={`/docs/${prev}`} className={styles.card}>
          <div className={styles.label}>Previous</div>
          <div className={styles.title}>{PAGES[prev].title}</div>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={`/docs/${next}`} className={styles.cardNext}>
          <div className={styles.label}>Next</div>
          <div className={styles.title}>{PAGES[next].title}</div>
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
