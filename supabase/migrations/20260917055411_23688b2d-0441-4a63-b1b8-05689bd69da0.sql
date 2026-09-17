CREATE TABLE public.story_promises (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES public.story_entities(id) ON DELETE SET NULL,
  title text NOT NULL,
  promise text NOT NULL DEFAULT '',
  subject text,
  setup_scene_id uuid REFERENCES public.scenes(id) ON DELETE SET NULL,
  setup_quote text,
  payoff_scene_id uuid REFERENCES public.scenes(id) ON DELETE SET NULL,
  payoff_quote text,
  status text NOT NULL DEFAULT 'open',
  truth_type text NOT NULL DEFAULT 'inferred',
  origin text NOT NULL DEFAULT 'author',
  author_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_promises TO authenticated;
GRANT ALL ON public.story_promises TO service_role;

ALTER TABLE public.story_promises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own promises" ON public.story_promises FOR ALL TO authenticated
  USING (private.owns_project(project_id))
  WITH CHECK (private.owns_project(project_id));

CREATE INDEX story_promises_project_idx ON public.story_promises (project_id, created_at);

CREATE TRIGGER story_promises_set_updated_at BEFORE UPDATE ON public.story_promises
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();