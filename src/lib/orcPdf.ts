// Gera o Orçamento como PDF A4 de verdade (mesmo padrão visual da OS).
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { company } from "@/lib/company";
import { brl, dataBR } from "@/lib/format";

const AZUL: [number, number, number] = [37, 99, 235];
const CINZA: [number, number, number] = [100, 116, 139];
const FUNDO: [number, number, number] = [241, 245, 249];
const TEXTO: [number, number, number] = [15, 23, 42];

type Img = { data: string; w: number; h: number };

async function carregar(url: string, max: number): Promise<Img | null> {
  try {
    const bmp = await createImageBitmap(await (await fetch(url)).blob());
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    return { data: c.toDataURL("image/jpeg", 0.85), w, h };
  } catch {
    return null;
  }
}

export type OrcParaPdf = {
  codigo: string;
  emissao: string;
  validade: string;
  descricao: string;
  observacoes?: string | null;
  cliente?: { nome?: string | null; documento?: string | null; whatsapp?: string | null } | null;
  endereco?: string;
  itens: { tipo: string; descricao: string; quantidade: number; unitario: number }[];
  total: number;
  pix?: { chave: string; nome: string } | null;
  logoUrl: string;
  marcaUrl: string;
};

export async function gerarPdfOrcamento(o: OrcParaPdf) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 14, CW = W - M * 2;
  const [logo, marca] = await Promise.all([carregar(o.logoUrl, 900), carregar(o.marcaUrl, 700)]);

  const moldura = () => {
    doc.setFillColor(...AZUL).rect(0, 0, W, 3, "F");
    if (marca) {
      const mw = W * 0.7, mh = (mw * marca.h) / marca.w;
      doc.saveGraphicsState();
      doc.setGState(new (doc as unknown as { GState: new (o: object) => unknown }).GState({ opacity: 0.07 }) as never);
      doc.addImage(marca.data, "JPEG", (W - mw) / 2, (H - mh) / 2, mw, mh);
      doc.restoreGraphicsState();
    }
    doc.setFillColor(...AZUL).rect(0, H - 9, W, 9, "F");
    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(255, 255, 255);
    doc.text(`${company.name} · ${company.addressDisplay}`, M, H - 3.5);
    doc.text(`${o.codigo} · WhatsApp ${company.phoneDisplay}`, W - M, H - 3.5, { align: "right" });
  };
  moldura();
  let y = 10;
  const espaco = (alt: number) => { if (y + alt > H - 14) { doc.addPage(); moldura(); y = 12; } };

  if (logo) {
    const lw = Math.min((18 * logo.w) / logo.h, 105);
    doc.addImage(logo.data, "JPEG", M, y, lw, (lw * logo.h) / logo.w);
  }
  doc.setDrawColor(...AZUL).setLineWidth(0.6).line(M, y + 21, M, y + 29);
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...CINZA);
  doc.text(company.addressDisplay, M + 3, y + 24);
  doc.text(`WhatsApp ${company.phoneDisplay} · ${company.instagram}`, M + 3, y + 28);

  const bw = 62, bx = W - M - bw, cx = bx + bw / 2;
  doc.setDrawColor(...AZUL).setLineWidth(0.6).roundedRect(bx, y, bw, 30, 1.5, 1.5, "S");
  doc.setFillColor(...AZUL).rect(bx, y, bw, 7, "F");
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(255, 255, 255).text("ORÇAMENTO", cx, y + 4.8, { align: "center" });
  doc.setFontSize(15).setTextColor(...TEXTO).text(`Nº ${o.codigo}`, cx, y + 15, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...CINZA);
  doc.text(`Emissão ${dataBR(o.emissao)}`, cx, y + 21.5, { align: "center" });
  doc.setTextColor(...AZUL).text(`Válido até ${dataBR(o.validade)}`, cx, y + 26, { align: "center" });
  y += 38;

  const titulo = (n: string, t: string) => {
    espaco(14);
    doc.setFillColor(...AZUL).roundedRect(M, y - 3.6, 5, 5, 0.6, 0.6, "F");
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(255, 255, 255).text(n, M + 2.5, y + 0.1, { align: "center" });
    doc.setFontSize(9).setTextColor(...AZUL).text(t.toUpperCase(), M + 7, y);
    doc.setDrawColor(...AZUL).setLineWidth(0.5).line(M, y + 2, W - M, y + 2);
    y += 7;
  };
  const campo = (rot: string, val: string, x: number, w: number, yy: number) => {
    doc.setFont("helvetica", "bold").setFontSize(6.5).setTextColor(...CINZA).text(rot.toUpperCase(), x, yy);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...TEXTO);
    doc.text(doc.splitTextToSize(val || "—", w) as string[], x, yy + 4);
  };

  titulo("1", "Dados do cliente");
  const c2 = CW * 0.62;
  const docu = o.cliente?.documento?.trim(), tel = o.cliente?.whatsapp?.trim();
  const d1: [string, string] | null = docu ? ["CPF / CNPJ", docu] : tel ? ["Telefone", tel] : null;
  const d2: [string, string] | null = docu && tel ? ["Telefone", tel] : null;
  doc.setFontSize(9);
  const endL = (doc.splitTextToSize(o.endereco || "—", (d2 ? c2 : CW) - 6) as string[]).length;
  const boxH = 18 + endL * 4;
  doc.setFillColor(...FUNDO).roundedRect(M, y - 1, CW, boxH, 1.5, 1.5, "F");
  campo("Nome / Razão social", o.cliente?.nome ?? "", M + 3, (d1 ? c2 : CW) - 6, y + 3);
  if (d1) campo(d1[0], d1[1], M + c2, CW - c2 - 3, y + 3);
  campo("Local do serviço", o.endereco ?? "", M + 3, (d2 ? c2 : CW) - 6, y + 13);
  if (d2) campo(d2[0], d2[1], M + c2, CW - c2 - 3, y + 13);
  y += boxH + 6;

  titulo("2", "Serviço proposto");
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...TEXTO);
  const desc = doc.splitTextToSize(o.descricao || "—", CW) as string[];
  doc.text(desc, M, y + 1);
  y += desc.length * 4.5 + 4;

  titulo("3", "Materiais e mão de obra");
  const linhas = o.itens.length ? o.itens : [{ tipo: "Serviço", descricao: o.descricao, quantidade: 1, unitario: o.total }];
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, bottom: 14 },
    head: [["Tipo", "Descrição", "Qtd.", "Unitário", "Total"]],
    body: linhas.map((i) => [i.tipo, i.descricao, String(i.quantidade).replace(".", ","), brl(i.unitario), brl(i.quantidade * i.unitario)]),
    styles: { font: "helvetica", fontSize: 8.5, textColor: TEXTO, cellPadding: 2 },
    headStyles: { fillColor: AZUL, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: FUNDO },
    columnStyles: { 0: { cellWidth: 24 }, 2: { halign: "right", cellWidth: 14 }, 3: { halign: "right", cellWidth: 26 }, 4: { halign: "right", cellWidth: 28 } },
    didDrawPage: (d) => { if (d.pageNumber > 1) moldura(); },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  const mat = o.itens.filter((i) => i.tipo === "Material").reduce((a, i) => a + i.quantidade * i.unitario, 0);
  espaco(24);
  if (o.itens.length) {
    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...CINZA);
    doc.text(`Materiais: ${brl(mat)}`, W - M, y + 2, { align: "right" });
    doc.text(`Mão de obra: ${brl(o.total - mat)}`, W - M, y + 6.5, { align: "right" });
    y += 9;
  }
  const tw = 72;
  doc.setFillColor(...AZUL).roundedRect(W - M - tw, y, tw, 9, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(255, 255, 255).text("VALOR TOTAL", W - M - tw + 4, y + 5.8);
  doc.setFontSize(11).text(brl(o.total), W - M - 4, y + 6, { align: "right" });
  y += 16;

  let n = 4;
  if (o.observacoes?.trim()) {
    titulo(String(n++), "Condições e observações");
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...TEXTO);
    const ob = doc.splitTextToSize(o.observacoes.trim(), CW) as string[];
    espaco(ob.length * 4.2);
    doc.text(ob, M, y + 1);
    y += ob.length * 4.2 + 5;
  }
  if (o.pix) {
    titulo(String(n++), "Pagamento via Pix");
    doc.setFillColor(...FUNDO).roundedRect(M, y - 1, CW, 12, 1.5, 1.5, "F");
    campo("Chave Pix", o.pix.chave, M + 3, CW * 0.55, y + 3);
    campo("Recebedor", o.pix.nome, M + CW * 0.6, CW * 0.38, y + 3);
    y += 18;
  }

  espaco(26);
  y = Math.max(y + 8, H - 40);
  doc.setDrawColor(...CINZA).setLineWidth(0.3);
  const aw = CW / 2 - 8;
  doc.line(M, y, M + aw, y);
  doc.line(W - M - aw, y, W - M, y);
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...CINZA);
  doc.text("De acordo — cliente", M + aw / 2, y + 4, { align: "center" });
  doc.text(company.name, W - M - aw / 2, y + 4, { align: "center" });

  return doc.output("blob");
}
