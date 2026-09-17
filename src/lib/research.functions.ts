import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export type ResearchNote = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  tags: string[];
  kind: string;
  created_at: string;
  updated_at: string;
};

const SELECT = "id, title, body, link, tags, kind, created_at, updated_at";

/**
 * Research and notes sit deliberately outside the story model: nothing here is
 * ever read as something the book establishes.
 */
export const getResearch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("research_notes")
      .select(SELECT)
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { notes: (rows ?? []) as ResearchNote[] };
  });

export const saveResearchNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: uuid,
        id: uuid.nullable(),
        title: z.string().min(1).max(200),
        body: z.string().max(20000),
        link: z.string().max(500).nullable(),
        tags: z.array(z.string().max(60)).max(12),
        kind: z.enum(["note", "source"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch = {
      title: data.title.trim(),
      body: data.body.trim(),
      link: data.link?.trim() || null,
      tags: data.tags.map((tag) => tag.trim()).filter(Boolean),
      kind: data.kind,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("research_notes")
        .update(patch)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }
    const { data: inserted, error } = await context.supabase
      .from("research_notes")
      .insert({ ...patch, project_id: data.projectId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: inserted.id };
  });

export const deleteResearchNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("research_notes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
