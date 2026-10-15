import { describe, expect, it } from "vitest";
import { calcGesso } from "@/lib/gesso";

describe("calcGesso", () => {
  it("forro: área = largura × comprimento", () => {
    expect(calcGesso("Forro", 3.5, 4).quantidade).toBe(14);
  });
  it("forro: placas 60x60 com 10% de perda", () => {
    expect(calcGesso("Forro", 3.6, 1).materiais[0].qtd).toBe(11);
  });
  it("moldura: metros lineares = perímetro", () => {
    const r = calcGesso("Moldura", 3, 4);
    expect(r.quantidade).toBe(14);
    expect(r.unidade).toBe("m");
  });
  it("medidas vazias não geram itens", () => {
    expect(calcGesso("Forro", 0, 4).quantidade).toBe(0);
  });
});
