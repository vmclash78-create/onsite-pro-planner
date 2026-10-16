import { createFileRoute, Outlet } from "@tanstack/react-router";

// MODO DE TESTE: login desligado a pedido do usuário.
// Para religar: adicione beforeLoad com supabase.auth.getUser() e redirect({ to: "/auth" }).
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: () => <Outlet />,
});
