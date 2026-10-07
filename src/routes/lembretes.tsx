import { createFileRoute } from "@tanstack/react-router";
import { AppShell, EmBreve } from "@/components/AppShell";

export const Route = createFileRoute("/lembretes")({
  head: () => ({
    meta: [
      { title: "Lembretes — Climatech" },
      { name: "description", content: "Manutenções preventivas de refrigeração com intervalo configurável." },
      { property: "og:title", content: "Lembretes — Climatech" },
      { property: "og:description", content: "Manutenções preventivas de refrigeração com intervalo configurável." },
    ],
  }),
  component: () => (
    <AppShell title="Lembretes">
      <EmBreve descricao="Manutenções preventivas de refrigeração com intervalo configurável." />
    </AppShell>
  ),
});
