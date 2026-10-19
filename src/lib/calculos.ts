/** Field-estimate calculators for Refrigeração and Elétrica (Gesso lives in gesso.ts). Materials include 10% loss. */
export type Material = { nome: string; qtd: number; unidade: string };
const perda = (v: number) => Math.ceil(v * 1.1);

export const BTUS = [9000, 12000, 18000, 24000, 30000] as const;
export const GASES = ["R410A", "R32", "R22"] as const;
/** Pre-charged line length most splits ship with; extra refrigerant only beyond it. */
export const METROS_INCLUSOS = 5;
const GRAMAS_POR_METRO: Record<string, number> = { R410A: 20, R32: 15, R22: 20 };

/** Suction-line diameter by capacity; liquid line is 1/4" up to 24k BTUs, 3/8" above. */
export function bitolas(btus: number) {
  const succao = btus <= 12000 ? '3/8"' : btus <= 18000 ? '1/2"' : '5/8"';
  const liquido = btus <= 24000 ? '1/4"' : '3/8"';
  return { liquido, succao };
}

export function calcRefrigeracao(btus: number, metros: number, gas: string) {
  if (!(metros > 0)) return { extraMetros: 0, gasGramas: 0, materiais: [] as Material[] };
  const { liquido, succao } = bitolas(btus);
  const extraMetros = Math.max(0, metros - METROS_INCLUSOS);
  const gasGramas = Math.round(extraMetros * (GRAMAS_POR_METRO[gas] ?? 20));
  const materiais: Material[] = [
    { nome: `Tubo de cobre ${liquido}`, qtd: perda(metros), unidade: "m" },
    { nome: `Tubo de cobre ${succao}`, qtd: perda(metros), unidade: "m" },
    { nome: "Isolamento térmico (esponjoso)", qtd: perda(metros * 2), unidade: "m" },
    { nome: "Cabo PP 4 x 2,5 mm²", qtd: perda(metros), unidade: "m" },
    { nome: "Fita PVC para acabamento", qtd: Math.max(1, Math.ceil(metros / 10)), unidade: "rolo" },
    { nome: "Suporte para condensadora", qtd: 1, unidade: "par" },
  ];
  if (gasGramas > 0) materiais.push({ nome: `Carga adicional de gás ${gas}`, qtd: gasGramas, unidade: "g" });
  return { extraMetros, gasGramas, materiais };
}

export type EntradaEletrica = { tomadas: number; interruptores: number; luzes: number; dedicados: number; distancia: number };

export function calcEletrica(e: EntradaEletrica) {
  const pontos = e.tomadas + e.interruptores + e.luzes + e.dedicados;
  if (!(pontos > 0) || !(e.distancia > 0)) return { pontos: 0, circuitos: 0, materiais: [] as Material[] };
  const d = e.distancia;
  const circuitos = Math.ceil(e.tomadas / 8) + Math.ceil(e.luzes / 10) + e.dedicados;
  const materiais: Material[] = [];
  const add = (nome: string, qtd: number, unidade: string) => { if (qtd > 0) materiais.push({ nome, qtd, unidade }); };
  add("Cabo 2,5 mm² (tomadas: fase, neutro, terra)", perda(e.tomadas * d * 3), "m");
  add("Cabo 1,5 mm² (iluminação e retorno)", perda((e.luzes + e.interruptores) * d * 2), "m");
  add("Cabo 6 mm² (circuitos dedicados)", perda(e.dedicados * d * 3), "m");
  add("Eletroduto corrugado 3/4\"", perda(pontos * d), "m");
  add("Caixa 4x2", e.tomadas + e.interruptores, "un");
  add("Caixa octogonal (teto)", e.luzes, "un");
  add("Disjuntor DIN", circuitos, "un");
  return { pontos, circuitos, materiais };
}
