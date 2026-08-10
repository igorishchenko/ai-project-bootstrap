import type { ReactNode } from "react";
import { NavBar } from "./NavBar";
import styles from "@/styles/section.module.css";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <NavBar />
      {children}
    </div>
  );
}
