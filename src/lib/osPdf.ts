// Gera a Ordem de Serviço como um PDF de verdade (texto selecionável, A4),
// sem depender da impressão do navegador.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { company } from "@/lib/company";
import { addDias, brl, dataBR } from "@/lib/format";

// Cores da folha impressa (mesmo azul de destaque do sistema).
const AZUL: [number, number, number] = [37, 99, 235];
const CINZA: [number, number, number] = [100, 116, 139];
const FUNDO: [number, number, number] = [241, 245, 249];
const TEXTO: [number, number, number] = [15, 23, 42];

type Img = { data: string; w: number; h: number };

// Carrega e reduz a imagem (logos e fotos vêm enormes), mantendo o PDF leve
// para enviar pelo WhatsApp.
async function carregar(url?: string, max = 1000): Promise<Img | null> {
  if (!url) return null;
  try {
    const blob = await (await fetch(url)).blob();
    const bmp = await createImageBitmap(blob);
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; // folha é branca: fundo transparente vira branco
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    return { data: c.toDataURL("image/jpeg", 0.85), w, h };
  } catch {
    return null;
  }
}

const fmt = (d: string) => (d.includes("image/png") ? "PNG" : "JPEG");

export type OSParaPdf = {
  codigo: string;
  status: string;
  inicio?: string | null;
  concluida_em?: string | null;
  categoria?: string | null;
  descricao?: string | null;
  valor?: number | null;
  garantia_dias: number;
  cliente?: { nome?: string | null; documento?: string | null; whatsapp?: string | null } | null;
  endereco?: string;
  equipamento?: string;
  itens: { nome: string; quantidade: string }[];
  fotosAntes: (string | undefined)[];
  fotosDepois: (string | undefined)[];
  logoUrl: string;
  marcaUrl: string;
};

export async function gerarPdfOS(o: OSParaPdf) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 14, CW = W - M * 2;
  const [logo, marca, ...fotos] = await Promise.all([
    carregar(o.logoUrl, 900), carregar(o.marcaUrl, 700),
    ...o.fotosAntes.map((u) => carregar(u, 600)), ...o.fotosDepois.map((u) => carregar(u, 600)),
  ]);
  const antes = fotos.slice(0, o.fotosAntes.length);
  const depois = fotos.slice(o.fotosAntes.length);

  const moldura = () => {
    doc.setFillColor(...AZUL);
    doc.rect(0, 0, W, 3, "F");
    if (marca) {
      const mw = W * 0.7, mh = (mw * marca.h) / marca.w;
      doc.saveGraphicsState();
      doc.setGState(new (doc as unknown as { GState: new (o: object) => unknown }).GState({ opacity: 0.07 }) as never);
      doc.addImage(marca.data, fmt(marca.data), (W - mw) / 2, (H - mh) / 2, mw, mh);
      doc.restoreGraphicsState();
    }
    doc.setFillColor(...AZUL);
    doc.rect(0, H - 9, W, 9, "F");
    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(255, 255, 255);
    doc.text(`${company.name} · ${company.addressDisplay}`, M, H - 3.5);
    doc.text(`${o.codigo} · WhatsApp ${company.phoneDisplay}`, W - M, H - 3.5, { align: "right" });
  };
  moldura();

  let y = 10;
  const garantirEspaco = (alt: number) => {
    if (y + alt > H - 14) { doc.addPage(); moldura(); y = 12; }
  };

  // Cabeçalho
  if (logo) {
    const lw = Math.min((18 * logo.w) / logo.h, 105);
    doc.addImage(logo.data, fmt(logo.data), M, y, lw, (lw * logo.h) / logo.w);
  }
  doc.setDrawColor(...AZUL).setLineWidth(0.6).line(M, y + 21, M, y + 29);
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...CINZA);
  doc.text(company.addressDisplay, M + 3, y + 24);
  doc.text(`WhatsApp ${company.phoneDisplay} · ${company.instagram}`, M + 3, y + 28);

  // Cartão da OS: conteúdo centralizado, sem lado vazio.
  const bw = 62, bx = W - M - bw, cx = bx + bw / 2;
  doc.setDrawColor(...AZUL).setLineWidth(0.6).roundedRect(bx, y, bw, 30, 1.5, 1.5, "S");
  doc.setFillColor(...AZUL).rect(bx, y, bw, 7, "F");
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(255, 255, 255);
  doc.text("ORDEM DE SERVIÇO", cx, y + 4.8, { align: "center" });
  doc.setFontSize(15).setTextColor(...TEXTO).text(`Nº ${o.codigo}`, cx, y + 14.5, { align: "center" });
  doc.setFontSize(7.5);
  const sw = doc.getTextWidth(o.status.toUpperCase()) + 6;
  doc.setFillColor(...FUNDO).roundedRect(cx - sw / 2, y + 16.8, sw, 4.6, 2.3, 2.3, "F");
  doc.setTextColor(...AZUL).text(o.status.toUpperCase(), cx, y + 20, { align: "center" });
  const datas = [o.inicio && `Início ${dataBR(o.inicio)}`, o.concluida_em && `Conclusão ${dataBR(o.concluida_em)}`].filter(Boolean).join("  ·  ");
  if (datas) doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...CINZA).text(datas, cx, y + 26.5, { align: "center" });
  y += 38;

  const titulo = (n: string, t: string) => {
    garantirEspaco(14);
    doc.setFillColor(...AZUL).roundedRect(M, y - 3.6, 5, 5, 0.6, 0.6, "F");
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(255, 255, 255).text(n, M + 2.5, y + 0.1, { align: "center" });
    doc.setFontSize(9).setTextColor(...AZUL).text(t.toUpperCase(), M + 7, y);
    doc.setDrawColor(...AZUL).setLineWidth(0.5).line(M, y + 2, W - M, y + 2);
    y += 7;
  };
  const campo = (rot: string, val: string, x: number, w: number, yy: number) => {
    doc.setFont("helvetica", "bold").setFontSize(6.5).setTextColor(...CINZA).text(rot.toUpperCase(), x, yy);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...TEXTO);
    const linhas = doc.splitTextToSize(val || "—", w) as string[];
    doc.text(linhas, x, yy + 4);
    return 4 + linhas.length * 4;
  };

  // 1. Cliente — só mostra o que existe; sem CPF, o telefone sobe e o endereço ocupa a linha toda.
  titulo("1", "Dados do cliente");
  const c2 = CW * 0.62;
  const doc1 = o.cliente?.documento?.trim();
  const tel = o.cliente?.whatsapp?.trim();
  const direita1 = doc1 ? ["CPF / CNPJ", doc1] : tel ? ["Telefone", tel] : null;
  const direita2 = doc1 && tel ? ["Telefone", tel] : null;
  doc.setFont("helvetica", "normal").setFontSize(9);
  const endL = (doc.splitTextToSize(o.endereco || "—", (direita2 ? c2 : CW) - 6) as string[]).length;
  const boxH = 18 + endL * 4;
  doc.setFillColor(...FUNDO).roundedRect(M, y - 1, CW, boxH, 1.5, 1.5, "F");
  campo("Nome / Razão social", o.cliente?.nome ?? "", M + 3, (direita1 ? c2 : CW) - 6, y + 3);
  if (direita1) campo(direita1[0], direita1[1], M + c2, CW - c2 - 3, y + 3);
  campo("Endereço do atendimento", o.endereco ?? "", M + 3, (direita2 ? c2 : CW) - 6, y + 13);
  if (direita2) campo(direita2[0], direita2[1], M + c2, CW - c2 - 3, y + 13);
  y += boxH + 6;

  // 2. Serviço — descrição integrada num fundo suave; nada de caixa vazia.
  titulo("2", "Serviço executado");
  if (o.equipamento) {
    campo("Especialidade", o.categoria ?? "", M, CW * 0.3, y);
    campo("Equipamento atendido", o.equipamento, M + CW * 0.34, CW * 0.66, y);
  } else {
    campo("Especialidade", o.categoria ?? "", M, CW, y);
  }
  y += 10;
  if (o.descricao?.trim()) {
    doc.setFont("helvetica", "normal").setFontSize(9);
    const desc = doc.splitTextToSize(o.descricao.trim(), CW - 8) as string[];
    const dh = 9 + desc.length * 4;
    garantirEspaco(dh);
    doc.setFillColor(...FUNDO).roundedRect(M, y, CW, dh, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold").setFontSize(6.5).setTextColor(...CINZA).text("DESCRIÇÃO TÉCNICA", M + 4, y + 4.5);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...TEXTO).text(desc, M + 4, y + 9);
    y += dh + 6;
  } else {
    y += 2;
  }

  // 3. Materiais — sem peças, vira uma linha de mão de obra (sem tabela vazia).
  titulo(o.itens.length ? "3" : "3", o.itens.length ? "Peças e materiais aplicados" : "Itens do serviço");
  if (o.itens.length) {
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M, bottom: 14 },
      head: [["Item", "Quantidade"]],
      body: o.itens.map((i) => [i.nome, i.quantidade]),
      styles: { font: "helvetica", fontSize: 9, textColor: TEXTO, cellPadding: 2 },
      headStyles: { fillColor: AZUL, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: FUNDO },
      columnStyles: { 1: { halign: "right", cellWidth: 35 } },
      didDrawPage: (d) => { if (d.pageNumber > 1) moldura(); },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;
  } else {
    doc.setFillColor(...FUNDO).roundedRect(M, y - 1, CW, 9, 1.5, 1.5, "F");
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...TEXTO)
      .text(`Mão de obra — ${o.categoria ? `serviço de ${o.categoria.toLowerCase()}` : "serviço técnico especializado"}`, M + 4, y + 4.8);
    y += 11;
  }
  garantirEspaco(12);
  const tw = 72;
  doc.setFillColor(...AZUL).roundedRect(W - M - tw, y, tw, 9, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(255, 255, 255).text("VALOR TOTAL", W - M - tw + 4, y + 5.8);
  doc.setFontSize(11).text(o.valor != null ? brl(Number(o.valor)) : "—", W - M - 4, y + 6, { align: "right" });
  y += 17;

  // 4. Fotos
  let n = 4;
  if (antes.length + depois.length > 0) {
    titulo(String(n++), "Registro fotográfico");
    const lado = (CW - 6) / 6;
    const linhas = Math.max(Math.ceil(antes.length / 3), Math.ceil(depois.length / 3), 1);
    garantirEspaco(6 + linhas * (lado + 2));
    const bloco = (rot: string, lista: (Img | null)[], x0: number) => {
      doc.setFont("helvetica", "bold").setFontSize(6.5).setTextColor(...CINZA).text(rot, x0, y);
      lista.forEach((f, i) => {
        const fx = x0 + (i % 3) * (lado + 1.5), fy = y + 2 + Math.floor(i / 3) * (lado + 1.5);
        if (f) {
          // recorta em quadrado (centro) desenhando com escala e clip
          const s = Math.max(lado / f.w, lado / f.h);
          const dw = f.w * s, dh2 = f.h * s;
          doc.saveGraphicsState();
          doc.rect(fx, fy, lado, lado, null);
          doc.clip();
          doc.discardPath();
          doc.addImage(f.data, fmt(f.data), fx - (dw - lado) / 2, fy - (dh2 - lado) / 2, dw, dh2);
          doc.restoreGraphicsState();
        }
        doc.setDrawColor(226, 232, 240).setLineWidth(0.3).rect(fx, fy, lado, lado, "S");
      });
    };
    bloco("ANTES", antes, M);
    bloco("DEPOIS", depois, M + CW / 2 + 3);
    y += 4 + linhas * (lado + 1.5) + 6;
  }

  // Garantia
  const gtxt = o.garantia_dias > 0
    ? `Os serviços descritos possuem garantia de ${o.garantia_dias} dias${o.concluida_em ? `, válida até ${dataBR(addDias(o.concluida_em, o.garantia_dias))}` : " a contar da conclusão"}, cobrindo defeitos de execução. A garantia não abrange mau uso, intervenção de terceiros, oscilações da rede elétrica ou desgaste natural.`
    : "Serviço executado sem garantia.";
  doc.setFontSize(9);
  const gl = doc.splitTextToSize(gtxt, CW - 10) as string[];
  const gh = 10 + gl.length * 4;
  garantirEspaco(gh + 60);
  titulo(String(n), "Termo de garantia");
  doc.setFillColor(...FUNDO).rect(M, y - 1, CW, gh, "F");
  doc.setFillColor(...AZUL).rect(M, y - 1, 1.2, gh, "F");
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...TEXTO).text(gl, M + 5, y + 3.5);
  doc.setTextColor(...CINZA).text("Declaro que o serviço foi executado e entregue em pleno funcionamento.", M + 5, y + 3.5 + gl.length * 4 + 1);
  y += gh + 6;
  doc.setTextColor(...TEXTO).text(`${company.city}/${company.state}, ____ de ______________ de ________.`, M, y);
  y += 26;

  // Assinaturas
  const aw = (CW - 20) / 2;
  [[o.cliente?.nome ?? "", "Cliente", M], [company.name, "Técnico responsável", M + aw + 20]].forEach(([nome, papel, x]) => {
    const xx = x as number;
    doc.setDrawColor(...TEXTO).setLineWidth(0.3).line(xx, y, xx + aw, y);
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...TEXTO).text(String(nome) || "—", xx + aw / 2, y + 4.5, { align: "center" });
    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...CINZA).text(String(papel), xx + aw / 2, y + 8.5, { align: "center" });
  });

  return doc.output("blob");
}
