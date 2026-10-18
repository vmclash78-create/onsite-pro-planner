import { supabaseAdmin } from "@/integrations/supabase/client.server";

const LOTE = 100;

export type ResultadoLimpeza = { ok: boolean; tabelas: unknown; fotosEncontradas: number; fotosRemovidas: number };

/**
 * Remove autorizações vencidas, contadores antigos e fotos do site que nunca viraram pedido.
 * Idempotente: pode rodar duas vezes ou com atraso. `ok` é false se qualquer etapa falhar
 * (a rota devolve 500 para o agendador registrar a falha).
 */
export async function limparPublico(): Promise<ResultadoLimpeza> {
  const r: ResultadoLimpeza = { ok: true, tabelas: null, fotosEncontradas: 0, fotosRemovidas: 0 };
  const falhou = (etapa: string, e: unknown) => {
    r.ok = false;
    console.error(`limpeza ${etapa}`, e instanceof Error ? e.name : typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "ERRO");
  };

  try {
    const { data, error } = await supabaseAdmin.rpc("limpar_registros_publicos");
    if (error) falhou("tabelas", error);
    else r.tabelas = data;
  } catch (e) {
    falhou("tabelas", e);
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("fotos_site_orfas", { _limite: 500 });
    if (error) return falhou("listagem", error), r;
    if (!Array.isArray(data) || data.some((x) => typeof x !== "string" || !x.startsWith("site/"))) { falhou("resposta", new Error("Invalid orphan response")); return r; }
    const orfas = data.filter((x): x is string => typeof x === "string" && x.startsWith("site/"));
    r.fotosEncontradas = orfas.length;
    for (let i = 0; i < orfas.length; i += LOTE) {
      const { data: removidas, error: erroRemocao } = await supabaseAdmin.storage.from("pedidos").remove(orfas.slice(i, i + LOTE));
      if (erroRemocao) {
        falhou("remocao", erroRemocao);
        break;
      }
      r.fotosRemovidas += removidas?.length ?? 0;
    }
  } catch (e) {
    falhou("fotos", e);
  }
  return r;
}
