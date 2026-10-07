import { createFileRoute } from "@tanstack/react-router";
import { AppShell, EmBreve, PrimaryButton } from "@/components/AppShell";

export const Route = createFileRoute("/locais")({
  head: () => ({
    meta: [
      { title: "Locais — VM Climatização & Acabamentos" },
      { name: "description", content: "Endereços dos clientes com aparelhos, quadros elétricos e ambientes de gesso." },
      { property: "og:title", content: "Locais — VM Climatização & Acabamentos" },
      { property: "og:description", content: "Endereços dos clientes com aparelhos, quadros elétricos e ambientes de gesso." },
    ],
  }),
  component: () => (
    <AppShell title="Locais" actions={<PrimaryButton label="Novo local" />}>
      <EmBreve descricao="Endereços dos clientes com aparelhos, quadros elétricos e ambientes de gesso." />
    </AppShell>
  ),
});
