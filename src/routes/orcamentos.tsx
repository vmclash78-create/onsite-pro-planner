import { createFileRoute } from "@tanstack/react-router";
import { AppShell, EmBreve, PrimaryButton } from "@/components/AppShell";

export const Route = createFileRoute("/orcamentos")({
  head: () => ({
    meta: [
      { title: "Orçamentos — VM Climatização & Acabamentos" },
      { name: "description", content: "Itens de material e mão de obra, total automático, status e link compartilhável." },
      { property: "og:title", content: "Orçamentos — VM Climatização & Acabamentos" },
      { property: "og:description", content: "Itens de material e mão de obra, total automático, status e link compartilhável." },
    ],
  }),
  component: () => (
    <AppShell title="Orçamentos" actions={<PrimaryButton label="Novo orçamento" />}>
      <EmBreve descricao="Itens de material e mão de obra, total automático, status e link compartilhável." />
    </AppShell>
  ),
});
