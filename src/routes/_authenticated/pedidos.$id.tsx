import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Loader2, MessageCircle, Sparkles, X } from "lucide-react";
import { company } from "@/lib/company";
import { AppShell } from "@/components/AppShell";
import { Panel, StateRow, StatusSelect, inputCls } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { analisarPedido } from "@/lib/pedidos.functions";
import { dataBR } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { STATUS_AG, useMe } from "@/lib/staff";

export const Route = createFileRoute("/_authenticated/pedidos/$id")({
  head: pageHead("Pedido", "Detalhes do pedido de serviço, fotos e análise com IA."),
  component: Pedido,
});

const urgCor: Record<string, string> = { Alta: "text-destructive", Média: "text-warning", Baixa: "text-success" };

function Pedido() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const me = useMe();
  const analisar = useServerFn(analisarPedido);
  const fileRef = useRef<HTMLInputElement>(null);
  const [descricao, setDescricao] = useState("");

  const q = useQuery({
    queryKey: ["pedido", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("*").eq("id", id).single();
      if (error) throw error;
      let urls: Record<string, string> = {};
      if (data.fotos.length) {
        const { data: s } = await supabase.storage.from("pedidos").createSignedUrls(data.fotos, 3600);
        urls = Object.fromEntries((s ?? []).map((x) => [x.path ?? "", x.signedUrl ?? ""]));
      }
      return { ...data, urls };
    },
  });
  useEffect(() => { if (q.data) setDescricao(q.data.descricao ?? ""); }, [q.data?.id, q.data?.descricao]);
  const p = q.data;
  const inval = () => { qc.invalidateQueries({ queryKey: ["pedido", id] }); qc.invalidateQueries({ queryKey: ["pedidos"] }); qc.invalidateQueries({ queryKey: ["agenda"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); };

  const salvarDesc = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("appointments").update({ descricao: descricao.trim() || null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: inval,
  });
  const status = useMutation({
    mutationFn: async (s: string) => {
      const { error } = await supabase.from("appointments").update({ status: s }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: inval,
  });
  const enviarFotos = useMutation({
    mutationFn: async (files: File[]) => {
      if (!p) return;
      const livres = 3 - p.fotos.length;
      if (livres <= 0) throw new Error("Limite de 3 fotos.");
      const novos: string[] = [];
      for (const file of files.slice(0, livres)) {
        if (!file.type.startsWith("image/")) continue;
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `painel/${id}/${Date.now()}-${novos.length}.${ext}`;
        const { error } = await supabase.storage.from("pedidos").upload(path, file, { contentType: file.type });
        if (error) throw new Error("Falha ao enviar a foto.");
        novos.push(path);
      }
      const { error } = await supabase.from("appointments").update({ fotos: [...p.fotos, ...novos] }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: inval,
  });
  const removerFoto = useMutation({
    mutationFn: async (path: string) => {
      if (!p) return;
      const { error } = await supabase.from("appointments").update({ fotos: p.fotos.filter((f) => f !== path) }).eq("id", id);
      if (error) throw error;
      await supabase.storage.from("pedidos").remove([path]);
    },
    onSuccess: inval,
  });
  const ia = useMutation({
    mutationFn: async () => {
      if (descricao !== (p?.descricao ?? "")) await salvarDesc.mutateAsync();
      return analisar({ data: { id } });
    },
    onSuccess: inval,
  });

  const passos = Array.isArray(p?.ia_proximos_passos) ? (p.ia_proximos_passos as string[]) : [];

  return (
    <AppShell title={p?.nome_contato ?? "Pedido"} breadcrumb={["Painel", "Pedidos", "Detalhes"]}>
      <Link to="/pedidos" className="mb-4 inline-block text-xs text-primary hover:underline">Voltar aos pedidos</Link>
      {!p ? <Panel><StateRow loading={q.isLoading} error={q.error} /></Panel> : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-5">
            <Panel title="Pedido" action={<StatusSelect value={p.status} options={STATUS_AG} onChange={(s) => status.mutate(s)} />}>
              <dl className="grid gap-x-4 gap-y-3 p-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-muted-foreground">Serviço</dt><dd>{p.categoria} · {p.tipo}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Quando</dt><dd className="tabular-nums">{p.visita_orcamento ? "Visita para orçamento" : p.data ? `${dataBR(p.data)} às ${p.hora ?? "--:--"}` : "Sem data"}</dd></div>
                <div><dt className="text-xs text-muted-foreground">WhatsApp</dt><dd><a className="tabular-nums text-primary hover:underline" href={`https://wa.me/55${p.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{p.whatsapp}</a></dd></div>
                <div><dt className="text-xs text-muted-foreground">Endereço</dt><dd>{p.endereco ?? "—"}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Recebido</dt><dd className="tabular-nums">{dataBR(p.created_at)} · {p.origem === "site" ? "pelo site" : "pelo painel"}</dd></div>
              </dl>
              <div className="border-t p-4">
                <a
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:w-auto"
                  target="_blank" rel="noreferrer"
                  onClick={() => { if (p.status === "Pendente") status.mutate("Confirmado"); }}
                  href={`https://wa.me/55${p.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Prezado(a) ${p.nome_contato}, a ${company.name} confirma sua solicitação de ${p.categoria} (${p.tipo}) ` +
                    (p.visita_orcamento || !p.data ? "na modalidade de visita técnica. Entraremos em contato para definir a data." : `para ${dataBR(p.data)}${p.hora ? ` às ${p.hora}` : ""}.`) +
                    ` Endereço: ${p.endereco ?? "a confirmar"}. Em caso de dúvidas, permanecemos à disposição.`
                  )}`}
                ><MessageCircle className="h-4 w-4" /> Confirmar pelo WhatsApp</a>
              </div>
            </Panel>

            <Panel title="Descrição do problema" action={descricao !== (p.descricao ?? "") ? (
              <button onClick={() => salvarDesc.mutate()} disabled={salvarDesc.isPending} className="text-xs text-primary hover:underline">{salvarDesc.isPending ? "Salvando..." : "Salvar"}</button>
            ) : null}>
              <div className="p-4">
                <textarea aria-label="Descrição do problema" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={5}
                  className={`${inputCls} h-auto resize-y py-2`} placeholder="O que o cliente relatou, o que foi visto no local..." />
              </div>
            </Panel>

            <Panel title="Fotos" action={<span className="text-xs tabular-nums text-muted-foreground">{p.fotos.length} de 3</span>}>
              <div className="flex flex-wrap gap-3 p-4">
                {p.fotos.map((path) => (
                  <div key={path} className="relative h-28 w-28 overflow-hidden rounded-lg border bg-muted">
                    {p.urls[path] && <img src={p.urls[path]} alt="Foto do pedido" className="h-full w-full object-cover" />}
                    <button aria-label="Remover foto" onClick={() => removerFoto.mutate(path)} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/90"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                {p.fotos.length < 3 && (
                  <button onClick={() => fileRef.current?.click()} disabled={enviarFotos.isPending}
                    className="flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground hover:border-primary hover:text-foreground">
                    {enviarFotos.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" strokeWidth={1.75} />} Adicionar
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { enviarFotos.mutate(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
              </div>
              {enviarFotos.error && <p className="px-4 pb-3 text-xs text-destructive">{enviarFotos.error.message}</p>}
            </Panel>
          </div>

          <Panel title="Análise com IA" action={p.ia_analisado_em ? <span className="text-xs tabular-nums text-muted-foreground">{dataBR(p.ia_analisado_em)}</span> : null}>
            <div className="p-4">
              {!me.data?.isAdmin ? (
                <p className="text-sm text-muted-foreground">Somente administradores podem pedir a análise.</p>
              ) : (
                <button onClick={() => ia.mutate()} disabled={ia.isPending}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[6px] bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {ia.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Analisando...</> : <><Sparkles className="h-4 w-4" /> {p.ia_analisado_em ? "Analisar de novo" : "Classificar com IA"}</>}
                </button>
              )}
              {ia.error && <p className="mt-3 text-xs text-destructive">{ia.error.message}</p>}
              {p.ia_tipo ? (
                <dl className="mt-4 space-y-3 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Tipo de atendimento</dt><dd className="font-medium">{p.ia_tipo}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Urgência</dt><dd className={`font-medium ${urgCor[p.ia_urgencia ?? ""] ?? ""}`}>{p.ia_urgencia}</dd></div>
                  {p.ia_justificativa && <div><dt className="text-xs text-muted-foreground">Por quê</dt><dd className="text-muted-foreground">{p.ia_justificativa}</dd></div>}
                  {passos.length > 0 && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Próximos passos</dt>
                      <dd><ol className="mt-1 list-decimal space-y-1 pl-5">{passos.map((s, i) => <li key={i}>{s}</li>)}</ol></dd>
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground">Sugestão automática. Confira antes de agir.</p>
                </dl>
              ) : !ia.isPending && <p className="mt-3 text-xs text-muted-foreground">Informe a descrição e as fotos e clique para classificar o tipo de atendimento, a urgência e os próximos passos.</p>}
            </div>
          </Panel>
        </div>
      )}
    </AppShell>
  );
}
