import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell, PrimaryButton } from "@/components/AppShell";
import { Field, FormPanel, Panel, StateRow, inputCls } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/seo";
import { useClientes } from "./-shared";

export const Route = createFileRoute("/_authenticated/locais")({
  head: pageHead("Locais", "Endereços de atendimento de cada cliente."),
  component: Locais,
});

const vazio = { client_id: "", apelido: "Principal", endereco: "", bairro: "", cidade: "Hidrolândia/CE", cep: "" };

function Locais() {
  const qc = useQueryClient();
  const clientes = useClientes();
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState(vazio);
  const q = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("id, apelido, endereco, bairro, cidade, cep, clients(nome), equipment(id)").order("cidade");
      if (error) throw error;
      return data;
    },
  });
  const salvar = useMutation({
    mutationFn: async () => {
      if (!f.client_id || !f.endereco.trim()) throw new Error("Escolha o cliente e informe o endereço.");
      const { error } = await supabase.from("locations").insert({ ...f, bairro: f.bairro || null, cep: f.cep || null });
      if (error) throw error;
    },
    onSuccess: () => { setF(vazio); setAberto(false); qc.invalidateQueries({ queryKey: ["locations"] }); qc.invalidateQueries({ queryKey: ["clients"] }); },
  });
  const set = (k: keyof typeof vazio) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <AppShell title="Locais" actions={<PrimaryButton label="Novo local" onClick={() => setAberto(true)} />}>
      {aberto && (
        <FormPanel title="Novo local" onClose={() => setAberto(false)} onSubmit={() => salvar.mutate()} saving={salvar.isPending} error={salvar.error?.message}>
          <Field label="Cliente">
            <select className={inputCls} value={f.client_id} onChange={set("client_id")} required>
              <option value="">Selecione</option>
              {clientes.data?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>
          <Field label="Nome do local"><input className={inputCls} value={f.apelido} onChange={set("apelido")} /></Field>
          <Field label="Endereço"><input className={inputCls} value={f.endereco} onChange={set("endereco")} required /></Field>
          <Field label="Bairro"><input className={inputCls} value={f.bairro} onChange={set("bairro")} /></Field>
          <Field label="Cidade"><input className={inputCls} value={f.cidade} onChange={set("cidade")} /></Field>
          <Field label="CEP"><input className={inputCls} value={f.cep} onChange={set("cep")} inputMode="numeric" /></Field>
        </FormPanel>
      )}
      <Panel title={`${q.data?.length ?? 0} local(is)`}>
        <StateRow loading={q.isLoading} error={q.error} empty={q.data?.length === 0} emptyText="Nenhum local cadastrado." />
        <ul className="divide-y">
          {q.data?.map((l) => (
            <li key={l.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_6rem] sm:gap-4">
              <div className="min-w-0"><div className="truncate text-sm font-medium">{l.clients?.nome}</div><div className="text-xs text-muted-foreground">{l.apelido}</div></div>
              <div className="truncate text-sm text-muted-foreground">{l.endereco}{l.bairro ? ` — ${l.bairro}` : ""}, {l.cidade}</div>
              <div className="text-xs tabular-nums text-muted-foreground sm:text-right">{l.equipment.length} aparelho(s)</div>
            </li>
          ))}
        </ul>
      </Panel>
    </AppShell>
  );
}
