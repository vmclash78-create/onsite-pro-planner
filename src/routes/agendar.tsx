import { createFileRoute, Link } from "@tanstack/react-router";
import { Snowflake } from "lucide-react";

export const Route = createFileRoute("/agendar")({
  head: () => ({
    meta: [
      { title: "Agende seu serviço — Climatech" },
      { name: "description", content: "Agende refrigeração, gesso ou elétrica online." },
      { property: "og:title", content: "Agende seu serviço — Climatech" },
      { property: "og:description", content: "Agende refrigeração, gesso ou elétrica online." },
    ],
  }),
  component: Agendar,
});

function Agendar() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Snowflake className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">Climatech</div>
            <div className="text-xs text-sidebar-foreground/60">Refrigeração · Gesso · Elétrica</div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Agende seu serviço</h1>
        <p className="mt-2 text-muted-foreground">O formulário de agendamento será implementado em breve.</p>
        <Link to="/" className="mt-6 inline-block text-sm text-primary hover:underline">Voltar ao painel</Link>
      </main>
    </div>
  );
}
