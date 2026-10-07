import { createFileRoute } from "@tanstack/react-router";
import { AppShell, EmBreve } from "@/components/AppShell";

export const Route = createFileRoute("/locais")({
  head: () => ({
    meta: [
      { title: "Locais — Climatech" },
      { name: "description", content: "Endereços dos clientes com aparelhos, quadros elétricos e ambientes de gesso." },
      { property: "og:title", content: "Locais — Climatech" },
      { property: "og:description", content: "Endereços dos clientes com aparelhos, quadros elétricos e ambientes de gesso." },
    ],
  }),
  component: () => (
    <AppShell title="Locais">
      <EmBreve descricao="Endereços dos clientes com aparelhos, quadros elétricos e ambientes de gesso." />
    </AppShell>
  ),
});
