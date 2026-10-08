import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, PrimaryButton } from "@/components/AppShell";
import { Panel, StateRow, Status } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { brl, dataBR, isoLocal, addDias, diasEntre } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { CATEGORIAS, useMe } from "@/lib/staff";

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
        supabase.from("appointments").select("id, hora, nome_contato, categoria, tipo, endereco, status, profiles:tecnico_id(nome)").eq("data", hoje).order("hora"),
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
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border bg-card lg:grid-cols-4">
        {kpis.map((k, i) => (
          <div key={k.r} className={`p-4 ${i < 2 ? "border-b lg:border-b-0" : ""} ${i % 2 === 0 ? "border-r" : ""} ${i === 1 ? "lg:border-r" : ""} ${i === 3 ? "lg:border-r-0" : ""}`}>
            <div className="text-xs text-muted-foreground">{k.r}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{q.isLoading ? "–" : k.v}</div>
            <div className={`mt-1 text-xs ${k.t}`}>{q.isLoading ? "" : k.s}</div>
          </div>
        ))}
      </div>

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
                <div className="col-start-2 sm:col-start-auto"><Status value={a.status} /></div>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel title="Orçamentos aguardando" action={<Link to="/orcamentos" className="text-xs text-primary hover:underline">Ver todos</Link>}>
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
          </Panel>

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
