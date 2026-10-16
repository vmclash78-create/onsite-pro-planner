import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { company } from "@/lib/company";
import { addDias, brl, dataBR } from "@/lib/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/imprimir/ordem/$id")({
  head: pageHead("Imprimir ordem de serviço", "Ordem de serviço para impressão e assinatura."),
  component: ImprimirOS,
});

const Rot = ({ children }: { children: React.ReactNode }) => <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{children}</div>;

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

  return (
    <div className="min-h-screen bg-muted/40 py-6 print:bg-background print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] justify-end px-4 print:hidden">
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir / Salvar PDF</Button>
      </div>
      <article className="mx-auto max-w-[210mm] bg-background p-[14mm] text-[12px] leading-relaxed text-foreground shadow-sm print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b pb-4">
          <div>
            <div className="text-lg font-semibold">{company.name}</div>
            <div className="text-muted-foreground">{company.addressDisplay}</div>
            <div className="text-muted-foreground">WhatsApp {company.phoneDisplay} · Instagram {company.instagram}</div>
          </div>
          <div className="text-right">
            <div className="text-base font-semibold">ORDEM DE SERVIÇO</div>
            <div className="tabular-nums">{codigo}</div>
            <div className="text-muted-foreground">Situação: {o.status}</div>
            {o.inicio && <div className="tabular-nums text-muted-foreground">Início {dataBR(o.inicio)}</div>}
            {o.concluida_em && <div className="tabular-nums text-muted-foreground">Conclusão {dataBR(o.concluida_em)}</div>}
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4 border-b py-4">
          <div>
            <Rot>Cliente</Rot>
            <div className="font-medium">{o.clients?.nome}</div>
            {o.clients?.documento && <div>CPF/CNPJ: {o.clients.documento}</div>}
            {o.clients?.whatsapp && <div>Telefone: {o.clients.whatsapp}</div>}
          </div>
          <div>
            <Rot>Local do serviço</Rot>
            <div>{loc ? `${loc.endereco}${loc.bairro ? `, ${loc.bairro}` : ""}` : "—"}</div>
            {loc && <div>{loc.cidade}</div>}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 border-b py-4">
          <div><Rot>Especialidade</Rot><div>{o.categoria}</div></div>
          <div><Rot>Equipamento atendido</Rot><div>{ap ? [ap.descricao, ap.marca, ap.btus ? `${ap.btus} BTUs` : ""].filter(Boolean).join(" · ") : "—"}</div></div>
          <div className="col-span-2"><Rot>Serviço executado</Rot><p className="whitespace-pre-line">{o.descricao}</p></div>
        </section>

        <section className="border-b py-4">
          <Rot>Peças e materiais aplicados</Rot>
          {o.service_order_items.length === 0 ? <div>Nenhum material lançado.</div> : (
            <table className="mt-1 w-full border-collapse">
              <tbody>
                {o.service_order_items.map((i) => (
                  <tr key={i.id} className="border-b last:border-0">
                    <td className="py-1">{i.stock_items?.nome}</td>
                    <td className="py-1 text-right tabular-nums">{String(i.quantidade).replace(".", ",")} {i.stock_items?.unidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mt-3 flex justify-end gap-6 text-sm font-semibold"><span>Valor total</span><span className="tabular-nums">{o.valor != null ? brl(Number(o.valor)) : "—"}</span></div>
        </section>

        {(["antes", "depois"] as const).map((t) => fotos(t).length > 0 && (
          <section key={t} className="border-b py-4 break-inside-avoid">
            <Rot>Registro fotográfico — {t}</Rot>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {fotos(t).map((f) => <img key={f.id} src={o.urls[f.path]} alt={`Foto ${t}`} className="aspect-square w-full rounded object-cover" />)}
            </div>
          </section>
        ))}

        <section className="py-4">
          <Rot>Termo de garantia</Rot>
          <p>
            {o.garantia_dias > 0
              ? `Os serviços descritos possuem garantia de ${o.garantia_dias} dias${o.concluida_em ? `, válida até ${dataBR(addDias(o.concluida_em, o.garantia_dias))}` : " a contar da conclusão"}, cobrindo defeitos de execução. A garantia não abrange mau uso, intervenção de terceiros, oscilações da rede elétrica ou desgaste natural.`
              : "Serviço executado sem garantia."}
          </p>
          <p className="mt-2 text-muted-foreground">Declaro que o serviço foi executado e entregue em pleno funcionamento.</p>
          <p className="mt-3">{company.city}/{company.state}, ____ de ______________ de ________.</p>
        </section>

        <section className="mt-14 grid grid-cols-2 gap-10 text-center">
          <div><div className="border-t border-foreground pt-1.5 font-medium">{o.clients?.nome}</div><div className="text-muted-foreground">Cliente</div></div>
          <div><div className="border-t border-foreground pt-1.5 font-medium">{company.name}</div><div className="text-muted-foreground">Técnico responsável</div></div>
        </section>
      </article>
    </div>
  );
}
