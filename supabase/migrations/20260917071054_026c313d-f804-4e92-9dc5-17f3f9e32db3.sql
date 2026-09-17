CREATE TABLE public.story_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id uuid REFERENCES public.scenes(id) ON DELETE SET NULL,
  summary text NOT NULL,
  when_text text,
  order_hint double precision NOT NULL DEFAULT 1,
  certainty text NOT NULL DEFAULT 'clear',
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  truth_type text NOT NULL DEFAULT 'inferred',
  origin text NOT NULL DEFAULT 'analysis',
  author_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_events TO authenticated;
GRANT ALL ON public.story_events TO service_role;

ALTER TABLE public.story_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own story events" ON public.story_events
  FOR ALL TO authenticated
  USING (private.owns_project(project_id))
  WITH CHECK (private.owns_project(project_id));

CREATE INDEX story_events_project_order_idx ON public.story_events (project_id, order_hint);

CREATE TRIGGER story_events_updated_at
  BEFORE UPDATE ON public.story_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();