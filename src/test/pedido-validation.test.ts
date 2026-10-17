import { describe, expect, it } from "vitest";
import { criarPedidoSchema, prepararFotosSchema, validarFotos } from "@/lib/pedido-validation";

const schema = criarPedidoSchema(() => new Date("2026-10-17T20:26:00Z"));
const base = { categoria: "Gesso", tipo: "Reparo", visita: false, data: "2026-10-19", hora: "08:00", nome: "Cliente teste", whatsapp: "(88) 99999-9999", cep: "62270-000", descricao: "Parede", fotos: [], lgpd: true };
const path = "site/12345678-1234-1234-1234-123456789abc/0.jpg";
describe("Validação pública", () => {
  it("aceita agendamento válido", () => expect(schema.safeParse(base).success).toBe(true));
  it.each(["2026-10-16", "2026-10-17", "2026-10-18", "2026-02-30", "3000-01-01"])("rejeita data indisponível %s", (data) => expect(schema.safeParse({ ...base, data }).success).toBe(false));
  it("exige data e hora para reserva", () => expect(schema.safeParse({ ...base, data: null, hora: null }).success).toBe(false));
  it("permite visita sem reserva", () => expect(schema.safeParse({ ...base, visita: true, data: null, hora: null }).success).toBe(true));
  it("rejeita visita com reserva", () => expect(schema.safeParse({ ...base, visita: true }).success).toBe(false));
  it("rejeita horário fora da grade", () => expect(schema.safeParse({ ...base, hora: "03:00" }).success).toBe(false));
  it("serviço longo começa no início do turno", () => {
    expect(schema.safeParse({ ...base, categoria: "Refrigeração", tipo: "Instalação", hora: "09:00" }).success).toBe(false);
    expect(schema.safeParse({ ...base, categoria: "Refrigeração", tipo: "Instalação", hora: "14:00" }).success).toBe(true);
  });
  it("rejeita modalidade de outra categoria", () => expect(schema.safeParse({ ...base, tipo: "Limpeza" }).success).toBe(false));
  it("exige aceite LGPD", () => expect(schema.safeParse({ ...base, lgpd: false }).success).toBe(false));
  it("rejeita nome e descrição excessivos", () => {
    expect(schema.safeParse({ ...base, nome: "a".repeat(121) }).success).toBe(false);
    expect(schema.safeParse({ ...base, descricao: "a".repeat(2001) }).success).toBe(false);
  });
  it("rejeita fotos repetidas e pastas distintas", () => {
    expect(schema.safeParse({ ...base, fotos: [path, path] }).success).toBe(false);
    expect(schema.safeParse({ ...base, fotos: [path, path.replace("123456789abc", "123456789abd")] }).success).toBe(false);
  });
  it("limita anexos a 3 fotos de até 10 MB", () => {
    expect(validarFotos(Array(4).fill({ type: "image/jpeg", size: 10 }))).not.toBeNull();
    expect(validarFotos([{ type: "image/jpeg", size: 10 * 1024 * 1024 }])).toBeNull();
    expect(validarFotos([{ type: "image/jpeg", size: 10 * 1024 * 1024 + 1 }])).not.toBeNull();
  });
  it("rejeita SVG e arquivos vazios", () => {
    expect(validarFotos([{ type: "image/svg+xml", size: 100 }])).not.toBeNull();
    expect(validarFotos([{ type: "image/png", size: 0 }])).not.toBeNull();
  });
  it("isca preenchida bloqueia pedido e preparação de fotos", () => {
    expect(schema.safeParse({ ...base, website: "bot" }).success).toBe(false);
    expect(prepararFotosSchema.safeParse({ tipos: ["image/jpeg"], website: "bot" }).success).toBe(false);
  });
});