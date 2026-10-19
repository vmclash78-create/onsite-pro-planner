DROP POLICY IF EXISTS "own profile update" ON public.profiles;
CREATE POLICY "own or dono profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'dono'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'dono'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM pg_advisory_xact_lock(724301);
  INSERT INTO public.profiles(id,nome,email,telefone) VALUES(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',split_part(new.email,'@',1)),120),new.email,left(nullif(new.raw_user_meta_data->>'telefone',''),20));
  IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE role='admin') THEN
    INSERT INTO public.user_roles(user_id,role) VALUES(new.id,'admin'),(new.id,'dono');
  END IF;
  RETURN new;
END $function$;