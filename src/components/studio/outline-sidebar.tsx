import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronRight,
  Compass,
  Download,
  Eye,
  FilePlus2,
  FolderPlus,
  Lightbulb,
  MoveDown,
  MoveUp,
  PanelLeftClose,
  Pencil,
  RotateCcw,
  Settings2,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PanelView } from "./context-panel";

export type ChapterRow = { id: string; title: string; position: number };
export type SceneRow = {
  id: string;
  chapter_id: string;
  title: string;
  position: number;
  word_count: number;
  deleted_at: string | null;
};

export type OutlineActions = {
  selectScene: (sceneId: string) => void;
  addChapter: () => void;
  addScene: (chapterId: string) => void;
  rename: (kind: "chapter" | "scene", id: string, title: string) => void;
  move: (kind: "chapter" | "scene", id: string, direction: "up" | "down") => void;
  setSceneDeleted: (sceneId: string, deleted: boolean) => void;
  setChapterDeleted: (chapterId: string, deleted: boolean) => void;
  exportProject: () => void;
};

export function OutlineSidebar(props: {
  projects: { id: string; title: string }[];
  projectId: string;
  projectTitle: string;
  isSample: boolean;
  chapters: ChapterRow[];
  scenes: SceneRow[];
  activeSceneId: string | null;
  observationCount: number;
  actions: OutlineActions;
  onOpenPanel: (view: PanelView) => void;
  onCollapse: () => void;
}) {
  const {
    projects,
    projectId,
    projectTitle,
    isSample,
    chapters,
    scenes,
    activeSceneId,
    observationCount,
    actions,
    onOpenPanel,
    onCollapse,
  } = props;

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<{ kind: "chapter" | "scene"; id: string } | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);

  const startRename = (kind: "chapter" | "scene", id: string, title: string) => {
    setEditing({ kind, id });
    setDraftTitle(title);
  };

  const commitRename = () => {
    if (editing && draftTitle.trim()) actions.rename(editing.kind, editing.id, draftTitle.trim());
    setEditing(null);
  };

  return (
    <div className="flex h-full w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between gap-1 px-3 py-3">
        <Link to="/studio" className="truncate font-serif text-sm tracking-tight">
          Storymatic
        </Link>
        <Button variant="ghost" size="icon" aria-label="Hide the sidebar" onClick={onCollapse}>
          <PanelLeftClose className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="px-3 pb-3">
        <label className="sr-only" htmlFor="project-switcher">
          Switch project
        </label>
        <select
          id="project-switcher"
          className="w-full rounded-md border border-sidebar-border bg-card px-2 py-1.5 text-sm"
          value={projectId}
          onChange={(event) => {
            window.location.href = `/p/${event.target.value}`;
          }}
        >
          {projects.length === 0 && <option value={projectId}>{projectTitle}</option>}
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>
        {isSample && (
          <p className="mt-2 rounded-sm bg-accent px-2 py-1 text-xs text-accent-foreground">
            Sample project
          </p>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2" aria-label="Manuscript outline">
        <div className="flex items-center justify-between px-1 pb-1">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Manuscript
          </h2>
          <div className="flex">
            <Button variant="ghost" size="icon" aria-label="Add chapter" onClick={actions.addChapter}>
              <FolderPlus className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <ul className="space-y-1">
          {chapters.map((chapter) => {
            const chapterScenes = scenes
              .filter((scene) => scene.chapter_id === chapter.id && (showDeleted || !scene.deleted_at))
              .sort((a, b) => a.position - b.position);
            const isCollapsed = collapsed[chapter.id] ?? false;
            return (
              <li key={chapter.id}>
                <div className="group flex items-center gap-0.5 rounded-md px-1 py-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={isCollapsed ? `Expand ${chapter.title}` : `Collapse ${chapter.title}`}
                    aria-expanded={!isCollapsed}
                    onClick={() =>
                      setCollapsed((prev) => ({ ...prev, [chapter.id]: !isCollapsed }))
                    }
                  >
                    {isCollapsed ? (
                      <ChevronRight className="size-4" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="size-4" aria-hidden="true" />
                    )}
                  </Button>
                  {editing?.kind === "chapter" && editing.id === chapter.id ? (
                    <Input
                      autoFocus
                      className="h-7 text-sm"
                      value={draftTitle}
                      aria-label="Chapter title"
                      onChange={(event) => setDraftTitle(event.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") commitRename();
                        if (event.key === "Escape") setEditing(null);
                      }}
                    />
                  ) : (
                    <span className="flex-1 truncate text-sm font-medium">{chapter.title}</span>
                  )}
                  <span className="flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Rename ${chapter.title}`}
                      onClick={() => startRename("chapter", chapter.id, chapter.title)}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${chapter.title} up`}
                      onClick={() => actions.move("chapter", chapter.id, "up")}
                    >
                      <MoveUp className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${chapter.title} down`}
                      onClick={() => actions.move("chapter", chapter.id, "down")}
                    >
                      <MoveDown className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Add scene to ${chapter.title}`}
                      onClick={() => actions.addScene(chapter.id)}
                    >
                      <FilePlus2 className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${chapter.title} to trash`}
                      onClick={() => actions.setChapterDeleted(chapter.id, true)}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  </span>
                </div>

                {!isCollapsed && (
                  <ul className="mt-0.5 space-y-0.5 pl-5">
                    {chapterScenes.length === 0 && (
                      <li className="px-2 py-1 text-xs text-muted-foreground">No scenes yet</li>
                    )}
                    {chapterScenes.map((scene) => {
                      const active = scene.id === activeSceneId;
                      return (
                        <li key={scene.id} className="group flex items-center gap-0.5">
                          {editing?.kind === "scene" && editing.id === scene.id ? (
                            <Input
                              autoFocus
                              className="h-7 text-sm"
                              value={draftTitle}
                              aria-label="Scene title"
                              onChange={(event) => setDraftTitle(event.target.value)}
                              onBlur={commitRename}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") commitRename();
                                if (event.key === "Escape") setEditing(null);
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              aria-current={active ? "true" : undefined}
                              onClick={() => actions.selectScene(scene.id)}
                              className={`flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                                active
                                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                                  : "hover:bg-secondary"
                              } ${scene.deleted_at ? "line-through opacity-60" : ""}`}
                            >
                              {scene.title}
                            </button>
                          )}
                          <span className="flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Rename ${scene.title}`}
                              onClick={() => startRename("scene", scene.id, scene.title)}
                            >
                              <Pencil className="size-3.5" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Move ${scene.title} up`}
                              onClick={() => actions.move("scene", scene.id, "up")}
                            >
                              <MoveUp className="size-3.5" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Move ${scene.title} down`}
                              onClick={() => actions.move("scene", scene.id, "down")}
                            >
                              <MoveDown className="size-3.5" aria-hidden="true" />
                            </Button>
                            {scene.deleted_at ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Restore ${scene.title}`}
                                onClick={() => actions.setSceneDeleted(scene.id, false)}
                              >
                                <RotateCcw className="size-3.5" aria-hidden="true" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Move ${scene.title} to trash`}
                                onClick={() => actions.setSceneDeleted(scene.id, true)}
                              >
                                <Trash2 className="size-3.5" aria-hidden="true" />
                              </Button>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className="mt-2 flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShowDeleted((value) => !value)}
        >
          <Eye className="size-3.5" aria-hidden="true" />
          {showDeleted ? "Hide deleted scenes" : "Show deleted scenes"}
        </button>

        <h2 className="mt-5 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Story
        </h2>
        <ul className="mt-1 space-y-0.5">
          {(
            [
              { view: "story" as PanelView, label: "Story", icon: Compass },
              { view: "characters" as PanelView, label: "Characters", icon: Users },
              { view: "director" as PanelView, label: "Director", icon: Pencil },
              { view: "possibilities" as PanelView, label: "Possibilities", icon: Compass },
              {
                view: "observations" as PanelView,
                label: "Observations",
                icon: Lightbulb,
                count: observationCount,
              },
            ] as { view: PanelView; label: string; icon: typeof Compass; count?: number }[]
          ).map((item) => (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => onOpenPanel(item.view)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary"
              >
                <item.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                {item.count ? (
                  <span className="rounded-sm bg-secondary px-1.5 text-xs">{item.count}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <button
          type="button"
          onClick={() => onOpenPanel("settings")}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary"
        >
          <Settings2 className="size-4 text-muted-foreground" aria-hidden="true" />
          Project settings
        </button>
        <button
          type="button"
          onClick={actions.exportProject}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary"
        >
          <Download className="size-4 text-muted-foreground" aria-hidden="true" />
          Export Markdown
        </button>
      </div>
    </div>
  );
}
