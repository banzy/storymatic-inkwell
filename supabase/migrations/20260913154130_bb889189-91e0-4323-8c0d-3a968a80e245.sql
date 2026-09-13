
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  genre TEXT,
  creative_direction TEXT,
  is_sample BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own projects" ON public.projects FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.owns_project(_project_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = _project_id AND p.owner_id = auth.uid())
$$;
GRANT EXECUTE ON FUNCTION public.owns_project(UUID) TO authenticated;

CREATE TABLE public.chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled chapter',
  position DOUBLE PRECISION NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapters TO authenticated;
GRANT ALL ON public.chapters TO service_role;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chapters" ON public.chapters FOR ALL TO authenticated
  USING (public.owns_project(project_id)) WITH CHECK (public.owns_project(project_id));
CREATE TRIGGER chapters_updated_at BEFORE UPDATE ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX chapters_project_idx ON public.chapters(project_id, position);

CREATE TABLE public.scenes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled scene',
  position DOUBLE PRECISION NOT NULL DEFAULT 1,
  summary TEXT,
  pov TEXT,
  location TEXT,
  story_time TEXT,
  content JSONB,
  plain_text TEXT NOT NULL DEFAULT '',
  word_count INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scenes TO authenticated;
GRANT ALL ON public.scenes TO service_role;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own scenes" ON public.scenes FOR ALL TO authenticated
  USING (public.owns_project(project_id)) WITH CHECK (public.owns_project(project_id));
CREATE TRIGGER scenes_updated_at BEFORE UPDATE ON public.scenes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX scenes_chapter_idx ON public.scenes(chapter_id, position);

CREATE TABLE public.scene_revisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  content JSONB,
  plain_text TEXT NOT NULL DEFAULT '',
  word_count INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'author',
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scene_revisions TO authenticated;
GRANT ALL ON public.scene_revisions TO service_role;
ALTER TABLE public.scene_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own revisions" ON public.scene_revisions FOR ALL TO authenticated
  USING (public.owns_project(project_id)) WITH CHECK (public.owns_project(project_id));
CREATE INDEX scene_revisions_scene_idx ON public.scene_revisions(scene_id, created_at DESC);

CREATE TABLE public.author_directions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'project',
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id) ON DELETE CASCADE,
  subject TEXT,
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'standing',
  status TEXT NOT NULL DEFAULT 'active',
  is_inferred BOOLEAN NOT NULL DEFAULT false,
  confirmed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.author_directions TO authenticated;
GRANT ALL ON public.author_directions TO service_role;
ALTER TABLE public.author_directions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own directions" ON public.author_directions FOR ALL TO authenticated
  USING (public.owns_project(project_id)) WITH CHECK (public.owns_project(project_id));
CREATE TRIGGER author_directions_updated_at BEFORE UPDATE ON public.author_directions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.observations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  why_it_matters TEXT,
  uncertainty TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  origin TEXT NOT NULL DEFAULT 'analysis',
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.observations TO authenticated;
GRANT ALL ON public.observations TO service_role;
ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own observations" ON public.observations FOR ALL TO authenticated
  USING (public.owns_project(project_id)) WITH CHECK (public.owns_project(project_id));
CREATE TRIGGER observations_updated_at BEFORE UPDATE ON public.observations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
