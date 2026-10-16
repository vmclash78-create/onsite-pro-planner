-- Long services (installation of AC, electrical panel) block the whole period (morning or afternoon).
CREATE OR REPLACE FUNCTION public.horarios_ocupados(_inicio date, _fim date)
RETURNS TABLE(data date, hora text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT DISTINCT a.data, h.hora FROM public.appointments a
  CROSS JOIN LATERAL (
    SELECT unnest(CASE
      WHEN (a.categoria, a.tipo) IN (('Refrigeração','Instalação'),('Elétrica','Quadro')) AND a.hora < '12:00'
        THEN ARRAY['08:00','09:00','10:00']
      WHEN (a.categoria, a.tipo) IN (('Refrigeração','Instalação'),('Elétrica','Quadro'))
        THEN ARRAY['14:00','15:00','16:00']
      ELSE ARRAY[a.hora] END) AS hora
  ) h
  WHERE a.data BETWEEN _inicio AND LEAST(_fim, _inicio + 60)
    AND a.hora IS NOT NULL AND a.status <> 'Cancelada'
$$;
REVOKE ALL ON FUNCTION public.horarios_ocupados(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.horarios_ocupados(date, date) TO anon, authenticated, service_role;
