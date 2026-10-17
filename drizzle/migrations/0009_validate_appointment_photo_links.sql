CREATE OR REPLACE FUNCTION public.proteger_colunas_agendamento() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ DECLARE p text; BEGIN
IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
 IF (to_jsonb(new)-ARRAY['status','descricao','fotos']) IS DISTINCT FROM (to_jsonb(old)-ARRAY['status','descricao','fotos']) THEN RAISE EXCEPTION 'Apenas administradores podem reatribuir ou alterar os dados do agendamento'; END IF;
 FOREACH p IN ARRAY new.fotos LOOP
  IF NOT (p=ANY(old.fotos)) AND (split_part(p,'/',1)<>'painel' OR split_part(p,'/',2)<>new.id::text) THEN RAISE EXCEPTION 'Foto não pertence ao agendamento'; END IF;
 END LOOP;
END IF; RETURN new; END $$;