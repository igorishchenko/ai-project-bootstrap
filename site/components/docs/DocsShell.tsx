"use client";

import { useEffect, useState } from "react";
import { PAGES, pageBlocks } from "@/content/docs/pages";
import { IconRail } from "./IconRail";
import { SectionSidebar } from "./SectionSidebar";
import { Toc } from "./Toc";
import { MobileBar } from "./MobileBar";
import { PrevNext } from "./PrevNext";
import { BlockRenderer } from "./BlockRenderer";
import { useSearch } from "@/lib/useSearch";
import styles from "./DocsShell.module.css";

export function DocsShell({ pageId }: { pageId: string }) {
  const page = PAGES[pageId];
  const [signedIn, setSignedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // The overlay and its ⌘K binding live in SearchProvider now, so every header
  // on the site opens the same one. Escape still closes the mobile drawer.
  const { open: openSearch } = useSearch();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pageId]);

  if (!page) return null;
  const blocks = pageBlocks(pageId, signedIn);

  return (
    <div className={styles.page}>
      <MobileBar
        currentId={pageId}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((v) => !v)}
        onSearch={openSearch}
        signedIn={signedIn}
        onToggleSignedIn={() => setSignedIn((v) => !v)}
      />

      <div className={styles.shell}>
        <IconRail page={page} onSearch={openSearch} />
        <SectionSidebar
          currentId={pageId}
          signedIn={signedIn}
          onToggleSignedIn={() => setSignedIn((v) => !v)}
        />

        <div className={styles.content}>
          <div className={styles.breadcrumb}>
            Docs / {page.group} / {page.title}
          </div>
          <h1 className={styles.h1}>{page.title}</h1>
          <p className={styles.lead}>{page.lead}</p>
          <BlockRenderer blocks={blocks} />
          <PrevNext id={pageId} />
        </div>

        <Toc blocks={blocks} src={page.src} />
      </div>
    </div>
  );
}
