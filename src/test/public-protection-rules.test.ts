import { beforeEach, describe, expect, it, vi } from "vitest";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc } }));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: () => new Request("https://test.invalid", { headers: { "cf-connecting-ip": "192.0.2.12" } }) }));
import { limitarPedido, limitarFotos } from "@/lib/rate-limit.server";
beforeEach(() => { rpc.mockReset(); rpc.mockResolvedValue({ data: true, error: null }); });
describe("limites autorizados", () => {
  it("pedido: 5 por IP em 600 segundos", async () => {
    await limitarPedido("(88) 99999-1234");
    expect(rpc.mock.calls[0]?.[1]).toMatchObject({ _max: 5, _janela_seg: 600 });
  });
  it("pedido: 3 por WhatsApp em 3600 segundos, normalizando o número", async () => {
    await limitarPedido("(88) 99999-1234");
    const first = rpc.mock.calls[1]?.[1];
    expect(first).toMatchObject({ _max: 3, _janela_seg: 3600 });
    rpc.mockClear();
    await limitarPedido("88999991234");
    expect(rpc.mock.calls[1]?.[1]._chave).toBe(first._chave);
  });
  it("volume acima de 60 por hora nunca bloqueia", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    rpc.mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: false });
    await expect(limitarPedido("88999991234")).resolves.toBeUndefined();
    expect(rpc.mock.calls[2]?.[1]).toMatchObject({ _max: 60, _janela_seg: 3600 });
  });
  it("fotos: 10 preparações por IP em 600 segundos", async () => {
    await limitarFotos();
    expect(rpc.mock.calls[0]?.[1]).toMatchObject({ _max: 10, _janela_seg: 600 });
  });
});