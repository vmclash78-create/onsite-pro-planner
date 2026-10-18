CREATE OR REPLACE FUNCTION public.fotos_site_orfas(_limite integer DEFAULT 500)
RETURNS SETOF text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT o.name FROM storage.objects o
 WHERE o.bucket_id='pedidos' AND o.name LIKE 'site/%'
 AND o.created_at < now()-interval '24 hours'
 AND NOT EXISTS (SELECT 1 FROM public.appointments a WHERE a.fotos @> ARRAY[o.name])
 AND NOT EXISTS (SELECT 1 FROM public.os_fotos f WHERE f.path=o.name)
 AND NOT EXISTS (SELECT 1 FROM public.booking_upload_authorizations t WHERE t.expires_at > now() AND o.name=ANY(t.paths))
 ORDER BY o.created_at LIMIT least(greatest(_limite,1),1000)
$$;
REVOKE ALL ON FUNCTION public.fotos_site_orfas(integer) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fotos_site_orfas(integer) TO service_role;