/**
 * Manuscript document helpers.
 *
 * The editor stores a TipTap/ProseMirror JSON document. Plain text and Markdown
 * are derived from it so import/export and word counts stay consistent.
 */

export type ProseMark = { type: string };
export type ProseNode = {
  type: string;
  text?: string;
  marks?: ProseMark[];
  attrs?: Record<string, unknown>;
  content?: ProseNode[];
};
export type ProseDoc = { type: "doc"; content: ProseNode[] };

export const emptyDoc = (): ProseDoc => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});

export function isProseDoc(value: unknown): value is ProseDoc {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "doc" &&
    Array.isArray((value as { content?: unknown }).content)
  );
}

function inlineText(nodes: ProseNode[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((node) => {
      if (node.type === "text") return node.text ?? "";
      if (node.type === "hardBreak") return "\n";
      return inlineText(node.content);
    })
    .join("");
}

export function docToPlainText(doc: unknown): string {
  if (!isProseDoc(doc)) return "";
  const blocks: string[] = [];
  const walk = (nodes: ProseNode[]) => {
    for (const node of nodes) {
      if (node.type === "horizontalRule") {
        blocks.push("* * *");
      } else if (node.type === "bulletList" || node.type === "orderedList" || node.type === "blockquote") {
        walk(node.content ?? []);
      } else if (node.type === "listItem") {
        walk(node.content ?? []);
      } else {
        const text = inlineText(node.content);
        if (text.trim().length > 0) blocks.push(text);
      }
    }
  };
  walk(doc.content);
  return blocks.join("\n\n");
}

function inlineMarkdown(nodes: ProseNode[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "  \n";
      if (node.type !== "text") return inlineMarkdown(node.content);
      let text = node.text ?? "";
      const marks = (node.marks ?? []).map((m) => m.type);
      if (marks.includes("code")) text = "`" + text + "`";
      if (marks.includes("italic")) text = `*${text}*`;
      if (marks.includes("bold")) text = `**${text}**`;
      return text;
    })
    .join("");
}

export function docToMarkdown(doc: unknown): string {
  if (!isProseDoc(doc)) return "";
  const out: string[] = [];
  for (const node of doc.content) {
    switch (node.type) {
      case "heading": {
        const level = Number(node.attrs?.["level"] ?? 2);
        out.push(`${"#".repeat(Math.min(6, Math.max(1, level)))} ${inlineMarkdown(node.content)}`);
        break;
      }
      case "horizontalRule":
        out.push("---");
        break;
      case "blockquote":
        out.push(
          (node.content ?? []).map((child) => `> ${inlineMarkdown(child.content)}`).join("\n"),
        );
        break;
      case "bulletList":
        out.push(
          (node.content ?? [])
            .map((item) => `- ${(item.content ?? []).map((p) => inlineMarkdown(p.content)).join(" ")}`)
            .join("\n"),
        );
        break;
      case "orderedList":
        out.push(
          (node.content ?? [])
            .map(
              (item, i) =>
                `${i + 1}. ${(item.content ?? []).map((p) => inlineMarkdown(p.content)).join(" ")}`,
            )
            .join("\n"),
        );
        break;
      default: {
        const text = inlineMarkdown(node.content);
        if (text.trim().length > 0) out.push(text);
      }
    }
  }
  return out.join("\n\n");
}

const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;

function markdownInline(text: string): ProseNode[] {
  const parts = text.split(INLINE_PATTERN).filter((part) => part.length > 0);
  return parts.map((part) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return { type: "text", text: part.slice(2, -2), marks: [{ type: "bold" }] };
    }
    if (
      ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) &&
      part.length > 2
    ) {
      return { type: "text", text: part.slice(1, -1), marks: [{ type: "italic" }] };
    }
    return { type: "text", text: part };
  });
}

/** Accepts plain text or light Markdown and returns an editor document. */
export function textToDoc(input: string): ProseDoc {
  const blocks = input.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const content: ProseNode[] = [];
  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;
    if (/^(---|\*\s?\*\s?\*|###\s*$)$/.test(block)) {
      content.push({ type: "horizontalRule" });
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(block);
    if (heading) {
      content.push({
        type: "heading",
        attrs: { level: heading[1]!.length },
        content: markdownInline(heading[2]!),
      });
      continue;
    }
    if (block.startsWith("> ")) {
      content.push({
        type: "blockquote",
        content: [{ type: "paragraph", content: markdownInline(block.replace(/^>\s?/gm, "")) }],
      });
      continue;
    }
    content.push({
      type: "paragraph",
      content: markdownInline(block.replace(/\n/g, " ")),
    });
  }
  return { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph" }] };
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Splits an imported manuscript into scenes on Markdown headings. */
export function splitIntoScenes(input: string): { title: string; body: string }[] {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const scenes: { title: string; body: string[] }[] = [];
  for (const line of lines) {
    const heading = /^#{1,3}\s+(.*)$/.exec(line.trim());
    if (heading) {
      scenes.push({ title: heading[1]!.trim() || "Untitled scene", body: [] });
    } else {
      if (scenes.length === 0) scenes.push({ title: "Imported scene", body: [] });
      scenes[scenes.length - 1]!.body.push(line);
    }
  }
  return scenes
    .map((scene) => ({ title: scene.title, body: scene.body.join("\n").trim() }))
    .filter((scene) => scene.body.length > 0 || scenes.length === 1);
}
