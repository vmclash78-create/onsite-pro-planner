import { createFileRoute } from "@tanstack/react-router";
import { AppShell, EmBreve } from "@/components/AppShell";

export const Route = createFileRoute("/ordens")({
  head: () => ({
    meta: [
      { title: "Ordens de serviço — Climatech" },
      { name: "description", content: "Status, técnico responsável, fotos antes/depois e histórico do local." },
      { property: "og:title", content: "Ordens de serviço — Climatech" },
      { property: "og:description", content: "Status, técnico responsável, fotos antes/depois e histórico do local." },
    ],
  }),
  component: () => (
    <AppShell title="Ordens de serviço">
      <EmBreve descricao="Status, técnico responsável, fotos antes/depois e histórico do local." />
    </AppShell>
  ),
});
