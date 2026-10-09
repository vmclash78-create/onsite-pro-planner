import { createFileRoute, Outlet } from "@tanstack/react-router";

// TESTE: verificação de login desligada a pedido do usuário.
// Para religar, restaure o beforeLoad:
//   beforeLoad: async () => {
//     const { data } = await supabase.auth.getUser();
//     if (!data.user) throw redirect({ to: "/auth" });
//   },
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: () => <Outlet />,
});
