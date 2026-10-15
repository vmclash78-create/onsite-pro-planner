import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PrimaryButton } from "@/components/AppShell";
import { Field, FormPanel, Panel, StateRow, inputCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { CATEGORIAS } from "@/lib/staff";

export const Route = createFileRoute("/_authenticated/vitrine")({
  head: pageHead("Vitrine", "Serviços, aparelhos e fotos de obras exibidos na página pública."),
  component: Vitrine,
});

const vazio = { tipo: "Serviço", categoria: "Refrigeração", titulo: "", descricao: "", preco: "", a_partir: true };

function Vitrine() {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState(vazio);
  const [foto, setFoto] = useState<File | null>(null);
  const q = useQuery({
    queryKey: ["catalogo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("catalogo_itens").select("*").order("ordem");
      if (error) throw error;
      return data;
    },
  });
  const inval = () => { qc.invalidateQueries({ queryKey: ["catalogo"] }); qc.invalidateQueries({ queryKey: ["catalogo-publico"] }); };
  const salvar = useMutation({
    mutationFn: async () => {
      if (!f.titulo.trim()) throw new Error("Informe o título.");
      let imagem_url: string | null = null;
      if (foto) {
        const path = `${crypto.randomUUID()}.${foto.name.split(".").pop() || "jpg"}`;
        const up = await supabase.storage.from("catalogo").upload(path, foto, { contentType: foto.type });
        if (up.error) throw up.error;
        imagem_url = supabase.storage.from("catalogo").getPublicUrl(path).data.publicUrl;
      }
      const preco = f.preco ? Number(f.preco.replace(/\./g, "").replace(",", ".")) : null;
      const { error } = await supabase.from("catalogo_itens").insert({ tipo: f.tipo, categoria: f.categoria, titulo: f.titulo.trim(), descricao: f.descricao || null, preco, a_partir: f.a_partir, imagem_url, ordem: (q.data?.length ?? 0) + 1 });
      if (error) throw error;
    },
    onSuccess: () => { setF(vazio); setFoto(null); setAberto(false); inval(); toast.success("Item publicado na vitrine."); },
  });
  const toggle = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => { const { error } = await supabase.from("catalogo_itens").update({ ativo }).eq("id", id); if (error) throw error; },
    onSuccess: inval, onError: (e) => toast.error(e.message),
  });
  const excluir = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("catalogo_itens").delete().eq("id", id); if (error) throw error; },
    onSuccess: inval, onError: (e) => toast.error(e.message),
  });

  return (
    <AppShell title="Vitrine" actions={<div className="flex gap-2">
      <Button asChild variant="outline"><Link to="/catalogo" target="_blank"><ExternalLink className="h-4 w-4" /><span className="hidden sm:inline">Ver página</span></Link></Button>
      <PrimaryButton label="Novo item" onClick={() => setAberto(true)} />
    </div>}>
      {aberto && (
        <FormPanel title="Novo item da vitrine" onClose={() => setAberto(false)} onSubmit={() => salvar.mutate()} saving={salvar.isPending} error={salvar.error?.message}>
          <Field label="Tipo"><select className={inputCls} value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
            {["Serviço", "Aparelho", "Acessório", "Obra"].map((t) => <option key={t} value={t}>{t === "Obra" ? "Foto de obra (portfólio)" : t}</option>)}
          </select></Field>
          <Field label="Categoria"><select className={inputCls} value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Título" className="sm:col-span-2"><input className={inputCls} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder="Split 9.000 BTUs Inverter com instalação" required /></Field>
          <Field label="Descrição" className="sm:col-span-2"><input className={inputCls} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></Field>
          {f.tipo !== "Obra" && <Field label="Preço (R$)"><input className={inputCls} inputMode="decimal" value={f.preco} onChange={(e) => setF({ ...f, preco: e.target.value })} placeholder="0,00" /></Field>}
          {f.tipo !== "Obra" && <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={f.a_partir} onChange={(e) => setF({ ...f, a_partir: e.target.checked })} /> Mostrar "a partir de"</label>}
          <Field label="Foto" className="sm:col-span-2"><input type="file" accept="image/*" className="text-sm" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} /></Field>
        </FormPanel>
      )}
      <Panel title={`${q.data?.length ?? 0} item(ns)`}>
        <StateRow loading={q.isLoading} error={q.error} empty={q.data?.length === 0} emptyText="Nenhum item na vitrine." />
        <ul className="divide-y">
          {q.data?.map((i) => (
            <li key={i.id} className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
              <div className="h-12 w-12 overflow-hidden rounded-md border bg-muted">{i.imagem_url && <img src={i.imagem_url} alt="" className="h-full w-full object-cover" />}</div>
              <div className="min-w-0">
                <div className={`truncate text-sm font-medium ${i.ativo ? "" : "text-muted-foreground line-through"}`}>{i.titulo}</div>
                <div className="truncate text-xs text-muted-foreground">{i.tipo} · {i.categoria}{i.preco != null ? ` · ${i.a_partir ? "a partir de " : ""}${brl(Number(i.preco))}` : ""}</div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => toggle.mutate({ id: i.id, ativo: !i.ativo })}>{i.ativo ? "Ocultar" : "Mostrar"}</Button>
                <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => confirm("Excluir este item?") && excluir.mutate(i.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </AppShell>
  );
}
