CREATE TABLE public.outline_beats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'beat',
  title text NOT NULL,
  intent text,
  position double precision NOT NULL DEFAULT 1,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  scene_id uuid REFERENCES public.scenes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'planned',
  link_basis text NOT NULL DEFAULT 'author',
  link_note text,
  author_confirmed boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.outline_beats TO authenticated;
GRANT ALL ON public.outline_beats TO service_role;

ALTER TABLE public.outline_beats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own outline beats" ON public.outline_beats FOR ALL TO authenticated
  USING (private.owns_project(project_id)) WITH CHECK (private.owns_project(project_id));

CREATE TRIGGER outline_beats_updated_at BEFORE UPDATE ON public.outline_beats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX outline_beats_project_position_idx ON public.outline_beats (project_id, position);