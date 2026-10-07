import { createFileRoute } from "@tanstack/react-router";
import { AppShell, EmBreve } from "@/components/AppShell";

export const Route = createFileRoute("/orcamentos")({
  head: () => ({
    meta: [
      { title: "Orçamentos — Climatech" },
      { name: "description", content: "Itens de material e mão de obra, total automático, status e link compartilhável." },
      { property: "og:title", content: "Orçamentos — Climatech" },
      { property: "og:description", content: "Itens de material e mão de obra, total automático, status e link compartilhável." },
    ],
  }),
  component: () => (
    <AppShell title="Orçamentos">
      <EmBreve descricao="Itens de material e mão de obra, total automático, status e link compartilhável." />
    </AppShell>
  ),
});
