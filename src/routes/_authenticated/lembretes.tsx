import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell, PrimaryButton } from "@/components/AppShell";
import { Field, FormPanel, Panel, StateRow, inputCls } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { addDias, dataBR, diasEntre, isoLocal } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { WhatsButton } from "@/components/WhatsButton";

export const Route = createFileRoute("/_authenticated/lembretes")({
  head: pageHead("Lembretes", "Manutenções preventivas de ar-condicionado por aparelho."),
  component: Lembretes,
});

const vazio = { location_id: "", descricao: "", ultima_manutencao: "", intervalo_meses: "6" };

function Lembretes() {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState(vazio);
  const locais = useQuery({
    queryKey: ["locations-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("id, apelido, clients(nome)");
      if (error) throw error;
      return data;
    },
  });
  const q = useQuery({
    queryKey: ["equipment"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment").select("id, descricao, ultima_manutencao, intervalo_meses, locations(apelido, bairro, cidade, client_id, clients(nome, whatsapp))");
      if (error) throw error;
      const hoje = isoLocal();
      return data.map((e) => {
        const proxima = e.ultima_manutencao ? addDias(e.ultima_manutencao, e.intervalo_meses * 30) : hoje;
        return { ...e, proxima, falta: diasEntre(hoje, proxima) };
      }).sort((a, b) => a.falta - b.falta);
    },
  });
  const inval = () => { qc.invalidateQueries({ queryKey: ["equipment"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); };
  const salvar = useMutation({
    mutationFn: async () => {
      if (!f.location_id || !f.descricao.trim()) throw new Error("Escolha o local e descreva o aparelho.");
      const { error } = await supabase.from("equipment").insert({ location_id: f.location_id, descricao: f.descricao.trim(), ultima_manutencao: f.ultima_manutencao || null, intervalo_meses: Number(f.intervalo_meses) || 6 });
      if (error) throw error;
    },
    onSuccess: () => { setF(vazio); setAberto(false); inval(); },
  });
  const feita = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipment").update({ ultima_manutencao: isoLocal() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: inval,
  });

  return (
    <AppShell title="Lembretes" actions={<PrimaryButton label="Novo aparelho" onClick={() => setAberto(true)} />}>
      {aberto && (
        <FormPanel title="Novo aparelho" onClose={() => setAberto(false)} onSubmit={() => salvar.mutate()} saving={salvar.isPending} error={salvar.error?.message}>
          <Field label="Local">
            <select className={inputCls} value={f.location_id} onChange={(e) => setF({ ...f, location_id: e.target.value })} required>
              <option value="">Selecione</option>
              {locais.data?.map((l) => <option key={l.id} value={l.id}>{l.clients?.nome} — {l.apelido}</option>)}
            </select>
          </Field>
          <Field label="Aparelho"><input className={inputCls} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} placeholder="Split 12.000 BTU — quarto" required /></Field>
          <Field label="Última manutenção"><input type="date" className={inputCls} value={f.ultima_manutencao} onChange={(e) => setF({ ...f, ultima_manutencao: e.target.value })} /></Field>
          <Field label="Intervalo (meses)"><input className={inputCls} value={f.intervalo_meses} onChange={(e) => setF({ ...f, intervalo_meses: e.target.value })} inputMode="numeric" /></Field>
        </FormPanel>
      )}
      <Panel title={`${q.data?.length ?? 0} aparelho(s)`}>
        <StateRow loading={q.isLoading} error={q.error} empty={q.data?.length === 0} emptyText="Nenhum aparelho cadastrado." />
        <ul className="divide-y">
          {q.data?.map((e) => (
            <li key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{e.locations?.clients?.nome} <span className="font-normal text-muted-foreground">· {e.descricao}</span></div>
                <div className="truncate text-xs text-muted-foreground">
                  {e.locations?.bairro ? `${e.locations.bairro}, ` : ""}{e.locations?.cidade} · próxima em {dataBR(e.proxima)} ·{" "}
                  <span className={e.falta < 0 ? "text-destructive" : e.falta <= 15 ? "text-warning" : ""}>{e.falta < 0 ? `vencida há ${-e.falta} dias` : `faltam ${e.falta} dias`}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-start justify-end gap-2">
              {e.falta < 0 && (
                <WhatsButton label="Avisar no WhatsApp" chave="preventiva" telefone={e.locations?.clients?.whatsapp} clienteId={e.locations?.client_id ?? null} referenciaId={e.id}
                  vars={{ nome: e.locations?.clients?.nome ?? "", modelo_aparelho: e.descricao, servico: "manutenção preventiva", data: dataBR(e.proxima) }} />
              )}
              <button onClick={() => feita.mutate(e.id)} disabled={feita.isPending} className="h-8 rounded-[6px] border px-3 text-xs hover:bg-muted">Manutenção feita</button>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </AppShell>
  );
}
