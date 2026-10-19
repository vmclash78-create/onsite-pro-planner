import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Current signed-in user plus their roles (read from the protected roles table). */
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const user = u.user;
      if (!user) return null;
      const [{ data: roles }, { data: perfil }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle(),
      ]);
      const r = (roles ?? []).map((x) => x.role as string);
      return { id: user.id, email: user.email ?? "", nome: perfil?.nome || user.email || "", roles: r, isDono: r.includes("dono"), isAdmin: r.includes("admin") || r.includes("dono"), isStaff: r.length > 0 };
    },
    staleTime: 60_000,
  });
}

export const CATEGORIAS = ["Refrigeração", "Gesso", "Elétrica"] as const;
export const TIPOS: Record<string, string[]> = {
  Refrigeração: ["Instalação", "Limpeza", "Manutenção", "Conserto"],
  Gesso: ["Forro", "Parede", "Sanca", "Reparo"],
  Elétrica: ["Ponto novo", "Quadro", "Instalação", "Reparo"],
};
export const STATUS_AG = ["Pendente", "Agendada", "Em andamento", "Concluída", "Cancelada"];
