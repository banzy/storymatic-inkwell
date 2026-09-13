import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { BookOpen, FilePlus2, Import, Loader2, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createProject,
  deleteProject,
  importManuscript,
  listProjects,
  openSampleProject,
} from "@/lib/manuscript.functions";

export const Route = createFileRoute("/_authenticated/studio")({
  validateSearch: (search: Record<string, unknown>): { sample?: boolean } =>
    search["sample"] === true || search["sample"] === "true" ? { sample: true } : {},
  head: () => ({
    meta: [
      { title: "Your projects — Storymatic" },
      { name: "description", content: "Open a manuscript, start a new project, or import a draft." },
      { property: "og:title", content: "Your projects — Storymatic" },
      {
        property: "og:description",
        content: "Open a manuscript, start a new project, or import a draft.",
      },
    ],
  }),
  component: StudioHome,
});

function StudioHome() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { sample } = Route.useSearch();

  const fetchProjects = useServerFn(listProjects);
  const create = useServerFn(createProject);
  const openSample = useServerFn(openSampleProject);
  const remove = useServerFn(deleteProject);
  const importFn = useServerFn(importManuscript);

  const projects = useQuery({ queryKey: ["projects"], queryFn: () => fetchProjects() });

  const [title, setTitle] = useState("");
  const [importText, setImportText] = useState("");
  const [importTitle, setImportTitle] = useState("");
  const autoSample = useRef(false);

  const sampleMutation = useMutation({
    mutationFn: () => openSample(),
    onSuccess: ({ projectId }) => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void navigate({ to: "/p/$projectId", params: { projectId } });
    },
    onError: () => toast.error("Couldn't open the sample manuscript."),
  });

  useEffect(() => {
    if (sample && !autoSample.current) {
      autoSample.current = true;
      sampleMutation.mutate();
    }
  }, [sample, sampleMutation]);

  const createMutation = useMutation({
    mutationFn: (projectTitle: string) => create({ data: { title: projectTitle } }),
    onSuccess: ({ projectId }) => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void navigate({ to: "/p/$projectId", params: { projectId } });
    },
    onError: () => toast.error("Couldn't create the project."),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const created = await create({ data: { title: importTitle.trim() || "Imported manuscript" } });
      await importFn({
        data: { projectId: created.projectId, chapterTitle: "Imported", text: importText },
      });
      return created;
    },
    onSuccess: ({ projectId }) => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void navigate({ to: "/p/$projectId", params: { projectId } });
    },
    onError: () => toast.error("Couldn't import that file."),
  });

  const removeMutation = useMutation({
    mutationFn: (projectId: string) => remove({ data: { projectId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  const readFile = async (file: File) => {
    const text = await file.text();
    setImportText(text);
    if (!importTitle) setImportTitle(file.name.replace(/\.(md|markdown|txt)$/i, ""));
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <Link to="/" className="font-serif text-lg tracking-tight">
          Storymatic
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await supabase.auth.signOut();
            queryClient.clear();
            void navigate({ to: "/auth" });
          }}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </Button>
      </div>

      <h1 className="mt-10 font-serif text-3xl tracking-tight">Your projects</h1>

      <section className="mt-6 space-y-2" aria-label="Projects">
        {projects.isLoading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading your projects…
          </p>
        )}
        {projects.isError && (
          <div className="rounded-md border border-destructive/30 bg-card p-4 text-sm">
            <p>We couldn't load your projects.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => projects.refetch()}>
              Try again
            </Button>
          </div>
        )}
        {projects.data?.length === 0 && (
          <p className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
            Nothing here yet. Start an empty project, open the sample manuscript, or import a draft.
          </p>
        )}
        {projects.data?.map((project) => (
          <div
            key={project.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3"
          >
            <Link
              to="/p/$projectId"
              params={{ projectId: project.id }}
              className="min-w-0 flex-1 rounded-sm"
            >
              <span className="font-serif text-base">{project.title}</span>
              {project.is_sample && (
                <span className="ml-2 rounded-sm bg-accent px-1.5 py-0.5 text-xs text-accent-foreground">
                  Sample project
                </span>
              )}
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {project.genre ?? "No genre set"} · edited{" "}
                {new Date(project.updated_at).toLocaleDateString()}
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Move ${project.title} to trash`}
              onClick={() => removeMutation.mutate(project.id)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
      </section>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <FilePlus2 className="size-4 text-primary" aria-hidden="true" /> Start an empty project
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A title is all you need. Genre and creative direction can come later.
          </p>
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (title.trim()) createMutation.mutate(title.trim());
            }}
          >
            <Label htmlFor="new-title" className="sr-only">
              Project title
            </Label>
            <Input
              id="new-title"
              placeholder="Working title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Button type="submit" disabled={createMutation.isPending || !title.trim()}>
              Create project
            </Button>
          </form>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="size-4 text-primary" aria-hidden="true" /> The City of Ashes
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A clearly labelled sample manuscript: three scenes, one planned author direction, and a
            few curated sample insights.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => sampleMutation.mutate()}
            disabled={sampleMutation.isPending}
          >
            Open sample project
          </Button>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 sm:col-span-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Import className="size-4 text-primary" aria-hidden="true" /> Import plain text or
            Markdown
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Headings become scenes. Everything else becomes prose you can keep editing.
          </p>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="import-title">Project title</Label>
              <Input
                id="import-title"
                value={importTitle}
                onChange={(e) => setImportTitle(e.target.value)}
                placeholder="Imported manuscript"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="import-file">Choose a .txt or .md file</Label>
              <Input
                id="import-file"
                type="file"
                accept=".txt,.md,.markdown,text/plain,text/markdown"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void readFile(file);
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="import-text">…or paste it here</Label>
              <Textarea
                id="import-text"
                rows={5}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={"# Scene one\n\nThe lamp had been trimmed too low…"}
              />
            </div>
            <Button
              variant="outline"
              className="justify-self-start"
              disabled={!importText.trim() || importMutation.isPending}
              onClick={() => importMutation.mutate()}
            >
              Import into a new project
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
