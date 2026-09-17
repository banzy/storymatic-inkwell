ALTER TABLE public.observations
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'discovery';

ALTER TABLE public.observations
  DROP CONSTRAINT IF EXISTS observations_kind_check;

ALTER TABLE public.observations
  ADD CONSTRAINT observations_kind_check CHECK (kind IN ('discovery', 'theme'));

CREATE INDEX IF NOT EXISTS observations_project_kind_idx
  ON public.observations (project_id, kind);