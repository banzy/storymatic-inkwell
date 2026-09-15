CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.story_entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'character',
  name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  identity TEXT,
  current_state TEXT,
  notes TEXT,
  truth_type TEXT NOT NULL DEFAULT 'inferred',
  author_confirmed BOOLEAN NOT NULL DEFAULT false,
  first_scene_id UUID REFERENCES public.scenes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX story_entities_unique_name ON public.story_entities (project_id, kind, lower(name));
CREATE INDEX story_entities_project_idx ON public.story_entities (project_id);

CREATE TABLE public.story_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.story_entities(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id) ON DELETE CASCADE,
  revision_id UUID REFERENCES public.scene_revisions(id) ON DELETE SET NULL,
  claim_kind TEXT NOT NULL DEFAULT 'fact',
  subject TEXT NOT NULL,
  assertion TEXT NOT NULL,
  basis TEXT NOT NULL DEFAULT 'inferred',
  truth_type TEXT NOT NULL DEFAULT 'inferred',
  validity TEXT NOT NULL DEFAULT 'current',
  knowledge_holder TEXT,
  knowledge_state TEXT,
  story_position INTEGER,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  author_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX story_claims_project_idx ON public.story_claims (project_id);
CREATE INDEX story_claims_scene_idx ON public.story_claims (scene_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_entities TO authenticated;
GRANT ALL ON public.story_entities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_claims TO authenticated;
GRANT ALL ON public.story_claims TO service_role;

ALTER TABLE public.story_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage story entities" ON public.story_entities FOR ALL TO authenticated
  USING (private.owns_project(project_id)) WITH CHECK (private.owns_project(project_id));
CREATE POLICY "Owners manage story claims" ON public.story_claims FOR ALL TO authenticated
  USING (private.owns_project(project_id)) WITH CHECK (private.owns_project(project_id));

CREATE TRIGGER story_entities_updated_at BEFORE UPDATE ON public.story_entities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER story_claims_updated_at BEFORE UPDATE ON public.story_claims
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();