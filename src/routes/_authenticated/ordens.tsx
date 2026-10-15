import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell, PrimaryButton } from "@/components/AppShell";
import { Field, FormPanel, Panel, StateRow, StatusSelect, inputCls } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { brl, dataBR, isoLocal } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { CATEGORIAS } from "@/lib/staff";
import { useClientes, useTecnicos } from "./-shared";

export const Route = createFileRoute("/_authenticated/ordens")({
  head: pageHead("Ordens de serviço", "Ordens abertas, em andamento e concluídas."),
  component: Ordens,
});

const STATUS = ["Aberta", "Em andamento", "Concluída", "Cancelada"];
const vazio = { client_id: "", tecnico_id: "", categoria: "Refrigeração", descricao: "", valor: "" };

function Ordens() {
  const qc = useQueryClient();
  const clientes = useClientes();
  const tecnicos = useTecnicos();
  const [aberto, setAberto] = useState(false);
  const [filtro, setFiltro] = useState("Todas");
  const [f, setF] = useState(vazio);
  const q = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("service_orders").select("id, numero, categoria, descricao, status, valor, inicio, concluida_em, clients(nome), profiles:tecnico_id(nome)").order("numero", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const inval = () => { qc.invalidateQueries({ queryKey: ["orders"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); qc.invalidateQueries({ queryKey: ["financeiro"] }); qc.invalidateQueries({ queryKey: ["dash-fin"] }); qc.invalidateQueries({ queryKey: ["recebimentos"] }); qc.invalidateQueries({ queryKey: ["dash-receber"] }); };
  const salvar = useMutation({
    mutationFn: async () => {
      if (!f.client_id || !f.descricao.trim()) throw new Error("Preencha cliente e descrição.");
      const valor = f.valor ? Number(f.valor.replace(/\./g, "").replace(",", ".")) : null;
      const { error } = await supabase.from("service_orders").insert({ client_id: f.client_id, tecnico_id: f.tecnico_id || null, categoria: f.categoria, descricao: f.descricao.trim(), valor });
      if (error) throw error;
    },
    onSuccess: () => { setF(vazio); setAberto(false); inval(); },
  });
  const status = useMutation({
    mutationFn: async ({ id, s }: { id: string; s: string }) => {
      const { error } = await supabase.from("service_orders").update({ status: s, concluida_em: s === "Concluída" ? isoLocal() : null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: inval,
  });
  const lista = (q.data ?? []).filter((o) => filtro === "Todas" || o.status === filtro);

  return (
    <AppShell title="Ordens de serviço" actions={<PrimaryButton label="Nova ordem" onClick={() => setAberto(true)} />}>
      {aberto && (
        <FormPanel title="Nova ordem de serviço" onClose={() => setAberto(false)} onSubmit={() => salvar.mutate()} saving={salvar.isPending} error={salvar.error?.message}>
          <Field label="Cliente">
            <select className={inputCls} value={f.client_id} onChange={(e) => setF({ ...f, client_id: e.target.value })} required>
              <option value="">Selecione</option>
              {clientes.data?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>
          <Field label="Categoria">
            <select className={inputCls} value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Técnico">
            <select className={inputCls} value={f.tecnico_id} onChange={(e) => setF({ ...f, tecnico_id: e.target.value })}>
              <option value="">Sem técnico</option>
              {tecnicos.data?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </Field>
          <Field label="Valor (R$)"><input className={inputCls} value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} inputMode="decimal" placeholder="0,00" /></Field>
          <Field label="Descrição" className="sm:col-span-2"><input className={inputCls} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} required /></Field>
        </FormPanel>
      )}
      <Panel title={`${lista.length} ordem(ns)`} action={
        <select aria-label="Filtrar" className={`${inputCls} h-8 w-36`} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          {["Todas", ...STATUS].map((s) => <option key={s}>{s}</option>)}
        </select>}>
        <StateRow loading={q.isLoading} error={q.error} empty={lista.length === 0} emptyText="Nenhuma ordem." />
        <ul className="divide-y">
          {lista.map((o) => (
            <li key={o.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[5rem_minmax(0,1fr)_7rem_auto]">
              <div className="hidden text-xs tabular-nums text-muted-foreground sm:block">OS-{String(o.numero).padStart(4, "0")}</div>
              <div className="min-w-0">
                <Link to="/ordem/$id" params={{ id: o.id }} className="block truncate text-sm font-medium text-primary hover:underline">{o.clients?.nome}</Link>
                <div className="truncate text-xs text-muted-foreground">{o.categoria} · {o.descricao}</div>
                <div className="text-xs tabular-nums text-muted-foreground">{o.inicio ? `Início ${dataBR(o.inicio)}` : ""}{o.concluida_em ? ` · concluída ${dataBR(o.concluida_em)}` : ""}{o.profiles?.nome ? ` · ${o.profiles.nome}` : ""}</div>
              </div>
              <div className="hidden text-right text-sm tabular-nums sm:block">{o.valor != null ? brl(Number(o.valor)) : "—"}</div>
              <StatusSelect value={o.status} options={STATUS} onChange={(s) => status.mutate({ id: o.id, s })} />
            </li>
          ))}
        </ul>
      </Panel>
    </AppShell>
  );
}
