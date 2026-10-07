import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, FileClock, Loader, CheckCircle2, AlertTriangle, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { resumo, proximosServicos, manutencoesVencidas, type Categoria } from "@/lib/sample-data";
import { brl, dataBR, horaBR } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Climatech" },
      { name: "description", content: "Visão geral de agendamentos, orçamentos e ordens de serviço." },
      { property: "og:title", content: "Dashboard — Climatech" },
      { property: "og:description", content: "Visão geral de agendamentos, orçamentos e ordens de serviço." },
    ],
  }),
  component: Dashboard,
});

const catCor: Record<Categoria, string> = {
  "Refrigeração": "bg-accent text-accent-foreground",
  "Gesso": "bg-secondary text-secondary-foreground",
  "Elétrica": "bg-warning/20 text-foreground",
};

const statusCor = {
  "Agendada": "text-primary",
  "Pendente": "text-warning",
  "Em andamento": "text-success",
} as const;

function Dashboard() {
  const cards = [
    { label: "Agendamentos hoje", valor: resumo.agendamentosHoje, icon: CalendarCheck, to: "/agenda" },
    { label: "Orçamentos pendentes", valor: resumo.orcamentosPendentes, icon: FileClock, to: "/orcamentos" },
    { label: "Ordens em andamento", valor: resumo.ordensAndamento, icon: Loader, to: "/ordens" },
    { label: "Concluídas no mês", valor: resumo.concluidasMes, icon: CheckCircle2, to: "/ordens" },
  ] as const;

  return (
    <AppShell
      title="Dashboard"
      actions={
        <Link to="/agenda" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo agendamento</span>
        </Link>
      }
    >
      <p className="mb-5 text-sm text-muted-foreground">
        {dataBR(new Date())} · Faturamento no mês: <span className="font-medium text-foreground">{brl(resumo.faturamentoMes)}</span>
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {cards.map(({ label, valor, icon: Icon, to }) => (
          <Link key={label} to={to} className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs sm:text-sm">{label}</span>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 text-3xl font-semibold">{valor}</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border bg-card lg:col-span-2">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="font-semibold">Próximos serviços</h2>
            <Link to="/agenda" className="text-sm text-primary hover:underline">Ver agenda</Link>
          </div>
          <ul className="divide-y">
            {proximosServicos.map((s) => (
              <li key={s.id} className="flex items-center gap-4 p-4">
                <div className="w-14 shrink-0 text-center">
                  <div className="text-sm font-semibold">{horaBR(s.inicio)}</div>
                  <div className="text-xs text-muted-foreground">{dataBR(s.inicio).slice(0, 5)}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{s.cliente}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className={`rounded px-1.5 py-0.5 font-medium ${catCor[s.categoria]}`}>{s.categoria}</span>
                    <span>{s.tipo}</span>·<span>{s.bairro}</span>·<span>{s.tecnico}</span>
                  </div>
                </div>
                <span className={`hidden text-xs font-medium sm:inline ${statusCor[s.status]}`}>{s.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b p-4">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h2 className="font-semibold">Manutenções vencidas</h2>
          </div>
          <ul className="divide-y">
            {manutencoesVencidas.map((m) => (
              <li key={m.id} className="p-4">
                <div className="font-medium">{m.aparelho}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {m.cliente} · venceu em <span className="text-destructive">{dataBR(m.vencida)}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t p-3 text-center">
            <Link to="/lembretes" className="text-sm text-primary hover:underline">Ver todos os lembretes</Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
