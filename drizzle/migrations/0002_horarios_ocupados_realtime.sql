CREATE OR REPLACE FUNCTION public.horarios_ocupados(_inicio date, _fim date)
RETURNS TABLE(data date, hora text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT DISTINCT a.data, a.hora FROM public.appointments a
  WHERE a.data BETWEEN _inicio AND LEAST(_fim, _inicio + 60)
    AND a.hora IS NOT NULL AND a.status <> 'Cancelada'
$$;
REVOKE ALL ON FUNCTION public.horarios_ocupados(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.horarios_ocupados(date, date) TO anon, authenticated, service_role;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;