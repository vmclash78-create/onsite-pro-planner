import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Panel, StateRow } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/seo";
import { useMe } from "@/lib/staff";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: pageHead("Equipe", "Técnicos e administradores com acesso ao painel."),
  component: Equipe,
});

type Papel = "admin" | "tecnico" | "nenhum";

function Equipe() {
  const qc = useQueryClient();
  const me = useMe();
  const q = useQuery({
    queryKey: ["equipe"],
    queryFn: async () => {
      const [{ data: perfis, error }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, nome, email, telefone").order("nome"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      return (perfis ?? []).map((p) => {
        const r = (roles ?? []).filter((x) => x.user_id === p.id).map((x) => x.role);
        return { ...p, papel: (r.includes("admin") ? "admin" : r.includes("tecnico") ? "tecnico" : "nenhum") as Papel };
      });
    },
  });
  const mudar = useMutation({
    mutationFn: async ({ id, papel }: { id: string; papel: Papel }) => {
      const del = await supabase.from("user_roles").delete().eq("user_id", id);
      if (del.error) throw del.error;
      if (papel !== "nenhum") {
        const ins = await supabase.from("user_roles").insert({ user_id: id, role: papel });
        if (ins.error) throw ins.error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipe"] }),
  });

  return (
    <AppShell title="Equipe">
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Cada pessoa cria a própria conta na tela de entrada. Depois, o administrador libera o acesso aqui.
      </p>
      <Panel title={`${q.data?.length ?? 0} pessoa(s)`}>
        <StateRow loading={q.isLoading} error={q.error} empty={q.data?.length === 0} />
        {mudar.error && <p className="px-4 pt-3 text-xs text-destructive">Não foi possível alterar o acesso.</p>}
        <ul className="divide-y">
          {q.data?.map((p) => (
            <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{p.nome || "Sem nome"}</div>
                <div className="truncate text-xs text-muted-foreground">{p.email}</div>
              </div>
              {me.data?.isAdmin && p.id !== me.data.id ? (
                <select aria-label={`Acesso de ${p.nome}`} value={p.papel} onChange={(e) => mudar.mutate({ id: p.id, papel: e.target.value as Papel })}
                  className="h-8 rounded-[6px] border border-input bg-background px-2 text-xs">
                  <option value="nenhum">Sem acesso</option>
                  <option value="tecnico">Técnico</option>
                  <option value="admin">Administrador</option>
                </select>
              ) : (
                <span className="text-xs text-muted-foreground">{p.papel === "admin" ? "Administrador" : p.papel === "tecnico" ? "Técnico" : "Sem acesso"}</span>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </AppShell>
  );
}
