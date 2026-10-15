import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell, PrimaryButton } from "@/components/AppShell";
import { Field, FormPanel, Panel, StateRow, inputCls } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: pageHead("Clientes", "Cadastro de clientes com contato e endereços."),
  component: Clientes,
});

const vazio = { nome: "", whatsapp: "", email: "", endereco: "", bairro: "", cidade: "Hidrolândia/CE", observacoes: "" };

function Clientes() {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [f, setF] = useState(vazio);
  const q = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, nome, whatsapp, email, locations(endereco, bairro, cidade)").order("nome");
      if (error) throw error;
      return data;
    },
  });
  const salvar = useMutation({
    mutationFn: async () => {
      if (!f.nome.trim()) throw new Error("Informe o nome.");
      const { data, error } = await supabase.from("clients").insert({ nome: f.nome.trim(), whatsapp: f.whatsapp || null, email: f.email || null, observacoes: f.observacoes || null }).select("id").single();
      if (error) throw error;
      if (f.endereco.trim()) {
        const r = await supabase.from("locations").insert({ client_id: data.id, endereco: f.endereco.trim(), bairro: f.bairro || null, cidade: f.cidade || "Hidrolândia/CE" });
        if (r.error) throw r.error;
      }
    },
    onSuccess: () => { setF(vazio); setAberto(false); qc.invalidateQueries({ queryKey: ["clients"] }); },
  });
  const set = (k: keyof typeof vazio) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const lista = (q.data ?? []).filter((c) => c.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <AppShell title="Clientes" actions={<PrimaryButton label="Novo cliente" onClick={() => setAberto(true)} />}>
      {aberto && (
        <FormPanel title="Novo cliente" onClose={() => setAberto(false)} onSubmit={() => salvar.mutate()} saving={salvar.isPending} error={salvar.error?.message}>
          <Field label="Nome"><input className={inputCls} value={f.nome} onChange={set("nome")} required /></Field>
          <Field label="WhatsApp"><input className={inputCls} value={f.whatsapp} onChange={set("whatsapp")} inputMode="tel" /></Field>
          <Field label="E-mail"><input className={inputCls} type="email" value={f.email} onChange={set("email")} /></Field>
          <Field label="Endereço"><input className={inputCls} value={f.endereco} onChange={set("endereco")} placeholder="Rua, número" /></Field>
          <Field label="Bairro"><input className={inputCls} value={f.bairro} onChange={set("bairro")} /></Field>
          <Field label="Cidade"><input className={inputCls} value={f.cidade} onChange={set("cidade")} /></Field>
        </FormPanel>
      )}
      <Panel title={`${lista.length} cliente(s)`} action={<input className={`${inputCls} h-8 w-44`} placeholder="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} />}>
        <StateRow loading={q.isLoading} error={q.error} empty={lista.length === 0} emptyText="Nenhum cliente encontrado." />
        <ul className="divide-y">
          {lista.map((c) => (
            <li key={c.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)] sm:gap-4">
              <Link to="/cliente/$id" params={{ id: c.id }} className="truncate text-sm font-medium text-primary hover:underline">{c.nome}</Link>
              <div className="text-sm tabular-nums text-muted-foreground">{c.whatsapp ?? "—"}</div>
              <div className="truncate text-xs text-muted-foreground sm:text-sm">{c.locations[0] ? `${c.locations[0].endereco} — ${c.locations[0].bairro ?? ""}, ${c.locations[0].cidade}` : "Sem endereço"}{c.locations.length > 1 ? ` (+${c.locations.length - 1})` : ""}</div>
            </li>
          ))}
        </ul>
      </Panel>
    </AppShell>
  );
}
