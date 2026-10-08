import { createFileRoute, Outlet } from "@tanstack/react-router";

// MODO TESTE: verificação de login desativada temporariamente.
// Para reativar, restaurar o beforeLoad que redireciona para /auth.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: () => <Outlet />,
});
