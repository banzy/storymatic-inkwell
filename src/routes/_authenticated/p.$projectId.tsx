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
import { PeopleView } from "@/components/studio/people-view";

import {
  analyseScene,
  getStoryModel,
  saveEntity,
  setClaimJudgement,
} from "@/lib/story.functions";
import { OutlineView, type BeatDraft } from "@/components/studio/outline-view";
import {
  deleteBeat,
  getOutline,
  moveBeat,
  reviewOutline,
  saveBeat,
  setBeatState,
} from "@/lib/outline.functions";
import {
  StorySpace,
  type CardPatch,
  type StorySpaceTab,
} from "@/components/studio/story-space";
import { describeScenes, reviewSceneMove } from "@/lib/storyspace.functions";
import {
  DiscoveriesView,
  RelationshipsView,
  SynopsisView,
  type SynopsisTarget,
} from "@/components/studio/story-extras";
import {
  findDiscoveries,
  getStoryExtras,
  judgeRelationship,
  judgeRelationshipBeat,
  readRelationships,
  saveRelationship,
  saveSynopsis,
  writeSynopsis,
} from "@/lib/storybrain.functions";
import { PromisesView, type PromiseDraft } from "@/components/studio/promises-view";
import {
  deletePromise,
  getPromises,
  judgePromise,
  readPromises,
  savePromise,
} from "@/lib/promises.functions";
import { WorldView } from "@/components/studio/world-view";
import { ResearchView, type ResearchDraft } from "@/components/studio/research-view";
import { ThemesView, type ThemeDraft } from "@/components/studio/themes-view";
import { QuestionsView, type QuestionDraft } from "@/components/studio/questions-view";
import {
  deleteQuestion,
  getQuestions,
  readContradictions,
  saveQuestion,
} from "@/lib/contradictions.functions";
import { ThreadsView, type ThreadDraft } from "@/components/studio/threads-view";
import {
  deleteThread,
  getThreads,
  judgeThread,
  judgeThreadBeat,
  readThreads,
  saveThread,
  setThreadStatus,
} from "@/lib/threads.functions";

import { readWorld } from "@/lib/world.functions";
import { OverviewView } from "@/components/studio/overview-view";
import { getStoryOverview } from "@/lib/overview.functions";
import {
  PossibilitiesView,
  type PossibilityDraft,
} from "@/components/studio/possibilities-view";
import {
  deletePossibility,
  exploreScene,
  getPossibilities,
  savePossibility,
  setPossibilityStatus,
} from "@/lib/possibilities.functions";


import { ChronologyView, type EventDraft } from "@/components/studio/chronology-view";
import {
  deleteStoryEvent,
  getChronology,
  judgeStoryEvent,
  moveStoryEvent,
  readChronology,
  saveStoryEvent,
} from "@/lib/timeline.functions";

import {
  deleteResearchNote,
  getResearch,
  saveResearchNote,
} from "@/lib/research.functions";
import { deleteTheme, getThemes, readThemes, saveTheme } from "@/lib/themes.functions";



import { docToMarkdown } from "@/lib/prose";

import {
  createChapter,
  createScene,
  getScene,
  getWorkspace,
  listProjects,
  listRevisions,
  moveNode,
  placeScene,
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
  const placeSceneFn = useServerFn(placeScene);
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
  const outlineFn = useServerFn(getOutline);
  const saveBeatFn = useServerFn(saveBeat);
  const moveBeatFn = useServerFn(moveBeat);
  const beatStateFn = useServerFn(setBeatState);
  const deleteBeatFn = useServerFn(deleteBeat);
  const reviewOutlineFn = useServerFn(reviewOutline);
  const describeScenesFn = useServerFn(describeScenes);
  const reviewMoveFn = useServerFn(reviewSceneMove);
  const extrasFn = useServerFn(getStoryExtras);
  const writeSynopsisFn = useServerFn(writeSynopsis);
  const saveSynopsisFn = useServerFn(saveSynopsis);
  const readRelationshipsFn = useServerFn(readRelationships);
  const saveRelationshipFn = useServerFn(saveRelationship);
  const judgeRelationshipFn = useServerFn(judgeRelationship);
  const judgeBeatFn = useServerFn(judgeRelationshipBeat);
  const findDiscoveriesFn = useServerFn(findDiscoveries);
  const promisesFn = useServerFn(getPromises);
  const savePromiseFn = useServerFn(savePromise);
  const judgePromiseFn = useServerFn(judgePromise);
  const deletePromiseFn = useServerFn(deletePromise);
  const readPromisesFn = useServerFn(readPromises);
  const readWorldFn = useServerFn(readWorld);
  const chronologyFn = useServerFn(getChronology);
  const overviewFn = useServerFn(getStoryOverview);
  const possibilitiesFn = useServerFn(getPossibilities);
  const savePossibilityFn = useServerFn(savePossibility);
  const possibilityStatusFn = useServerFn(setPossibilityStatus);
  const deletePossibilityFn = useServerFn(deletePossibility);
  const exploreSceneFn = useServerFn(exploreScene);


  const saveEventFn = useServerFn(saveStoryEvent);
  const judgeEventFn = useServerFn(judgeStoryEvent);
  const deleteEventFn = useServerFn(deleteStoryEvent);
  const moveEventFn = useServerFn(moveStoryEvent);
  const readChronologyFn = useServerFn(readChronology);

  const researchFn = useServerFn(getResearch);
  const saveResearchFn = useServerFn(saveResearchNote);
  const deleteResearchFn = useServerFn(deleteResearchNote);

  const themesFn = useServerFn(getThemes);
  const saveThemeFn = useServerFn(saveTheme);
  const deleteThemeFn = useServerFn(deleteTheme);
  const readThemesFn = useServerFn(readThemes);

  const questionsFn = useServerFn(getQuestions);
  const saveQuestionFn = useServerFn(saveQuestion);
  const deleteQuestionFn = useServerFn(deleteQuestion);
  const readContradictionsFn = useServerFn(readContradictions);

  const threadsFn = useServerFn(getThreads);
  const saveThreadFn = useServerFn(saveThread);
  const judgeThreadFn = useServerFn(judgeThread);
  const judgeThreadBeatFn = useServerFn(judgeThreadBeat);
  const threadStatusFn = useServerFn(setThreadStatus);
  const deleteThreadFn = useServerFn(deleteThread);
  const readThreadsFn = useServerFn(readThreads);





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
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [reviewingOutline, setReviewingOutline] = useState(false);
  const [outlineMessage, setOutlineMessage] = useState<string | null>(null);
  const [unplanned, setUnplanned] = useState<{ sceneId: string; note: string }[]>([]);
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyTab, setStoryTab] = useState<StorySpaceTab>("overview");
  const [fillingCards, setFillingCards] = useState(false);
  const [storyMessage, setStoryMessage] = useState<string | null>(null);
  const [synopsisBusy, setSynopsisBusy] = useState<string | null>(null);
  const [extrasBusy, setExtrasBusy] = useState(false);
  const [moveNotes, setMoveNotes] = useState<{
    sceneTitle: string;
    notes: { note: string; certainty: string }[];
  } | null>(null);
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
    enabled: panelView === "story" || panelView === "characters" || storyOpen,
  });

  const outline = useQuery({
    queryKey: ["outline", projectId],
    queryFn: () => outlineFn({ data: { projectId } }),
    enabled: outlineOpen || storyOpen,
  });

  const refreshOutline = () => queryClient.invalidateQueries({ queryKey: ["outline", projectId] });

  // A brand-new story starts with nothing: there is nothing to read until words exist.
  const hasWriting = (outline.data?.scenes ?? []).some((scene) => (scene.word_count ?? 0) > 0);
  const readingBlocked = extrasBusy || !hasWriting;
  const readingHint = hasWriting ? undefined : "There's nothing written to read yet.";

  // The synopsis, relationships and discoveries all grow with the draft, so they
  // are read fresh whenever the Story views are opened.
  const extras = useQuery({
    queryKey: ["story-extras", projectId],
    queryFn: () => extrasFn({ data: { projectId } }),
    enabled: storyOpen,
  });
  const refreshExtras = () =>
    queryClient.invalidateQueries({ queryKey: ["story-extras", projectId] });

  const promises = useQuery({
    queryKey: ["story-promises", projectId],
    queryFn: () => promisesFn({ data: { projectId } }),
    enabled: storyOpen,
  });
  const refreshPromises = () =>
    queryClient.invalidateQueries({ queryKey: ["story-promises", projectId] });

  const runReadPromises = async () => {
    setExtrasBusy(true);
    setStoryMessage("Reading what the draft sets up…");
    try {
      await autosave.flush();
      const result = await readPromisesFn({ data: { projectId } });
      if (result.ok) {
        await refreshPromises();
        setStoryMessage(
          result.noted === 0
            ? "Nothing is planted clearly enough to list yet."
            : `${result.noted} promise${result.noted === 1 ? "" : "s"}, ${result.paid} already paid off. These are Storymatic's readings until you confirm them.`,
        );
      } else {
        setStoryMessage(result.message);
      }
    } catch {
      setStoryMessage("Storymatic couldn't read the promises just now. Your draft is unaffected.");
    } finally {
      setExtrasBusy(false);
    }
  };

  const research = useQuery({
    queryKey: ["research", projectId],
    queryFn: () => researchFn({ data: { projectId } }),
    enabled: storyOpen,
  });
  const refreshResearch = () =>
    queryClient.invalidateQueries({ queryKey: ["research", projectId] });

  const threads = useQuery({
    queryKey: ["story-threads", projectId],
    queryFn: () => threadsFn({ data: { projectId } }),
    enabled: storyOpen,
  });
  const refreshThreads = () =>
    queryClient.invalidateQueries({ queryKey: ["story-threads", projectId] });

  const runReadThreads = async () => {
    setExtrasBusy(true);
    setStoryMessage("Reading what the scenes are carrying…");
    try {
      await autosave.flush();
      const result = await readThreadsFn({ data: { projectId } });
      if (result.ok) {
        await refreshThreads();
        setStoryMessage(
          result.noted === 0
            ? "Nothing runs across the scenes clearly enough to name yet. This grows with the draft."
            : `${result.noted} thread${result.noted === 1 ? "" : "s"}, picked up ${result.moments} time${result.moments === 1 ? "" : "s"} in the draft. Each stays Storymatic's reading until you agree.`,
        );
      } else {
        setStoryMessage(result.message);
      }
    } catch {
      setStoryMessage("Storymatic couldn't read the threads just now. Your draft is unaffected.");
    } finally {
      setExtrasBusy(false);
    }
  };

  const themes = useQuery({
    queryKey: ["themes", projectId],
    queryFn: () => themesFn({ data: { projectId } }),
    enabled: storyOpen,
  });
  const refreshThemes = () =>
    queryClient.invalidateQueries({ queryKey: ["themes", projectId] });

  const runReadThemes = async () => {
    setExtrasBusy(true);
    setStoryMessage("Reading for what keeps coming back…");
    try {
      await autosave.flush();
      const result = await readThemesFn({ data: { projectId } });
      if (result.ok) {
        await refreshThemes();
        setStoryMessage(
          result.added === 0
            ? "Nothing recurs clearly enough to name yet. This grows with the draft."
            : `${result.added} thing${result.added === 1 ? "" : "s"} the scenes keep returning to. Each one is a reading, not a verdict — agree with it or set it aside.`,
        );
      } else {
        setStoryMessage(result.message);
      }
    } catch {
      setStoryMessage("Storymatic couldn't read for themes just now. Your draft is unaffected.");
    } finally {
      setExtrasBusy(false);
    }
  };

  const questions = useQuery({
    queryKey: ["questions", projectId],
    queryFn: () => questionsFn({ data: { projectId } }),
    enabled: storyOpen,
  });
  const refreshQuestions = () =>
    queryClient.invalidateQueries({ queryKey: ["questions", projectId] });

  const runCompareScenes = async () => {
    setExtrasBusy(true);
    setStoryMessage("Comparing the scenes with each other…");
    try {
      await autosave.flush();
      const result = await readContradictionsFn({ data: { projectId } });
      if (result.ok) {
        await refreshQuestions();
        setStoryMessage(
          result.added === 0
            ? "Nothing in the scenes seems to disagree. Nothing is being called correct — this is only what Storymatic can see."
            : `${result.added} question${result.added === 1 ? "" : "s"} to look at, each with both passages. None of it is a mistake until you say so.`,
        );
      } else {
        setStoryMessage(result.message);
      }
    } catch {
      setStoryMessage("Storymatic couldn't compare the scenes just now. Your draft is unaffected.");
    } finally {
      setExtrasBusy(false);
    }
  };

  const overview = useQuery({
    queryKey: ["story-overview", projectId],
    queryFn: () => overviewFn({ data: { projectId } }),
    enabled: storyOpen,
  });

  const possibilities = useQuery({
    queryKey: ["possibilities", projectId],
    queryFn: () => possibilitiesFn({ data: { projectId } }),
    enabled: storyOpen,
  });
  const refreshPossibilities = () =>
    queryClient.invalidateQueries({ queryKey: ["possibilities", projectId] });

  const runExploreScene = async () => {
    if (!activeSceneId) {
      setStoryMessage("Open a scene first, and Storymatic will explore that one.");
      return;
    }
    setExtrasBusy(true);
    setStoryMessage("Thinking about ways this scene could go…");
    try {
      await autosave.flush();
      const result = await exploreSceneFn({
        data: { projectId, sceneId: activeSceneId, question: null },
      });
      if (result.ok) {
        await refreshPossibilities();
        setStoryMessage(
          result.added === 0
            ? "Nothing worth putting forward for this scene."
            : `${result.added} way${result.added === 1 ? "" : "s"} “${result.sceneTitle}” could go. None of it is written anywhere — it's yours to take up or set aside.`,
        );
      } else {
        setStoryMessage(result.message);
      }
    } catch {
      setStoryMessage("Storymatic couldn't explore this scene just now. Your draft is unaffected.");
    } finally {
      setExtrasBusy(false);
    }
  };

  const onSavePossibility = async (draft: PossibilityDraft) => {
    await savePossibilityFn({
      data: {
        projectId,
        id: draft.id,
        sceneId: draft.sceneId,
        name: draft.name,
        premise: draft.premise,
        notes: draft.notes,
      },
    });
    await refreshPossibilities();
  };


  const chronology = useQuery({

    queryKey: ["chronology", projectId],
    queryFn: () => chronologyFn({ data: { projectId } }),
    enabled: storyOpen,
  });
  const refreshChronology = () =>
    queryClient.invalidateQueries({ queryKey: ["chronology", projectId] });

  const runReadChronology = async () => {
    setExtrasBusy(true);
    setStoryMessage("Working out when things happen…");
    try {
      await autosave.flush();
      const result = await readChronologyFn({ data: { projectId } });
      if (result.ok) {
        await refreshChronology();
        setStoryMessage(
          result.noted === 0
            ? "The draft doesn't settle its order clearly enough yet."
            : `${result.noted} thing${result.noted === 1 ? "" : "s"} placed in story order${
                result.unclear > 0
                  ? `, ${result.unclear} with the timing left as the draft leaves it`
                  : ""
              }. These stay Storymatic's readings until you agree.`,
        );
      } else {
        setStoryMessage(result.message);
      }
    } catch {
      setStoryMessage(
        "Storymatic couldn't read the chronology just now. Your draft is unaffected.",
      );
    } finally {
      setExtrasBusy(false);
    }
  };

  const onSaveEvent = async (draft: EventDraft) => {
    await saveEventFn({
      data: {
        projectId,
        id: draft.id,
        summary: draft.summary,
        whenText: draft.whenText,
        sceneId: draft.sceneId,
        certainty: draft.certainty,
      },
    });
    await refreshChronology();
  };


  const runReadWorld = async () => {
    setExtrasBusy(true);
    setStoryMessage("Reading the world your scenes have built…");
    try {
      await autosave.flush();
      const result = await readWorldFn({ data: { projectId } });
      if (result.ok) {
        await queryClient.invalidateQueries({ queryKey: ["story-model", projectId] });
        setStoryMessage(
          result.added === 0 && result.noted === 0
            ? "The draft hasn't established anything solid about its world yet."
            : `${result.added} place${result.added === 1 ? "" : "s"}, thing${
                result.added === 1 ? "" : "s"
              } or group${result.added === 1 ? "" : "s"} and ${result.noted} rule${
                result.noted === 1 ? "" : "s"
              }. These stay Storymatic's readings until you agree.`,
        );
      } else {
        setStoryMessage(result.message);
      }
    } catch {
      setStoryMessage("Storymatic couldn't read the world just now. Your draft is unaffected.");
    } finally {
      setExtrasBusy(false);
    }
  };



  const synopsisTargets: SynopsisTarget[] = useMemo(() => {
    const chapters = outline.data?.chapters ?? [];
    const scenes = outline.data?.scenes ?? [];
    const people = (storyModel.data?.entities ?? []).filter(
      (entity) => entity.kind === "character",
    );
    const threadRows = threads.data?.threads ?? [];
    return [
      { scope: "story" as const, targetId: null, label: "The whole story so far" },
      ...chapters.map((chapter) => ({
        scope: "chapter" as const,
        targetId: chapter.id,
        label: chapter.title,
      })),
      ...scenes.map((scene) => ({
        scope: "scene" as const,
        targetId: scene.id,
        label: scene.title,
      })),
      ...people.map((person) => ({
        scope: "character" as const,
        targetId: person.id,
        label: person.name,
      })),
      ...threadRows.map((thread) => ({
        scope: "thread" as const,
        targetId: thread.id,
        label: thread.name,
      })),
    ];
  }, [outline.data, storyModel.data, threads.data]);

  const runWriteSynopsis = async (target: SynopsisTarget) => {
    const key = `${target.scope}:${target.targetId ?? ""}`;
    setSynopsisBusy(key);
    setStoryMessage("Reading the draft…");
    try {
      const result = await writeSynopsisFn({
        data: { projectId, scope: target.scope, targetId: target.targetId, length: "full" },
      });
      if (result.ok) {
        await refreshExtras();
        setStoryMessage(
          `Written from ${result.scenes} scene${result.scenes === 1 ? "" : "s"}. Edit it freely, and lock it when it reads right.`,
        );
      } else {
        setStoryMessage(result.message);
      }
    } catch {
      setStoryMessage("Storymatic couldn't write that summary just now. Your draft is unaffected.");
    } finally {
      setSynopsisBusy(null);
    }
  };

  const runReadRelationships = async () => {
    setExtrasBusy(true);
    setStoryMessage("Reading how your people stand with each other…");
    try {
      await autosave.flush();
      const result = await readRelationshipsFn({ data: { projectId } });
      if (result.ok) {
        await refreshExtras();
        setStoryMessage(
          result.pairs === 0
            ? "Nothing between your people showed up clearly enough to record yet."
            : `${result.pairs} relationship${result.pairs === 1 ? "" : "s"} and ${result.moments} moment${
                result.moments === 1 ? "" : "s"
              } of change. These are Storymatic's readings until you confirm them.`,
        );
      } else {
        setStoryMessage(result.message);
      }
    } catch {
      setStoryMessage("Storymatic couldn't read the relationships just now. Your draft is unaffected.");
    } finally {
      setExtrasBusy(false);
    }
  };

  const runFindDiscoveries = async () => {
    setExtrasBusy(true);
    setStoryMessage("Looking across your scenes…");
    try {
      await autosave.flush();
      const result = await findDiscoveriesFn({ data: { projectId } });
      if (result.ok) {
        await refreshExtras();
        await queryClient.invalidateQueries({ queryKey: ["workspace", projectId] });
        setStoryMessage(
          result.added === 0
            ? "Nothing new worth raising. Nothing in your draft has been changed."
            : `${result.added} thing${result.added === 1 ? "" : "s"} worth a look. None of it is a verdict.`,
        );
      } else {
        setStoryMessage(result.message);
      }
    } catch {
      setStoryMessage("Storymatic couldn't look across the scenes just now. Your draft is unaffected.");
    } finally {
      setExtrasBusy(false);
    }
  };

  const runOutlineReview = async () => {
    setReviewingOutline(true);
    setOutlineMessage("Comparing your plan with the draft…");
    try {
      await autosave.flush();
      const result = await reviewOutlineFn({ data: { projectId } });
      if (result.ok) {
        setUnplanned(result.unplanned);
        await refreshOutline();
        setOutlineMessage(
          `${result.placed} of ${result.considered} planned step${
            result.considered === 1 ? "" : "s"
          } ${result.placed === 1 ? "looks" : "look"} written. These are Storymatic's readings until you confirm them.`,
        );
      } else {
        setOutlineMessage(result.message);
      }
    } catch {
      setOutlineMessage(
        "Storymatic couldn't compare the plan just now. Your writing is unaffected.",
      );
    } finally {
      setReviewingOutline(false);
    }
  };


  /** Fills only the card fields left blank; anything the author wrote stays as it is. */
  const runFillCards = async () => {
    setFillingCards(true);
    setStoryMessage("Reading your scenes…");
    try {
      await autosave.flush();
      const result = await describeScenesFn({ data: { projectId } });
      if (result.ok) {
        await refreshOutline();
        setStoryMessage(
          result.filled === 0
            ? "Nothing new to add — the scenes don't say more than the cards already show."
            : `Filled in ${result.filled} card${result.filled === 1 ? "" : "s"} from the scenes themselves. Edit any of them.`,
        );
      } else {
        setStoryMessage(result.message);
      }
    } catch {
      setStoryMessage("Storymatic couldn't read the scenes just now. Your writing is unaffected.");
    } finally {
      setFillingCards(false);
    }
  };

  /** After a move: consequences only. Nothing is rewritten. */
  const runMoveReview = async (sceneId: string, sceneTitle: string) => {
    setStoryMessage("Looking at what the new order changes…");
    try {
      const result = await reviewMoveFn({ data: { projectId, sceneId } });
      if (result.ok) {
        setMoveNotes({ sceneTitle, notes: result.notes });
        setStoryMessage(null);
      } else {
        setStoryMessage(result.message);
      }
    } catch {
      setStoryMessage("Storymatic couldn't look at the move just now. The move is still saved.");
    }
  };

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

  /** Reads each scene in turn, so the people gather from the whole draft. */
  const runReadEveryScene = async () => {
    const scenes = outline.data?.scenes ?? [];
    if (scenes.length === 0) return;
    setExtrasBusy(true);
    try {
      await autosave.flush();
      let noted = 0;
      let failure: string | null = null;
      for (const [index, item] of scenes.entries()) {
        setStoryMessage(`Reading ${item.title} (${index + 1} of ${scenes.length})…`);
        try {
          const result = await analyseSceneFn({ data: { projectId, sceneId: item.id } });
          if (result.ok) noted += result.claims;
          else if (result.kind !== "empty") failure = result.message;
        } catch {
          failure = "Storymatic couldn't finish reading the draft just now.";
        }
        if (failure) break;
      }
      await queryClient.invalidateQueries({ queryKey: ["story-model", projectId] });
      setStoryMessage(
        failure ??
          (noted === 0
            ? "There isn't enough written yet for Storymatic to gather anyone."
            : `${noted} thing${noted === 1 ? "" : "s"} gathered from your scenes. Each stays Storymatic's reading until you agree.`),
      );
    } finally {
      setExtrasBusy(false);
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

  // A quiet observer: once the writing has settled, Storymatic looks across the
  // scenes on its own. Nothing interrupts; anything it finds waits in Discoveries.
  const lastObserverRun = useRef(0);
  useEffect(() => {
    if (!autosave.lastSavedAt) return;
    const timer = setTimeout(
      () => {
        if (Date.now() - lastObserverRun.current < 10 * 60_000) return;
        lastObserverRun.current = Date.now();
        void findDiscoveriesFn({ data: { projectId } })
          .then(() => {
            void queryClient.invalidateQueries({ queryKey: ["workspace", projectId] });
            void queryClient.invalidateQueries({ queryKey: ["story-extras", projectId] });
          })
          .catch(() => {
            /* silent: an observer that can't look now simply says nothing */
          });
      },
      2 * 60_000,
    );
    return () => clearTimeout(timer);
  }, [autosave.lastSavedAt, findDiscoveriesFn, projectId, queryClient]);



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
  const sceneTitles = Object.fromEntries(data.scenes.map((row) => [row.id, row.title]));
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
          onOpenPanel={(view) => {
            if (view === "possibilities") {
              setPanelView(null);
              setStoryMessage(null);
              setStoryTab("possibilities");
              setStoryOpen(true);
              return;
            }
            setPanelView(view);
          }}

          onCollapse={() => setSidebarOpen(false)}
        />
      )}

      <main className="relative flex min-w-0 flex-1 flex-col">
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
              setOutlineOpen(true);
            }}
          >
            Outline
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFocusMode(false);
              setPanelView(null);
              setStoryOpen(true);
            }}
          >
            Story
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

        {outlineOpen && (
          <OutlineView
            beats={outline.data?.beats ?? []}
            scenes={outline.data?.scenes ?? []}
            chapters={outline.data?.chapters ?? []}
            loading={outline.isLoading}
            reviewing={reviewingOutline}
            message={outlineMessage}
            unplanned={unplanned}
            onClose={() => setOutlineOpen(false)}
            onReview={() => void runOutlineReview()}
            onOpenScene={(sceneId) => {
              setOutlineOpen(false);
              void goToScene(sceneId);
            }}
            onSaveBeat={(draft: BeatDraft) =>
              mutate.mutate(async () => {
                await saveBeatFn({
                  data: {
                    projectId,
                    kind: draft.kind,
                    title: draft.title,
                    intent: draft.intent,
                    ...(draft.id ? { id: draft.id } : {}),
                  },
                });
                await refreshOutline();
              })
            }
            onMoveBeat={(id, direction) =>
              mutate.mutate(async () => {
                await moveBeatFn({ data: { id, direction } });
                await refreshOutline();
              })
            }
            onDeleteBeat={(id) =>
              mutate.mutate(async () => {
                await deleteBeatFn({ data: { id } });
                await refreshOutline();
              })
            }
            onSetBeatState={(id, patch) =>
              mutate.mutate(async () => {
                await beatStateFn({ data: { id, ...patch } });
                await refreshOutline();
              })
            }
          />
        )}

        {storyOpen && (
          <StorySpace
            tab={storyTab}
            onTabChange={(next) => {
              // A note about one view shouldn't linger over another.
              setStoryMessage(null);
              setStoryTab(next);
            }}
            scenes={outline.data?.scenes ?? []}
            chapters={outline.data?.chapters ?? []}
            entities={storyModel.data?.entities ?? []}
            claims={storyModel.data?.claims ?? []}
            sceneTitles={new Map(Object.entries(sceneTitles))}
            loading={outline.isLoading}
            filling={fillingCards}
            message={storyMessage}
            moveNotes={moveNotes}
            onDismissMoveNotes={() => setMoveNotes(null)}
            onClose={() => setStoryOpen(false)}
            onFillCards={() => void runFillCards()}
            onOpenScene={(sceneId) => {
              setStoryOpen(false);
              void goToScene(sceneId);
            }}
            onMoveScene={(sceneId, direction) => {
              const title = sceneTitles[sceneId] ?? "that scene";
              mutate.mutate(async () => {
                await moveFn({ data: { kind: "scene", id: sceneId, direction } });
                await refreshOutline();
                // Moving a scene never rewrites it; it only asks what the new order changes.
                await runMoveReview(sceneId, title);
              });
            }}
            onSaveCard={(sceneId, patch: CardPatch) =>
              mutate.mutate(async () => {
                await sceneMetaFn({ data: { sceneId, ...patch } });
                await refreshOutline();
              })
            }
            onDropCard={(sceneId, targetSceneId, before) => {
              const title = sceneTitles[sceneId] ?? "that scene";
              mutate.mutate(async () => {
                await placeSceneFn({ data: { sceneId, targetSceneId, before } });
                await refreshOutline();
                // Dragging a card only changes the order; the writing is untouched.
                await runMoveReview(sceneId, title);
              });
            }}
            onOpenEvidence={(sceneId, quote) => {
              setStoryOpen(false);
              void openEvidence(sceneId, quote);
            }}
            headerAction={
              storyTab === "people" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={extrasBusy}
                  onClick={() => void runReadEveryScene()}
                >
                  {extrasBusy && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                  {extrasBusy ? "Reading…" : "Read the scenes"}
                </Button>
              ) : storyTab === "relationships" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={extrasBusy}
                  onClick={() => void runReadRelationships()}
                >
                  {extrasBusy && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                  {extrasBusy ? "Reading…" : "Read the relationships"}
                </Button>
              ) : storyTab === "world" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={extrasBusy}
                  onClick={() => void runReadWorld()}
                >
                  {extrasBusy && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                  {extrasBusy ? "Reading…" : "Read the world"}
                </Button>
              ) : storyTab === "plot" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={extrasBusy}
                  onClick={() => void runReadThreads()}
                >
                  {extrasBusy && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                  {extrasBusy ? "Reading…" : "Read the threads"}
                </Button>
              ) : storyTab === "promises" ? (

                <Button
                  variant="outline"
                  size="sm"
                  disabled={extrasBusy}
                  onClick={() => void runReadPromises()}
                >
                  {extrasBusy && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                  {extrasBusy ? "Reading…" : "Read what's set up"}
                </Button>
              ) : storyTab === "themes" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={extrasBusy}
                  onClick={() => void runReadThemes()}
                >
                  {extrasBusy && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                  {extrasBusy ? "Reading…" : "Read for themes"}
                </Button>
              ) : storyTab === "questions" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={extrasBusy}
                  onClick={() => void runCompareScenes()}
                >
                  {extrasBusy && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                  {extrasBusy ? "Comparing…" : "Compare the scenes"}
                </Button>
              ) : storyTab === "discoveries" ? (


                <Button
                  variant="outline"
                  size="sm"
                  disabled={extrasBusy}
                  onClick={() => void runFindDiscoveries()}
                >
                  {extrasBusy && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                  {extrasBusy ? "Looking…" : "Look across the scenes"}
                </Button>
              ) : storyTab === "timeline" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={extrasBusy}
                  onClick={() => void runReadChronology()}
                >
                  {extrasBusy && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                  {extrasBusy ? "Reading…" : "Read the chronology"}
                </Button>
              ) : storyTab === "possibilities" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={extrasBusy}
                  onClick={() => void runExploreScene()}
                >
                  {extrasBusy && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                  {extrasBusy ? "Thinking…" : "Explore this scene"}
                </Button>
              ) : null
            }
            extraSlot={
              storyTab === "possibilities" ? (
                <PossibilitiesView
                  possibilities={possibilities.data?.possibilities ?? []}
                  scenes={(outline.data?.scenes ?? []).map((scene) => ({
                    id: scene.id,
                    title: scene.title,
                  }))}
                  sceneTitles={new Map(Object.entries(sceneTitles))}
                  loading={possibilities.isLoading}
                  onSave={(draft) => mutate.mutate(async () => onSavePossibility(draft))}
                  onStatus={(id, status) =>
                    mutate.mutate(async () => {
                      await possibilityStatusFn({ data: { id, status } });
                      await refreshPossibilities();
                    })
                  }
                  onDelete={(id) =>
                    mutate.mutate(async () => {
                      await deletePossibilityFn({ data: { id } });
                      await refreshPossibilities();
                    })
                  }
                  onOpenScene={(sceneId) => {
                    setStoryOpen(false);
                    void goToScene(sceneId);
                  }}
                />
              ) : storyTab === "overview" ? (

                <OverviewView
                  overview={overview.data}
                  loading={overview.isLoading}
                  onOpenScene={(sceneId) => {
                    setStoryOpen(false);
                    void goToScene(sceneId);
                  }}
                  onGoToTab={(tab) => {
                    setStoryMessage(null);
                    setStoryTab(tab);
                  }}
                  onOpenOutline={() => {
                    setStoryOpen(false);
                    setOutlineOpen(true);
                  }}
                />
              ) : storyTab === "timeline" ? (

                <ChronologyView
                  events={chronology.data?.events ?? []}
                  scenes={outline.data?.scenes ?? []}
                  sceneTitles={new Map(Object.entries(sceneTitles))}
                  loading={chronology.isLoading}
                  onSave={(draft) => mutate.mutate(async () => onSaveEvent(draft))}
                  onMove={(id, direction) =>
                    mutate.mutate(async () => {
                      await moveEventFn({ data: { projectId, id, direction } });
                      await refreshChronology();
                    })
                  }
                  onJudge={(id, confirmed) =>
                    mutate.mutate(async () => {
                      await judgeEventFn({ data: { id, confirmed } });
                      await refreshChronology();
                    })
                  }
                  onDelete={(id) =>
                    mutate.mutate(async () => {
                      await deleteEventFn({ data: { id } });
                      await refreshChronology();
                    })
                  }
                  onOpenScene={(sceneId) => {
                    setStoryOpen(false);
                    void goToScene(sceneId);
                  }}
                  onOpenEvidence={(sceneId, quote) => {
                    setStoryOpen(false);
                    void openEvidence(sceneId, quote);
                  }}
                />
              ) : storyTab === "people" ? (

                <PeopleView
                  entities={storyModel.data?.entities ?? []}
                  claims={storyModel.data?.claims ?? []}
                  scenes={outline.data?.scenes ?? []}
                  loading={storyModel.isLoading}
                  onOpenScene={(sceneId) => {
                    setStoryOpen(false);
                    void goToScene(sceneId);
                  }}
                  onOpenEvidence={(sceneId, quote) => {
                    setStoryOpen(false);
                    void openEvidence(sceneId, quote);
                  }}
                  onClaimAction={(id, action) =>
                    mutate.mutate(async () => {
                      await claimJudgementFn({ data: { id, action } });
                      await queryClient.invalidateQueries({ queryKey: ["story-model", projectId] });
                    })
                  }
                  onSaveEntity={(id, fields) =>
                    mutate.mutate(async () => {
                      await saveEntityFn({ data: { id, ...fields } });
                      await queryClient.invalidateQueries({ queryKey: ["story-model", projectId] });
                    })
                  }
                />
              ) : storyTab === "world" ? (
                <WorldView
                  entities={(storyModel.data?.entities ?? []).filter((entity) =>
                    ["location", "object", "faction"].includes(entity.kind),
                  )}
                  claims={storyModel.data?.claims ?? []}
                  sceneTitles={new Map(Object.entries(sceneTitles))}
                  loading={storyModel.isLoading}
                  onSaveEntity={(id, fields) =>
                    mutate.mutate(async () => {
                      await saveEntityFn({ data: { id, ...fields } });
                      await queryClient.invalidateQueries({ queryKey: ["story-model", projectId] });
                    })
                  }
                  onClaimAction={(id, action) =>
                    mutate.mutate(async () => {
                      await claimJudgementFn({ data: { id, action } });
                      await queryClient.invalidateQueries({ queryKey: ["story-model", projectId] });
                    })
                  }
                  onOpenEvidence={(sceneId, quote) => {
                    setStoryOpen(false);
                    void openEvidence(sceneId, quote);
                  }}
                />
              ) : storyTab === "research" ? (
                <ResearchView
                  notes={research.data?.notes ?? []}
                  loading={research.isLoading}
                  onSave={(draft: ResearchDraft) =>
                    mutate.mutate(async () => {
                      await saveResearchFn({ data: { projectId, ...draft } });
                      await refreshResearch();
                    })
                  }
                  onDelete={(id) =>
                    mutate.mutate(async () => {
                      await deleteResearchFn({ data: { id } });
                      await refreshResearch();
                    })
                  }
                />
              ) : storyTab === "themes" ? (
                <ThemesView
                  themes={themes.data?.themes ?? []}
                  scenes={(outline.data?.scenes ?? []).map((scene) => ({
                    id: scene.id,
                    title: scene.title,
                  }))}
                  sceneTitles={new Map(Object.entries(sceneTitles))}
                  onSave={(draft: ThemeDraft) =>
                    mutate.mutate(async () => {
                      await saveThemeFn({ data: { projectId, ...draft } });
                      await refreshThemes();
                    })
                  }
                  onDelete={(id) =>
                    mutate.mutate(async () => {
                      await deleteThemeFn({ data: { id } });
                      await refreshThemes();
                    })
                  }
                  onStatus={(id, status) =>
                    mutate.mutate(async () => {
                      await observationStatusFn({ data: { id, status } });
                      await refreshThemes();
                    })
                  }
                  onOpenScene={(sceneId) => {
                    setStoryOpen(false);
                    void goToScene(sceneId);
                  }}
                  onOpenEvidence={(sceneId, quote) => {
                    setStoryOpen(false);
                    void openEvidence(sceneId, quote);
                  }}
                />
              ) : storyTab === "questions" ? (
                <QuestionsView
                  questions={questions.data?.questions ?? []}
                  stale={questions.data?.stale ?? []}
                  scenes={(outline.data?.scenes ?? []).map((scene) => ({
                    id: scene.id,
                    title: scene.title,
                  }))}
                  sceneTitles={new Map(Object.entries(sceneTitles))}
                  loading={questions.isLoading}
                  onSave={(draft: QuestionDraft) =>
                    mutate.mutate(async () => {
                      await saveQuestionFn({ data: { projectId, ...draft } });
                      await refreshQuestions();
                    })
                  }
                  onDelete={(id) =>
                    mutate.mutate(async () => {
                      await deleteQuestionFn({ data: { id } });
                      await refreshQuestions();
                    })
                  }
                  onStatus={(id, status) =>
                    mutate.mutate(async () => {
                      await observationStatusFn({ data: { id, status } });
                      await refreshQuestions();
                    })
                  }
                  onClaimAction={(id, action) =>
                    mutate.mutate(async () => {
                      await claimJudgementFn({ data: { id, action } });
                      await refreshQuestions();
                      await queryClient.invalidateQueries({
                        queryKey: ["story-model", projectId],
                      });
                    })
                  }
                  onOpenScene={(sceneId) => {
                    setStoryOpen(false);
                    void goToScene(sceneId);
                  }}
                  onOpenEvidence={(sceneId, quote) => {
                    setStoryOpen(false);
                    void openEvidence(sceneId, quote);
                  }}
                />
              ) : storyTab === "plot" ? (
                <ThreadsView
                  threads={threads.data?.threads ?? []}
                  beats={threads.data?.beats ?? []}
                  scenes={(outline.data?.scenes ?? []).map((scene) => ({
                    id: scene.id,
                    title: scene.title,
                  }))}
                  sceneTitles={new Map(Object.entries(sceneTitles))}
                  loading={threads.isLoading}
                  onSave={(draft: ThreadDraft) =>
                    mutate.mutate(async () => {
                      await saveThreadFn({ data: { projectId, ...draft } });
                      await refreshThreads();
                    })
                  }
                  onJudge={(id, confirmed) =>
                    mutate.mutate(async () => {
                      await judgeThreadFn({ data: { id, confirmed } });
                      await refreshThreads();
                    })
                  }
                  onJudgeBeat={(id, confirmed) =>
                    mutate.mutate(async () => {
                      await judgeThreadBeatFn({ data: { id, confirmed } });
                      await refreshThreads();
                    })
                  }
                  onStatus={(id, status) =>
                    mutate.mutate(async () => {
                      await threadStatusFn({ data: { id, status } });
                      await refreshThreads();
                    })
                  }
                  onDelete={(id) =>
                    mutate.mutate(async () => {
                      await deleteThreadFn({ data: { id } });
                      await refreshThreads();
                    })
                  }
                  onOpenScene={(sceneId) => {
                    setStoryOpen(false);
                    void goToScene(sceneId);
                  }}
                  onOpenEvidence={(sceneId, quote) => {
                    setStoryOpen(false);
                    void openEvidence(sceneId, quote);
                  }}
                />
              ) : storyTab === "promises" ? (


                <PromisesView
                  promises={promises.data?.promises ?? []}
                  scenes={(outline.data?.scenes ?? []).map((scene) => ({
                    id: scene.id,
                    title: scene.title,
                  }))}
                  sceneTitles={new Map(Object.entries(sceneTitles))}
                  loading={promises.isLoading}
                  onSave={(draft: PromiseDraft) =>
                    mutate.mutate(async () => {
                      await savePromiseFn({ data: { projectId, ...draft } });
                      await refreshPromises();
                    })
                  }
                  onJudge={(id, confirmed) =>
                    mutate.mutate(async () => {
                      await judgePromiseFn({ data: { id, confirmed } });
                      await refreshPromises();
                    })
                  }
                  onDelete={(id) =>
                    mutate.mutate(async () => {
                      await deletePromiseFn({ data: { id } });
                      await refreshPromises();
                    })
                  }
                  onOpenScene={(sceneId) => {
                    setStoryOpen(false);
                    void goToScene(sceneId);
                  }}
                  onOpenEvidence={(sceneId, quote) => {
                    setStoryOpen(false);
                    void openEvidence(sceneId, quote);
                  }}
                />
              ) : extras.isLoading ? (
                <p className="text-sm text-muted-foreground">Gathering your story…</p>
              ) : storyTab === "synopsis" ? (

                <SynopsisView
                  targets={synopsisTargets}
                  synopses={extras.data?.synopses ?? []}
                  busyTarget={synopsisBusy}
                  onWrite={(target) => void runWriteSynopsis(target)}
                  onSave={(target, body, locked) =>
                    mutate.mutate(async () => {
                      await saveSynopsisFn({
                        data: {
                          projectId,
                          scope: target.scope,
                          targetId: target.targetId,
                          body,
                          locked,
                        },
                      });
                      await refreshExtras();
                    })
                  }
                />
              ) : storyTab === "relationships" ? (
                <RelationshipsView
                  relationships={extras.data?.relationships ?? []}
                  beats={extras.data?.beats ?? []}
                  entities={storyModel.data?.entities ?? []}
                  sceneTitles={new Map(Object.entries(sceneTitles))}
                  onSave={(id, nature, currentState, notes) =>
                    mutate.mutate(async () => {
                      await saveRelationshipFn({
                        data: {
                          id,
                          nature: nature || null,
                          currentState: currentState || null,
                          notes: notes || null,
                        },
                      });
                      await refreshExtras();
                    })
                  }
                  onJudge={(id, confirmed) =>
                    mutate.mutate(async () => {
                      await judgeRelationshipFn({ data: { id, confirmed } });
                      await refreshExtras();
                    })
                  }
                  onJudgeBeat={(id, confirmed) =>
                    mutate.mutate(async () => {
                      await judgeBeatFn({ data: { id, confirmed } });
                      await refreshExtras();
                    })
                  }
                  onOpenEvidence={(sceneId, quote) => {
                    setStoryOpen(false);
                    void openEvidence(sceneId, quote);
                  }}
                />
              ) : (
                <DiscoveriesView
                  discoveries={extras.data?.discoveries ?? []}
                  sceneTitles={new Map(Object.entries(sceneTitles))}
                  onStatus={(id, status) =>
                    mutate.mutate(async () => {
                      await observationStatusFn({ data: { id, status } });
                      await refreshExtras();
                    })
                  }
                  onOpenScene={(sceneId) => {
                    setStoryOpen(false);
                    void goToScene(sceneId);
                  }}
                  onOpenEvidence={(sceneId, quote) => {
                    setStoryOpen(false);
                    void openEvidence(sceneId, quote);
                  }}
                />
              )
            }
          />

        )}
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
          onSelectView={(view) => {
            if (view === "possibilities") {
              setPanelView(null);
              setStoryMessage(null);
              setStoryTab("possibilities");
              setStoryOpen(true);
              return;
            }
            setPanelView(view);
          }}

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
          storySlot={
            <StoryView
              entities={storyModel.data?.entities ?? []}
              claims={storyModel.data?.claims ?? []}
              sceneTitles={sceneTitles}
              loading={storyModel.isLoading}
              analysing={analysing}
              canAnalyse={Boolean(activeSceneId)}
              sceneTitle={activeScene?.title ?? null}
              message={analysisMessage}
              onAnalyse={() => void runSceneAnalysis()}
              onOpenEvidence={(sceneId, quote) => void openEvidence(sceneId, quote)}
              onClaimAction={(id, action) =>
                mutate.mutate(async () => {
                  await claimJudgementFn({ data: { id, action } });
                  await queryClient.invalidateQueries({ queryKey: ["story-model", projectId] });
                })
              }
            />
          }
          charactersSlot={
            <CharactersView
              entities={storyModel.data?.entities ?? []}
              claims={storyModel.data?.claims ?? []}
              sceneTitles={sceneTitles}
              loading={storyModel.isLoading}
              storyPosition={activeScene?.position ?? null}
              sceneTitle={activeScene?.title ?? null}
              onOpenEvidence={(sceneId, quote) => void openEvidence(sceneId, quote)}
              onClaimAction={(id, action) =>
                mutate.mutate(async () => {
                  await claimJudgementFn({ data: { id, action } });
                  await queryClient.invalidateQueries({ queryKey: ["story-model", projectId] });
                })
              }
              onSaveEntity={(id, fields) =>
                mutate.mutate(async () => {
                  await saveEntityFn({ data: { id, ...fields } });
                  await queryClient.invalidateQueries({ queryKey: ["story-model", projectId] });
                  toast.success("Saved.");
                })
              }
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
