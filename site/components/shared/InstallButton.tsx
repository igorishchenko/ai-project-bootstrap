"use client";

import { useCopy } from "@/lib/useCopy";
import styles from "./InstallButton.module.css";

export function InstallButton({
  command = "npx ai-project-bootstrap",
  dark = false,
  liftOnHover = true,
}: {
  command?: string;
  dark?: boolean;
  liftOnHover?: boolean;
}) {
  const { copied, copy } = useCopy(command);
  return (
    <button
      onClick={copy}
      className={dark ? styles.btnDark : styles.btn}
      data-lift={liftOnHover ? "" : undefined}
    >
      <span className={styles.prompt}>$</span>
      <span>{command}</span>
      <span className={styles.label}>{copied ? "copied" : "copy"}</span>
    </button>
  );
}
