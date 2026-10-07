import { createFileRoute } from "@tanstack/react-router";
import { AppShell, EmBreve, PrimaryButton } from "@/components/AppShell";

export const Route = createFileRoute("/ordens")({
  head: () => ({
    meta: [
      { title: "Ordens de serviço — VM Climatização & Acabamentos" },
      { name: "description", content: "Status, técnico responsável, fotos antes/depois e histórico do local." },
      { property: "og:title", content: "Ordens de serviço — VM Climatização & Acabamentos" },
      { property: "og:description", content: "Status, técnico responsável, fotos antes/depois e histórico do local." },
    ],
  }),
  component: () => (
    <AppShell title="Ordens de serviço" actions={<PrimaryButton label="Nova ordem" />}>
      <EmBreve descricao="Status, técnico responsável, fotos antes/depois e histórico do local." />
    </AppShell>
  ),
});
