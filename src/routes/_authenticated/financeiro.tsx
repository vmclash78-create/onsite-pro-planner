import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell, PrimaryButton } from "@/components/AppShell";
import { Field, FormPanel, Panel, StateRow, inputCls } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { brl, dataBR, isoLocal } from "@/lib/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: pageHead("Financeiro", "Entradas, saídas, lucro e prejuízo do mês."),
  component: Financeiro,
});

const CATS = { Entrada: ["Serviço", "Venda de material", "Outros"], Saída: ["Material", "Combustível", "Salário", "Ferramentas", "Aluguel", "Impostos", "Outros"] } as const;

function Financeiro() {
  const qc = useQueryClient();
  const [mes, setMes] = useState(() => isoLocal().slice(0, 7));
  const [aberto, setAberto] = useState(false);
  const vazio = { tipo: "Entrada" as "Entrada" | "Saída", descricao: "", categoria: "Serviço", valor: "", data: isoLocal() };
  const [f, setF] = useState(vazio);
  const [y, m] = mes.split("-").map(Number) as [number, number];
  const ini = `${mes}-01`, fim = isoLocal(new Date(y, m, 0));

  const q = useQuery({
    queryKey: ["financeiro", mes],
    queryFn: async () => {
      const { data, error } = await supabase.from("financial_entries").select("*").gte("data", ini).lte("data", fim).order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const inval = () => qc.invalidateQueries({ queryKey: ["financeiro"] });
  const salvar = useMutation({
    mutationFn: async () => {
      const valor = Number(f.valor.replace(/\./g, "").replace(",", "."));
      if (!f.descricao.trim() || !(valor > 0)) throw new Error("Informe descrição e valor.");
      const { error } = await supabase.from("financial_entries").insert({ ...f, valor });
      if (error) throw error;
    },
    onSuccess: () => { setF(vazio); setAberto(false); inval(); },
  });
  const excluir = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("financial_entries").delete().eq("id", id); if (error) throw error; },
    onSuccess: inval,
  });

  const ent = q.data?.filter((e) => e.tipo === "Entrada").reduce((s, e) => s + Number(e.valor), 0) ?? 0;
  const sai = q.data?.filter((e) => e.tipo === "Saída").reduce((s, e) => s + Number(e.valor), 0) ?? 0;
  const res = ent - sai;
  const porCat = Object.entries((q.data ?? []).filter((e) => e.tipo === "Saída").reduce<Record<string, number>>((a, e) => ({ ...a, [e.categoria]: (a[e.categoria] ?? 0) + Number(e.valor) }), {})).sort((a, b) => b[1] - a[1]);

  return (
    <AppShell title="Financeiro" actions={<PrimaryButton label="Novo lançamento" onClick={() => setAberto(true)} />}>
      {aberto && (
        <FormPanel title="Novo lançamento" onClose={() => setAberto(false)} onSubmit={() => salvar.mutate()} saving={salvar.isPending} error={salvar.error?.message}>
          <Field label="Tipo">
            <select className={inputCls} value={f.tipo} onChange={(e) => { const t = e.target.value as "Entrada" | "Saída"; setF({ ...f, tipo: t, categoria: CATS[t][0] }); }}>
              <option>Entrada</option><option>Saída</option>
            </select>
          </Field>
          <Field label="Categoria">
            <select className={inputCls} value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
              {CATS[f.tipo].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Descrição"><input className={inputCls} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} required /></Field>
          <Field label="Valor (R$)"><input className={inputCls} inputMode="decimal" placeholder="0,00" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} required /></Field>
          <Field label="Data"><input type="date" className={inputCls} value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} required /></Field>
        </FormPanel>
      )}

      <div className="mb-4 flex items-center gap-2">
        <input type="month" aria-label="Mês" className={`${inputCls} h-9 w-44`} value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Entrou" value={brl(ent)} cls="text-success" />
        <Kpi label="Saiu" value={brl(sai)} cls="text-destructive" />
        <Kpi label={res >= 0 ? "Lucro do mês" : "Prejuízo do mês"} value={brl(Math.abs(res))} cls={res >= 0 ? "text-success" : "text-destructive"}
          sub={ent > 0 ? `Margem ${Math.round((res / ent) * 100)}%` : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Lançamentos">
          <StateRow loading={q.isLoading} error={q.error} empty={q.data?.length === 0} emptyText="Nenhum lançamento neste mês." />
          <ul className="divide-y">
            {q.data?.map((e) => (
              <li key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{e.descricao}</div>
                  <div className="text-xs tabular-nums text-muted-foreground">{dataBR(e.data)} · {e.categoria}</div>
                </div>
                <div className={`text-sm font-medium tabular-nums ${e.tipo === "Entrada" ? "text-success" : "text-destructive"}`}>{e.tipo === "Entrada" ? "+" : "−"} {brl(Number(e.valor))}</div>
                <button onClick={() => confirm("Excluir lançamento?") && excluir.mutate(e.id)} className="text-xs text-muted-foreground hover:text-destructive">Excluir</button>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Para onde foi o dinheiro">
          {porCat.length === 0 ? <div className="px-4 py-3 text-xs text-muted-foreground">Sem saídas no mês.</div> : (
            <ul className="space-y-3 p-4">
              {porCat.map(([c, v]) => (
                <li key={c}>
                  <div className="flex justify-between text-xs"><span>{c}</span><span className="tabular-nums">{brl(v)}</span></div>
                  <div className="mt-1 h-1.5 rounded bg-muted"><div className="h-1.5 rounded bg-foreground/60" style={{ width: `${(v / sai) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

function Kpi({ label, value, cls, sub }: { label: string; value: string; cls: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${cls}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
