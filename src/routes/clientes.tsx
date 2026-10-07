import { createFileRoute } from "@tanstack/react-router";
import { AppShell, EmBreve, PrimaryButton } from "@/components/AppShell";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — VM Climatização & Acabamentos" },
      { name: "description", content: "Lista com busca e filtros, contato, locais e histórico de serviços." },
      { property: "og:title", content: "Clientes — VM Climatização & Acabamentos" },
      { property: "og:description", content: "Lista com busca e filtros, contato, locais e histórico de serviços." },
    ],
  }),
  component: () => (
    <AppShell title="Clientes" actions={<PrimaryButton label="Novo cliente" />}>
      <EmBreve descricao="Lista com busca e filtros, contato, locais e histórico de serviços." />
    </AppShell>
  ),
});
