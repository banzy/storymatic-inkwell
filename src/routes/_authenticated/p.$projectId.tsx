import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  AlertTriangle,
  Bold,
  Check,
  Heading2,
  Italic,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  PanelLeftOpen,
  PanelRightOpen,
  Sparkles,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { OutlineSidebar, type OutlineActions } from "@/components/studio/outline-sidebar";
import {
  ContextPanel,
  type PanelView,
  type RevisionRow,
} from "@/components/studio/context-panel";
import { ManuscriptEditor, findQuoteRange } from "@/components/studio/manuscript-editor";
import { useSceneAutosave } from "@/components/studio/use-scene-autosave";
import { QUICK_ACTIONS, SelectionMenu } from "@/components/studio/selection-menu";
import { ProposalView, type Proposal } from "@/components/studio/proposal-view";
import { AskView, type AskScope, type AskTurn } from "@/components/studio/ask-view";
import {
  askStorymatic,
  proposePassageEdit,
  type EditAction,
} from "@/lib/assist.functions";
import { CharactersView, StoryView } from "@/components/studio/story-view";
import {
  analyseScene,
  getStoryModel,
  saveEntity,
  setClaimJudgement,
} from "@/lib/story.functions";
import { docToMarkdown } from "@/lib/prose";

import {
  createChapter,
  createScene,
  getScene,
  getWorkspace,
  listProjects,
  listRevisions,
  moveNode,
  renameNode,
  resetSampleProject,
  restoreRevision,
  saveDirection,
  setChapterDeleted,
  setDirectionStatus,
  setObservationStatus,
  setSceneDeleted,
  updateSceneMeta,
} from "@/lib/manuscript.functions";

export const Route = createFileRoute("/_authenticated/p/$projectId")({
  validateSearch: (search: Record<string, unknown>): { scene?: string } =>
    typeof search["scene"] === "string" ? { scene: search["scene"] } : {},
  head: () => ({
    meta: [
      { title: "Writing room — Storymatic" },
      { name: "description", content: "Draft your manuscript in a calm, focused writing room." },
      { property: "og:title", content: "Writing room — Storymatic" },
      {
        property: "og:description",
        content: "Draft your manuscript in a calm, focused writing room.",
      },
    ],
  }),
  component: Workspace,
});

function SaveIndicator(props: {
  status: string;
  lastSavedAt: string | null;
  onRetry: () => void;
}) {
  const { status, lastSavedAt, onRetry } = props;
  return (
    <div className="flex items-center gap-2 text-xs" aria-live="polite" role="status">
      {status === "saving" && (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Saving…
        </span>
      )}
      {status === "unsaved" && <span className="text-muted-foreground">Unsaved changes</span>}
      {status === "saved" && (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Check className="size-3.5" aria-hidden="true" />
          Saved{lastSavedAt ? ` ${new Date(lastSavedAt).toLocaleTimeString()}` : ""}
        </span>
      )}
      {status === "error" && (
        <span className="flex items-center gap-1.5 text-destructive">
          <AlertTriangle className="size-3.5" aria-hidden="true" />
          Couldn't save
          <button type="button" className="underline underline-offset-2" onClick={onRetry}>
            Try again
          </button>
        </span>
      )}
    </div>
  );
}

function Workspace() {
  const { projectId } = Route.useParams();
  const { scene: sceneParam } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchWorkspace = useServerFn(getWorkspace);
  const fetchProjects = useServerFn(listProjects);
  const fetchScene = useServerFn(getScene);
  const fetchRevisions = useServerFn(listRevisions);

  const addChapterFn = useServerFn(createChapter);
  const addSceneFn = useServerFn(createScene);
  const renameFn = useServerFn(renameNode);
  const moveFn = useServerFn(moveNode);
  const sceneDeletedFn = useServerFn(setSceneDeleted);
  const chapterDeletedFn = useServerFn(setChapterDeleted);
  const sceneMetaFn = useServerFn(updateSceneMeta);
  const directionFn = useServerFn(saveDirection);
  const directionStatusFn = useServerFn(setDirectionStatus);
  const observationStatusFn = useServerFn(setObservationStatus);
  const restoreFn = useServerFn(restoreRevision);
  const resetSampleFn = useServerFn(resetSampleProject);
  const proposeFn = useServerFn(proposePassageEdit);
  const askFn = useServerFn(askStorymatic);
  const storyModelFn = useServerFn(getStoryModel);
  const analyseSceneFn = useServerFn(analyseScene);
  const claimJudgementFn = useServerFn(setClaimJudgement);
  const saveEntityFn = useServerFn(saveEntity);


  const workspace = useQuery({
    queryKey: ["workspace", projectId],
    queryFn: () => fetchWorkspace({ data: { projectId } }),
  });
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => fetchProjects() });

  const visibleScenes = useMemo(
    () => (workspace.data?.scenes ?? []).filter((scene) => !scene.deleted_at),
    [workspace.data],
  );

  const activeSceneId = sceneParam ?? visibleScenes[0]?.id ?? null;

  const scene = useQuery({
    queryKey: ["scene", activeSceneId],
    queryFn: () => fetchScene({ data: { sceneId: activeSceneId! } }),
    enabled: Boolean(activeSceneId),
  });

  const [panelView, setPanelView] = useState<PanelView | null>("scene");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [fontSize, setFontSize] = useState(20);
  const [leading, setLeading] = useState(1.75);
  const [selectionText, setSelectionText] = useState("");
  const [selectionPos, setSelectionPos] = useState<{ top: number; left: number } | null>(null);
  const [liveWordCount, setLiveWordCount] = useState<number | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposalStale, setProposalStale] = useState(false);
  const [askTurns, setAskTurns] = useState<AskTurn[]>([]);
  const [askScope, setAskScope] = useState<AskScope>("scene");
  const [askLoading, setAskLoading] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const pendingHighlight = useRef<string | null>(null);


  const revisions = useQuery({
    queryKey: ["revisions", activeSceneId],
    queryFn: () => fetchRevisions({ data: { sceneId: activeSceneId! } }),
    enabled: Boolean(activeSceneId) && panelView === "revisions",
  });

  const storyModel = useQuery({
    queryKey: ["story-model", projectId],
    queryFn: () => storyModelFn({ data: { projectId } }),
    enabled: panelView === "story" || panelView === "characters",
  });

  const runSceneAnalysis = async () => {
    if (!activeSceneId) return;
    setAnalysing(true);
    setAnalysisMessage("Updating story understanding…");
    try {
      // Only the open scene is read; the rest of the manuscript is left alone.
      await autosave.flush();
      const result = await analyseSceneFn({ data: { projectId, sceneId: activeSceneId } });
      if (result.ok) {
        await queryClient.invalidateQueries({ queryKey: ["story-model", projectId] });
        setAnalysisMessage(
          result.unverified > 0
            ? `${result.claims} noted. ${result.unverified} reading${
                result.unverified === 1 ? "" : "s"
              } were left out because no passage backed them up.`
            : `${result.claims} noted from this scene.`,
        );
      } else {
        setAnalysisMessage(result.message);
      }
    } catch {
      setAnalysisMessage("Storymatic couldn't read this scene just now. Your writing is unaffected.");
    } finally {
      setAnalysing(false);
    }
  };

  const autosave = useSceneAutosave({
    sceneId: activeSceneId,
    serverPlainText: scene.data?.plain_text ?? "",
    onSaved: () => {
      void queryClient.invalidateQueries({ queryKey: ["workspace", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["revisions", activeSceneId] });
    },
  });

  const refreshWorkspace = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["workspace", projectId] }),
    [queryClient, projectId],
  );

  const goToScene = useCallback(
    async (sceneId: string) => {
      // Pending changes are written before the manuscript surface changes.
      await autosave.flush();
      void navigate({ to: "/p/$projectId", params: { projectId }, search: { scene: sceneId } });
    },
    [autosave, navigate, projectId],
  );

  const mutate = useMutation({
    mutationFn: async (task: () => Promise<unknown>) => task(),
    onSuccess: () => void refreshWorkspace(),
    onError: () => toast.error("That change didn't go through. Please try again."),
  });

  const actions: OutlineActions = {
    selectScene: (sceneId) => void goToScene(sceneId),
    addChapter: () =>
      mutate.mutate(() => addChapterFn({ data: { projectId } })),
    addScene: (chapterId) =>
      mutate.mutate(async () => {
        const created = await addSceneFn({ data: { projectId, chapterId } });
        await refreshWorkspace();
        await goToScene(created.sceneId);
      }),
    rename: (kind, id, title) => mutate.mutate(() => renameFn({ data: { kind, id, title } })),
    move: (kind, id, direction) => mutate.mutate(() => moveFn({ data: { kind, id, direction } })),
    setSceneDeleted: (sceneId, deleted) =>
      mutate.mutate(async () => {
        await sceneDeletedFn({ data: { sceneId, deleted } });
        if (deleted) toast.success("Scene moved to trash. You can restore it from the outline.");
      }),
    setChapterDeleted: (chapterId, deleted) =>
      mutate.mutate(async () => {
        await chapterDeletedFn({ data: { chapterId, deleted } });
        if (deleted) toast.success("Chapter moved to trash. Show deleted scenes to restore it.");
      }),
    exportProject: () => exportMarkdown(),
  };

  const exportMarkdown = () => {
    const data = workspace.data;
    if (!data) return;
    const lines: string[] = [`# ${data.project.title}`, ""];
    for (const chapter of data.chapters) {
      lines.push(`## ${chapter.title}`, "");
      for (const row of data.scenes
        .filter((s) => s.chapter_id === chapter.id && !s.deleted_at)
        .sort((a, b) => a.position - b.position)) {
        lines.push(`### ${row.title}`, "");
        lines.push(
          row.id === activeSceneId && editorRef.current
            ? docToMarkdown(editorRef.current.getJSON())
            : "_Open this scene to include its text in the export._",
          "",
        );
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${data.project.title.replace(/[^\w-]+/g, "-").toLowerCase()}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openEvidence = async (sceneId: string, quote: string) => {
    if (sceneId === activeSceneId) {
      highlight(quote);
      return;
    }
    pendingHighlight.current = quote;
    await goToScene(sceneId);
  };

  const highlight = (quote: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const range = findQuoteRange(editor, quote);
    if (!range) {
      toast.info("That passage has changed since the note was written.");
      return;
    }
    editor.chain().focus().setTextSelection(range).scrollIntoView().run();
  };

  const onEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
    setLiveWordCount(null);
    if (pendingHighlight.current) {
      const quote = pendingHighlight.current;
      pendingHighlight.current = null;
      const range = findQuoteRange(editor, quote);
      if (range) editor.chain().focus().setTextSelection(range).scrollIntoView().run();
      else toast.info("That passage has changed since the note was written.");
    }
  }, []);

  /* ------------------------------------------------ contextual assistance */

  const currentSceneText = () => {
    const editor = editorRef.current;
    if (!editor) return scene.data?.plain_text ?? "";
    return editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n\n");
  };

  const requestProposal = async (
    action: EditAction,
    instruction?: string,
    original?: string,
  ) => {
    if (!activeSceneId) return;
    const append = action === "continue";
    const passage = (original ?? selectionText).trim();
    if (!append && !passage) {
      toast.info("Select a passage in the manuscript first.");
      return;
    }
    setFocusMode(false);
    setPanelView("proposal");
    setSelectionPos(null);
    setProposalError(null);
    setProposalStale(false);
    setProposalLoading(true);
    const label =
      action === "continue"
        ? "Continue this scene"
        : action === "custom"
          ? "Custom instruction"
          : (QUICK_ACTIONS.find((item) => item.action === action)?.label ?? "Rewrite");
    setProposal({
      sceneId: activeSceneId,
      action,
      actionLabel: label,
      instruction: instruction ?? null,
      original: passage,
      proposed: "",
      explanation: "",
      append,
    });
    try {
      const result = await proposeFn({
        data: {
          projectId,
          sceneId: activeSceneId,
          action,
          ...(instruction ? { instruction } : {}),
          selection: passage,
          sceneText: currentSceneText(),
        },
      });
      if (!result.ok) {
        setProposal(null);
        setProposalError(result.message);
        return;
      }
      setProposal((current) =>
        current
          ? { ...current, proposed: result.proposedText, explanation: result.explanation }
          : current,
      );
    } catch {
      setProposal(null);
      setProposalError("Assistance isn't available right now. Your writing is unaffected.");
    } finally {
      setProposalLoading(false);
    }
  };

  const acceptProposal = async () => {
    const editor = editorRef.current;
    if (!editor || !proposal || !proposal.proposed.trim()) return;
    if (proposal.sceneId !== activeSceneId) {
      setProposalStale(true);
      return;
    }
    const paragraphs = proposal.proposed
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => ({ type: "paragraph", content: [{ type: "text", text: block }] }));
    if (paragraphs.length === 0) return;

    if (proposal.append) {
      editor.chain().focus().insertContentAt(editor.state.doc.content.size, paragraphs).run();
    } else {
      // The proposal may only replace the passage it was written for; if the text
      // moved on since then, refuse rather than overwrite newer writing.
      const range = findQuoteRange(editor, proposal.original);
      if (!range) {
        setProposalStale(true);
        toast.info("That passage has changed. Ask again to work from the current text.");
        return;
      }
      editor.chain().focus().insertContentAt(range, paragraphs).run();
    }

    autosave.change(editor.getJSON() as never);
    await autosave.flush();
    void queryClient.invalidateQueries({ queryKey: ["revisions", activeSceneId] });
    setProposal(null);
    setPanelView("scene");
    toast.success("Change applied. The previous version is in revision history.");
  };

  const runAsk = async (question: string) => {
    if (!workspace.data) return;
    const scopeUsed: AskScope = askScope === "selection" && !selectionText ? "scene" : askScope;
    const history = askTurns
      .filter((turn): turn is Extract<AskTurn, { role: "user" | "assistant" }> =>
        turn.role !== "error",
      )
      .slice(-6)
      .map((turn) => ({ role: turn.role, text: turn.text }));
    setAskTurns((turns) => [...turns, { role: "user", text: question, scope: scopeUsed }]);
    setAskLoading(true);
    try {
      const result = await askFn({
        data: {
          projectId,
          sceneId: activeSceneId,
          scope: scopeUsed,
          question,
          ...(selectionText ? { selection: selectionText } : {}),
          sceneText: currentSceneText(),
          history,
        },
      });
      setAskTurns((turns) =>
        result.ok
          ? [
              ...turns,
              {
                role: "assistant",
                text: result.answer,
                basis: result.basis,
                sources: result.sources,
              },
            ]
          : [...turns, { role: "error", text: result.message }],
      );
    } catch {
      setAskTurns((turns) => [
        ...turns,
        { role: "error", text: "Storymatic couldn't answer just now. Your writing is unaffected." },
      ]);
    } finally {
      setAskLoading(false);
    }
  };


  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && focusMode) setFocusMode(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusMode]);

  if (workspace.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> Opening your manuscript…
      </div>
    );
  }

  if (workspace.isError || !workspace.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm">We couldn't open this project.</p>
        <Button variant="outline" onClick={() => workspace.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const data = workspace.data;
  const activeScene = data.scenes.find((row) => row.id === activeSceneId) ?? null;
  const activeChapter = data.chapters.find((row) => row.id === activeScene?.chapter_id) ?? null;
  const sceneDirections = data.directions.filter(
    (direction) =>
      direction.status === "active" &&
      (direction.scene_id === activeSceneId ||
        (!direction.scene_id && !direction.chapter_id) ||
        direction.chapter_id === activeChapter?.id),
  );
  const openObservations = data.observations.filter((row) => row.status === "open");
  const wordCount = liveWordCount ?? scene.data?.word_count ?? 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && !focusMode && (
        <OutlineSidebar
          projects={projects.data ?? []}
          projectId={projectId}
          projectTitle={data.project.title}
          isSample={data.project.is_sample}
          chapters={data.chapters}
          scenes={data.scenes}
          activeSceneId={activeSceneId}
          observationCount={openObservations.length}
          actions={actions}
          onOpenPanel={(view) => setPanelView(view)}
          onCollapse={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-2.5">
          {(!sidebarOpen || focusMode) && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Show the sidebar"
              onClick={() => {
                setSidebarOpen(true);
                setFocusMode(false);
              }}
            >
              <PanelLeftOpen className="size-4" aria-hidden="true" />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">
              {data.project.title}
              {activeChapter ? ` · ${activeChapter.title}` : ""}
            </p>
            {activeScene && (
              <input
                aria-label="Scene title"
                className="w-full truncate border-0 bg-transparent p-0 font-serif text-lg tracking-tight outline-none focus-visible:ring-0"
                defaultValue={activeScene.title}
                key={activeScene.id}
                onBlur={(event) => {
                  const title = event.target.value.trim();
                  if (title && title !== activeScene.title)
                    actions.rename("scene", activeScene.id, title);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
              />
            )}
          </div>

          <SaveIndicator
            status={autosave.status}
            lastSavedAt={autosave.lastSavedAt}
            onRetry={autosave.retry}
          />

          <span className="hidden text-xs text-muted-foreground sm:inline">{wordCount} words</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Formatting">
                <Type className="size-4" aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 space-y-4">
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Bold"
                  onClick={() => editorRef.current?.chain().focus().toggleBold().run()}
                >
                  <Bold className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Italic"
                  onClick={() => editorRef.current?.chain().focus().toggleItalic().run()}
                >
                  <Italic className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Heading"
                  onClick={() =>
                    editorRef.current?.chain().focus().toggleHeading({ level: 2 }).run()
                  }
                >
                  <Heading2 className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Scene break"
                  onClick={() => editorRef.current?.chain().focus().setHorizontalRule().run()}
                >
                  <Minus className="size-4" aria-hidden="true" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type-size">Text size ({fontSize}px)</Label>
                <Slider
                  id="type-size"
                  min={17}
                  max={24}
                  step={1}
                  value={[fontSize]}
                  onValueChange={([value]) => setFontSize(value ?? 20)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type-leading">Line spacing ({leading.toFixed(2)})</Label>
                <Slider
                  id="type-leading"
                  min={1.4}
                  max={2.2}
                  step={0.05}
                  value={[leading]}
                  onValueChange={([value]) => setLeading(value ?? 1.75)}
                />
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            aria-label={focusMode ? "Leave focus mode" : "Enter focus mode"}
            onClick={() => setFocusMode((value) => !value)}
          >
            {focusMode ? (
              <Minimize2 className="size-4" aria-hidden="true" />
            ) : (
              <Maximize2 className="size-4" aria-hidden="true" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFocusMode(false);
              setPanelView("ask");
            }}
          >
            <Sparkles className="size-4" aria-hidden="true" />
            Assist
          </Button>

          {activeSceneId && (
            <Button
              variant="ghost"
              size="sm"
              disabled={proposalLoading}
              onClick={() => void requestProposal("continue")}
            >
              Continue this scene
            </Button>
          )}


          {!panelView && !focusMode && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Show the context panel"
              onClick={() => setPanelView("scene")}
            >
              <PanelRightOpen className="size-4" aria-hidden="true" />
            </Button>
          )}
        </header>

        {focusMode && (
          <div className="border-b border-border bg-secondary px-4 py-1.5 text-center text-xs text-muted-foreground">
            Focus mode — press Escape to bring the workspace back
          </div>
        )}

        {autosave.recovery && (
          <div className="flex flex-wrap items-center gap-3 border-b border-border bg-planned px-4 py-2 text-xs text-planned-foreground">
            <span>
              A local draft of this scene from{" "}
              {new Date(autosave.recovery.savedAt).toLocaleString()} didn't reach the server.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const draft = autosave.recovery;
                if (draft && editorRef.current) {
                  editorRef.current.commands.setContent(draft.content);
                  autosave.change(draft.content);
                }
                autosave.dismissRecovery();
              }}
            >
              Use the local draft
            </Button>
            <Button size="sm" variant="ghost" onClick={autosave.dismissRecovery}>
              Keep the saved text
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div
            className="mx-auto px-6 py-12 sm:px-10"
            style={
              {
                "--manuscript-size": `${fontSize}px`,
                "--manuscript-leading": String(leading),
                maxWidth: "min(100%, 860px)",
              } as React.CSSProperties
            }
          >
            {!activeSceneId && (
              <p className="text-sm text-muted-foreground">
                This project has no scenes yet. Add one from the outline to start writing.
              </p>
            )}
            {activeSceneId && scene.isLoading && (
              <p className="text-sm text-muted-foreground">Loading the scene…</p>
            )}
            {activeSceneId && scene.isError && (
              <div className="text-sm">
                <p>We couldn't load this scene.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => scene.refetch()}>
                  Try again
                </Button>
              </div>
            )}
            {activeSceneId && scene.data && (
              <ManuscriptEditor
                sceneId={activeSceneId}
                initialContent={scene.data.content}
                editable
                onChange={(doc) => {
                  autosave.change(doc);
                  const editor = editorRef.current;
                  if (editor) {
                    const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, " ");
                    setLiveWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
                  }
                }}
                onReady={onEditorReady}
                onSelectionText={(text) => {
                  setSelectionText(text);
                  if (!text.trim()) {
                    setSelectionPos(null);
                    return;
                  }
                  const domSelection = window.getSelection();
                  const rect = domSelection?.rangeCount
                    ? domSelection.getRangeAt(0).getBoundingClientRect()
                    : null;
                  if (!rect) return;
                  setSelectionPos({
                    top: Math.min(rect.bottom + 8, window.innerHeight - 220),
                    left: Math.min(Math.max(rect.left, 16), window.innerWidth - 320),
                  });
                }}
              />
            )}
            {selectionText && !selectionPos && (
              <p className="mt-8 text-xs text-muted-foreground">
                {selectionText.trim().split(/\s+/).length} words selected.{" "}
                <button
                  type="button"
                  className="underline underline-offset-2"
                  onClick={() => void requestProposal("rewrite")}
                >
                  Ask for a rewrite
                </button>
              </p>
            )}

          </div>
        </div>
      </main>

      <SelectionMenu
        position={selectionText.trim() ? selectionPos : null}
        words={selectionText.trim() ? selectionText.trim().split(/\s+/).length : 0}
        busy={proposalLoading}
        onAction={(action, instruction) => void requestProposal(action, instruction)}
        onAsk={() => {
          setAskScope("selection");
          setSelectionPos(null);
          setPanelView("ask");
        }}
        onDismiss={() => setSelectionPos(null)}
      />


      {panelView && !focusMode && (
        <ContextPanel
          view={panelView}
          onClose={() => setPanelView(null)}
          onSelectView={setPanelView}
          scene={
            scene.data
              ? {
                  id: scene.data.id,
                  title: scene.data.title,
                  summary: scene.data.summary,
                  pov: scene.data.pov,
                  location: scene.data.location,
                  story_time: scene.data.story_time,
                  word_count: scene.data.word_count,
                }
              : null
          }
          sceneDirections={sceneDirections}
          directions={data.directions}
          observations={data.observations}
          revisions={(revisions.data ?? []) as RevisionRow[]}
          revisionsLoading={revisions.isLoading}
          projectTitle={data.project.title}
          isSample={data.project.is_sample}
          onSaveSceneMeta={(meta) =>
            mutate.mutate(async () => {
              if (!activeSceneId) return;
              await sceneMetaFn({ data: { sceneId: activeSceneId, ...meta } });
              await queryClient.invalidateQueries({ queryKey: ["scene", activeSceneId] });
              toast.success("Scene context saved.");
            })
          }
          onAddDirection={(body, kind, sceneScoped) =>
            mutate.mutate(() =>
              directionFn({
                data: {
                  projectId,
                  scope: sceneScoped ? "scene" : "project",
                  sceneId: sceneScoped ? activeSceneId : null,
                  body,
                  kind,
                },
              }),
            )
          }
          onRetireDirection={(id, status) =>
            mutate.mutate(() => directionStatusFn({ data: { id, status } }))
          }
          onObservationStatus={(id, status) =>
            mutate.mutate(() => observationStatusFn({ data: { id, status } }))
          }
          onOpenEvidence={(sceneId, quote) => void openEvidence(sceneId, quote)}
          onRestoreRevision={(revisionId) =>
            mutate.mutate(async () => {
              await autosave.flush();
              await restoreFn({ data: { revisionId } });
              await queryClient.invalidateQueries({ queryKey: ["scene", activeSceneId] });
              await queryClient.invalidateQueries({ queryKey: ["revisions", activeSceneId] });
              toast.success("Revision restored.");
            })
          }
          onResetSample={() =>
            mutate.mutate(async () => {
              const result = await resetSampleFn();
              void navigate({ to: "/p/$projectId", params: { projectId: result.projectId } });
              toast.success("Sample project reset.");
            })
          }
          onExport={exportMarkdown}
          askSlot={
            <AskView
              turns={askTurns}
              loading={askLoading}
              scope={askScope}
              hasSelection={Boolean(selectionText.trim())}
              onScopeChange={setAskScope}
              onAsk={(question) => void runAsk(question)}
              onOpenSource={(sceneId, quote) => void openEvidence(sceneId, quote)}
            />
          }
          proposalSlot={
            <ProposalView
              proposal={proposal}
              loading={proposalLoading}
              error={proposalError}
              stale={proposalStale}
              onEdit={(text) =>
                setProposal((current) => (current ? { ...current, proposed: text } : current))
              }
              onAccept={() => void acceptProposal()}
              onRegenerate={() =>
                void requestProposal(
                  (proposal?.action ?? "rewrite") as EditAction,
                  proposal?.instruction ?? undefined,
                  proposal?.original,
                )
              }
              onDiscard={() => {
                setProposal(null);
                setProposalError(null);
                setPanelView("scene");
              }}
            />
          }

        />
      )}
    </div>
  );
}
