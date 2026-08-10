import Link from "next/link";
import { InstallButton } from "./InstallButton";
import styles from "./CtaBand.module.css";

export function CtaBand({
  title,
  lead,
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  lead: string;
  secondaryHref: string;
  secondaryLabel: string;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.h2}>{title}</h2>
        <p className={styles.lead}>{lead}</p>
        <div className={styles.actions}>
          <InstallButton dark />
          <Link href={secondaryHref} data-lift="" className={styles.secondary}>
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
