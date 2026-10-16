import { createFileRoute, redirect } from "@tanstack/react-router";

// A vitrine e o agendamento viraram uma página só em /agendar.
export const Route = createFileRoute("/catalogo")({
  beforeLoad: () => {
    throw redirect({ to: "/agendar" });
  },
});
