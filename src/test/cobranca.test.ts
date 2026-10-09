import { describe, expect, it } from "vitest";
import { crc16, normalizarTelefone, pixPayload, preencherModelo, statusRecebimento } from "@/lib/cobranca";

describe("telefone WhatsApp", () => {
  it("normaliza para 55 + DDD + número", () => expect(normalizarTelefone("(88) 99640-1373")).toBe("5588996401373"));
  it("aceita número já com 55", () => expect(normalizarTelefone("+55 88 99640-1373")).toBe("5588996401373"));
  it("recusa número sem DDD", () => expect(normalizarTelefone("99640-1373")).toBeNull());
});

describe("recebimentos", () => {
  it("atrasado quando vencido e com saldo", () => expect(statusRecebimento({ valor_total: 300, valor_pago: 100, vencimento: "2026-10-01" }, "2026-10-09")).toBe("atrasado"));
  it("pago quando saldo zero mesmo vencido", () => expect(statusRecebimento({ valor_total: 300, valor_pago: 300, vencimento: "2026-10-01" }, "2026-10-09")).toBe("pago"));
  it("parcial dentro do prazo", () => expect(statusRecebimento({ valor_total: 300, valor_pago: 100, vencimento: "2026-10-20" }, "2026-10-09")).toBe("parcial"));
});

describe("pix", () => {
  it("CRC16 padrão CCITT-FALSE", () => expect(crc16("123456789")).toBe("29B1"));
  it("payload tem valor e CRC válido", () => {
    const p = pixPayload({ chave: "+5588996401373", nome: "VM Climatização", cidade: "Hidrolândia", valor: 150 });
    expect(p).toContain("5406150.00");
    expect(p.slice(-4)).toBe(crc16(p.slice(0, -4)));
  });
});

describe("modelos", () => {
  it("preenche variáveis", () => expect(preencherModelo("Olá {nome}, {valor}", { nome: "Ana", valor: "R$ 10,00" })).toBe("Olá Ana, R$ 10,00"));
});
