import Link from "next/link";
import { Mark } from "./Logo";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.brand}>
        <Mark size={22} strokeWidth={1.7} />
        <span className={styles.brandLabel}>ai-project-bootstrap · MIT</span>
      </div>
      <div className={styles.links}>
        <Link href="/docs">Docs</Link>
        <a href="https://www.npmjs.com/package/ai-project-bootstrap" target="_blank" rel="noreferrer">
          npm
        </a>
        <a href="https://github.com/igorishchenko/ai-project-bootstrap" target="_blank" rel="noreferrer">
          GitHub
        </a>
        <Link href="/commands">Commands</Link>
        <a
          href="https://github.com/igorishchenko/ai-project-bootstrap/blob/main/CONTRIBUTING.md"
          target="_blank"
          rel="noreferrer"
        >
          Contributing
        </a>
        <a href="https://github.com/igorishchenko/ai-project-bootstrap/issues" target="_blank" rel="noreferrer">
          Issues
        </a>
      </div>
    </footer>
  );
}
