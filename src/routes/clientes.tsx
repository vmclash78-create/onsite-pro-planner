import { createFileRoute } from "@tanstack/react-router";
import { AppShell, EmBreve } from "@/components/AppShell";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Climatech" },
      { name: "description", content: "Lista com busca e filtros, contato, locais e histórico de serviços." },
      { property: "og:title", content: "Clientes — Climatech" },
      { property: "og:description", content: "Lista com busca e filtros, contato, locais e histórico de serviços." },
    ],
  }),
  component: () => (
    <AppShell title="Clientes">
      <EmBreve descricao="Lista com busca e filtros, contato, locais e histórico de serviços." />
    </AppShell>
  ),
});
