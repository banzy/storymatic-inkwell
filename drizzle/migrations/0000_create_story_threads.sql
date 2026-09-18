CREATE TABLE public.story_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'thread' CHECK (kind IN ('thread','subplot','mystery','reveal','question','conflict','goal')),
  name text NOT NULL,
  premise text NOT NULL DEFAULT '',
  notes text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('planned','open','resolved','dropped')),
  origin text NOT NULL DEFAULT 'analysis' CHECK (origin IN ('author','analysis')),
  truth_type text NOT NULL DEFAULT 'inferred',
  author_confirmed boolean NOT NULL DEFAULT false,
  position double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.story_thread_beats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES public.story_threads(id) ON DELETE CASCADE,
  scene_id uuid REFERENCES public.scenes(id) ON DELETE SET NULL,
  story_position integer,
  role text NOT NULL DEFAULT 'development' CHECK (role IN ('setup','development','complication','reveal','resolution')),
  note text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  truth_type text NOT NULL DEFAULT 'inferred',
  author_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_threads TO authenticated;
GRANT ALL ON public.story_threads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_thread_beats TO authenticated;
GRANT ALL ON public.story_thread_beats TO service_role;

ALTER TABLE public.story_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_thread_beats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own story threads" ON public.story_threads
  FOR ALL USING (private.owns_project(project_id)) WITH CHECK (private.owns_project(project_id));
CREATE POLICY "own story thread beats" ON public.story_thread_beats
  FOR ALL USING (private.owns_project(project_id)) WITH CHECK (private.owns_project(project_id));

CREATE INDEX story_threads_project_idx ON public.story_threads (project_id, position);
CREATE INDEX story_thread_beats_thread_idx ON public.story_thread_beats (thread_id, story_position);

CREATE TRIGGER story_threads_updated_at BEFORE UPDATE ON public.story_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER story_thread_beats_updated_at BEFORE UPDATE ON public.story_thread_beats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();