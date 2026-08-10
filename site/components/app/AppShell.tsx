"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Moon, Search, Sun } from "lucide-react";
import { Mark, Wordmark } from "@/components/shared/Logo";
import { useTheme } from "@/lib/useTheme";
import { useSearch } from "@/lib/useSearch";
import { useSession } from "@/lib/useSession";
import type { Me } from "@/lib/api";
import { dashboardNav } from "@/content/app";
import styles from "./AppShell.module.css";

export type ShellMarker = { text: string; tone: "signal" | "muted" };

/** `ada@lovelace.dev` → `ad`. Two characters is all the avatar has room for. */
function initialsFor(me: Me | undefined): string {
  if (!me) return "··";
  const name = me.displayName?.trim();
  if (name) {
    const parts = name.split(/\s+/);
    const pair = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
    return pair.toLowerCase();
  }
  return me.email.slice(0, 2).toLowerCase();
}

/**
 * The API cannot say when a subscription renews — `GET /v1/me` returns the
 * status and nothing else — so this states the status plainly rather than
 * inventing a date. Being signed in is what makes saying it at all legitimate:
 * the chat endpoints deliberately refuse to distinguish these cases.
 */
function planFor(me: Me | undefined): { label: string; danger: boolean } {
  if (!me) return { label: "…", danger: false };
  if (me.plan === "free" || me.status === "none") {
    return { label: "No subscription", danger: false };
  }
  if (me.status === "past_due") return { label: "Past due — payment failed", danger: true };
  if (me.status === "canceled") return { label: "Pro · canceled", danger: true };
  return { label: "Pro · active", danger: false };
}

export function AppShell({
  title,
  marker,
  fill = false,
  children,
}: {
  title: string;
  marker: ShellMarker;
  /** Chat needs the main column to size to the viewport and scroll internally. */
  fill?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { open: openSearch } = useSearch();
  const { me, signOut } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [menuOpen]);

  const plan = planFor(me);

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}>
          <Mark size={24} strokeWidth={1.7} />
          <span className={styles.hideSm}>
            <Wordmark size={13} />
          </span>
        </Link>
        <span className={`${styles.divider} ${styles.hideSm}`} />
        <span className={styles.pageTitle}>{title}</span>
        <span className={marker.tone === "signal" ? styles.pillSignal : styles.pill}>
          {marker.text}
        </span>

        <div className={styles.right}>
          <Link href="/docs" className={`${styles.docsLink} ${styles.hideSm}`}>
            Docs
          </Link>
          <button onClick={openSearch} className={styles.iconBtn} aria-label="Search docs">
            <Search size={14} />
          </button>
          <button onClick={toggleTheme} className={styles.iconBtn} aria-label="Toggle theme">
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          <div className={styles.accountWrap} ref={menuRef}>
            <button
              className={styles.accountBtn}
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className={styles.avatar}>{initialsFor(me)}</span>
              <span className={`${styles.accountEmail} ${styles.hideSm}`}>
                {me?.email ?? "signed out"}
              </span>
            </button>
            {menuOpen && (
              <div className={styles.menu} role="menu">
                <div className={styles.menuHead}>
                  <div className={styles.menuEmail}>{me?.email ?? "Not signed in"}</div>
                  <div className={plan.danger ? styles.menuPlanDanger : styles.menuPlan}>
                    {plan.label}
                  </div>
                </div>
                <div className={styles.menuList}>
                  <Link href="/settings" className={styles.menuItem} role="menuitem">
                    Settings
                  </Link>
                  <Link href="/settings?tab=billing" className={styles.menuItem} role="menuitem">
                    Billing
                  </Link>
                  <Link href="/connect" className={styles.menuItem} role="menuitem">
                    Connect your editor
                  </Link>
                  <button
                    className={styles.menuItemQuiet}
                    role="menuitem"
                    onClick={async () => {
                      setMenuOpen(false);
                      await signOut();
                      router.push("/login");
                    }}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={styles.body}>
        <nav className={styles.rail} aria-label="Dashboard">
          {dashboardNav.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                title={n.label}
                aria-label={n.label}
                aria-current={active ? "page" : undefined}
                className={active ? styles.railLinkActive : styles.railLink}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={n.d} />
                </svg>
              </Link>
            );
          })}
        </nav>

        <main className={fill ? styles.mainFill : styles.main}>{children}</main>
      </div>
    </div>
  );
}
