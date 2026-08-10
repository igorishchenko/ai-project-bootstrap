/**
 * The narrow slice of markdown the chat model actually emits: fenced code
 * blocks, `##` headings, `-` bullets, `code` spans and **bold**. Deliberately
 * not a general parser — anything richer than this in a reply is a signal the
 * prompt changed, not that this file needs extending.
 */

export type InlinePart = {
  text: string;
  kind: "plain" | "code" | "strong";
};

export type TextLine = {
  kind: "heading" | "bullet" | "paragraph";
  parts: InlinePart[];
};

export type Block =
  | { type: "text"; lines: TextLine[] }
  | { type: "code"; lang: string; text: string };

export function inlineParts(text: string): InlinePart[] {
  const out: InlinePart[] = [];
  for (const seg of text.split(/(`[^`]+`|\*\*[^*]+\*\*)/)) {
    if (!seg) continue;
    if (seg.startsWith("`") && seg.endsWith("`")) {
      out.push({ text: seg.slice(1, -1), kind: "code" });
    } else if (seg.startsWith("**") && seg.endsWith("**")) {
      out.push({ text: seg.slice(2, -2), kind: "strong" });
    } else {
      out.push({ text: seg, kind: "plain" });
    }
  }
  return out;
}

function textBlock(raw: string): Block | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const lines: TextLine[] = trimmed
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => {
      const line = l.trim();
      if (line.startsWith("## ")) {
        return { kind: "heading" as const, parts: inlineParts(line.slice(3)) };
      }
      if (line.startsWith("- ")) {
        return { kind: "bullet" as const, parts: inlineParts(line.slice(2)) };
      }
      return { kind: "paragraph" as const, parts: inlineParts(line) };
    });
  return { type: "text", lines };
}

export function parseMarkdown(text: string): Block[] {
  const blocks: Block[] = [];
  // Tolerates the unterminated fence a half-streamed reply ends on.
  const fence = /```(\w+)?\n([\s\S]*?)```/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = fence.exec(text))) {
    if (match.index > last) {
      const block = textBlock(text.slice(last, match.index));
      if (block) blocks.push(block);
    }
    blocks.push({ type: "code", lang: match[1] || "text", text: match[2].replace(/\s+$/, "") });
    last = fence.lastIndex;
  }

  if (last < text.length) {
    const block = textBlock(text.slice(last));
    if (block) blocks.push(block);
  }
  return blocks;
}
