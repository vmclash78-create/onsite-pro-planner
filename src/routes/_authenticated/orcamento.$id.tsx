import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Printer, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Field, Panel, StateRow, StatusSelect, inputCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { brl, dataBR } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { CATEGORIAS } from "@/lib/staff";
import { useOrcamento } from "@/lib/orcamento";
import { CalcGesso } from "@/components/CalcGesso";

export const Route = createFileRoute("/_authenticated/orcamento/$id")({
  head: pageHead("Orçamento", "Itens, valores e impressão do orçamento."),
  component: Orcamento,
});

const STATUS = ["Rascunho", "Aguardando", "Aprovado", "Recusado"];
const num = (s: string) => Number(s.replace(/\./g, "").replace(",", ".")) || 0;
type Item = { id?: string; tipo: string; descricao: string; quantidade: string; valor_unitario: string };

function Orcamento() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const nav = useNavigate();
  const q = useOrcamento(id);
  const [itens, setItens] = useState<Item[]>([]);
  const [descricao, setDescricao] = useState("");
  const [obs, setObs] = useState("");
  const [validade, setValidade] = useState("15");
  const [categoria, setCategoria] = useState<string>("Refrigeração");

  useEffect(() => {
    if (!q.data) return;
    setDescricao(q.data.descricao);
    setObs(q.data.observacoes ?? "");
    setValidade(String(q.data.validade_dias));
    setItens(q.data.quote_items.map((i) => ({ id: i.id, tipo: i.tipo, descricao: i.descricao, quantidade: String(i.quantidade).replace(".", ","), valor_unitario: Number(i.valor_unitario).toFixed(2).replace(".", ",") })));
  }, [q.data]);

  const total = itens.reduce((a, i) => a + num(i.quantidade) * num(i.valor_unitario), 0);
  const totMat = itens.filter((i) => i.tipo === "Material").reduce((a, i) => a + num(i.quantidade) * num(i.valor_unitario), 0);
  const inval = () => { for (const k of ["quotes", "dashboard"]) qc.invalidateQueries({ queryKey: [k] }); qc.invalidateQueries({ queryKey: ["quote", id] }); };

  const salvar = useMutation({
    mutationFn: async () => {
      if (!descricao.trim()) throw new Error("Descreva o serviço.");
      const validos = itens.filter((i) => i.descricao.trim());
      const del = await supabase.from("quote_items").delete().eq("quote_id", id);
      if (del.error) throw del.error;
      if (validos.length) {
        const ins = await supabase.from("quote_items").insert(validos.map((i, n) => ({ quote_id: id, tipo: i.tipo, descricao: i.descricao.trim(), quantidade: num(i.quantidade) || 1, valor_unitario: num(i.valor_unitario), ordem: n })));
        if (ins.error) throw ins.error;
      }
      const up = await supabase.from("quotes").update({ descricao: descricao.trim(), observacoes: obs || null, validade_dias: Number(validade) || 15, valor: total }).eq("id", id);
      if (up.error) throw up.error;
    },
    onSuccess: () => { inval(); toast.success("Orçamento salvo."); },
  });
  const status = useMutation({
    mutationFn: async (s: string) => {
      const { error } = await supabase.from("quotes").update({ status: s, ...(s === "Aguardando" ? { enviado_em: new Date().toISOString().slice(0, 10) } : {}) }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: inval,
  });
  const converter = useMutation({
    mutationFn: async () => {
      if (!q.data) return;
      await salvar.mutateAsync();
      const { data: os, error } = await supabase.from("service_orders").insert({ client_id: q.data.client_id, categoria, descricao: `ORC-${String(q.data.numero).padStart(4, "0")} · ${descricao.trim()}`, valor: total }).select("id").single();
      if (error) throw error;
      const up = await supabase.from("quotes").update({ status: "Aprovado", service_order_id: os.id }).eq("id", id);
      if (up.error) throw up.error;
    },
    onSuccess: () => { inval(); qc.invalidateQueries({ queryKey: ["orders"] }); toast.success("Ordem de serviço criada."); nav({ to: "/ordens" }); },
  });
  const excluir = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotes"] }); nav({ to: "/orcamentos" }); },
  });

  const set = (n: number, k: keyof Item, v: string) => setItens(itens.map((i, j) => (j === n ? { ...i, [k]: v } : i)));
  const add = (tipo: string) => setItens([...itens, { tipo, descricao: "", quantidade: "1", valor_unitario: "" }]);
  const d = q.data;
  const codigo = d ? `ORC-${String(d.numero).padStart(4, "0")}` : "Orçamento";

  return (
    <AppShell title={codigo} breadcrumb={["Painel", "Orçamentos", codigo]}
      actions={d && <Button asChild variant="outline"><Link to="/imprimir/orcamento/$id" params={{ id }} target="_blank"><Printer className="h-4 w-4" /> <span className="hidden sm:inline">Imprimir para assinar</span></Link></Button>}>
      {q.isLoading || q.error || !d ? <Panel><StateRow loading={q.isLoading} error={q.error ?? (!d ? "x" : null)} /></Panel> : (
        <div className="space-y-5">
          <Panel title={d.clients?.nome} action={<StatusSelect value={d.status} options={STATUS} onChange={(s) => status.mutate(s)} />}>
            <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
              <Field label="Serviço / descrição"><input className={inputCls} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></Field>
              <Field label="Validade (dias)"><input className={inputCls} inputMode="numeric" value={validade} onChange={(e) => setValidade(e.target.value)} /></Field>
              <Field label="Observações (aparecem na impressão)" className="sm:col-span-2"><textarea className="min-h-16 w-full rounded-[6px] border border-input bg-background p-2 text-sm" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Forma de pagamento, garantia, prazo de execução..." /></Field>
            </div>
          </Panel>

          <Panel title="Itens" action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => add("Material")}><Plus className="h-4 w-4" /> Material</Button>
              <Button size="sm" variant="outline" onClick={() => add("Mão de obra")}><Plus className="h-4 w-4" /> Mão de obra</Button>
            </div>}>
            {itens.length === 0 && <div className="px-4 py-6 text-sm text-muted-foreground">Nenhum item. Adicione material ou mão de obra.</div>}
            <ul className="divide-y">
              {itens.map((i, n) => (
                <li key={n} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 px-4 py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)_5rem_7rem_6.5rem_auto] sm:items-center">
                  <select aria-label="Tipo" className={`${inputCls} col-span-2 sm:col-span-1`} value={i.tipo} onChange={(e) => set(n, "tipo", e.target.value)}>
                    <option>Material</option><option>Mão de obra</option>
                  </select>
                  <input aria-label="Descrição do item" className={`${inputCls} col-span-2 sm:col-span-1`} value={i.descricao} onChange={(e) => set(n, "descricao", e.target.value)} placeholder={i.tipo === "Material" ? "Tubo de cobre 1/4" : "Instalação split 12.000 BTU"} />
                  <input aria-label="Quantidade" className={inputCls} inputMode="decimal" value={i.quantidade} onChange={(e) => set(n, "quantidade", e.target.value)} />
                  <input aria-label="Valor unitário" className={inputCls} inputMode="decimal" value={i.valor_unitario} onChange={(e) => set(n, "valor_unitario", e.target.value)} placeholder="0,00" />
                  <div className="text-right text-sm tabular-nums">{brl(num(i.quantidade) * num(i.valor_unitario))}</div>
                  <Button variant="ghost" size="icon" aria-label="Remover item" onClick={() => setItens(itens.filter((_, j) => j !== n))}><Trash2 className="h-4 w-4" /></Button>
                </li>
              ))}
            </ul>
            <div className="grid gap-1 border-t px-4 py-3 text-sm sm:justify-end">
              <div className="flex justify-between gap-8 text-muted-foreground"><span>Material</span><span className="tabular-nums">{brl(totMat)}</span></div>
              <div className="flex justify-between gap-8 text-muted-foreground"><span>Mão de obra</span><span className="tabular-nums">{brl(total - totMat)}</span></div>
              <div className="flex justify-between gap-8 text-base font-semibold"><span>Total</span><span className="tabular-nums">{brl(total)}</span></div>
            </div>
          </Panel>

          <CalcGesso onAdd={(novos) => setItens([...itens, ...novos])} />


          {(salvar.error || converter.error) && <p role="alert" className="text-xs text-destructive">{(salvar.error ?? converter.error)?.message}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>Salvar orçamento</Button>
            <Button asChild variant="outline"><Link to="/imprimir/orcamento/$id" params={{ id }} target="_blank"><Printer className="h-4 w-4" /> Imprimir para assinar</Link></Button>
            {d.service_order_id ? <span className="text-xs text-muted-foreground">Já convertido em ordem de serviço.</span> : (
              <span className="flex items-center gap-2">
                <select aria-label="Categoria da ordem" className={`${inputCls} h-9 w-36`} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                </select>
                <Button variant="outline" onClick={() => converter.mutate()} disabled={converter.isPending}><Wrench className="h-4 w-4" /> Aprovar e gerar OS</Button>
              </span>
            )}
            <Button variant="ghost" className="ml-auto text-destructive" onClick={() => confirm("Excluir este orçamento?") && excluir.mutate()}><Trash2 className="h-4 w-4" /> Excluir</Button>
          </div>
          <p className="text-xs text-muted-foreground">Criado em {dataBR(d.created_at)}{d.enviado_em ? ` · enviado em ${dataBR(d.enviado_em)}` : ""}</p>
        </div>
      )}
    </AppShell>
  );
}
