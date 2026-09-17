CREATE TABLE public.story_possibilities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id uuid REFERENCES public.scenes(id) ON DELETE SET NULL,
  name text NOT NULL,
  premise text NOT NULL DEFAULT '',
  notes text,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  consequences jsonb NOT NULL DEFAULT '[]'::jsonb,
  origin text NOT NULL DEFAULT 'analysis',
  status text NOT NULL DEFAULT 'exploring',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_possibilities TO authenticated;
GRANT ALL ON public.story_possibilities TO service_role;

ALTER TABLE public.story_possibilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own possibilities" ON public.story_possibilities
  FOR ALL TO authenticated
  USING (private.owns_project(project_id))
  WITH CHECK (private.owns_project(project_id));

CREATE INDEX story_possibilities_project_idx ON public.story_possibilities (project_id, created_at DESC);

CREATE TRIGGER story_possibilities_updated_at BEFORE UPDATE ON public.story_possibilities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();