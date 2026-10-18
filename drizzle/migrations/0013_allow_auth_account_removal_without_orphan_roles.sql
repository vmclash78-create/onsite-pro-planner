CREATE OR REPLACE FUNCTION public.guard_last_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(724301);
  IF TG_OP = 'INSERT' THEN RETURN NEW; END IF;
  -- Auth Admin deletion removes the auth row before cascading its role rows.
  -- Keep direct role removals protected while allowing an authorized account reset.
  IF TG_OP = 'DELETE' AND auth.uid() IS NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = OLD.user_id) THEN
    RETURN OLD;
  END IF;
  IF OLD.role = 'admin' AND (TG_OP = 'DELETE' OR NEW.role IS DISTINCT FROM OLD.role OR NEW.user_id IS DISTINCT FROM OLD.user_id)
     AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin' AND id <> OLD.id) THEN
    RAISE EXCEPTION 'Não é possível remover o último administrador';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END
$$;