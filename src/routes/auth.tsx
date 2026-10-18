import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — VM Climatização & Acabamentos" },
      { name: "description", content: "Acesso da equipe ao painel da VM Climatização & Acabamentos." },
      { property: "og:title", content: "Entrar — VM Climatização & Acabamentos" },
      { property: "og:description", content: "Acesso da equipe ao painel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => { throw redirect({ to: "/inicio" }); },
});
