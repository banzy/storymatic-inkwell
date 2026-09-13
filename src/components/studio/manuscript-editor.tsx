import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import type { ProseDoc } from "@/lib/prose";
import { emptyDoc, isProseDoc } from "@/lib/prose";

export type ManuscriptEditorHandle = Editor | null;

/** Finds a quotation in the document and returns its selection range. */
export function findQuoteRange(editor: Editor, quote: string): { from: number; to: number } | null {
  const needle = quote.trim().replace(/\s+/g, " ");
  if (!needle) return null;
  let found: { from: number; to: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (found || !node.isText || !node.text) return;
    const haystack = node.text.replace(/\s+/g, " ");
    const index = haystack.indexOf(needle);
    if (index >= 0) {
      found = { from: pos + index, to: pos + index + needle.length };
    }
  });
  return found;
}

export function ManuscriptEditor(props: {
  sceneId: string;
  initialContent: unknown;
  editable: boolean;
  onChange: (doc: ProseDoc) => void;
  onReady: (editor: Editor) => void;
  onSelectionText: (text: string) => void;
}) {
  const { sceneId, initialContent, editable, onChange, onReady, onSelectionText } = props;

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          codeBlock: false,
        }),
      ],
      content: isProseDoc(initialContent) ? initialContent : emptyDoc(),
      editable,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          role: "textbox",
          "aria-multiline": "true",
          "aria-label": "Manuscript",
          spellcheck: "true",
        },
      },
      onUpdate: ({ editor: instance }) => {
        onChange(instance.getJSON() as ProseDoc);
      },
      onSelectionUpdate: ({ editor: instance }) => {
        const { from, to } = instance.state.selection;
        onSelectionText(from === to ? "" : instance.state.doc.textBetween(from, to, "\n"));
      },
    },
    [sceneId],
  );

  useEffect(() => {
    if (editor) onReady(editor);
  }, [editor, onReady]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  return (
    <div className="manuscript-editor manuscript mx-auto w-full">
      <EditorContent editor={editor} />
    </div>
  );
}
