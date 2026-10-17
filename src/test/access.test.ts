import { describe, expect, it } from "vitest";
import { canOpenPanel, canSeeNav } from "@/lib/access";

describe("Permissões de apresentação", () => {
  it("administrador acessa o caixa", () => expect(canOpenPanel("/financeiro", true)).toBe(true));
  it("técnico não acessa o caixa", () => expect(canOpenPanel("/financeiro", false)).toBe(false));
  it("técnico não acessa orçamentos", () => expect(canOpenPanel("/orcamento/123", false)).toBe(false));
  it("técnico acessa detalhes de sua agenda", () => expect(canOpenPanel("/pedidos/123", false)).toBe(true));
  it("técnico não vê a fila geral de pedidos", () => expect(canSeeNav("/pedidos", false)).toBe(false));
  it("técnico pode visualizar PDF de OS", () => expect(canOpenPanel("/imprimir/ordem/123", false)).toBe(true));
});