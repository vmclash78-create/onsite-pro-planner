export type TipoGesso = "Forro" | "Drywall" | "Moldura" | "Sanca";

/**
 * Forro/Drywall: área = a × b (m²). Moldura/Sanca: perímetro = 2 × (a + b) (m).
 * Material estimates include 10% loss.
 */
export function calcGesso(tipo: TipoGesso, a: number, b: number) {
  if (!(a > 0) || !(b > 0)) return { quantidade: 0, unidade: tipo === "Moldura" || tipo === "Sanca" ? "m" : "m²", materiais: [] as { nome: string; qtd: number }[] };
  const r2 = (v: number) => Math.round(v * 100) / 100;
  if (tipo === "Moldura" || tipo === "Sanca") {
    const m = r2(2 * (a + b));
    return { quantidade: m, unidade: "m", materiais: [{ nome: tipo === "Sanca" ? "Placas para sanca" : "Barras de moldura (1 m)", qtd: Math.ceil(m * 1.1) }] };
  }
  const area = r2(a * b);
  if (tipo === "Drywall") {
    return { quantidade: area, unidade: "m²", materiais: [
      { nome: "Chapas de drywall 1,20 x 1,80 m", qtd: Math.ceil(((area * 2) / 2.16) * 1.1) },
      { nome: "Montantes 3 m", qtd: Math.ceil((a / 0.6 + 1) * Math.ceil(b / 3)) },
    ] };
  }
  return { quantidade: area, unidade: "m²", materiais: [
    { nome: "Placas de gesso 60 x 60 cm", qtd: Math.ceil((area / 0.36) * 1.1) },
    { nome: "Tirantes", qtd: Math.ceil(area / 0.64) },
    { nome: "Sacos de gesso cola", qtd: Math.ceil(area / 20) },
  ] };
}
