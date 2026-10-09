import { createFileRoute } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { company } from "@/lib/company";
import { addDias, brl, dataBR } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { useOrcamento } from "./orcamento.$id";

export const Route = createFileRoute("/_authenticated/imprimir/orcamento/$id")({
  head: pageHead("Imprimir orçamento", "Orçamento para impressão e assinatura."),
  component: Imprimir,
});

function Imprimir() {
  const { id } = Route.useParams();
  const q = useOrcamento(id);
  const d = q.data;
  if (q.isLoading) return <p className="p-8 text-sm text-muted-foreground">Carregando...</p>;
  if (q.error || !d) return <p className="p-8 text-sm text-destructive">Não foi possível carregar o orçamento. Entre no painel e tente de novo.</p>;
  const loc = d.clients?.locations?.[0];
  const itens = d.quote_items;
  const total = itens.reduce((a, i) => a + Number(i.quantidade) * Number(i.valor_unitario), 0) || Number(d.valor);
  const emissao = d.enviado_em ?? d.created_at.slice(0, 10);
  const codigo = `ORC-${String(d.numero).padStart(4, "0")}`;

  return (
    <div className="min-h-screen bg-muted/40 py-6 print:bg-background print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] justify-end px-4 print:hidden">
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir</Button>
      </div>
      <article className="mx-auto max-w-[210mm] bg-background p-[14mm] text-[12px] leading-relaxed text-foreground shadow-sm print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b pb-4">
          <div>
            <div className="text-lg font-semibold">{company.name}</div>
            <div className="text-muted-foreground">{company.addressDisplay}</div>
            <div className="text-muted-foreground">WhatsApp {company.phoneDisplay} · Instagram {company.instagram}</div>
          </div>
          <div className="text-right">
            <div className="text-base font-semibold">ORÇAMENTO</div>
            <div className="tabular-nums">{codigo}</div>
            <div className="tabular-nums text-muted-foreground">Emissão {dataBR(emissao)}</div>
            <div className="tabular-nums text-muted-foreground">Válido até {dataBR(addDias(emissao, d.validade_dias))}</div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4 border-b py-4">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Cliente</div>
            <div className="font-medium">{d.clients?.nome}</div>
            {d.clients?.documento && <div>CPF/CNPJ: {d.clients.documento}</div>}
            {d.clients?.whatsapp && <div>Telefone: {d.clients.whatsapp}</div>}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Local do serviço</div>
            <div>{loc ? `${loc.endereco}${loc.bairro ? `, ${loc.bairro}` : ""}` : "—"}</div>
            {loc && <div>{loc.cidade}</div>}
          </div>
        </section>

        <section className="py-4">
          <div className="mb-2 font-medium">{d.descricao}</div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-1.5">Tipo</th><th className="py-1.5">Descrição</th><th className="py-1.5 text-right">Qtd.</th><th className="py-1.5 text-right">Unitário</th><th className="py-1.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {itens.length === 0 ? (
                <tr className="border-b"><td className="py-1.5" colSpan={4}>{d.descricao}</td><td className="py-1.5 text-right tabular-nums">{brl(total)}</td></tr>
              ) : itens.map((i) => (
                <tr key={i.id} className="border-b">
                  <td className="py-1.5 pr-2">{i.tipo}</td>
                  <td className="py-1.5 pr-2">{i.descricao}</td>
                  <td className="py-1.5 text-right tabular-nums">{String(i.quantidade).replace(".", ",")}</td>
                  <td className="py-1.5 text-right tabular-nums">{brl(Number(i.valor_unitario))}</td>
                  <td className="py-1.5 text-right tabular-nums">{brl(Number(i.quantidade) * Number(i.valor_unitario))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={4} className="pt-3 text-right font-semibold">Total</td><td className="pt-3 text-right text-sm font-semibold tabular-nums">{brl(total)}</td></tr>
            </tfoot>
          </table>
        </section>

        {d.observacoes && (
          <section className="border-t py-4">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Observações</div>
            <p className="whitespace-pre-line">{d.observacoes}</p>
          </section>
        )}

        <p className="border-t pt-4 text-muted-foreground">Declaro que li e aprovo este orçamento, autorizando a execução dos serviços descritos acima.</p>
        <p className="mt-4">{company.city}/{company.state}, ____ de ______________ de ________.</p>

        <section className="mt-16 grid grid-cols-2 gap-10 text-center">
          <div>
            <div className="border-t border-foreground pt-1.5 font-medium">{d.clients?.nome}</div>
            <div className="text-muted-foreground">Cliente</div>
          </div>
          <div>
            <div className="border-t border-foreground pt-1.5 font-medium">{company.name}</div>
            <div className="text-muted-foreground">Responsável</div>
          </div>
        </section>
      </article>
    </div>
  );
}
