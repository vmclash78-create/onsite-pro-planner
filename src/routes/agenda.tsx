import { createFileRoute } from "@tanstack/react-router";
import { AppShell, EmBreve } from "@/components/AppShell";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — Climatech" },
      { name: "description", content: "Visão diária e semanal por técnico, com checagem de conflito de horário." },
      { property: "og:title", content: "Agenda — Climatech" },
      { property: "og:description", content: "Visão diária e semanal por técnico, com checagem de conflito de horário." },
    ],
  }),
  component: () => (
    <AppShell title="Agenda">
      <EmBreve descricao="Visão diária e semanal por técnico, com checagem de conflito de horário." />
    </AppShell>
  ),
});
