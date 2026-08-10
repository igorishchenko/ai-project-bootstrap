import type { Block } from "@/content/docs/pages";
import { slug } from "@/lib/slug";
import styles from "./DocsShell.module.css";

export function Toc({ blocks, src }: { blocks: Block[]; src: string }) {
  const headings = blocks.filter((b): b is Extract<Block, { t: "h2" }> => b.t === "h2");
  return (
    <div className={styles.toc}>
      <div className={styles.tocLabel}>On this page</div>
      {headings.map((h) => (
        <a key={h.text} href={`#${slug(h.text)}`} className={styles.tocLink}>
          {h.text}
        </a>
      ))}
      <div className={styles.tocSource}>Source: {src}</div>
    </div>
  );
}
