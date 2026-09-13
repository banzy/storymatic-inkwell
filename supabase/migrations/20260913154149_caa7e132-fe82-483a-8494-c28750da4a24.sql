
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.owns_project(_project_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = _project_id AND p.owner_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION private.owns_project(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.owns_project(UUID) TO authenticated, service_role;

DROP POLICY "own chapters" ON public.chapters;
CREATE POLICY "own chapters" ON public.chapters FOR ALL TO authenticated
  USING (private.owns_project(project_id)) WITH CHECK (private.owns_project(project_id));
DROP POLICY "own scenes" ON public.scenes;
CREATE POLICY "own scenes" ON public.scenes FOR ALL TO authenticated
  USING (private.owns_project(project_id)) WITH CHECK (private.owns_project(project_id));
DROP POLICY "own revisions" ON public.scene_revisions;
CREATE POLICY "own revisions" ON public.scene_revisions FOR ALL TO authenticated
  USING (private.owns_project(project_id)) WITH CHECK (private.owns_project(project_id));
DROP POLICY "own directions" ON public.author_directions;
CREATE POLICY "own directions" ON public.author_directions FOR ALL TO authenticated
  USING (private.owns_project(project_id)) WITH CHECK (private.owns_project(project_id));
DROP POLICY "own observations" ON public.observations;
CREATE POLICY "own observations" ON public.observations FOR ALL TO authenticated
  USING (private.owns_project(project_id)) WITH CHECK (private.owns_project(project_id));

DROP FUNCTION public.owns_project(UUID);
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon;
