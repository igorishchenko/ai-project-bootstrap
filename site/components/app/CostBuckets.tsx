import type { CostBucket } from "@/lib/proposalCosts";
import styles from "./CostBuckets.module.css";

const valueClass: Record<CostBucket["tone"], string> = {
  faint: styles.valueFaint,
  ink: styles.value,
  signal: styles.valueSignal,
};

/**
 * Flat, usage-based and no-data stay three separate figures. Summing them
 * would imply the missing prices are $0, which is the one thing the catalogue
 * refuses to claim.
 */
export function CostBuckets({ buckets, foot }: { buckets: CostBucket[]; foot: string }) {
  return (
    <>
      <div className={styles.list}>
        {buckets.map((b) => (
          <div key={b.label} className={styles.bucket}>
            <div className={styles.top}>
              <span className={styles.label}>{b.label}</span>
              <span className={valueClass[b.tone]}>{b.value}</span>
            </div>
            <div className={styles.note}>{b.note}</div>
          </div>
        ))}
      </div>
      <p className={styles.foot}>{foot}</p>
    </>
  );
}
