CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'Mão de obra' CHECK (tipo IN ('Material','Mão de obra')),
  descricao text NOT NULL,
  quantidade numeric NOT NULL DEFAULT 1,
  valor_unitario numeric NOT NULL DEFAULT 0,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_items TO authenticated;
GRANT ALL ON public.quote_items TO service_role;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff all quote_items" ON public.quote_items FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
ALTER TABLE public.quotes ADD COLUMN validade_dias int NOT NULL DEFAULT 15;
ALTER TABLE public.quotes ADD COLUMN observacoes text;
ALTER TABLE public.quotes ADD COLUMN service_order_id uuid REFERENCES public.service_orders(id) ON DELETE SET NULL;