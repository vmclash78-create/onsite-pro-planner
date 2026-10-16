// Renderiza as páginas de um PDF como imagens, para mostrar o arquivo real
// dentro da tela (funciona no iPhone e dentro de qualquer moldura).
export async function paginasDoPdf(blob: Blob, largura = 1240): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const pdf = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise;
  const urls: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: largura / base.width });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
    urls.push(canvas.toDataURL("image/jpeg", 0.9));
  }
  return urls;
}

// Entrega o arquivo: no celular abre o menu de compartilhar (Salvar em Arquivos,
// WhatsApp...); no computador baixa direto. Deve ser chamado direto no toque.
export function entregarArquivo(file: File): Promise<void> | void {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  const toque = matchMedia("(pointer: coarse)").matches;
  if (toque && nav.canShare?.({ files: [file] })) {
    return nav.share({ files: [file], title: file.name }).catch((e: unknown) => {
      if ((e as DOMException)?.name !== "AbortError") baixar(file);
    });
  }
  baixar(file);
}

export function baixar(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
