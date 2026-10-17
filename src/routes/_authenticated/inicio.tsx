import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BellRing, CalendarPlus, FileText, MessageCircle, UserPlus, Wrench } from "lucide-react";
import { normalizarTelefone } from "@/lib/cobranca";
import { AppShell, PrimaryButton } from "@/components/AppShell";
import { Panel, StateRow, Status } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { brl, dataBR, isoLocal, addDias, diasEntre } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { CATEGORIAS, useMe } from "@/lib/staff";
import { statusRecebimento } from "@/lib/cobranca";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: pageHead("Início", "Agenda do dia, orçamentos pendentes e ordens de serviço."),
  component: Dashboard,
});

function inicioMes(offset = 0) {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset);
  return isoLocal(d);
}

function useDashboard(enabled: boolean) {
  return useQuery({
    queryKey: ["dashboard"],
    enabled,
    queryFn: async () => {
      const hoje = isoLocal();
      const [ag, orc, ord, eq] = await Promise.all([
        supabase.from("appointments").select("id, hora, nome_contato, whatsapp, categoria, tipo, endereco, status, profiles:tecnico_id(nome)").eq("data", hoje).order("hora"),
        supabase.from("quotes").select("id, numero, descricao, valor, enviado_em, clients(nome)").eq("status", "Aguardando").order("enviado_em"),
        supabase.from("service_orders").select("id, status, categoria, inicio, concluida_em").or(`status.eq.Em andamento,concluida_em.gte.${inicioMes(-1)}`),
        supabase.from("equipment").select("id, descricao, ultima_manutencao, intervalo_meses, locations(bairro, cidade, clients(nome))"),
      ]);
      const err = ag.error || orc.error || ord.error || eq.error;
      if (err) throw err;
      const ordens = ord.data ?? [];
      const mes = inicioMes(0);
      const concluidasMes = ordens.filter((o) => o.concluida_em && o.concluida_em >= mes);
      const concluidasAnt = ordens.filter((o) => o.concluida_em && o.concluida_em < mes).length;
      const andamento = ordens.filter((o) => o.status === "Em andamento");
      const vencidas = (eq.data ?? []).map((e) => {
        const prox = e.ultima_manutencao ? addDias(e.ultima_manutencao, e.intervalo_meses * 30) : hoje;
        return { ...e, atraso: diasEntre(prox, hoje) };
      }).filter((e) => e.atraso > 0).sort((a, b) => b.atraso - a.atraso);
      return { agenda: ag.data ?? [], orcamentos: orc.data ?? [], andamento, concluidasMes, concluidasAnt, vencidas };
    },
  });
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function useFinanceiro(enabled: boolean) {
  return useQuery({
    queryKey: ["dash-fin"],
    enabled,
    queryFn: async () => {
      const [fin, est] = await Promise.all([
        supabase.from("financial_entries").select("tipo, valor, data").gte("data", inicioMes(-5)),
        supabase.from("stock_items").select("id, nome, quantidade, minimo, unidade, custo"),
      ]);
      if (fin.error || est.error) throw fin.error || est.error;
      const meses = Array.from({ length: 6 }, (_, i) => {
        const ini = inicioMes(i - 5), key = ini.slice(0, 7);
        const doMes = (fin.data ?? []).filter((e) => e.data.startsWith(key));
        const ent = doMes.filter((e) => e.tipo === "Entrada").reduce((a, e) => a + Number(e.valor), 0);
        const sai = doMes.filter((e) => e.tipo === "Saída").reduce((a, e) => a + Number(e.valor), 0);
        return { label: MESES[Number(key.slice(5)) - 1]!, ent, sai };
      });
      const itens = est.data ?? [];
      return {
        meses,
        repor: itens.filter((i) => Number(i.quantidade) <= Number(i.minimo)),
        valorEstoque: itens.reduce((a, i) => a + Number(i.quantidade) * Number(i.custo), 0),
      };
    },
  });
}

function FinanceiroResumo({ enabled }: { enabled: boolean }) {
  const f = useFinanceiro(enabled);
  const atual = f.data?.meses[5];
  const res = atual ? atual.ent - atual.sai : 0;
  const max = Math.max(1, ...(f.data?.meses.flatMap((m) => [m.ent, m.sai]) ?? [1]));
  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <Panel title="Dinheiro do mês" action={<Link to="/financeiro" className="text-xs text-primary hover:underline">Abrir financeiro</Link>}>
        {f.isLoading || f.error ? <StateRow loading={f.isLoading} error={f.error} /> : (
          <div className="grid gap-5 p-4 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">{res >= 0 ? "Lucro" : "Prejuízo"}</div>
                <div className={`text-3xl font-semibold tabular-nums ${res >= 0 ? "text-success" : "text-destructive"}`}>{brl(Math.abs(res))}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t pt-3">
                <div><div className="text-xs text-muted-foreground">Entrou</div><div className="text-sm font-medium tabular-nums">{brl(atual?.ent ?? 0)}</div></div>
                <div><div className="text-xs text-muted-foreground">Saiu</div><div className="text-sm font-medium tabular-nums">{brl(atual?.sai ?? 0)}</div></div>
              </div>
            </div>
            <div>
              <div className="flex h-36 items-end gap-2 border-b">
                {f.data?.meses.map((m, i) => (
                  <div key={i} className="flex h-full flex-1 items-end justify-center gap-1" title={`${m.label}: entrou ${brl(m.ent)}, saiu ${brl(m.sai)}`}>
                    <div className="w-2.5 rounded-t-sm bg-primary sm:w-3.5" style={{ height: `${(m.ent / max) * 100}%` }} />
                    <div className="w-2.5 rounded-t-sm bg-muted-foreground/40 sm:w-3.5" style={{ height: `${(m.sai / max) * 100}%` }} />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex gap-2">{f.data?.meses.map((m, i) => <div key={i} className="flex-1 text-center text-[11px] text-muted-foreground">{m.label}</div>)}</div>
              <div className="mt-2 flex gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-primary" /> Entradas</span>
                <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-muted-foreground/40" /> Saídas</span>
              </div>
            </div>
          </div>
        )}
      </Panel>
      <Panel title="Estoque para repor" action={<Link to="/estoque" className="text-xs text-primary hover:underline">Abrir estoque</Link>}>
        <StateRow loading={f.isLoading} error={f.error} empty={f.data?.repor.length === 0} emptyText="Nada abaixo do mínimo." />
        <ul className="divide-y">
          {f.data?.repor.slice(0, 5).map((i) => (
            <li key={i.id} className="flex items-baseline justify-between gap-3 px-4 py-3">
              <span className="truncate text-sm font-medium">{i.nome}</span>
              <span className="shrink-0 text-xs tabular-nums text-destructive">{Number(i.quantidade)} {i.unidade} (mín. {Number(i.minimo)})</span>
            </li>
          ))}
        </ul>
        {f.data && <div className="border-t px-4 py-3 text-xs text-muted-foreground">Valor em estoque: <span className="tabular-nums text-foreground">{brl(f.data.valorEstoque)}</span></div>}
      </Panel>
    </div>
  );
}

function ReceberResumo({ enabled }: { enabled: boolean }) {
  const q = useQuery({
    queryKey: ["dash-receber"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("recebimentos").select("valor_total, valor_pago, vencimento").neq("status", "pago");
      if (error) throw error;
      const hoje = isoLocal();
      let total = 0, atraso = 0, n = 0;
      for (const r of data) {
        const saldo = Number(r.valor_total) - Number(r.valor_pago);
        if (saldo <= 0) continue;
        total += saldo;
        if (statusRecebimento({ valor_total: Number(r.valor_total), valor_pago: Number(r.valor_pago), vencimento: r.vencimento }, hoje) === "atrasado") { atraso += saldo; n++; }
      }
      return { total, atraso, n };
    },
  });
  return (
    <Link to="/receber" className="mt-5 grid grid-cols-2 overflow-hidden rounded-lg border bg-card hover:bg-muted/40">
      <div className="border-r p-4">
        <div className="text-xs text-muted-foreground">A receber</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{q.isLoading ? "–" : q.error ? "!" : brl(q.data?.total ?? 0)}</div>
      </div>
      <div className="p-4">
        <div className="text-xs text-muted-foreground">Em atraso</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-destructive">{q.isLoading ? "–" : q.error ? "!" : brl(q.data?.atraso ?? 0)}</div>
        <div className="mt-1 text-xs text-muted-foreground">{q.data ? `${q.data.n} cobrança(s)` : ""}</div>
      </div>
    </Link>
  );
}

function AvisoPedidos({ enabled }: { enabled: boolean }) {
  const q = useQuery({
    queryKey: ["pedidos", "pendentes-count"],
    enabled,
    queryFn: async () => {
      const { count, error } = await supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "Pendente");
      if (error) throw error;
      return count ?? 0;
    },
  });
  if (!q.data) return null;
  return (
    <Link to="/pedidos" className="mb-5 flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-sm hover:bg-primary/10">
      <BellRing className="h-4 w-4 shrink-0 text-primary" />
      <span className="flex-1"><b className="tabular-nums">{q.data}</b> {q.data === 1 ? "pedido novo aguardando" : "pedidos novos aguardando"} confirmação</span>
      <span className="text-xs font-medium text-primary">Ver pedidos</span>
    </Link>
  );
}

function Dashboard() {
  const me = useMe();
  const q = useDashboard(!!me.data?.isStaff);
  const d = q.data;
  const totalAberto = d?.orcamentos.reduce((a, o) => a + Number(o.valor), 0) ?? 0;
  const diff = d ? d.concluidasMes.length - d.concluidasAnt : 0;
  const porCat = CATEGORIAS.map((c) => ({ c, n: d?.concluidasMes.filter((o) => o.categoria === c).length ?? 0 }));
  const max = Math.max(1, ...porCat.map((p) => p.n));

  const kpis = [
    { r: "Agendamentos hoje", v: d?.agenda.length ?? 0, s: `${d?.agenda.filter((a) => a.status === "Concluída").length ?? 0} concluído(s)`, t: "text-muted-foreground" },
    { r: "Orçamentos pendentes", v: d?.orcamentos.length ?? 0, s: `${brl(totalAberto)} em aberto`, t: "text-warning" },
    { r: "Ordens em andamento", v: d?.andamento.length ?? 0, s: `${d?.andamento.filter((o) => o.inicio && o.inicio < isoLocal()).length ?? 0} de vários dias`, t: "text-muted-foreground" },
    { r: "Concluídas no mês", v: d?.concluidasMes.length ?? 0, s: diff >= 0 ? `${diff} a mais que no mês passado` : `${-diff} a menos que no mês passado`, t: diff >= 0 ? "text-success" : "text-destructive" },
  ];

  return (
    <AppShell title="Início" actions={<PrimaryButton label="Novo agendamento" to="/agenda" />}>
      {me.data?.isAdmin && <AvisoPedidos enabled />}
      {me.data?.isAdmin && <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([["/clientes", "Novo cliente", UserPlus], ["/ordens", "Nova OS", Wrench], ["/orcamentos", "Novo orçamento", FileText], ["/agenda", "Agendamento", CalendarPlus]] as const).map(([to, l, I]) => (
          <Link key={to} to={to} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-3 text-sm font-medium hover:bg-muted/50">
            <I className="h-4 w-4 shrink-0 text-primary" /> <span className="truncate">{l}</span>
          </Link>
        ))}
      </div>}
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border bg-card lg:grid-cols-4">
        {kpis.map((k, i) => (
          <div key={k.r} className={`p-4 ${i < 2 ? "border-b lg:border-b-0" : ""} ${i % 2 === 0 ? "border-r" : ""} ${i === 1 ? "lg:border-r" : ""} ${i === 3 ? "lg:border-r-0" : ""}`}>
            <div className="text-xs text-muted-foreground">{k.r}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{q.isLoading ? "–" : k.v}</div>
            <div className={`mt-1 text-xs ${k.t}`}>{q.isLoading ? "" : k.s}</div>
          </div>
        ))}
      </div>

      {me.data?.isAdmin && <ReceberResumo enabled />}
      {me.data?.isAdmin && <FinanceiroResumo enabled />}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Panel title={<>Agenda de hoje <span className="ml-1 font-normal tabular-nums text-muted-foreground">{dataBR(new Date())}</span></>}
          action={<Link to="/agenda" className="text-xs text-primary hover:underline">Ver semana</Link>}>
          <StateRow loading={q.isLoading} error={q.error} empty={d?.agenda.length === 0} emptyText="Nenhum serviço marcado para hoje." />
          <ul className="divide-y">
            {d?.agenda.map((a) => (
              <li key={a.id} className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3 px-4 py-3 sm:grid-cols-[3.25rem_minmax(0,1fr)_auto]">
                <div className="pt-0.5 text-sm font-medium tabular-nums">{a.hora ?? "--:--"}</div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{a.nome_contato}</div>
                  <div className="truncate text-xs text-muted-foreground">{a.categoria} · {a.tipo}</div>
                  <div className="truncate text-xs text-muted-foreground">{a.endereco}{a.profiles?.nome ? ` · ${a.profiles.nome}` : ""}</div>
                </div>
                <div className="col-start-2 flex items-center gap-2 sm:col-start-auto">
                  <Status value={a.status} />
                  {normalizarTelefone(a.whatsapp) && <a href={`https://wa.me/${normalizarTelefone(a.whatsapp)}?text=${encodeURIComponent(`Olá, ${a.nome_contato}! Sou da VM Climatização & Acabamentos e estou a caminho para realizar seu atendimento.`)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-success hover:bg-muted"><MessageCircle className="h-3.5 w-3.5" /> A caminho</a>}
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="flex flex-col gap-5">
          {me.data?.isAdmin && <Panel title="Orçamentos aguardando" action={<Link to="/orcamentos" className="text-xs text-primary hover:underline">Ver todos</Link>}>
            <StateRow loading={q.isLoading} error={q.error} empty={d?.orcamentos.length === 0} emptyText="Nenhum orçamento aguardando." />
            <ul className="divide-y">
              {d?.orcamentos.slice(0, 5).map((o) => (
                <li key={o.id} className="px-4 py-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                    <span className="truncate text-sm font-medium">{o.clients?.nome}</span>
                    <span className="shrink-0 text-sm tabular-nums">{brl(Number(o.valor))}</span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{o.descricao}</div>
                  <div className="text-xs tabular-nums text-muted-foreground">ORC-{String(o.numero).padStart(4, "0")}{o.enviado_em ? ` · enviado em ${dataBR(o.enviado_em)}` : ""}</div>
                </li>
              ))}
            </ul>
          </Panel>}

          <Panel title="Serviços no mês" action={<span className="text-xs tabular-nums text-muted-foreground">{d?.concluidasMes.length ?? 0} concluídos</span>}>
            <div className="space-y-3 p-4">
              {porCat.map((p) => (
                <div key={p.c}>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">{p.c}</span><span className="tabular-nums">{p.n}</span></div>
                  <div className="mt-1 h-2 rounded-sm bg-muted"><div className="h-2 rounded-sm bg-chart-1" style={{ width: `${(p.n / max) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Manutenção vencida" action={<Link to="/lembretes" className="text-xs text-primary hover:underline">Ver lembretes</Link>}>
            <StateRow loading={q.isLoading} error={q.error} empty={d?.vencidas.length === 0} emptyText="Nenhuma manutenção vencida." />
            <ul className="divide-y">
              {d?.vencidas.slice(0, 5).map((m) => (
                <li key={m.id} className="flex items-baseline justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{m.locations?.clients?.nome}</div>
                    <div className="truncate text-xs text-muted-foreground">{m.descricao} · {m.locations?.bairro}</div>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-destructive">{m.atraso} dias</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
