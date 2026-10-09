CREATE TABLE public.recebimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id uuid UNIQUE REFERENCES public.service_orders(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  valor_total numeric NOT NULL DEFAULT 0,
  valor_pago numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','parcial','pago','atrasado')),
  vencimento date NOT NULL DEFAULT (current_date + 7),
  forma_pagamento text CHECK (forma_pagamento IN ('pix','dinheiro','cartão','transferência')),
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recebimentos TO authenticated;
GRANT ALL ON public.recebimentos TO service_role;
ALTER TABLE public.recebimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all recebimentos" ON public.recebimentos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "tecnico read own recebimentos" ON public.recebimentos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_orders o WHERE o.id = ordem_id AND o.tecnico_id = auth.uid()));

ALTER TABLE public.financial_entries ADD COLUMN recebimento_id uuid REFERENCES public.recebimentos(id) ON DELETE SET NULL;

CREATE TABLE public.configuracoes_empresa (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  pix_chave text,
  pix_nome text,
  pix_cidade text,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.configuracoes_empresa TO authenticated;
GRANT ALL ON public.configuracoes_empresa TO service_role;
ALTER TABLE public.configuracoes_empresa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read config" ON public.configuracoes_empresa FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin insert config" ON public.configuracoes_empresa FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update config" ON public.configuracoes_empresa FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
INSERT INTO public.configuracoes_empresa (id, pix_nome, pix_cidade) VALUES (1, 'VM Climatizacao', 'Hidrolandia');

CREATE TABLE public.modelos_mensagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  titulo text NOT NULL,
  texto text NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modelos_mensagem TO authenticated;
GRANT ALL ON public.modelos_mensagem TO service_role;
ALTER TABLE public.modelos_mensagem ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read modelos" ON public.modelos_mensagem FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin write modelos" ON public.modelos_mensagem FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.modelos_mensagem (chave, titulo, texto) VALUES
 ('confirmacao','Confirmação de agendamento','Olá {nome}! Seu serviço de {servico} está confirmado para {data} às {hora}. Técnico: {tecnico}. VM Climatização & Acabamentos'),
 ('vespera','Lembrete na véspera','Olá {nome}! Lembrando que amanhã, {data} às {hora}, faremos o serviço de {servico}. Qualquer coisa é só responder aqui. VM Climatização & Acabamentos'),
 ('a_caminho','Técnico a caminho','Olá {nome}! O técnico {tecnico} está a caminho para o serviço de {servico}. VM Climatização & Acabamentos'),
 ('cobranca','Cobrança de pagamento atrasado','Olá {nome}, tudo bem? Consta em aberto o valor de {valor} referente ao serviço de {servico} realizado em {data}. Podemos ajudar com o pagamento? VM Climatização & Acabamentos'),
 ('preventiva','Manutenção preventiva vencida','Olá {nome}! A manutenção preventiva do seu aparelho {modelo_aparelho} está vencida. Vamos agendar a limpeza? VM Climatização & Acabamentos');

CREATE TABLE public.mensagens_enviadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  referencia_id uuid,
  enviado_por uuid NOT NULL DEFAULT auth.uid(),
  data timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mensagens_enviadas_ref_idx ON public.mensagens_enviadas (referencia_id, tipo);
GRANT SELECT, INSERT ON public.mensagens_enviadas TO authenticated;
GRANT ALL ON public.mensagens_enviadas TO service_role;
ALTER TABLE public.mensagens_enviadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read mensagens" ON public.mensagens_enviadas FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR enviado_por = auth.uid());
CREATE POLICY "insert own mensagens" ON public.mensagens_enviadas FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND enviado_por = auth.uid());

CREATE OR REPLACE FUNCTION public.os_financeiro()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if new.status = 'Concluída' and coalesce(new.valor,0) > 0 then
    insert into public.recebimentos (ordem_id, cliente_id, valor_total, vencimento)
    values (new.id, new.client_id, new.valor, coalesce(new.concluida_em, current_date) + 7)
    on conflict (ordem_id) do update set valor_total = excluded.valor_total,
      status = case when recebimentos.valor_pago >= excluded.valor_total then 'pago'
                    when recebimentos.valor_pago > 0 then 'parcial' else 'pendente' end;
  else
    delete from public.recebimentos where ordem_id = new.id and valor_pago = 0;
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.registrar_pagamento(_rec uuid, _valor numeric, _data date, _forma text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare r record; novo numeric; descr text;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Somente administradores registram pagamentos'; end if;
  if _valor is null or _valor <= 0 then raise exception 'Valor inválido'; end if;
  if _forma not in ('pix','dinheiro','cartão','transferência') then raise exception 'Forma inválida'; end if;
  select rc.*, c.nome as cli, o.numero, o.categoria into r
    from public.recebimentos rc join public.clients c on c.id = rc.cliente_id
    left join public.service_orders o on o.id = rc.ordem_id where rc.id = _rec for update of rc;
  if not found then raise exception 'Recebimento não encontrado'; end if;
  if _valor > r.valor_total - r.valor_pago + 0.001 then raise exception 'Valor maior que o saldo'; end if;
  novo := r.valor_pago + _valor;
  update public.recebimentos set valor_pago = novo, forma_pagamento = _forma,
    status = case when novo >= valor_total then 'pago' else 'parcial' end where id = _rec;
  descr := coalesce('OS-' || lpad(r.numero::text, 4, '0') || ' · ', '') || r.cli || coalesce(' · ' || r.categoria, '') || ' (' || _forma || ')';
  insert into public.financial_entries (tipo, categoria, descricao, valor, data, recebimento_id)
  values ('Entrada', 'Serviço', descr, _valor, coalesce(_data, current_date), _rec);
end $function$;
REVOKE ALL ON FUNCTION public.registrar_pagamento(uuid, numeric, date, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.registrar_pagamento(uuid, numeric, date, text) TO authenticated;