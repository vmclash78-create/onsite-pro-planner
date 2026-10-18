CREATE TABLE IF NOT EXISTS public.rate_limits (
 chave text NOT NULL,
 janela timestamptz NOT NULL,
 n integer NOT NULL DEFAULT 0,
 PRIMARY KEY (chave, janela)
);
REVOKE ALL ON public.rate_limits FROM public, anon, authenticated;
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS rate_limits_janela_idx ON public.rate_limits(janela);
CREATE OR REPLACE FUNCTION public.rate_limit_hit(_chave text, _max integer, _janela_seg integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_janela timestamptz; v_n integer;
BEGIN
 IF _chave IS NULL OR length(_chave) NOT BETWEEN 1 AND 200 OR _max IS NULL OR _max < 1 OR _janela_seg IS NULL OR _janela_seg < 1 THEN RAISE EXCEPTION 'parametros invalidos'; END IF;
 v_janela := to_timestamp(floor(extract(epoch from now()) / _janela_seg) * _janela_seg);
 INSERT INTO public.rate_limits AS r (chave,janela,n) VALUES (_chave,v_janela,1)
 ON CONFLICT (chave,janela) DO UPDATE SET n=r.n+1 RETURNING r.n INTO v_n;
 RETURN v_n <= _max;
END $$;
REVOKE ALL ON FUNCTION public.rate_limit_hit(text,integer,integer) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text,integer,integer) TO service_role;
CREATE OR REPLACE FUNCTION public.limpar_registros_publicos()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a integer; b integer;
BEGIN
 DELETE FROM public.booking_upload_authorizations WHERE expires_at < now()-interval '1 hour';
 GET DIAGNOSTICS a=ROW_COUNT;
 DELETE FROM public.rate_limits WHERE janela < now()-interval '2 days';
 GET DIAGNOSTICS b=ROW_COUNT;
 RETURN jsonb_build_object('autorizacoes_removidas',a,'contadores_removidos',b);
END $$;
REVOKE ALL ON FUNCTION public.limpar_registros_publicos() FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.limpar_registros_publicos() TO service_role;
CREATE OR REPLACE FUNCTION public.fotos_site_orfas(_limite integer DEFAULT 500)
RETURNS SETOF text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT o.name FROM storage.objects o
 WHERE o.bucket_id='pedidos' AND o.name LIKE 'site/%'
 AND o.created_at < now()-interval '24 hours'
 AND NOT EXISTS (SELECT 1 FROM public.appointments a WHERE a.fotos @> ARRAY[o.name])
 AND NOT EXISTS (SELECT 1 FROM public.booking_upload_authorizations t WHERE t.expires_at > now() AND o.name=ANY(t.paths))
 ORDER BY o.created_at LIMIT least(greatest(_limite,1),1000)
$$;
REVOKE ALL ON FUNCTION public.fotos_site_orfas(integer) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fotos_site_orfas(integer) TO service_role;