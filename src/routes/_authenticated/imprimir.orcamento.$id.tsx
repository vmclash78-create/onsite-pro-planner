import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import logoH from "@/assets/logo-horizontal.png.asset.json";
import marca from "@/assets/marca-dagua.png.asset.json";
import { Button } from "@/components/ui/button";
import { linkWhatsApp, normalizarTelefone, useConfigEmpresa } from "@/lib/cobranca";
import { empresaDe } from "@/lib/company";
import { addDias, brl, dataBR } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { useOrcamento } from "@/lib/orcamento";

export const Route = createFileRoute("/_authenticated/imprimir/orcamento/$id")({
  head: pageHead("Orçamento em PDF", "Orçamento em PDF A4 para enviar ao cliente."),
  component: PdfOrcamento,
});

function PdfOrcamento() {
  const { id } = Route.useParams();
  const q = useOrcamento(id);
  const cfg = useConfigEmpresa();
  const company = empresaDe(cfg.data);
  const d = q.data;
  const pronto = !!d && !cfg.isLoading;

  const loc = d?.clients?.locations?.[0];
  const itens = (d?.quote_items ?? []).map((i) => ({ tipo: i.tipo, descricao: i.descricao, quantidade: Number(i.quantidade), unitario: Number(i.valor_unitario) }));
  const total = itens.reduce((a, i) => a + i.quantidade * i.unitario, 0) || Number(d?.valor ?? 0);
  const emissao = d ? (d.enviado_em ?? d.created_at.slice(0, 10)) : "";
  const codigo = d ? `ORC-${String(d.numero).padStart(4, "0")}` : "Orçamento";
  const validade = d ? addDias(emissao, d.validade_dias) : "";

  const pdf = useQuery({
    queryKey: ["orcamento-pdf", id, d, cfg.data],
    enabled: pronto,
    staleTime: Infinity,
    queryFn: async () => {
      const [{ gerarPdfOrcamento }, { paginasDoPdf }] = await Promise.all([import("@/lib/orcPdf"), import("@/lib/pdfPreview")]);
      const c = cfg.data;
      const blob = await gerarPdfOrcamento({
        codigo, emissao, validade, descricao: d!.descricao, observacoes: d!.observacoes,
        cliente: d!.clients, endereco: loc ? `${loc.endereco}${loc.bairro ? `, ${loc.bairro}` : ""} — ${loc.cidade}` : "",
        itens, total, pix: c?.pix_chave ? { chave: c.pix_chave, nome: c.pix_nome ?? company.name } : null,
        logoUrl: logoH.url, marcaUrl: marca.url, empresa: empresaDe(c),
      });
      const file = new File([blob], `${codigo}.pdf`, { type: "application/pdf" });
      return { file, paginas: await paginasDoPdf(blob) };
    },
  });

  function baixar() {
    if (!pdf.data) return;
    import("@/lib/pdfPreview").then(({ entregarArquivo }) => entregarArquivo(pdf.data.file)).catch(() => toast.error("Não foi possível baixar o PDF."));
  }

  if (q.isLoading) return <p className="p-8 text-sm text-muted-foreground">Carregando...</p>;
  if (q.error || !d) return <p className="p-8 text-sm text-destructive">Não foi possível carregar o orçamento. Entre no painel e tente de novo.</p>;

  const tel = normalizarTelefone(d.clients?.whatsapp);
  const msg = `Olá, ${d.clients?.nome ?? ""}! Aqui é da ${company.name}. Segue o orçamento ${codigo} (${d.descricao}) no valor de ${brl(total)}, válido até ${dataBR(validade)}. Qualquer dúvida, estou à disposição!`;

  return (
    <div className="min-h-screen bg-muted/50 pb-8">
      <div className="sticky top-0 z-10 mb-4 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[210mm] items-center gap-3 px-4 py-2.5">
          <Link to="/orcamento/$id" params={{ id }} aria-label="Voltar para o orçamento" className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Orçamento</div>
            <div className="truncate text-sm font-semibold tabular-nums">{codigo} · {d.clients?.nome}</div>
          </div>
          {tel && (
            <Button variant="outline" size="icon" asChild>
              <a href={linkWhatsApp(tel, msg)} target="_blank" rel="noreferrer" aria-label="Enviar pelo WhatsApp do cliente"><MessageCircle className="h-4 w-4" /></a>
            </Button>
          )}
          <Button size="sm" className="h-9" disabled={!pdf.data} onClick={baixar}>
            {pdf.isLoading || !pronto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span>Baixar PDF</span>
          </Button>
        </div>
      </div>
      {pdf.error && <p className="mx-auto mb-3 max-w-[210mm] px-4 text-xs text-destructive">Não foi possível montar o PDF. Atualize a página e tente de novo.</p>}
      {!pdf.data && !pdf.error && <p className="mx-auto max-w-[210mm] px-4 text-sm text-muted-foreground">Montando o PDF...</p>}
      {pdf.data && (
        <div className="mx-auto flex max-w-[210mm] flex-col gap-3 px-3 sm:px-4">
          {pdf.data.paginas.map((src, i) => (
            <img key={src.slice(-40) + i} src={src} alt={`${codigo} — página ${i + 1}`} className="w-full rounded-md border bg-background shadow-lg" />
          ))}
        </div>
      )}
    </div>
  );
}
