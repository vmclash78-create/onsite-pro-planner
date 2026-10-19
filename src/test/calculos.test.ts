import { describe, expect, it } from "vitest";
import { bitolas, calcEletrica, calcRefrigeracao } from "@/lib/calculos";
import { rotuloLembrete, tipoLembrete } from "@/lib/agendamento";

describe("refrigeração", () => {
  it("cobra gás só além de 5 m (R410A 20 g/m)", () => {
    expect(calcRefrigeracao(12000, 8, "R410A").gasGramas).toBe(60);
    expect(calcRefrigeracao(12000, 4, "R410A").gasGramas).toBe(0);
  });
  it("bitola de sucção por capacidade", () => {
    expect(bitolas(12000).succao).toBe('3/8"');
    expect(bitolas(18000).succao).toBe('1/2"');
    expect(bitolas(24000).succao).toBe('5/8"');
  });
});

describe("elétrica", () => {
  it("conta pontos e circuitos", () => {
    const r = calcEletrica({ tomadas: 9, interruptores: 2, luzes: 4, dedicados: 1, distancia: 5 });
    expect(r.pontos).toBe(16);
    expect(r.circuitos).toBe(4);
  });
});

describe("lembrete da agenda", () => {
  it("só diz amanhã na véspera", () => {
    expect(tipoLembrete("2026-10-20", "2026-10-19")).toBe("amanha");
    expect(tipoLembrete("2026-10-21", "2026-10-19")).toBe("futuro");
    expect(rotuloLembrete("2026-10-21", "2026-10-19")).toBe("Lembrar 21/10");
  });
});
