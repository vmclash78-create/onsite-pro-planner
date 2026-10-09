import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Copy, QrCode, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Field, Panel, StateRow, inputCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { WhatsButton } from "@/components/WhatsButton";
import { supabase } from "@/integrations/supabase/client";
import { linkWhatsApp, mensagemPix, normalizarTelefone, pixPayload, statusRecebimento, useConfigEmpresa, type StatusRec } from "@/lib/cobranca";
import { brl, dataBR, isoLocal } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { useMe } from "@/lib/staff";

export const Route = createFileRoute("/_authenticated/receber")({
  head: pageHead("A receber", "Contas a receber, cobrança por Pix e pagamentos dos serviços."),
  component: Receber,
});

const ROTULO: Record<StatusRec, string> = { pendente: "Pendente", parcial: "Parcial", pago: "Pago", atrasado: "Atrasado" };
const TOM: Record<StatusRec, string> = { pendente: "text-warning", parcial: "text-primary", pago: "text-success", atrasado: "text-destructive" };
const FORMAS = ["pix", "dinheiro", "cartão", "transferência"] as const;

function useRecebimentos() {
  return useQuery({
    queryKey: ["recebimentos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("recebimentos")
        .select("id, ordem_id, cliente_id, valor_total, valor_pago, vencimento, forma_pagamento, observacao, criado_em, clients(nome, whatsapp), service_orders(numero, categoria, descricao, concluida_em)")
        .order("vencimento");
      if (error) throw error;
      const hoje = isoLocal();
      return data.map((r) => ({ ...r, saldo: Number(r.valor_total) - Number(r.valor_pago), st: statusRecebimento({ ...r, valor_total: Number(r.valor_total), valor_pago: Number(r.valor_pago) }, hoje) }));
    },
  });
}
type Rec = NonNullable<ReturnType<typeof useRecebimentos>["data"]>[number];

function Receber() {
  const me = useMe();
  const q = useRecebimentos();
  const [filtro, setFiltro] = useState<"abertos" | StatusRec | "todos">("abertos");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [pagar, setPagar] = useState<Rec | null>(null);
  const [pix, setPix] = useState<Rec | null>(null);

  const lista = useMemo(() => (q.data ?? []).filter((r) =>
    (filtro === "todos" || (filtro === "abertos" ? r.st !== "pago" : r.st === filtro)) &&
    (!de || r.vencimento >= de) && (!ate || r.vencimento <= ate)), [q.data, filtro, de, ate]);
  const aReceber = (q.data ?? []).reduce((a, r) => a + Math.max(0, r.saldo), 0);
  const atraso = (q.data ?? []).filter((r) => r.st === "atrasado").reduce((a, r) => a + r.saldo, 0);

  return (
    <AppShell title="A receber" breadcrumb={["Painel", "Financeiro", "A receber"]}>
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border bg-card">
        <div className="border-r p-4"><div className="text-xs text-muted-foreground">Total a receber</div><div className="mt-1 text-2xl font-semibold tabular-nums">{q.isLoading ? "–" : brl(aReceber)}</div></div>
        <div className="p-4"><div className="text-xs text-muted-foreground">Em atraso</div><div className="mt-1 text-2xl font-semibold tabular-nums text-destructive">{q.isLoading ? "–" : brl(atraso)}</div></div>
      </div>

      {pagar && <PagamentoForm rec={pagar} onClose={() => setPagar(null)} />}
      {pix && <PixPanel rec={pix} onClose={() => setPix(null)} />}

      <div className="mt-5">
        <Panel title={`${lista.length} recebimento(s)`} action={
          <div className="flex flex-wrap gap-2">
            <select aria-label="Situação" className={`${inputCls} h-8 w-32`} value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)}>
              <option value="abertos">Em aberto</option><option value="pendente">Pendente</option><option value="parcial">Parcial</option>
              <option value="atrasado">Atrasado</option><option value="pago">Pago</option><option value="todos">Todos</option>
            </select>
            <input aria-label="Vencimento de" type="date" className={`${inputCls} h-8 w-36`} value={de} onChange={(e) => setDe(e.target.value)} />
            <input aria-label="Vencimento até" type="date" className={`${inputCls} h-8 w-36`} value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>}>
          <StateRow loading={q.isLoading} error={q.error} empty={lista.length === 0} emptyText="Nenhum recebimento neste filtro. Ordens concluídas com valor aparecem aqui." />
          <ul className="divide-y">
            {lista.map((r) => (
              <li key={r.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                    <span className="truncate text-sm font-medium">{r.clients?.nome}</span>
                    <span className="text-sm tabular-nums">{brl(r.saldo > 0 ? r.saldo : Number(r.valor_total))}</span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {r.service_orders ? `OS-${String(r.service_orders.numero).padStart(4, "0")} · ${r.service_orders.categoria}` : "Avulso"}
                    {Number(r.valor_pago) > 0 && r.saldo > 0 ? ` · pago ${brl(Number(r.valor_pago))} de ${brl(Number(r.valor_total))}` : ""}
                  </div>
                  <div className="flex gap-2 text-xs tabular-nums">
                    <span className="text-muted-foreground">Vence {dataBR(r.vencimento)}</span>
                    <span className={`inline-flex items-center gap-1 ${TOM[r.st]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{ROTULO[r.st]}</span>
                  </div>
                </div>
                {r.st !== "pago" && me.data?.isAdmin && (
                  <div className="flex flex-wrap items-start gap-2">
                    <button onClick={() => { setPix(null); setPagar(r); }} className="h-7 rounded-[6px] bg-primary px-2 text-[11px] font-medium text-primary-foreground hover:bg-primary/90">Registrar pagamento</button>
                    <button onClick={() => { setPagar(null); setPix(r); }} className="inline-flex h-7 items-center gap-1 rounded-[6px] border px-2 text-[11px] hover:bg-muted"><QrCode className="h-3.5 w-3.5" /> Cobrar por Pix</button>
                    {r.st === "atrasado" && (
                      <WhatsButton label="Cobrar atraso" chave="cobranca" telefone={r.clients?.whatsapp} clienteId={r.cliente_id} referenciaId={r.id}
                        vars={{ nome: r.clients?.nome ?? "", servico: r.service_orders?.categoria ?? "", data: dataBR(r.service_orders?.concluida_em ?? r.criado_em), valor: brl(r.saldo) }} />
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </AppShell>
  );
}

function PagamentoForm({ rec, onClose }: { rec: Rec; onClose: () => void }) {
  const qc = useQueryClient();
  const [valor, setValor] = useState(rec.saldo.toFixed(2).replace(".", ","));
  const [data, setData] = useState(isoLocal());
  const [forma, setForma] = useState<string>(rec.forma_pagamento ?? "pix");
  const m = useMutation({
    mutationFn: async () => {
      const v = Number(valor.replace(/\./g, "").replace(",", "."));
      if (!v || v <= 0) throw new Error("Informe um valor maior que zero.");
      if (v > rec.saldo + 0.001) throw new Error(`O valor passa do saldo (${brl(rec.saldo)}).`);
      const { error } = await supabase.rpc("registrar_pagamento", { _rec: rec.id, _valor: v, _data: data, _forma: forma });
      if (error) throw error;
    },
    onSuccess: () => {
      for (const k of ["recebimentos", "financeiro", "dash-fin", "dash-receber"]) qc.invalidateQueries({ queryKey: [k] });
      toast.success("Pagamento registrado e lançado no Financeiro.");
      onClose();
    },
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="mt-5 rounded-lg border border-primary/40 bg-card">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center border-b px-4 py-3">
        <h2 className="truncate text-sm font-semibold">Registrar pagamento · {rec.clients?.nome}</h2>
        <Button variant="ghost" size="icon" type="button" aria-label="Fechar" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-3">
        <Field label={`Valor (saldo ${brl(rec.saldo)})`}><input className={inputCls} value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" /></Field>
        <Field label="Data"><input type="date" className={inputCls} value={data} onChange={(e) => setData(e.target.value)} required /></Field>
        <Field label="Forma">
          <select className={inputCls} value={forma} onChange={(e) => setForma(e.target.value)}>
            {FORMAS.map((f) => <option key={f} value={f} className="capitalize">{f[0]!.toUpperCase() + f.slice(1)}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t px-4 py-3">
        {m.error && <p role="alert" className="w-full text-xs text-destructive">{m.error.message}</p>}
        <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
        <Button disabled={m.isPending}>Salvar pagamento</Button>
      </div>
    </form>
  );
}

function PixPanel({ rec, onClose }: { rec: Rec; onClose: () => void }) {
  const cfg = useConfigEmpresa();
  const [qr, setQr] = useState("");
  const codigo = cfg.data?.pix_chave ? pixPayload({ chave: cfg.data.pix_chave, nome: cfg.data.pix_nome ?? "", cidade: cfg.data.pix_cidade ?? "", valor: rec.saldo, txid: `VM${rec.service_orders?.numero ?? ""}` }) : "";
  useEffect(() => { if (codigo) QRCode.toDataURL(codigo, { margin: 1, width: 240 }).then(setQr); }, [codigo]);
  const tel = normalizarTelefone(rec.clients?.whatsapp);
  const msg = mensagemPix({ nome: rec.clients?.nome ?? "", servico: rec.service_orders?.categoria ?? "", data: rec.service_orders?.concluida_em ?? rec.criado_em, valor: rec.saldo, codigo });
  return (
    <section className="mt-5 rounded-lg border border-primary/40 bg-card">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center border-b px-4 py-3">
        <h2 className="truncate text-sm font-semibold">Pix · {rec.clients?.nome} · {brl(rec.saldo)}</h2>
        <Button variant="ghost" size="icon" aria-label="Fechar" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      {cfg.isLoading || cfg.error ? <StateRow loading={cfg.isLoading} error={cfg.error} /> : !codigo ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">Cadastre a chave Pix em Configurações para gerar a cobrança.</p>
      ) : (
        <div className="grid gap-4 p-4 sm:grid-cols-[auto_minmax(0,1fr)]">
          {qr ? <img src={qr} alt="QR Code Pix" className="h-48 w-48 rounded-md border" /> : <div className="h-48 w-48 rounded-md border bg-muted" />}
          <div className="min-w-0 space-y-3">
            <textarea readOnly value={codigo} className="h-24 w-full rounded-[6px] border bg-muted p-2 font-mono text-[11px] break-all" aria-label="Pix copia e cola" />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(codigo).then(() => toast.success("Código copiado."))}><Copy className="h-4 w-4" /> Copiar código</Button>
              <Button disabled={!tel} onClick={() => tel && window.open(linkWhatsApp(tel, msg), "_blank", "noopener")}><MessageCircle className="h-4 w-4" /> Enviar por WhatsApp</Button>
            </div>
            {!tel && <p className="text-xs text-destructive">Telefone do cliente inválido ou vazio. Cadastre DDD + número em Clientes.</p>}
          </div>
        </div>
      )}
    </section>
  );
}
