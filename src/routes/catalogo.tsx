import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";

// A vitrine e o agendamento viraram uma página só em /agendar.
export const Route = createFileRoute("/catalogo")({
  head: pageHead("Serviços e portfólio", "Serviços de refrigeração, gesso e elétrica da VM Climatização & Acabamentos."),
  beforeLoad: () => {
    throw redirect({ to: "/agendar" });
  },
});
