import { createFileRoute } from "@tanstack/react-router";
import { AppShell, EmBreve } from "@/components/AppShell";

export const Route = createFileRoute("/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe — Climatech" },
      { name: "description", content: "Cadastro de técnicos com telefone e categorias de atuação." },
      { property: "og:title", content: "Equipe — Climatech" },
      { property: "og:description", content: "Cadastro de técnicos com telefone e categorias de atuação." },
    ],
  }),
  component: () => (
    <AppShell title="Equipe">
      <EmBreve descricao="Cadastro de técnicos com telefone e categorias de atuação." />
    </AppShell>
  ),
});
