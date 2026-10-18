import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Limite de requisições das rotas públicas, com contador no banco (função rate_limit_hit),
 * então vale entre todas as instâncias do servidor. Só importar de dentro de handlers
 * (await import("@/lib/rate-limit.server")), como as demais funções *.server.
 */

/** SHA-256 (hex, 32 caracteres). O identificador nunca é gravado em texto puro (LGPD). */
export async function hashChave(valor: string): Promise<string> {
  const pimenta = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!pimenta) throw new Error("Missing hash secret");
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${pimenta}|${valor}`));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

/**
 * IP do cliente, SOMENTE de `cf-connecting-ip`: a confiança depende de a hospedagem
 * sobrescrever esse cabeçalho; deve ser verificada depois de publicar. `x-forwarded-for` e `x-real-ip` NÃO são usados porque qualquer cliente pode
 * enviá-los com valores inventados e contornar o limite. Sem cabeçalho confiável, devolve null.
 */
export function ipDoCliente(req?: Request): string | null {
  const ip = (req ?? getRequest()).headers.get("cf-connecting-ip")?.trim();
  return ip && /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : null;
}

const MUITAS = "MUITAS_TENTATIVAS";

/**
 * Registra uma tentativa e lança Error("MUITAS_TENTATIVAS") se passou do limite.
 * QUALQUER outra falha (erro do banco, exceção de rede, variável de ambiente ausente, resposta
 * inesperada) é registrada e deixa passar: melhor aceitar um pedido do que travar o site.
 */
export async function limitar(escopo: string, identificador: string, max: number, janelaSeg: number): Promise<void> {
  let liberado: unknown;
  try {
    const chave = `${escopo}:${await hashChave(identificador)}`;
    const { data, error } = await supabaseAdmin.rpc("rate_limit_hit", { _chave: chave, _max: max, _janela_seg: janelaSeg });
    if (error) {
      console.error("rate_limit_hit", error.code ?? "ERRO");
      return;
    }
    liberado = data;
  } catch (e) {
    console.error("rate_limit_hit exceção", e instanceof Error ? e.name : "ERRO");
    return;
  }
  if (liberado === false) throw new Error(MUITAS);
  if (liberado !== true) console.error("rate_limit_hit resposta inesperada");
}

/** Limite por IP. Sem IP confiável não há como limitar por IP: avisa no log e segue (restam o limite por WhatsApp e o Turnstile). */
export async function limitarPorIp(escopo: string, max: number, janelaSeg: number, req?: Request): Promise<void> {
  let ip: string | null = null;
  try {
    ip = ipDoCliente(req);
  } catch {
    ip = null;
  }
  if (!ip) {
    console.warn("IP_NAO_CONFIAVEL: sem cf-connecting-ip, limite por IP ignorado");
    return;
  }
  await limitar(escopo, ip, max, janelaSeg);
}

/**
 * Só OBSERVA o volume (nunca bloqueia): um teto global que bloqueia deixaria um atacante barrar
 * todos os clientes legítimos. Passou do limiar, vai um alerta no log.
 */
export async function observar(escopo: string, alertaEm: number, janelaSeg: number): Promise<void> {
  try {
    await limitar(`obs-${escopo}`, "todos", alertaEm, janelaSeg);
  } catch (e) {
    if (e instanceof Error && e.message === MUITAS) console.warn(`VOLUME_ANORMAL: ${escopo} passou de ${alertaEm} em ${janelaSeg}s`);
  }
}

export async function limitarPedido(whatsapp: string): Promise<void> {
  await limitarPorIp("pedido-ip", 5, 600);
  await limitar("pedido-zap", whatsapp.replace(/\D/g, ""), 3, 3600);
  await observar("pedido-global", 60, 3600);
}

export async function limitarFotos(): Promise<void> {
  await limitarPorIp("fotos-ip", 10, 600);
}
