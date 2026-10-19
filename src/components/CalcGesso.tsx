import { useState } from "react";
import { Ruler } from "lucide-react";
import { Field, Panel, inputCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { calcGesso, type TipoGesso } from "@/lib/gesso";

export type NovoItem = { tipo: string; descricao: string; quantidade: string; valor_unitario: string };
const n = (s: string) => Number(s.replace(",", ".")) || 0;
const fmt = (v: number) => v.toFixed(2).replace(".", ",");

/** Area / linear-meter calculator that turns room measurements into quote lines. */
export function CalcGesso({ onAdd, acao = "Adicionar ao orçamento" }: { onAdd: (itens: NovoItem[]) => void; acao?: string }) {
  const [tipo, setTipo] = useState<TipoGesso>("Forro");
  const [larg, setLarg] = useState("");
  const [comp, setComp] = useState("");
  const [preco, setPreco] = useState("");
  const [ambiente, setAmbiente] = useState("");
  const r = calcGesso(tipo, n(larg), n(comp));
  const linear = tipo === "Moldura" || tipo === "Sanca";

  const adicionar = () => {
    if (r.quantidade <= 0) return;
    const sufixo = ambiente ? ` — ${ambiente}` : "";
    onAdd([
      { tipo: "Mão de obra", descricao: `${tipo} de gesso ${fmt(r.quantidade)} ${r.unidade}${sufixo}`, quantidade: fmt(r.quantidade), valor_unitario: preco },
      ...r.materiais.map((m) => ({ tipo: "Material", descricao: `${m.nome}${sufixo}`, quantidade: String(m.qtd), valor_unitario: "" })),
    ]);
    setLarg(""); setComp(""); setAmbiente("");
  };

  return (
    <Panel title={<span className="inline-flex items-center gap-2"><Ruler className="h-4 w-4 text-primary" /> Calculadora de gesso</span>}>
      <div className="grid gap-3 p-4 sm:grid-cols-5">
        <Field label="Serviço"><select className={inputCls} value={tipo} onChange={(e) => setTipo(e.target.value as TipoGesso)}>
          {["Forro", "Drywall", "Moldura", "Sanca"].map((t) => <option key={t}>{t}</option>)}
        </select></Field>
        <Field label={linear ? "Lado A (m)" : "Largura (m)"}><input className={inputCls} inputMode="decimal" value={larg} onChange={(e) => setLarg(e.target.value)} placeholder="3,5" /></Field>
        <Field label={linear ? "Lado B (m)" : tipo === "Drywall" ? "Altura (m)" : "Comprimento (m)"}><input className={inputCls} inputMode="decimal" value={comp} onChange={(e) => setComp(e.target.value)} placeholder="4" /></Field>
        <Field label={`Preço por ${r.unidade} (R$)`}><input className={inputCls} inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="65,00" /></Field>
        <Field label="Ambiente"><input className={inputCls} value={ambiente} onChange={(e) => setAmbiente(e.target.value)} placeholder="Sala" /></Field>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t px-4 py-3 text-sm">
        <span className="tabular-nums"><b>{fmt(r.quantidade)} {r.unidade}</b> · {brl(r.quantidade * n(preco))}</span>
        {r.materiais.length > 0 && <span className="text-xs text-muted-foreground">Materiais: {r.materiais.map((m) => `${m.qtd} ${m.nome.toLowerCase()}`).join(", ")}</span>}
        <Button type="button" size="sm" className="ml-auto" disabled={r.quantidade <= 0} onClick={adicionar}>{acao}</Button>
      </div>
    </Panel>
  );
}
