import { createFileRoute } from "@tanstack/react-router";
import { AppShell, EmBreve, PrimaryButton } from "@/components/AppShell";

export const Route = createFileRoute("/lembretes")({
  head: () => ({
    meta: [
      { title: "Lembretes — VM Climatização & Acabamentos" },
      { name: "description", content: "Manutenções preventivas de refrigeração com intervalo configurável." },
      { property: "og:title", content: "Lembretes — VM Climatização & Acabamentos" },
      { property: "og:description", content: "Manutenções preventivas de refrigeração com intervalo configurável." },
    ],
  }),
  component: () => (
    <AppShell title="Lembretes" actions={<PrimaryButton label="Novo lembrete" />}>
      <EmBreve descricao="Manutenções preventivas de refrigeração com intervalo configurável." />
    </AppShell>
  ),
});
