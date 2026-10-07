import { createFileRoute } from "@tanstack/react-router";
import { AppShell, EmBreve, PrimaryButton } from "@/components/AppShell";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — VM Climatização & Acabamentos" },
      { name: "description", content: "Visão diária e semanal por técnico, com checagem de conflito de horário." },
      { property: "og:title", content: "Agenda — VM Climatização & Acabamentos" },
      { property: "og:description", content: "Visão diária e semanal por técnico, com checagem de conflito de horário." },
    ],
  }),
  component: () => (
    <AppShell title="Agenda" actions={<PrimaryButton label="Novo agendamento" />}>
      <EmBreve descricao="Visão diária e semanal por técnico, com checagem de conflito de horário." />
    </AppShell>
  ),
});
