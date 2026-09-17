CREATE TABLE public.research_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled note',
  body text NOT NULL DEFAULT '',
  link text,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  kind text NOT NULL DEFAULT 'note',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_notes TO authenticated;
GRANT ALL ON public.research_notes TO service_role;

ALTER TABLE public.research_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own research notes" ON public.research_notes FOR ALL TO authenticated
  USING (private.owns_project(project_id)) WITH CHECK (private.owns_project(project_id));

CREATE INDEX research_notes_project_idx ON public.research_notes (project_id, created_at);

CREATE TRIGGER research_notes_updated_at BEFORE UPDATE ON public.research_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();