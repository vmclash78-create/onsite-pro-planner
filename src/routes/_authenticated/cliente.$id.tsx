import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, FileText, MessageCircle, Pencil, Phone, Plus, Snowflake, Wrench } from "lucide-react";
import { CATEGORIAS } from "@/lib/staff";
import { AppShell } from "@/components/AppShell";
import { Field, FormPanel, Panel, StateRow, Status, inputCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { addDias, brl, dataBR, diasEntre, isoLocal } from "@/lib/format";
import { normalizarTelefone, statusRecebimento } from "@/lib/cobranca";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/cliente/$id")({
  head: pageHead("Ficha do cliente", "Aparelhos, histórico de serviços e situação financeira do cliente."),
  component: Ficha,
});

const vazioAp = { location_id: "", descricao: "", marca: "", btus: "", gas: "R410A", voltagem: "220V", ambiente: "", ultima_manutencao: "", intervalo_meses: "6" };

function Ficha() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [novoAp, setNovoAp] = useState(false);
  const [ap, setAp] = useState(vazioAp);
  const q = useQuery({
    queryKey: ["cliente", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients")
        .select("id, nome, whatsapp, email, observacoes, created_at, locations(id, apelido, endereco, bairro, cidade, equipment(id, descricao, marca, btus, gas, voltagem, ambiente, ultima_manutencao, intervalo_meses)), service_orders(id, numero, categoria, descricao, status, valor, inicio, concluida_em, garantia_dias), quotes(id, numero, descricao, valor, status, created_at), recebimentos(id, valor_total, valor_pago, vencimento, status)")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const salvarAp = useMutation({
    mutationFn: async () => {
      if (!ap.location_id || !ap.descricao.trim()) throw new Error("Escolha o local e descreva o aparelho.");
      const { error } = await supabase.from("equipment").insert({
        location_id: ap.location_id, descricao: ap.descricao.trim(), marca: ap.marca || null, btus: ap.btus ? Number(ap.btus.replace(/\D/g, "")) : null,
        gas: ap.gas || null, voltagem: ap.voltagem || null, ambiente: ap.ambiente || null, ultima_manutencao: ap.ultima_manutencao || null, intervalo_meses: Number(ap.intervalo_meses) || 6,
      });
      if (error) throw error;
    },
    onSuccess: () => { setAp(vazioAp); setNovoAp(false); qc.invalidateQueries({ queryKey: ["cliente", id] }); qc.invalidateQueries({ queryKey: ["equipment"] }); },
  });
  const nav = useNavigate();
  const [editando, setEditando] = useState(false);
  const [ed, setEd] = useState({ nome: "", whatsapp: "", email: "", observacoes: "" });
  const [novaOs, setNovaOs] = useState(false);
  const [os, setOs] = useState({ categoria: "Refrigeração", descricao: "", valor: "" });
  const salvarCli = useMutation({
    mutationFn: async () => {
      if (!ed.nome.trim()) throw new Error("Informe o nome.");
      const { error } = await supabase.from("clients").update({ nome: ed.nome.trim(), whatsapp: ed.whatsapp || null, email: ed.email || null, observacoes: ed.observacoes || null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { setEditando(false); qc.invalidateQueries({ queryKey: ["cliente", id] }); qc.invalidateQueries({ queryKey: ["clients"] }); },
  });
  const criarOs = useMutation({
    mutationFn: async () => {
      if (!os.descricao.trim()) throw new Error("Descreva o serviço.");
      const valor = os.valor ? Number(os.valor.replace(/\./g, "").replace(",", ".")) : null;
      const { data, error } = await supabase.from("service_orders").insert({ client_id: id, categoria: os.categoria, descricao: os.descricao.trim(), valor }).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (oid) => { qc.invalidateQueries({ queryKey: ["orders"] }); nav({ to: "/ordem/$id", params: { id: oid } }); },
  });
  const novoOrc = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("quotes").insert({ client_id: id, descricao: "Novo orçamento", valor: 0, status: "Rascunho" }).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (qid) => { qc.invalidateQueries({ queryKey: ["quotes"] }); nav({ to: "/orcamento/$id", params: { id: qid } }); },
  });

  const c = q.data;
  const hoje = isoLocal();
  const abertos = (c?.recebimentos ?? []).map((r) => ({ ...r, st: statusRecebimento({ valor_total: Number(r.valor_total), valor_pago: Number(r.valor_pago), vencimento: r.vencimento }, hoje) })).filter((r) => r.st !== "pago");
  const saldo = abertos.reduce((a, r) => a + Number(r.valor_total) - Number(r.valor_pago), 0);
  const atrasado = abertos.some((r) => r.st === "atrasado");
  const tel = normalizarTelefone(c?.whatsapp);
  const ordens = [...(c?.service_orders ?? [])].sort((a, b) => b.numero - a.numero);
  const orcs = [...(c?.quotes ?? [])].sort((a, b) => b.numero - a.numero);
  const setA = (k: keyof typeof vazioAp) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setAp({ ...ap, [k]: e.target.value });

  return (
    <AppShell title={c?.nome ?? "Cliente"} breadcrumb={["Painel", "Clientes", c?.nome ?? "Ficha"]}
      actions={c && <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => { setEd({ nome: c.nome, whatsapp: c.whatsapp ?? "", email: c.email ?? "", observacoes: c.observacoes ?? "" }); setEditando(true); }}><Pencil className="h-4 w-4" /><span className="hidden sm:inline">Editar</span></Button>
        {tel && <Button asChild variant="outline"><a href={`https://wa.me/${tel}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">WhatsApp</span></a></Button>}
        {tel && <Button asChild variant="outline"><a href={`tel:+${tel}`}><Phone className="h-4 w-4" /><span className="hidden sm:inline">Ligar</span></a></Button>}
      </div>}>
      {q.isLoading || q.error || !c ? <Panel><StateRow loading={q.isLoading} error={q.error} empty={!c} emptyText="Cliente não encontrado." /></Panel> : (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setNovaOs(true)}><Wrench className="h-4 w-4" /> Nova OS</Button>
            <Button variant="outline" disabled={novoOrc.isPending} onClick={() => novoOrc.mutate()}><FileText className="h-4 w-4" /> Novo orçamento</Button>
          </div>
          {novoOrc.error && <div className="text-sm text-destructive">{novoOrc.error.message}</div>}
          {editando && (
            <FormPanel title="Editar cliente" onClose={() => setEditando(false)} onSubmit={() => salvarCli.mutate()} saving={salvarCli.isPending} error={salvarCli.error?.message}>
              <Field label="Nome"><input className={inputCls} value={ed.nome} onChange={(e) => setEd({ ...ed, nome: e.target.value })} required /></Field>
              <Field label="WhatsApp"><input className={inputCls} inputMode="tel" value={ed.whatsapp} onChange={(e) => setEd({ ...ed, whatsapp: e.target.value })} /></Field>
              <Field label="E-mail"><input type="email" className={inputCls} value={ed.email} onChange={(e) => setEd({ ...ed, email: e.target.value })} /></Field>
              <Field label="Observações"><input className={inputCls} value={ed.observacoes} onChange={(e) => setEd({ ...ed, observacoes: e.target.value })} /></Field>
            </FormPanel>
          )}
          {novaOs && (
            <FormPanel title="Nova ordem de serviço" onClose={() => setNovaOs(false)} onSubmit={() => criarOs.mutate()} saving={criarOs.isPending} error={criarOs.error?.message}>
              <Field label="Área"><select className={inputCls} value={os.categoria} onChange={(e) => setOs({ ...os, categoria: e.target.value })}>{CATEGORIAS.map((g) => <option key={g}>{g}</option>)}</select></Field>
              <Field label="O que será feito"><input className={inputCls} value={os.descricao} onChange={(e) => setOs({ ...os, descricao: e.target.value })} required /></Field>
              <Field label="Valor (R$)"><input className={inputCls} inputMode="decimal" value={os.valor} onChange={(e) => setOs({ ...os, valor: e.target.value })} placeholder="0,00" /></Field>
            </FormPanel>
          )}
          {saldo > 0 && (
            <div role="alert" className={`flex items-start gap-3 rounded-lg border bg-card px-4 py-3 text-sm ${atrasado ? "border-destructive/50" : "border-warning/50"}`}>
              <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${atrasado ? "text-destructive" : "text-warning"}`} />
              <div className="min-w-0 flex-1"><span className="font-medium">{atrasado ? "Pagamento em atraso" : "Pagamento em aberto"}: {brl(saldo)}</span> <span className="text-muted-foreground">— confira antes de agendar um novo serviço.</span></div>
              <Link to="/receber" className="text-xs text-primary hover:underline">Ver</Link>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-4">
            <Kpi label="Serviços feitos" v={String(ordens.filter((o) => o.status === "Concluída").length)} />
            <Kpi label="Total gasto" v={brl(ordens.filter((o) => o.status === "Concluída").reduce((a, o) => a + Number(o.valor ?? 0), 0))} />
            <Kpi label="Aparelhos" v={String(c.locations.reduce((a, l) => a + l.equipment.length, 0))} />
            <Kpi label="Cliente desde" v={dataBR(c.created_at)} />
          </div>
          <Panel title="Contato">
            <div className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-3">
              <div className="tabular-nums">{c.whatsapp ?? "Sem WhatsApp"}</div>
              <div className="truncate text-muted-foreground">{c.email ?? "Sem e-mail"}</div>
              <div className="text-muted-foreground">{c.observacoes ?? ""}</div>
            </div>
          </Panel>

          {novoAp && (
            <FormPanel title="Novo aparelho" onClose={() => setNovoAp(false)} onSubmit={() => salvarAp.mutate()} saving={salvarAp.isPending} error={salvarAp.error?.message}>
              <Field label="Local"><select className={inputCls} value={ap.location_id} onChange={setA("location_id")} required>
                <option value="">Selecione</option>{c.locations.map((l) => <option key={l.id} value={l.id}>{l.apelido} — {l.endereco}</option>)}
              </select></Field>
              <Field label="Aparelho"><input className={inputCls} value={ap.descricao} onChange={setA("descricao")} placeholder="Split Dual Inverter" required /></Field>
              <Field label="Marca"><input className={inputCls} value={ap.marca} onChange={setA("marca")} placeholder="LG, Gree, Samsung..." /></Field>
              <Field label="Capacidade (BTUs)"><input className={inputCls} inputMode="numeric" value={ap.btus} onChange={setA("btus")} placeholder="12000" /></Field>
              <Field label="Gás"><select className={inputCls} value={ap.gas} onChange={setA("gas")}>{["R410A", "R32", "R22", "Outro"].map((g) => <option key={g}>{g}</option>)}</select></Field>
              <Field label="Voltagem"><select className={inputCls} value={ap.voltagem} onChange={setA("voltagem")}>{["220V", "127V"].map((g) => <option key={g}>{g}</option>)}</select></Field>
              <Field label="Ambiente"><input className={inputCls} value={ap.ambiente} onChange={setA("ambiente")} placeholder="Quarto do casal" /></Field>
              <Field label="Última manutenção"><input type="date" className={inputCls} value={ap.ultima_manutencao} onChange={setA("ultima_manutencao")} /></Field>
              <Field label="Repetir limpeza a cada (meses)"><select className={inputCls} value={ap.intervalo_meses} onChange={setA("intervalo_meses")}>{["3", "6", "12"].map((g) => <option key={g}>{g}</option>)}</select></Field>
            </FormPanel>
          )}

          <Panel title="Locais e aparelhos" action={c.locations.length > 0 && <Button size="sm" variant="outline" onClick={() => setNovoAp(true)}><Plus className="h-4 w-4" /> Aparelho</Button>}>
            {c.locations.length === 0 && <div className="px-4 py-6 text-sm text-muted-foreground">Nenhum endereço. Cadastre em Locais.</div>}
            <ul className="divide-y">
              {c.locations.map((l) => (
                <li key={l.id} className="px-4 py-3">
                  <div className="text-sm font-medium">{l.apelido} <span className="font-normal text-muted-foreground">· {l.endereco}{l.bairro ? `, ${l.bairro}` : ""} — {l.cidade}</span></div>
                  {l.equipment.length === 0 ? <div className="mt-1 text-xs text-muted-foreground">Sem aparelhos cadastrados.</div> : (
                    <ul className="mt-2 space-y-1.5">
                      {l.equipment.map((e) => {
                        const prox = e.ultima_manutencao ? addDias(e.ultima_manutencao, e.intervalo_meses * 30) : null;
                        const falta = prox ? diasEntre(hoje, prox) : null;
                        return (
                          <li key={e.id} className="flex items-start gap-2 text-sm">
                            <Snowflake className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.75} />
                            <div className="min-w-0">
                              <div>{[e.descricao, e.marca, e.btus ? `${e.btus.toLocaleString("pt-BR")} BTUs` : null].filter(Boolean).join(" · ")}</div>
                              <div className="text-xs text-muted-foreground">
                                {[e.ambiente, e.gas, e.voltagem].filter(Boolean).join(" · ")}{" · "}
                                {e.ultima_manutencao ? `última limpeza ${dataBR(e.ultima_manutencao)}` : "sem limpeza registrada"}
                                {falta != null && <span className={falta < 0 ? " text-destructive" : falta <= 15 ? " text-warning" : ""}> · {falta < 0 ? `vencida há ${-falta} dias` : `próxima ${dataBR(prox!)}`}</span>}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title={`Histórico de serviços (${ordens.length})`}>
            <StateRow empty={ordens.length === 0} emptyText="Nenhuma ordem de serviço ainda." />
            <ul className="divide-y">
              {ordens.map((o) => {
                const garantiaAte = o.concluida_em ? addDias(o.concluida_em, o.garantia_dias) : null;
                return (
                  <li key={o.id}>
                    <Link to="/ordem/$id" params={{ id: o.id }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-muted/50">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">OS-{String(o.numero).padStart(4, "0")} · {o.categoria}</div>
                        <div className="truncate text-xs text-muted-foreground">{o.descricao}</div>
                        <div className="text-xs tabular-nums text-muted-foreground">{o.concluida_em ? `Concluída ${dataBR(o.concluida_em)}` : o.inicio ? `Início ${dataBR(o.inicio)}` : ""}{garantiaAte ? (garantiaAte >= hoje ? ` · garantia até ${dataBR(garantiaAte)}` : " · garantia encerrada") : ""}</div>
                      </div>
                      <div className="text-right"><div className="text-sm tabular-nums">{o.valor != null ? brl(Number(o.valor)) : "—"}</div><Status value={o.status} /></div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel title={`Orçamentos (${orcs.length})`}>
            <StateRow empty={orcs.length === 0} emptyText="Nenhum orçamento ainda." />
            <ul className="divide-y">
              {orcs.map((o) => (
                <li key={o.id}>
                  <Link to="/orcamento/$id" params={{ id: o.id }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-muted/50">
                    <div className="min-w-0"><div className="truncate text-sm">ORC-{String(o.numero).padStart(4, "0")} · {o.descricao}</div><div className="text-xs text-muted-foreground">{dataBR(o.created_at)}</div></div>
                    <div className="text-right"><div className="text-sm tabular-nums">{brl(Number(o.valor))}</div><Status value={o.status} /></div>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </AppShell>
  );
}

function Kpi({ label, v }: { label: string; v: string }) {
  return <div className="rounded-lg border bg-card px-4 py-3"><div className="text-lg font-semibold tabular-nums">{v}</div><div className="text-xs text-muted-foreground">{label}</div></div>;
}
