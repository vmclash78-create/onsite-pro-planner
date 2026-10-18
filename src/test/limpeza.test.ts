import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const remove = vi.fn();
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { rpc: (...a: unknown[]) => rpc(...a), storage: { from: () => ({ remove: (p: string[]) => remove(p) }) } },
}));

import { limparPublico } from "@/lib/limpeza.server";

beforeEach(() => { rpc.mockReset(); remove.mockReset(); vi.spyOn(console, "error").mockImplementation(() => undefined); });

const orfas = (n: number) => Array.from({ length: n }, (_, i) => `site/00000000-0000-0000-0000-000000000000/${i}.jpg`);

describe("limpeza.server", () => {
  it.each([null, {}, ["os/abc/antes-1.jpg"]])("não apaga nada se a resposta de fotos for inválida: %s", async (data) => {
    rpc.mockImplementation(async (fn: string) => fn === "limpar_registros_publicos" ? { data: {}, error: null } : { data, error: null });
    expect((await limparPublico()).ok).toBe(false);
    expect(remove).not.toHaveBeenCalled();
  });
  it("remove só caminhos site/ devolvidos pelo banco, em lotes de 100, e reporta ok", async () => {
    rpc.mockImplementation(async (fn: string) =>
      fn === "limpar_registros_publicos" ? { data: { autorizacoes_removidas: 2 }, error: null } : { data: orfas(150), error: null });
    remove.mockImplementation(async (p: string[]) => ({ data: p.map((name) => ({ name })), error: null }));
    const r = await limparPublico();
    expect(remove).toHaveBeenCalledTimes(2);
    expect(remove.mock.calls.flatMap((c) => c[0] as string[]).every((p) => p.startsWith("site/"))).toBe(true);
    expect(r).toMatchObject({ ok: true, fotosRemovidas: 150 });
  });
  it("ok=false (para a rota devolver 500) se o banco falhar", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "XX000" } });
    const r = await limparPublico();
    expect(r.ok).toBe(false);
    expect(remove).not.toHaveBeenCalled();
  });
  it("ok=false se o Storage falhar ao remover, sem lançar", async () => {
    rpc.mockImplementation(async (fn: string) => (fn === "limpar_registros_publicos" ? { data: {}, error: null } : { data: orfas(3), error: null }));
    remove.mockResolvedValue({ data: null, error: { message: "boom" } });
    const r = await limparPublico();
    expect(r.ok).toBe(false);
    expect(r.fotosRemovidas).toBe(0);
  });
  it("ok=false se uma exceção for lançada (rede), sem propagar", async () => {
    rpc.mockRejectedValue(new TypeError("fetch failed"));
    await expect(limparPublico()).resolves.toMatchObject({ ok: false });
  });
});
