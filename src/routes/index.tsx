import { createFileRoute, redirect } from "@tanstack/react-router";

const OG = "https://vmclimatizacao.lovable.app/og-agendar.jpg";
const T = "Agendamento · VM Climatização & Acabamentos";
const D = "Solicite serviços e orçamentos de climatização, gesso e elétrica em Hidrolândia e região e em Fortaleza/CE.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: T },
      { name: "description", content: D },
      { property: "og:title", content: T },
      { property: "og:description", content: D },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/agendar" });
  },
});
