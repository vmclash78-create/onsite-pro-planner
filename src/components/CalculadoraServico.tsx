import { useState } from "react";
import { Calculator } from "lucide-react";
import { Field, Panel, inputCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { CATEGORIAS } from "@/lib/staff";
import { BTUS, GASES, METROS_INCLUSOS, calcEletrica, calcRefrigeracao, type Material } from "@/lib/calculos";
import { CalcGesso, type NovoItem } from "@/components/CalcGesso";

const n = (s: string) => Number(s.replace(",", ".")) || 0;
const fmt = (v: number) => String(v).replace(".", ",");
const mats = (m: Material[]): NovoItem[] => m.map((x) => ({ tipo: "Material", descricao: `${x.nome} (${x.unidade})`, quantidade: fmt(x.qtd), valor_unitario: "" }));

interface Props { categoria: string; onCategoria?: (c: string) => void; onAdd: (itens: NovoItem[]) => void; acao?: string }

/** One calculator per area; switching tabs changes the math and (optionally) the OS category. */
export function CalculadoraServico({ categoria, onCategoria, onAdd, acao = "Adicionar ao orçamento" }: Props) {
  const [aba, setAba] = useState(categoria);
  const trocar = (c: string) => { setAba(c); onCategoria?.(c); };
  return (
    <div className="space-y-2">
      <div role="tablist" aria-label="Área do cálculo" className="inline-flex rounded-md border bg-card p-1">
        {CATEGORIAS.map((c) => (
          <button key={c} role="tab" aria-selected={aba === c} type="button" onClick={() => trocar(c)}
            className={`rounded px-3 py-1.5 text-sm ${aba === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{c}</button>
        ))}
      </div>
      {aba === "Gesso" ? <CalcGesso onAdd={onAdd} acao={acao} /> : aba === "Elétrica" ? <CalcEletrica onAdd={onAdd} acao={acao} /> : <CalcRefrigeracao onAdd={onAdd} acao={acao} />}
    </div>
  );
}

function CalcRefrigeracao({ onAdd, acao }: { onAdd: Props["onAdd"]; acao: string }) {
  const [btus, setBtus] = useState("12000");
  const [metros, setMetros] = useState("");
  const [gas, setGas] = useState("R410A");
  const [preco, setPreco] = useState("");
  const r = calcRefrigeracao(Number(btus), n(metros), gas);
  const cap = `${Number(btus).toLocaleString("pt-BR")} BTUs`;
  const adicionar = () => {
    if (!r.materiais.length) return;
    onAdd([{ tipo: "Mão de obra", descricao: `Instalação de split ${cap} (${fmt(n(metros))} m de tubulação)`, quantidade: "1", valor_unitario: preco }, ...mats(r.materiais)]);
    setMetros("");
  };
  return (
    <Panel title={<span className="inline-flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> Cálculo de refrigeração</span>}>
      <div className="grid gap-3 p-4 sm:grid-cols-4">
        <Field label="Capacidade"><select className={inputCls} value={btus} onChange={(e) => setBtus(e.target.value)}>{BTUS.map((b) => <option key={b} value={b}>{b.toLocaleString("pt-BR")} BTUs</option>)}</select></Field>
        <Field label="Distância entre as unidades (m)"><input className={inputCls} inputMode="decimal" value={metros} onChange={(e) => setMetros(e.target.value)} placeholder="6" /></Field>
        <Field label="Gás"><select className={inputCls} value={gas} onChange={(e) => setGas(e.target.value)}>{GASES.map((g) => <option key={g}>{g}</option>)}</select></Field>
        <Field label="Mão de obra (R$)"><input className={inputCls} inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="450,00" /></Field>
      </div>
      <Resumo materiais={r.materiais} onClick={adicionar} acao={acao}
        destaque={r.materiais.length ? `${cap} · ${r.extraMetros > 0 ? `${fmt(r.extraMetros)} m além dos ${METROS_INCLUSOS} m · +${r.gasGramas} g de gás` : `até ${METROS_INCLUSOS} m, sem gás extra`} · ${brl(n(preco))}` : ""} />
    </Panel>
  );
}

function CalcEletrica({ onAdd, acao }: { onAdd: Props["onAdd"]; acao: string }) {
  const [v, setV] = useState({ tomadas: "", interruptores: "", luzes: "", dedicados: "", distancia: "", preco: "" });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  const r = calcEletrica({ tomadas: n(v.tomadas), interruptores: n(v.interruptores), luzes: n(v.luzes), dedicados: n(v.dedicados), distancia: n(v.distancia) });
  const adicionar = () => {
    if (!r.pontos) return;
    onAdd([{ tipo: "Mão de obra", descricao: `Pontos elétricos (${r.pontos} pontos, ${r.circuitos} circuitos)`, quantidade: String(r.pontos), valor_unitario: v.preco }, ...mats(r.materiais)]);
    setV({ ...v, tomadas: "", interruptores: "", luzes: "", dedicados: "" });
  };
  const campo = (k: keyof typeof v, label: string, ph: string) => <Field label={label}><input className={inputCls} inputMode="decimal" value={v[k]} onChange={set(k)} placeholder={ph} /></Field>;
  return (
    <Panel title={<span className="inline-flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> Cálculo de elétrica</span>}>
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-6">
        {campo("tomadas", "Tomadas", "6")}
        {campo("interruptores", "Interruptores", "3")}
        {campo("luzes", "Pontos de luz", "4")}
        {campo("dedicados", "Circuitos 220V (chuveiro, ar)", "1")}
        {campo("distancia", "Distância média ao quadro (m)", "8")}
        {campo("preco", "Preço por ponto (R$)", "60,00")}
      </div>
      <Resumo materiais={r.materiais} onClick={adicionar} acao={acao}
        destaque={r.pontos ? `${r.pontos} pontos · ${r.circuitos} circuitos · ${brl(r.pontos * n(v.preco))}` : ""} />
    </Panel>
  );
}

function Resumo({ materiais, destaque, onClick, acao }: { materiais: Material[]; destaque: string; onClick: () => void; acao: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t px-4 py-3 text-sm">
      {destaque ? <span className="tabular-nums font-medium">{destaque}</span> : <span className="text-muted-foreground">Preencha as medidas para calcular.</span>}
      {materiais.length > 0 && <span className="w-full text-xs text-muted-foreground">Materiais: {materiais.map((m) => `${fmt(m.qtd)} ${m.unidade} ${m.nome.toLowerCase()}`).join(" · ")}</span>}
      <Button type="button" size="sm" className="ml-auto" disabled={!materiais.length} onClick={onClick}>{acao}</Button>
    </div>
  );
}
