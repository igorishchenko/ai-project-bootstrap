import Link from "next/link";
import styles from "./TierCard.module.css";

export type TierRow = { mark: string; tone: "accent" | "signal" | "faint"; text: string };

export function TierCard({
  name,
  tag,
  tagTone,
  price,
  sub,
  border,
  rows,
  cta,
  ctaStyle,
  href,
  note,
}: {
  name: string;
  tag: string;
  tagTone: "muted" | "signal";
  price: string;
  sub: string;
  border: string;
  rows: TierRow[];
  cta: string;
  ctaStyle: "solid" | "outline";
  href: string;
  note?: string;
}) {
  return (
    <div className={styles.card} style={{ borderColor: border }}>
      <div className={styles.head}>
        <span className={styles.name}>{name}</span>
        <span className={styles.tag} style={{ color: `var(--${tagTone})` }}>
          {tag}
        </span>
      </div>
      <div className={styles.price}>{price}</div>
      <div className={styles.sub}>{sub}</div>
      <div className={styles.rows}>
        {rows.map((r) => (
          <div key={r.text} className={styles.row}>
            <span className={styles.mark} style={{ color: `var(--${r.tone})` }}>
              {r.mark}
            </span>
            <span className={styles.rowText}>{r.text}</span>
          </div>
        ))}
      </div>
      <Link
        href={href}
        data-lift=""
        className={ctaStyle === "solid" ? styles.ctaSolid : styles.ctaOutline}
      >
        {cta}
      </Link>
      {note && <div className={styles.note}>{note}</div>}
    </div>
  );
}
