import { createFileRoute } from "@tanstack/react-router";
import { AppShell, EmBreve, PrimaryButton } from "@/components/AppShell";

export const Route = createFileRoute("/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe — VM Climatização & Acabamentos" },
      { name: "description", content: "Cadastro de técnicos com telefone e categorias de atuação." },
      { property: "og:title", content: "Equipe — VM Climatização & Acabamentos" },
      { property: "og:description", content: "Cadastro de técnicos com telefone e categorias de atuação." },
    ],
  }),
  component: () => (
    <AppShell title="Equipe" actions={<PrimaryButton label="Novo técnico" />}>
      <EmBreve descricao="Cadastro de técnicos com telefone e categorias de atuação." />
    </AppShell>
  ),
});
