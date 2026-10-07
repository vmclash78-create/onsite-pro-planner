import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, ExternalLink } from "lucide-react";
import { AppShell, moreItems } from "@/components/AppShell";
import { company } from "@/lib/company";

export const Route = createFileRoute("/mais")({
  head: () => ({
    meta: [
      { title: "Mais — VM Climatização & Acabamentos" },
      { name: "description", content: "Acesso às demais áreas do painel: ordens, orçamentos, locais, equipe e lembretes." },
      { property: "og:title", content: "Mais — VM Climatização & Acabamentos" },
      { property: "og:description", content: "Acesso às demais áreas do painel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Mais,
});

function Mais() {
  return (
    <AppShell title="Mais">
      <div className="divide-y rounded-lg border bg-card">
        {[...moreItems, { to: "/agendar", label: "Página de agendamento", icon: ExternalLink }].map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
            <span className="flex-1">{label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
          </Link>
        ))}
      </div>
      <div className="mt-5 text-xs leading-relaxed text-muted-foreground">
        <a href={company.whatsappUrl} className="tabular-nums text-foreground">{company.phoneDisplay}</a>
        <div>{company.addressDisplay}</div>
      </div>
    </AppShell>
  );
}
