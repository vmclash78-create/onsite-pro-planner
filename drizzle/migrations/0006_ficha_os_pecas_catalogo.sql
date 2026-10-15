ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS marca text,
  ADD COLUMN IF NOT EXISTS btus integer,
  ADD COLUMN IF NOT EXISTS gas text,
  ADD COLUMN IF NOT EXISTS voltagem text,
  ADD COLUMN IF NOT EXISTS ambiente text;

ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS equipment_id uuid REFERENCES public.equipment(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS estoque_baixado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS garantia_dias integer NOT NULL DEFAULT 90;

CREATE TABLE public.service_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  stock_item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE RESTRICT,
  quantidade numeric NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_order_items TO authenticated;
GRANT ALL ON public.service_order_items TO service_role;
ALTER TABLE public.service_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff all os items" ON public.service_order_items FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX ON public.service_order_items(service_order_id);

CREATE TABLE public.os_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'antes' CHECK (tipo IN ('antes','depois')),
  path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_fotos TO authenticated;
GRANT ALL ON public.os_fotos TO service_role;
ALTER TABLE public.os_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff all os fotos" ON public.os_fotos FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX ON public.os_fotos(service_order_id);

CREATE OR REPLACE FUNCTION public.os_conclusao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  if new.status = 'Concluída' and coalesce(old.status,'') <> 'Concluída' then
    if not new.estoque_baixado then
      update public.stock_items s set quantidade = s.quantidade - i.q
        from (select stock_item_id, sum(quantidade) q from public.service_order_items
              where service_order_id = new.id group by stock_item_id) i
        where s.id = i.stock_item_id;
      new.estoque_baixado := true;
    end if;
    if new.equipment_id is not null then
      update public.equipment set ultima_manutencao = coalesce(new.concluida_em, current_date)
        where id = new.equipment_id;
    end if;
  elsif coalesce(old.status,'') = 'Concluída' and new.status <> 'Concluída' and new.estoque_baixado then
    update public.stock_items s set quantidade = s.quantidade + i.q
      from (select stock_item_id, sum(quantidade) q from public.service_order_items
            where service_order_id = new.id group by stock_item_id) i
      where s.id = i.stock_item_id;
    new.estoque_baixado := false;
  end if;
  return new;
end $$;
CREATE TRIGGER os_conclusao BEFORE UPDATE OF status ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.os_conclusao();

CREATE TABLE public.catalogo_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'Serviço' CHECK (tipo IN ('Serviço','Aparelho','Acessório','Obra')),
  categoria text NOT NULL DEFAULT 'Refrigeração',
  titulo text NOT NULL,
  descricao text,
  preco numeric,
  a_partir boolean NOT NULL DEFAULT true,
  imagem_url text,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.catalogo_itens TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogo_itens TO authenticated;
GRANT ALL ON public.catalogo_itens TO service_role;
ALTER TABLE public.catalogo_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read ativos" ON public.catalogo_itens FOR SELECT TO anon, authenticated
  USING (ativo OR public.is_staff(auth.uid()));
CREATE POLICY "admin write catalogo" ON public.catalogo_itens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.catalogo_itens (tipo, categoria, titulo, descricao, preco, ordem) VALUES
 ('Serviço','Refrigeração','Higienização completa de split','Limpeza da evaporadora e condensadora, bactericida e teste de funcionamento.',150,1),
 ('Serviço','Refrigeração','Instalação padrão de split','Até 3 m de tubulação, suporte e dreno. Aparelhos até 12.000 BTUs.',450,2),
 ('Serviço','Refrigeração','Recarga de gás','Localização de vazamento e carga de gás R410A ou R32.',250,3),
 ('Serviço','Gesso','Forro de gesso (m²)','Forro liso com acabamento, incluindo material.',65,4),
 ('Serviço','Gesso','Sanca com iluminação (metro)','Sanca aberta ou fechada pronta para fita de LED.',90,5),
 ('Serviço','Elétrica','Instalação de tomada ou ponto','Ponto novo com fiação e caixa, inclui material básico.',80,6),
 ('Acessório','Refrigeração','Controle remoto universal','Compatível com as principais marcas de split.',45,7);

CREATE POLICY "public read catalogo files" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'catalogo');
CREATE POLICY "admin write catalogo files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'catalogo' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete catalogo files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'catalogo' AND public.has_role(auth.uid(),'admin'));