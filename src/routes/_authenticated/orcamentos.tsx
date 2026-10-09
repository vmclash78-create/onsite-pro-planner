import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell, PrimaryButton } from "@/components/AppShell";
import { Field, FormPanel, Panel, StateRow, StatusSelect, inputCls } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { brl, dataBR } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { useClientes } from "./-shared";

export const Route = createFileRoute("/_authenticated/orcamentos")({
  head: pageHead("Orçamentos", "Orçamentos enviados, aprovados e recusados."),
  component: Orcamentos,
});

const STATUS = ["Rascunho", "Aguardando", "Aprovado", "Recusado"];
const vazio = { client_id: "", descricao: "" };

function Orcamentos() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const clientes = useClientes();
  const [aberto, setAberto] = useState(false);
  const [filtro, setFiltro] = useState("Todos");
  const [f, setF] = useState(vazio);
  const q = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotes").select("id, numero, descricao, valor, status, enviado_em, clients(nome)").order("numero", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const inval = () => { qc.invalidateQueries({ queryKey: ["quotes"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); };
  const salvar = useMutation({
    mutationFn: async () => {
      if (!f.client_id || !f.descricao.trim()) throw new Error("Escolha o cliente e descreva o serviço.");
      const { data, error } = await supabase.from("quotes").insert({ client_id: f.client_id, descricao: f.descricao.trim(), valor: 0, status: "Rascunho" }).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => { setF(vazio); setAberto(false); inval(); nav({ to: "/orcamento/$id", params: { id } }); },
  });
  const status = useMutation({
    mutationFn: async ({ id, s }: { id: string; s: string }) => {
      const { error } = await supabase.from("quotes").update({ status: s }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: inval,
  });
  const lista = (q.data ?? []).filter((o) => filtro === "Todos" || o.status === filtro);

  return (
    <AppShell title="Orçamentos" actions={<PrimaryButton label="Novo orçamento" onClick={() => setAberto(true)} />}>
      {aberto && (
        <FormPanel title="Novo orçamento" onClose={() => setAberto(false)} onSubmit={() => salvar.mutate()} saving={salvar.isPending} error={salvar.error?.message}>
          <Field label="Cliente">
            <select className={inputCls} value={f.client_id} onChange={(e) => setF({ ...f, client_id: e.target.value })} required>
              <option value="">Selecione</option>
              {clientes.data?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>
          <Field label="Serviço (os itens e valores vêm na próxima tela)"><input className={inputCls} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} required /></Field>
        </FormPanel>
      )}
      <Panel title={`${lista.length} orçamento(s)`} action={
        <select aria-label="Filtrar" className={`${inputCls} h-8 w-36`} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          {["Todos", ...STATUS].map((s) => <option key={s}>{s}</option>)}
        </select>}>
        <StateRow loading={q.isLoading} error={q.error} empty={lista.length === 0} emptyText="Nenhum orçamento." />
        <ul className="divide-y">
          {lista.map((o) => (
            <li key={o.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[5rem_minmax(0,1fr)_8rem_auto]">
              <div className="hidden text-xs tabular-nums text-muted-foreground sm:block">ORC-{String(o.numero).padStart(4, "0")}</div>
              <div className="min-w-0">
                <Link to="/orcamento/$id" params={{ id: o.id }} className="block truncate text-sm font-medium hover:underline">{o.clients?.nome}</Link>
                <div className="truncate text-xs text-muted-foreground">{o.descricao}{o.enviado_em ? ` · ${dataBR(o.enviado_em)}` : ""}</div>
              </div>
              <div className="text-right text-sm tabular-nums">{brl(Number(o.valor))}</div>
              <StatusSelect value={o.status} options={STATUS} onChange={(s) => status.mutate({ id: o.id, s })} />
            </li>
          ))}
        </ul>
      </Panel>
    </AppShell>
  );
}
