import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
let headers: Record<string, string> = {};
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc: (...a: unknown[]) => rpc(...a) } }));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: () => new Request("https://x.test", { headers }) }));

import { hashChave, ipDoCliente, limitar, limitarPorIp, observar } from "@/lib/rate-limit.server";

beforeEach(() => { rpc.mockReset(); headers = {}; vi.restoreAllMocks(); });

describe("ipDoCliente (só cabeçalho confiável)", () => {
  it("usa cf-connecting-ip", () => {
    headers = { "cf-connecting-ip": "2.2.2.2" };
    expect(ipDoCliente()).toBe("2.2.2.2");
  });
  it("IGNORA x-forwarded-for e x-real-ip, que o cliente pode forjar", () => {
    headers = { "x-forwarded-for": "9.9.9.9", "x-real-ip": "8.8.8.8" };
    expect(ipDoCliente()).toBeNull();
  });
  it("rejeita valor malformado em cf-connecting-ip", () => {
    headers = { "cf-connecting-ip": "1.1.1.1; DROP TABLE" };
    expect(ipDoCliente()).toBeNull();
  });
  it("aceita IPv6", () => {
    headers = { "cf-connecting-ip": "2804:14d:1234::1" };
    expect(ipDoCliente()).toBe("2804:14d:1234::1");
  });
});

describe("limitarPorIp", () => {
  it("sem IP confiável não bloqueia nem chama o banco, e avisa no log", async () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    headers = { "x-forwarded-for": "9.9.9.9" };
    await expect(limitarPorIp("pedido-ip", 5, 600)).resolves.toBeUndefined();
    expect(rpc).not.toHaveBeenCalled();
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining("IP_NAO_CONFIAVEL"));
  });
  it("com IP confiável, conta e bloqueia ao estourar", async () => {
    headers = { "cf-connecting-ip": "2.2.2.2" };
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(limitarPorIp("pedido-ip", 5, 600)).rejects.toThrow("MUITAS_TENTATIVAS");
  });
});

describe("limitar", () => {
  it("hash estável, sem o valor original", async () => {
    const a = await hashChave("(88) 99999-0000");
    expect(a).toBe(await hashChave("(88) 99999-0000"));
    expect(a).toHaveLength(32);
    expect(a).not.toContain("99999");
  });
  it("libera dentro do limite e envia só a chave com hash", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await expect(limitar("pedido-zap", "(88) 99999-0000", 3, 3600)).resolves.toBeUndefined();
    const [fn, args] = rpc.mock.calls[0] as [string, { _chave: string; _max: number; _janela_seg: number }];
    expect(fn).toBe("rate_limit_hit");
    expect(args._chave.startsWith("pedido-zap:")).toBe(true);
    expect(args._chave).not.toContain("99999");
    expect([args._max, args._janela_seg]).toEqual([3, 3600]);
  });
  it("bloqueia quando estoura o limite", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(limitar("a", "b", 5, 600)).rejects.toThrow("MUITAS_TENTATIVAS");
  });
  it.each([
    ["erro devolvido pelo banco", () => rpc.mockResolvedValue({ data: null, error: { code: "XX000" } })],
    ["exceção de rede", () => rpc.mockRejectedValue(new TypeError("fetch failed"))],
    ["resposta inesperada (null)", () => rpc.mockResolvedValue({ data: null, error: null })],
    ["resposta inesperada (texto)", () => rpc.mockResolvedValue({ data: "ok", error: null })],
  ])("falha aberta e registra: %s", async (_nome, preparar) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    preparar();
    await expect(limitar("a", "b", 5, 600)).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
  });
  it("falha aberta se o cliente admin lançar ao ser usado (variável de ambiente ausente)", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    rpc.mockImplementation(() => { throw new Error("Missing Supabase environment variable(s)"); });
    await expect(limitar("a", "b", 5, 600)).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
  });
});

describe("observar (nunca bloqueia)", () => {
  it("passou do limiar: só alerta no log, sem lançar", async () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(observar("pedido-global", 60, 3600)).resolves.toBeUndefined();
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining("VOLUME_ANORMAL"));
  });
  it("dentro do limiar: silencioso", async () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    rpc.mockResolvedValue({ data: true, error: null });
    await observar("pedido-global", 60, 3600);
    expect(aviso).not.toHaveBeenCalled();
  });
});
