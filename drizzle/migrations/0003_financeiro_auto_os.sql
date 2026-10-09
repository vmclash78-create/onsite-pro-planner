ALTER TABLE public.financial_entries ADD COLUMN service_order_id uuid UNIQUE REFERENCES public.service_orders(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.os_financeiro()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare cli text;
begin
  if new.status = 'Concluída' and coalesce(new.valor,0) > 0 then
    select nome into cli from public.clients where id = new.client_id;
    insert into public.financial_entries (tipo, categoria, descricao, valor, data, service_order_id)
    values ('Entrada', 'Serviço', 'OS-' || lpad(new.numero::text, 4, '0') || ' · ' || coalesce(cli, '') || ' · ' || new.categoria,
            new.valor, coalesce(new.concluida_em, current_date), new.id)
    on conflict (service_order_id) do update set valor = excluded.valor, data = excluded.data;
  else
    delete from public.financial_entries where service_order_id = new.id;
  end if;
  return new;
end $$;

CREATE TRIGGER service_orders_financeiro AFTER INSERT OR UPDATE OF status, valor, concluida_em ON public.service_orders
FOR EACH ROW EXECUTE FUNCTION public.os_financeiro();

INSERT INTO public.financial_entries (tipo, categoria, descricao, valor, data, service_order_id)
SELECT 'Entrada', 'Serviço', 'OS-' || lpad(o.numero::text, 4, '0') || ' · ' || coalesce(c.nome, '') || ' · ' || o.categoria,
       o.valor, coalesce(o.concluida_em, current_date), o.id
FROM public.service_orders o LEFT JOIN public.clients c ON c.id = o.client_id
WHERE o.status = 'Concluída' AND coalesce(o.valor,0) > 0
ON CONFLICT (service_order_id) DO NOTHING;