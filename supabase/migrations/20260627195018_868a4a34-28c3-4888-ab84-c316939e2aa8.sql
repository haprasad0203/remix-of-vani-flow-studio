DROP POLICY IF EXISTS "Any authed user can create an org" ON public.organizations;
CREATE POLICY "Authenticated users can create orgs"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);