import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PrimaryButton } from "@/components/AppShell";
import { indicadores, agendaHoje, orcamentosPendentes, servicosPorCategoria, manutencoesVencidas, type StatusAgenda } from "@/lib/sample-data";
import { brl, dataBR, horaBR } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Início — VM Climatização & Acabamentos" },
      { name: "description", content: "Agenda do dia, orçamentos pendentes e ordens de serviço da VM Climatização & Acabamentos." },
      { property: "og:title", content: "Início — VM Climatização & Acabamentos" },
      { property: "og:description", content: "Agenda do dia, orçamentos pendentes e ordens de serviço." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const statusCor: Record<StatusAgenda, string> = {
  Agendada: "text-muted-foreground",
  "Em andamento": "text-primary",
  Concluída: "text-success",
  Atrasada: "text-destructive",
};
const tomCor = { up: "text-success", warn: "text-warning", flat: "text-muted-foreground" };

function Dashboard() {
  const max = Math.max(...servicosPorCategoria.map((s) => s.total));
  const totalMes = servicosPorCategoria.reduce((a, s) => a + s.total, 0);
  return (
    <AppShell title="Início" breadcrumb={["Painel", "Início"]} actions={<PrimaryButton label="Novo agendamento" to="/agenda" />}>
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border bg-card lg:grid-cols-4">
        {indicadores.map((k, i) => (
          <div key={k.rotulo} className={`p-4 ${i < 2 ? "border-b lg:border-b-0" : ""} ${i % 2 === 0 ? "border-r" : ""} ${i === 1 ? "lg:border-r" : ""} ${i === 3 ? "lg:border-r-0" : ""}`}>
            <div className="text-xs text-muted-foreground">{k.rotulo}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{k.valor}</div>
            <div className={`mt-1 text-xs ${tomCor[k.tom]}`}>{k.variacao}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section className="rounded-lg border bg-card">
          <div className="flex items-baseline justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Agenda de hoje <span className="ml-1 font-normal tabular-nums text-muted-foreground">{dataBR(new Date())}</span></h2>
            <Link to="/agenda" className="text-xs text-primary hover:underline">Ver semana</Link>
          </div>
          <ul className="divide-y">
            {agendaHoje.map((a) => (
              <li key={a.id} className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] gap-3 px-4 py-3">
                <div className="pt-0.5 text-sm font-medium tabular-nums">{horaBR(a.hora)}</div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{a.cliente}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {a.categoria} · {a.tipo}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{a.endereco} · {a.tecnico}</div>
                </div>
                <div className={`flex items-center gap-1.5 text-xs ${statusCor[a.status]}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {a.status}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-5">
          <section className="rounded-lg border bg-card">
            <div className="flex items-baseline justify-between border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Orçamentos aguardando</h2>
              <Link to="/orcamentos" className="text-xs text-primary hover:underline">Ver todos</Link>
            </div>
            <ul className="divide-y">
              {orcamentosPendentes.map((o) => (
                <li key={o.id} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium">{o.cliente}</span>
                    <span className="shrink-0 text-sm tabular-nums">{brl(o.valor)}</span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{o.servico}</div>
                  <div className="text-xs tabular-nums text-muted-foreground">{o.id} · enviado em {dataBR(o.enviado)}</div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border bg-card p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">Serviços no mês</h2>
              <span className="text-xs tabular-nums text-muted-foreground">{totalMes} no total</span>
            </div>
            <div className="mt-4 space-y-3">
              {servicosPorCategoria.map((s) => (
                <div key={s.categoria}>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{s.categoria}</span>
                    <span className="tabular-nums">{s.total}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-sm bg-muted">
                    <div className="h-2 rounded-sm bg-chart-1" style={{ width: `${(s.total / max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border bg-card">
            <div className="flex items-baseline justify-between border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Manutenção vencida</h2>
              <Link to="/lembretes" className="text-xs text-primary hover:underline">Ver lembretes</Link>
            </div>
            <ul className="divide-y">
              {manutencoesVencidas.map((m) => {
                const dias = Math.round((Date.now() - new Date(m.vencida).getTime()) / 864e5);
                return (
                  <li key={m.id} className="flex items-baseline justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{m.cliente}</div>
                      <div className="truncate text-xs text-muted-foreground">{m.aparelho} · {m.bairro}</div>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-destructive">{dias} dias</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
