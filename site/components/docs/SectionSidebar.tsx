"use client";

import Link from "next/link";
import { GROUPS, PAGES } from "@/content/docs/pages";
import styles from "./DocsShell.module.css";

export function SectionSidebar({
  currentId,
  signedIn,
  onToggleSignedIn,
  onNavigate,
}: {
  currentId: string;
  signedIn: boolean;
  onToggleSignedIn: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarAccount}>
        <span
          className={styles.acctDot}
          style={{ background: signedIn ? "var(--accent)" : "var(--faint)" }}
        />
        <div>
          <div className={styles.acctTitle}>{signedIn ? "Signed in — Ada Lovelace" : "Signed out"}</div>
          <div className={styles.acctBody}>
            {signedIn
              ? "Pages that have account-specific detail are showing it, and Your licence key is in the nav."
              : "Some pages show more once you sign in — your licence key, your usage, and what the subscription covers."}
          </div>
          <button className={styles.acctCta} onClick={onToggleSignedIn}>
            {signedIn ? "View signed out" : "View signed in"}
          </button>
        </div>
      </div>

      {GROUPS.map((g) => (
        <div key={g.group} className={styles.sidebarGroup}>
          <div className={styles.sidebarGroupTitle}>{g.group}</div>
          <div className={styles.sidebarItems}>
            {g.items
              .filter((id) => !PAGES[id]?.signedInOnly || signedIn)
              .map((id) => (
                <Link
                  key={id}
                  href={`/docs/${id}`}
                  onClick={onNavigate}
                  className={id === currentId ? styles.sidebarItemActive : styles.sidebarItem}
                  style={{ color: id === currentId ? "var(--accent)" : "var(--muted)" }}
                >
                  {PAGES[id]?.title}
                </Link>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
