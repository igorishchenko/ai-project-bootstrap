"use client";

import Link from "next/link";
import { BookOpen, LayoutGrid, SquareTerminal, GitPullRequest, Search, Moon, Sun } from "lucide-react";
import { Mark } from "@/components/shared/Logo";
import { useTheme } from "@/lib/useTheme";
import type { DocPage } from "@/content/docs/pages";
import styles from "./DocsShell.module.css";

const RAIL_ITEMS = [
  { icon: BookOpen, label: "Docs", href: "/docs/what-this-is", groups: ["Getting started", "Choosing a stack"] },
  { icon: LayoutGrid, label: "Catalogue", href: "/docs/browse", groups: ["Technology catalogue"] },
  { icon: SquareTerminal, label: "CLI", href: "/docs/generate", groups: ["CLI reference"] },
  { icon: GitPullRequest, label: "Contribute", href: "/docs/add-technology", groups: ["Contributing"] },
];

export function IconRail({ page, onSearch }: { page: DocPage; onSearch: () => void }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={styles.rail}>
      <Link href="/" className={styles.railBrand}>
        <Mark size={27} />
      </Link>
      <span className={styles.railVersion}>v1.0.0</span>
      <button className={styles.railSearch} onClick={onSearch} aria-label="Search">
        <Search size={15} />
        <span>⌘K</span>
      </button>
      <nav className={styles.railNav}>
        {RAIL_ITEMS.map((item) => {
          const active = item.groups.includes(page.group);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={styles.railItem}
              style={{ color: active ? "var(--accent)" : "var(--muted)" }}
            >
              <Icon size={18} />
              <span className={styles.railItemLabel}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className={styles.railBottom}>
        <button onClick={toggleTheme} className={styles.railThemeBtn} aria-label="Toggle theme">
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </div>
  );
}
