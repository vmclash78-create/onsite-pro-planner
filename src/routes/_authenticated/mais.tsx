import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, ExternalLink, LogOut } from "lucide-react";
import { AppShell, moreItems, useSignOut } from "@/components/AppShell";
import { company } from "@/lib/company";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/mais")({
  head: pageHead("Mais", "Acesso às demais áreas do painel."),
  component: Mais,
});

function Mais() {
  const sair = useSignOut();
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
        <button onClick={sair} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm text-destructive hover:bg-muted">
          <LogOut className="h-4 w-4" strokeWidth={1.75} /> Sair
        </button>
      </div>
      <div className="mt-5 text-xs leading-relaxed text-muted-foreground">
        <a href={company.whatsappUrl} className="tabular-nums text-foreground">{company.phoneDisplay}</a>
        <div>{company.addressDisplay}</div>
      </div>
    </AppShell>
  );
}
