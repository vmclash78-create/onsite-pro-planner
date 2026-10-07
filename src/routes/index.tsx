import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel — VM Climatização & Acabamentos" },
      { name: "description", content: "Painel de gestão da VM Climatização & Acabamentos." },
      { property: "og:title", content: "Painel — VM Climatização & Acabamentos" },
      { property: "og:description", content: "Painel de gestão da VM Climatização & Acabamentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/inicio" });
  },
});
