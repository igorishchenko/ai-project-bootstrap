"use client";

import { Menu, X, Search, Moon, Sun } from "lucide-react";
import { Wordmark } from "@/components/shared/Logo";
import { useTheme } from "@/lib/useTheme";
import { SectionSidebar } from "./SectionSidebar";
import styles from "./DocsShell.module.css";

export function MobileBar({
  currentId,
  menuOpen,
  onToggleMenu,
  onSearch,
  signedIn,
  onToggleSignedIn,
}: {
  currentId: string;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onSearch: () => void;
  signedIn: boolean;
  onToggleSignedIn: () => void;
}) {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <div className={styles.mobileBar}>
        <button className={styles.mobileBtn} onClick={onToggleMenu} aria-label="Menu">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <span className={styles.mobileWordmark}>
          <Wordmark size={13.5} />
        </span>
        <button className={styles.mobileBtn} onClick={onSearch} aria-label="Search">
          <Search size={18} />
        </button>
        <button className={styles.mobileBtn} onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
      {menuOpen && (
        <div className={styles.drawer}>
          <SectionSidebar
            currentId={currentId}
            signedIn={signedIn}
            onToggleSignedIn={onToggleSignedIn}
            onNavigate={onToggleMenu}
          />
        </div>
      )}
    </>
  );
}
