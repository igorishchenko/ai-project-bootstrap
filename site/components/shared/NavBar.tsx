"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Search, Sun } from "lucide-react";
import { useTheme } from "@/lib/useTheme";
import { useSearch } from "@/lib/useSearch";
import { Mark, Wordmark, GitHubMark } from "./Logo";
import styles from "./NavBar.module.css";

const PAGES: { href: string; label: string }[] = [
  { href: "/docs", label: "Docs" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/commands", label: "Commands" },
  { href: "/pricing", label: "Pricing" },
];

export function NavBar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { open: openSearch } = useSearch();

  return (
    <nav className={styles.nav}>
      <div className={styles.brand}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Mark size={27} />
        </Link>
        <Link href="/" style={{ color: "var(--ink)" }}>
          <Wordmark />
        </Link>
        <a
          href="https://github.com/igorishchenko/ai-project-bootstrap"
          className={styles.badge}
          target="_blank"
          rel="noreferrer"
        >
          <GitHubMark />
          MIT · open source
        </a>
      </div>

      <div className={styles.links}>
        {PAGES.map((p) => {
          const active = pathname === p.href || pathname.startsWith(p.href + "/");
          return (
            <Link
              key={p.href}
              href={p.href}
              className={active ? styles.linkActive : styles.link}
            >
              {p.label}
            </Link>
          );
        })}
      </div>

      <div className={styles.right}>
        <button onClick={openSearch} className={styles.themeBtn} aria-label="Search docs">
          <Search size={14} />
        </button>
        <button onClick={toggleTheme} className={styles.themeBtn} aria-label="Toggle theme">
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <Link href="/login" className={styles.loginLink}>
          Log in
        </Link>
        <Link href="/register" className={styles.signup}>
          Sign up
        </Link>
      </div>
    </nav>
  );
}
