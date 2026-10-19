import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Field, Panel, StateRow, inputCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/seo";
import { useMe } from "@/lib/staff";
import { maskTel, telefoneValido } from "@/lib/telefone";
import { notificarMembro } from "@/lib/push.functions";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: pageHead("Equipe", "Dono, administradores e técnicos com acesso ao painel."),
  component: Equipe,
});

type Papel = "dono" | "admin" | "tecnico" | "nenhum";
const ROTULO: Record<Papel, string> = { dono: "Dono", admin: "Administrador", tecnico: "Técnico", nenhum: "Sem acesso" };
type Membro = { id: string; nome: string; email: string | null; telefone: string | null; especialidade: string | null; papel: Papel };

function Equipe() {
  const me = useMe();
  const q = useQuery({
    queryKey: ["equipe"],
    queryFn: async (): Promise<Membro[]> => {
      const [{ data: perfis, error }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, nome, email, telefone, especialidade").order("nome"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      return (perfis ?? []).map((p) => {
        const r = (roles ?? []).filter((x) => x.user_id === p.id).map((x) => x.role as string);
        const papel: Papel = r.includes("dono") ? "dono" : r.includes("admin") ? "admin" : r.includes("tecnico") ? "tecnico" : "nenhum";
        return { ...p, papel };
      });
    },
  });

  return (
    <AppShell title="Equipe">
      <div className="mb-4 max-w-2xl space-y-1 text-sm text-muted-foreground">
        <p>Cada pessoa cria a própria conta na tela de entrada. Depois o dono escolhe o cargo e pode editar os dados dela aqui.</p>
        <p><strong className="text-foreground">Dono:</strong> pode tudo. <strong className="text-foreground">Administrador:</strong> pedidos, agenda, orçamentos, ordens e escolher o técnico. <strong className="text-foreground">Técnico:</strong> só os próprios atendimentos.</p>
      </div>
      <Panel title={`${q.data?.length ?? 0} pessoa(s)`}>
        <StateRow loading={q.isLoading} error={q.error} empty={q.data?.length === 0} />
        <ul className="divide-y">
          {q.data?.map((p) => <MembroItem key={p.id} p={p} souDono={!!me.data?.isDono} souAdmin={!!me.data?.isAdmin} meuId={me.data?.id ?? ""} />)}
        </ul>
      </Panel>
    </AppShell>
  );
}

interface MembroItemProps { p: Membro; souDono: boolean; souAdmin: boolean; meuId: string }

function MembroItem({ p, souDono, souAdmin, meuId }: MembroItemProps) {
  const qc = useQueryClient();
  const notificar = useServerFn(notificarMembro);
  const [editando, setEditando] = useState(false);
  const [f, setF] = useState({ nome: p.nome, telefone: p.telefone ?? "", especialidade: p.especialidade ?? "" });
  const inval = () => { for (const k of ["equipe", "me", "tecnicos"]) qc.invalidateQueries({ queryKey: [k] }); };

  const mudar = useMutation({
    mutationFn: async (papel: Exclude<Papel, "dono">) => {
      const del = await supabase.from("user_roles").delete().eq("user_id", p.id);
      if (del.error) throw del.error;
      if (papel !== "nenhum") {
        const ins = await supabase.from("user_roles").insert({ user_id: p.id, role: papel });
        if (ins.error) throw ins.error;
      }
    },
    onSuccess: () => { inval(); toast.success("Cargo alterado."); },
    onError: () => toast.error("Não foi possível alterar o cargo."),
  });
  const salvar = useMutation({
    mutationFn: async () => {
      const nome = f.nome.trim().replace(/\s+/g, " ");
      if (nome.length < 2) throw new Error("Digite o nome.");
      if (f.telefone && !telefoneValido(f.telefone)) throw new Error("WhatsApp incompleto: use DDD + número.");
      const { error } = await supabase.from("profiles").update({ nome: nome.slice(0, 80), telefone: f.telefone || null, especialidade: f.especialidade.trim() || null }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => { inval(); setEditando(false); toast.success("Dados salvos."); },
  });
  const aviso = useMutation({
    mutationFn: async () => {
      const texto = prompt(`Mensagem para ${p.nome}:`, "Confira sua agenda, por favor.");
      if (!texto?.trim()) return null;
      return notificar({ data: { userId: p.id, titulo: "Aviso da VM Climatização", texto: texto.trim() } });
    },
    onSuccess: (r) => { if (r) toast[r.enviados ? "success" : "warning"](r.enviados ? "Notificação enviada." : `${p.nome} ainda não ativou as notificações no celular.`); },
    onError: (e) => toast.error(e.message),
  });

  const podeEditar = souDono && (p.papel !== "dono" || p.id === meuId);
  return (
    <li className="px-4 py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{p.nome || "Sem nome"}</div>
          <div className="truncate text-xs text-muted-foreground">{[p.email, p.telefone, p.especialidade].filter(Boolean).join(" · ")}</div>
        </div>
        <div className="flex items-center gap-1">
          {souAdmin && p.papel !== "nenhum" && p.id !== meuId && (
            <Button size="icon" variant="ghost" aria-label={`Notificar ${p.nome}`} disabled={aviso.isPending} onClick={() => aviso.mutate()}><BellRing className="h-4 w-4" /></Button>
          )}
          {podeEditar && <Button size="icon" variant="ghost" aria-label={`Editar ${p.nome}`} onClick={() => setEditando((v) => !v)}><Pencil className="h-4 w-4" /></Button>}
          {souDono && p.id !== meuId && p.papel !== "dono" ? (
            <select aria-label={`Cargo de ${p.nome}`} value={p.papel} disabled={mudar.isPending} onChange={(e) => mudar.mutate(e.target.value as Exclude<Papel, "dono">)}
              className="h-8 rounded-[6px] border border-input bg-background px-2 text-xs">
              <option value="nenhum">Sem acesso</option>
              <option value="tecnico">Técnico</option>
              <option value="admin">Administrador</option>
            </select>
          ) : (
            <span className="text-xs text-muted-foreground">{ROTULO[p.papel]}</span>
          )}
        </div>
      </div>
      {editando && (
        <form className="mt-3 grid gap-3 rounded-md border bg-muted/40 p-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); salvar.mutate(); }}>
          <Field label="Nome"><input className={inputCls} value={f.nome} maxLength={80} onChange={(e) => setF({ ...f, nome: e.target.value })} /></Field>
          <Field label="WhatsApp"><input className={inputCls} value={f.telefone} inputMode="tel" placeholder="(88) 99999-9999" onChange={(e) => setF({ ...f, telefone: maskTel(e.target.value) })} /></Field>
          <Field label="Especialidade"><input className={inputCls} value={f.especialidade} maxLength={60} placeholder="Ex.: Refrigeração" onChange={(e) => setF({ ...f, especialidade: e.target.value })} /></Field>
          {salvar.error && <p role="alert" className="text-xs text-destructive sm:col-span-3">{salvar.error.message}</p>}
          <div className="flex justify-end gap-2 sm:col-span-3">
            <Button type="button" variant="ghost" onClick={() => setEditando(false)}>Cancelar</Button>
            <Button disabled={salvar.isPending}>Salvar</Button>
          </div>
        </form>
      )}
    </li>
  );
}
