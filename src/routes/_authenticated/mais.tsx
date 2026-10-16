import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, LogOut } from "lucide-react";
import { LinkCliente } from "@/components/LinkCliente";
import { AppShell, moreGroups, useSignOut } from "@/components/AppShell";
import { company } from "@/lib/company";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/mais")({
  head: pageHead("Mais", "Acesso às demais áreas do painel."),
  component: Mais,
});

const row = "flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-muted";

function Mais() {
  const sair = useSignOut();
  const grupos = moreGroups;
  return (
    <AppShell title="Mais">
      <div className="space-y-5">
        <LinkCliente />
        {grupos.map((g) => (
          <section key={g.titulo}>
            <h2 className="mb-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{g.titulo}</h2>
            <div className="divide-y rounded-lg border bg-card">
              {g.itens.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to as "/inicio"} className={row}>
                  <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                  <span className="flex-1">{label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                </Link>
              ))}
            </div>
          </section>
        ))}
        <button onClick={sair} className="flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3.5 text-left text-sm text-destructive hover:bg-muted">
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
