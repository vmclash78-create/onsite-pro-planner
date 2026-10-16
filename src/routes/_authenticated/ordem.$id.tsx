import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Field, Panel, StateRow, StatusSelect, inputCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { addDias, brl, dataBR, isoLocal } from "@/lib/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/ordem/$id")({
  head: pageHead("Ordem de serviço", "Peças usadas, fotos de antes e depois e aparelho atendido."),
  component: Ordem,
});

const STATUS = ["Aberta", "Em andamento", "Concluída", "Cancelada"];

function Ordem() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [peca, setPeca] = useState({ stock_item_id: "", quantidade: "1" });
  const [enviando, setEnviando] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["ordem", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("service_orders")
        .select("id, numero, client_id, categoria, descricao, status, valor, inicio, concluida_em, equipment_id, estoque_baixado, garantia_dias, clients(nome, whatsapp, locations(id, apelido, equipment(id, descricao, marca, btus))), service_order_items(id, quantidade, stock_items(id, nome, unidade, custo)), os_fotos(id, tipo, path)")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      let urls: Record<string, string> = {};
      const paths = data?.os_fotos.map((f) => f.path) ?? [];
      if (paths.length) {
        const { data: s } = await supabase.storage.from("pedidos").createSignedUrls(paths, 3600);
        urls = Object.fromEntries((s ?? []).map((x) => [x.path ?? "", x.signedUrl ?? ""]));
      }
      return data ? { ...data, urls } : null;
    },
  });
  const estoque = useQuery({
    queryKey: ["stock"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_items").select("id, nome, unidade, quantidade, custo").order("nome");
      if (error) throw error;
      return data;
    },
  });
  const inval = () => { for (const k of ["ordem", "orders", "stock", "estoque", "dashboard", "recebimentos", "equipment"]) qc.invalidateQueries({ queryKey: [k] }); };

  const upd = useMutation({
    mutationFn: async (patch: { status?: string; equipment_id?: string | null; garantia_dias?: number }) => {
      const p = patch.status ? { ...patch, concluida_em: patch.status === "Concluída" ? isoLocal() : null } : patch;
      const { error } = await supabase.from("service_orders").update(p).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { inval(); if (v.status === "Concluída") toast.success("Ordem concluída. Peças baixadas do estoque."); },
    onError: (e) => toast.error(e.message),
  });
  const addPeca = useMutation({
    mutationFn: async () => {
      const qt = Number(peca.quantidade.replace(",", "."));
      if (!peca.stock_item_id || !(qt > 0)) throw new Error("Escolha a peça e a quantidade.");
      const { error } = await supabase.from("service_order_items").insert({ service_order_id: id, stock_item_id: peca.stock_item_id, quantidade: qt });
      if (error) throw error;
    },
    onSuccess: () => { setPeca({ stock_item_id: "", quantidade: "1" }); inval(); },
  });
  const delPeca = useMutation({
    mutationFn: async (pid: string) => { const { error } = await supabase.from("service_order_items").delete().eq("id", pid); if (error) throw error; },
    onSuccess: inval,
  });
  const enviarFotos = async (tipo: "antes" | "depois", files: FileList | null) => {
    if (!files?.length) return;
    setEnviando(tipo);
    try {
      for (const file of Array.from(files).slice(0, 6)) {
        const path = `os/${id}/${tipo}-${crypto.randomUUID()}.${file.name.split(".").pop() || "jpg"}`;
        const up = await supabase.storage.from("pedidos").upload(path, file, { contentType: file.type });
        if (up.error) throw up.error;
        const { error } = await supabase.from("os_fotos").insert({ service_order_id: id, tipo, path });
        if (error) throw error;
      }
      inval();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao enviar foto."); }
    finally { setEnviando(null); }
  };
  const delFoto = useMutation({
    mutationFn: async (f: { id: string; path: string }) => {
      await supabase.storage.from("pedidos").remove([f.path]);
      const { error } = await supabase.from("os_fotos").delete().eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: inval,
  });

  const o = q.data;
  const codigo = o ? `OS-${String(o.numero).padStart(4, "0")}` : "Ordem";
  const aparelhos = o?.clients?.locations.flatMap((l) => l.equipment.map((e) => ({ ...e, local: l.apelido }))) ?? [];
  const custoPecas = (o?.service_order_items ?? []).reduce((a, i) => a + Number(i.quantidade) * Number(i.stock_items?.custo ?? 0), 0);
  const bloqueado = !!o?.estoque_baixado;

  return (
    <AppShell title={codigo} breadcrumb={["Painel", "Ordens de serviço", codigo]}>
      <div className="mb-4 flex justify-end"><Link to="/imprimir/ordem/$id" params={{ id }} className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm hover:bg-muted"><FileText className="h-4 w-4" /> Ver PDF da OS</Link></div>
      {q.isLoading || q.error || !o ? <Panel><StateRow loading={q.isLoading} error={q.error} empty={!o} emptyText="Ordem não encontrada." /></Panel> : (
        <div className="space-y-5">
          <Panel title={<Link to="/cliente/$id" params={{ id: o.client_id }} className="hover:underline">{o.clients?.nome}</Link>} action={<StatusSelect value={o.status} options={STATUS} onChange={(s) => upd.mutate({ status: s })} />}>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <div className="text-sm sm:col-span-2"><span className="text-muted-foreground">{o.categoria} · </span>{o.descricao}</div>
              <div className="text-xs text-muted-foreground tabular-nums">Valor {o.valor != null ? brl(Number(o.valor)) : "—"}{o.inicio ? ` · início ${dataBR(o.inicio)}` : ""}{o.concluida_em ? ` · concluída ${dataBR(o.concluida_em)} · garantia até ${dataBR(addDias(o.concluida_em, o.garantia_dias))}` : ""}</div>
              <Field label="Aparelho atendido (atualiza a próxima limpeza ao concluir)">
                <select className={inputCls} value={o.equipment_id ?? ""} onChange={(e) => upd.mutate({ equipment_id: e.target.value || null })}>
                  <option value="">Nenhum</option>
                  {aparelhos.map((a) => <option key={a.id} value={a.id}>{a.local} — {[a.descricao, a.marca, a.btus ? `${a.btus} BTUs` : ""].filter(Boolean).join(" ")}</option>)}
                </select>
              </Field>
              <Field label="Garantia (dias)">
                <select className={inputCls} value={String(o.garantia_dias)} onChange={(e) => upd.mutate({ garantia_dias: Number(e.target.value) })}>
                  {["0", "30", "90", "180", "365"].map((d) => <option key={d} value={d}>{d === "0" ? "Sem garantia" : `${d} dias`}</option>)}
                </select>
              </Field>
            </div>
          </Panel>

          <Panel title="Peças e materiais usados" action={<span className="text-xs text-muted-foreground tabular-nums">Custo {brl(custoPecas)}</span>}>
            {bloqueado && <div className="border-b px-4 py-2 text-xs text-success">Já baixado do estoque. Volte a situação para alterar as peças.</div>}
            <StateRow empty={o.service_order_items.length === 0} emptyText="Nenhuma peça lançada. Ao concluir a ordem, as peças lançadas saem do estoque." />
            <ul className="divide-y">
              {o.service_order_items.map((i) => (
                <li key={i.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="truncate">{i.stock_items?.nome}</span>
                  <span className="tabular-nums text-muted-foreground">{String(i.quantidade).replace(".", ",")} {i.stock_items?.unidade}</span>
                  <Button variant="ghost" size="icon" aria-label="Remover peça" disabled={bloqueado} onClick={() => delPeca.mutate(i.id)}><Trash2 className="h-4 w-4" /></Button>
                </li>
              ))}
            </ul>
            {!bloqueado && (
              <form className="grid grid-cols-[minmax(0,1fr)_5rem_auto] gap-2 border-t px-4 py-3" onSubmit={(e) => { e.preventDefault(); addPeca.mutate(); }}>
                <select aria-label="Peça" className={inputCls} value={peca.stock_item_id} onChange={(e) => setPeca({ ...peca, stock_item_id: e.target.value })}>
                  <option value="">{estoque.data?.length === 0 ? "Cadastre itens no Estoque" : "Escolha a peça"}</option>
                  {estoque.data?.map((s) => <option key={s.id} value={s.id}>{s.nome} ({String(s.quantidade).replace(".", ",")} {s.unidade})</option>)}
                </select>
                <input aria-label="Quantidade" className={inputCls} inputMode="decimal" value={peca.quantidade} onChange={(e) => setPeca({ ...peca, quantidade: e.target.value })} />
                <Button type="submit" variant="outline" disabled={addPeca.isPending}><Plus className="h-4 w-4" /><span className="hidden sm:inline">Adicionar</span></Button>
                {addPeca.error && <p role="alert" className="col-span-3 text-xs text-destructive">{addPeca.error.message}</p>}
              </form>
            )}
          </Panel>

          <div className="grid gap-5 md:grid-cols-2">
            {(["antes", "depois"] as const).map((tipo) => {
              const fotos = o.os_fotos.filter((f) => f.tipo === tipo);
              return (
                <Panel key={tipo} title={tipo === "antes" ? "Fotos de antes" : "Fotos de depois"} action={
                  <Button asChild size="sm" variant="outline"><label className="cursor-pointer">
                    {enviando === tipo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Adicionar
                    <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { enviarFotos(tipo, e.target.files); e.target.value = ""; }} />
                  </label></Button>}>
                  {fotos.length === 0 ? <div className="px-4 py-6 text-sm text-muted-foreground">Nenhuma foto.</div> : (
                    <div className="grid grid-cols-3 gap-2 p-3">
                      {fotos.map((f) => (
                        <div key={f.id} className="relative aspect-square overflow-hidden rounded-md border bg-muted">
                          <a href={o.urls[f.path]} target="_blank" rel="noreferrer"><img src={o.urls[f.path]} alt={`Foto ${tipo}`} loading="lazy" className="h-full w-full object-cover" /></a>
                          <Button size="icon" variant="secondary" aria-label="Remover foto" className="absolute right-1 top-1 h-6 w-6" onClick={() => delFoto.mutate(f)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}
