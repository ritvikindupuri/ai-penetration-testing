-- Auto-create profile and default organization on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  user_email TEXT;
  user_name TEXT;
BEGIN
  -- Extract email and name from metadata
  user_email := NEW.email;
  user_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(user_email, '@', 1));
  
  -- Create a default organization for the user
  INSERT INTO public.organizations (name, slug)
  VALUES (
    user_name || '''s Organization',
    'org-' || SUBSTRING(NEW.id::TEXT, 1, 8)
  )
  RETURNING id INTO new_org_id;
  
  -- Create the user profile
  INSERT INTO public.profiles (id, org_id, email, full_name, role)
  VALUES (
    NEW.id,
    new_org_id,
    user_email,
    user_name,
    'owner' -- first user is owner of their org
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also add RLS policies for organizations based on membership
CREATE POLICY "org_select_member" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_update_owner" ON public.organizations
  FOR UPDATE USING (
    id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
  );
