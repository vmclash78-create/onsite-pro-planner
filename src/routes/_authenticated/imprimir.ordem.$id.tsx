import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { company } from "@/lib/company";
import { addDias, brl, dataBR } from "@/lib/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/imprimir/ordem/$id")({
  head: pageHead("Imprimir ordem de serviço", "Ordem de serviço para impressão e assinatura."),
  component: ImprimirOS,
});

const Titulo = ({ n, children }: { n: string; children: React.ReactNode }) => (
  <div className="mb-2 flex items-center gap-2 border-b-2 border-primary pb-1">
    <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-primary text-[10px] font-bold text-primary-foreground">{n}</span>
    <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">{children}</h2>
  </div>
);
const Campo = ({ r, v }: { r: string; v: React.ReactNode }) => (
  <div>
    <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{r}</div>
    <div className="font-medium">{v || "—"}</div>
  </div>
);

function ImprimirOS() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["ordem-print", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("service_orders")
        .select("id, numero, categoria, descricao, status, valor, inicio, concluida_em, equipment_id, garantia_dias, clients(nome, whatsapp, documento, locations(endereco, bairro, cidade, equipment(id, descricao, marca, btus))), service_order_items(id, quantidade, stock_items(nome, unidade)), os_fotos(id, tipo, path)")
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
  const o = q.data;
  if (q.isLoading) return <p className="p-8 text-sm text-muted-foreground">Carregando...</p>;
  if (q.error || !o) return <p className="p-8 text-sm text-destructive">Não foi possível carregar a ordem de serviço.</p>;
  const loc = o.clients?.locations?.[0];
  const ap = o.clients?.locations.flatMap((l) => l.equipment).find((e) => e.id === o.equipment_id);
  const codigo = `OS-${String(o.numero).padStart(4, "0")}`;
  const fotos = (t: string) => o.os_fotos.filter((f) => f.tipo === t);
  const temFotos = fotos("antes").length + fotos("depois").length > 0;

  return (
    <div className="min-h-screen bg-muted/50 py-6 print:bg-background print:py-0" style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}>
      <div className="mx-auto mb-4 flex max-w-[210mm] justify-end px-4 print:hidden">
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir / Salvar PDF</Button>
      </div>
      <div className="overflow-x-auto px-2 print:overflow-visible print:px-0">
        <article className="mx-auto flex min-h-[297mm] w-[210mm] flex-col bg-background text-[11px] leading-relaxed text-foreground shadow-lg print:shadow-none">
          <div className="h-2 bg-primary" />
          <header className="flex items-stretch justify-between gap-6 px-[14mm] pt-[10mm] pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-md bg-primary text-xl font-black tracking-tight text-primary-foreground">VM</div>
              <div>
                <div className="text-[17px] font-bold leading-tight">{company.name}</div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-primary">Climatização · Gesso · Elétrica</div>
                <div className="mt-1 text-[10px] text-muted-foreground">{company.addressDisplay}</div>
                <div className="text-[10px] text-muted-foreground">WhatsApp {company.phoneDisplay} · {company.instagram}</div>
              </div>
            </div>
            <div className="min-w-[58mm] rounded-md border-2 border-primary text-right">
              <div className="whitespace-nowrap bg-primary px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-primary-foreground">Ordem de Serviço</div>
              <div className="space-y-0.5 px-3 py-2">
                <div className="whitespace-nowrap text-lg font-bold tabular-nums">Nº {codigo}</div>
                <div className="text-[10px] text-muted-foreground">Situação: <b className="text-foreground">{o.status}</b></div>
                {o.inicio && <div className="text-[10px] tabular-nums text-muted-foreground">Início: {dataBR(o.inicio)}</div>}
                {o.concluida_em && <div className="text-[10px] tabular-nums text-muted-foreground">Conclusão: {dataBR(o.concluida_em)}</div>}
              </div>
            </div>
          </header>

          <main className="flex-1 space-y-5 px-[14mm]">
            <section>
              <Titulo n="1">Dados do cliente</Titulo>
              <div className="grid grid-cols-3 gap-3 rounded-md bg-muted/60 p-3">
                <div className="col-span-2"><Campo r="Nome / Razão social" v={o.clients?.nome} /></div>
                <Campo r="CPF / CNPJ" v={o.clients?.documento} />
                <div className="col-span-2"><Campo r="Endereço do atendimento" v={loc ? `${loc.endereco}${loc.bairro ? `, ${loc.bairro}` : ""} — ${loc.cidade}` : ""} /></div>
                <Campo r="Telefone" v={o.clients?.whatsapp} />
              </div>
            </section>

            <section>
              <Titulo n="2">Serviço executado</Titulo>
              <div className="grid grid-cols-3 gap-3">
                <Campo r="Especialidade" v={o.categoria} />
                <div className="col-span-2"><Campo r="Equipamento atendido" v={ap ? [ap.descricao, ap.marca, ap.btus ? `${ap.btus} BTUs` : ""].filter(Boolean).join(" · ") : ""} /></div>
                <div className="col-span-3 rounded-md border p-3"><div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Descrição técnica</div><p className="whitespace-pre-line">{o.descricao}</p></div>
              </div>
            </section>

            <section>
              <Titulo n="3">Peças e materiais aplicados</Titulo>
              <table className="w-full border-collapse overflow-hidden rounded-md">
                <thead><tr className="bg-primary text-primary-foreground"><th className="px-3 py-1.5 text-left font-semibold">Item</th><th className="w-32 px-3 py-1.5 text-right font-semibold">Quantidade</th></tr></thead>
                <tbody>
                  {o.service_order_items.length === 0 ? <tr><td colSpan={2} className="border-b px-3 py-2 text-muted-foreground">Nenhum material lançado.</td></tr> :
                    o.service_order_items.map((i) => (
                      <tr key={i.id} className="border-b even:bg-muted/50">
                        <td className="px-3 py-1.5">{i.stock_items?.nome}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{String(i.quantidade).replace(".", ",")} {i.stock_items?.unidade}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <div className="mt-2 flex justify-end">
                <div className="flex min-w-[70mm] items-center justify-between rounded-md bg-primary px-4 py-2 text-primary-foreground">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Valor total</span>
                  <span className="text-base font-bold tabular-nums">{o.valor != null ? brl(Number(o.valor)) : "—"}</span>
                </div>
              </div>
            </section>

            {temFotos && (
              <section className="break-inside-avoid">
                <Titulo n="4">Registro fotográfico</Titulo>
                <div className="grid grid-cols-2 gap-4">
                  {(["antes", "depois"] as const).map((t) => (
                    <div key={t}>
                      <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{t === "antes" ? "Antes" : "Depois"}</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {fotos(t).map((f) => <img key={f.id} src={o.urls[f.path]} alt={`Foto ${t}`} className="aspect-square w-full rounded border object-cover" />)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="break-inside-avoid">
              <Titulo n={temFotos ? "5" : "4"}>Termo de garantia</Titulo>
              <div className="flex gap-3 rounded-md border-l-4 border-primary bg-muted/60 p-3">
                <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p>
                    {o.garantia_dias > 0
                      ? `Os serviços descritos possuem garantia de ${o.garantia_dias} dias${o.concluida_em ? `, válida até ${dataBR(addDias(o.concluida_em, o.garantia_dias))}` : " a contar da conclusão"}, cobrindo defeitos de execução. A garantia não abrange mau uso, intervenção de terceiros, oscilações da rede elétrica ou desgaste natural.`
                      : "Serviço executado sem garantia."}
                  </p>
                  <p className="mt-1 text-muted-foreground">Declaro que o serviço foi executado e entregue em pleno funcionamento.</p>
                </div>
              </div>
              <p className="mt-3">{company.city}/{company.state}, ____ de ______________ de ________.</p>
            </section>

            <section className="grid grid-cols-2 gap-12 pt-12 text-center break-inside-avoid">
              <div><div className="border-t border-foreground pt-1.5 font-semibold">{o.clients?.nome}</div><div className="text-[10px] text-muted-foreground">Cliente</div></div>
              <div><div className="border-t border-foreground pt-1.5 font-semibold">{company.name}</div><div className="text-[10px] text-muted-foreground">Técnico responsável</div></div>
            </section>
          </main>

          <footer className="mt-8 flex items-center justify-between bg-primary px-[14mm] py-2 text-[9px] text-primary-foreground">
            <span>{company.name} · {company.addressDisplay}</span>
            <span className="tabular-nums">{codigo} · WhatsApp {company.phoneDisplay}</span>
          </footer>
        </article>
      </div>
    </div>
  );
}
