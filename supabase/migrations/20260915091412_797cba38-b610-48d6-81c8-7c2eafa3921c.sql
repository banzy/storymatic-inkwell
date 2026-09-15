CREATE TABLE public.story_synopses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'story',
  target_id uuid,
  body text NOT NULL DEFAULT '',
  locked boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'inferred',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX story_synopses_unique_target
  ON public.story_synopses (project_id, scope, target_id) NULLS NOT DISTINCT;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_synopses TO authenticated;
GRANT ALL ON public.story_synopses TO service_role;
ALTER TABLE public.story_synopses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own synopses" ON public.story_synopses FOR ALL TO authenticated
  USING (private.owns_project(project_id)) WITH CHECK (private.owns_project(project_id));
CREATE TRIGGER story_synopses_updated_at BEFORE UPDATE ON public.story_synopses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.story_relationships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  from_entity_id uuid NOT NULL REFERENCES public.story_entities(id) ON DELETE CASCADE,
  to_entity_id uuid NOT NULL REFERENCES public.story_entities(id) ON DELETE CASCADE,
  nature text,
  current_state text,
  notes text,
  truth_type text NOT NULL DEFAULT 'inferred',
  author_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX story_relationships_unique_pair
  ON public.story_relationships (project_id, from_entity_id, to_entity_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_relationships TO authenticated;
GRANT ALL ON public.story_relationships TO service_role;
ALTER TABLE public.story_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own relationships" ON public.story_relationships FOR ALL TO authenticated
  USING (private.owns_project(project_id)) WITH CHECK (private.owns_project(project_id));
CREATE TRIGGER story_relationships_updated_at BEFORE UPDATE ON public.story_relationships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.relationship_beats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  relationship_id uuid NOT NULL REFERENCES public.story_relationships(id) ON DELETE CASCADE,
  scene_id uuid REFERENCES public.scenes(id) ON DELETE SET NULL,
  story_position integer,
  change text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  truth_type text NOT NULL DEFAULT 'inferred',
  author_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX relationship_beats_by_relationship
  ON public.relationship_beats (relationship_id, story_position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relationship_beats TO authenticated;
GRANT ALL ON public.relationship_beats TO service_role;
ALTER TABLE public.relationship_beats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own relationship beats" ON public.relationship_beats FOR ALL TO authenticated
  USING (private.owns_project(project_id)) WITH CHECK (private.owns_project(project_id));
CREATE TRIGGER relationship_beats_updated_at BEFORE UPDATE ON public.relationship_beats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();