import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell, PrimaryButton } from "@/components/AppShell";
import { Field, FormPanel, Panel, StateRow, inputCls } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { brl, isoLocal } from "@/lib/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: pageHead("Estoque", "Materiais em estoque, quantidades mínimas e valor parado."),
  component: Estoque,
});

const num = (s: string) => Number(s.replace(",", "."));

function Estoque() {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const vazio = { nome: "", unidade: "un", quantidade: "0", minimo: "0", custo: "" };
  const [f, setF] = useState(vazio);

  const q = useQuery({
    queryKey: ["estoque"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_items").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });
  const inval = () => { qc.invalidateQueries({ queryKey: ["estoque"] }); qc.invalidateQueries({ queryKey: ["financeiro"] }); };

  const salvar = useMutation({
    mutationFn: async () => {
      if (!f.nome.trim()) throw new Error("Informe o nome do material.");
      const { error } = await supabase.from("stock_items").insert({ nome: f.nome, unidade: f.unidade, quantidade: num(f.quantidade) || 0, minimo: num(f.minimo) || 0, custo: num(f.custo) || 0 });
      if (error) throw error;
    },
    onSuccess: () => { setF(vazio); setAberto(false); inval(); },
  });

  const mover = useMutation({
    mutationFn: async ({ id, nome, atual, custo, entrada }: { id: string; nome: string; atual: number; custo: number; entrada: boolean }) => {
      const r = prompt(entrada ? `Quantas unidades de "${nome}" chegaram?` : `Quantas unidades de "${nome}" foram usadas?`);
      const n = r ? num(r) : 0;
      if (!(n > 0)) return;
      const nova = entrada ? atual + n : Math.max(0, atual - n);
      const { error } = await supabase.from("stock_items").update({ quantidade: nova }).eq("id", id);
      if (error) throw error;
      if (entrada && custo > 0 && confirm(`Lançar a compra de ${brl(n * custo)} como saída no financeiro?`)) {
        const { error: e2 } = await supabase.from("financial_entries").insert({ tipo: "Saída", categoria: "Material", descricao: `Compra: ${n} × ${nome}`, valor: n * custo, data: isoLocal() });
        if (e2) throw e2;
      }
    },
    onSuccess: inval,
  });

  const total = q.data?.reduce((s, i) => s + Number(i.quantidade) * Number(i.custo), 0) ?? 0;
  const baixos = q.data?.filter((i) => Number(i.quantidade) <= Number(i.minimo)).length ?? 0;

  return (
    <AppShell title="Estoque" actions={<PrimaryButton label="Novo material" onClick={() => setAberto(true)} />}>
      {aberto && (
        <FormPanel title="Novo material" onClose={() => setAberto(false)} onSubmit={() => salvar.mutate()} saving={salvar.isPending} error={salvar.error?.message}>
          <Field label="Material"><input className={inputCls} placeholder="Ex.: Gás R410A" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} required /></Field>
          <Field label="Unidade">
            <select className={inputCls} value={f.unidade} onChange={(e) => setF({ ...f, unidade: e.target.value })}>
              {["un", "m", "kg", "m²", "rolo", "saco", "caixa"].map((u) => <option key={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="Quantidade atual"><input className={inputCls} inputMode="decimal" value={f.quantidade} onChange={(e) => setF({ ...f, quantidade: e.target.value })} /></Field>
          <Field label="Quantidade mínima"><input className={inputCls} inputMode="decimal" value={f.minimo} onChange={(e) => setF({ ...f, minimo: e.target.value })} /></Field>
          <Field label="Custo por unidade (R$)"><input className={inputCls} inputMode="decimal" placeholder="0,00" value={f.custo} onChange={(e) => setF({ ...f, custo: e.target.value })} /></Field>
        </FormPanel>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4"><div className="text-xs text-muted-foreground">Valor em estoque</div><div className="mt-1 text-2xl font-semibold tabular-nums">{brl(total)}</div></div>
        <div className="rounded-lg border bg-card p-4"><div className="text-xs text-muted-foreground">Abaixo do mínimo</div><div className={`mt-1 text-2xl font-semibold tabular-nums ${baixos ? "text-destructive" : ""}`}>{baixos}</div></div>
      </div>

      <Panel title={`${q.data?.length ?? 0} material(is)`}>
        <StateRow loading={q.isLoading} error={q.error || mover.error} empty={q.data?.length === 0} emptyText="Nenhum material cadastrado." />
        <ul className="divide-y">
          {q.data?.map((i) => {
            const qt = Number(i.quantidade), baixo = qt <= Number(i.minimo);
            return (
              <li key={i.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{i.nome}</div>
                  <div className="text-xs tabular-nums text-muted-foreground">{brl(Number(i.custo))}/{i.unidade} · mínimo {Number(i.minimo)}</div>
                </div>
                <div className={`text-right text-sm font-medium tabular-nums ${baixo ? "text-destructive" : ""}`}>{qt} {i.unidade}{baixo && <div className="text-[11px] font-normal">Repor</div>}</div>
                <div className="col-span-2 flex gap-2 sm:col-span-1">
                  <button onClick={() => mover.mutate({ id: i.id, nome: i.nome, atual: qt, custo: Number(i.custo), entrada: true })} className="h-8 rounded-[6px] border px-3 text-xs hover:bg-muted">Entrada</button>
                  <button onClick={() => mover.mutate({ id: i.id, nome: i.nome, atual: qt, custo: Number(i.custo), entrada: false })} className="h-8 rounded-[6px] border px-3 text-xs hover:bg-muted">Saída</button>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
    </AppShell>
  );
}
