// Verificação de ponta a ponta contra o projeto REAL (concorrência, permissões, buckets, rota de limpeza).
// Seguro para produção: usa chaves de teste únicas e a limpeza é idempotente.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_PUBLISHABLE_KEY=... \
//   APP_URL=https://seu-app.lovable.app  [LOVABLE_CRON_SECRET=...] node scripts/verificar-protecao.mjs
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: srv, SUPABASE_PUBLISHABLE_KEY: pub, APP_URL: app, LOVABLE_CRON_SECRET: cron } = process.env;
if (!url || !srv || !pub || !app) { console.error("Defina SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PUBLISHABLE_KEY e APP_URL."); process.exit(2); }
const opts = { auth: { persistSession: false } };
const service = createClient(url, srv, opts), anon = createClient(url, pub, opts);

let ok = true;
const check = (nome, cond, extra = "") => { console.log(`${cond ? "PASSOU " : "FALHOU "} ${nome} ${extra}`); ok &&= !!cond; };

// 1) Concorrência real: 30 chamadas simultâneas, limite 5 => exatamente 5 liberadas
const chave = `verif-${randomUUID()}`;
const rs = await Promise.all(Array.from({ length: 30 }, () => service.rpc("rate_limit_hit", { _chave: chave, _max: 5, _janela_seg: 3600 })));
const liberadas = rs.filter((r) => r.data === true).length, bloqueadas = rs.filter((r) => r.data === false).length;
check("concorrência: 30 simultâneas, limite 5", liberadas === 5 && bloqueadas === 25, `(liberadas=${liberadas}, bloqueadas=${bloqueadas}, erros=${rs.filter((r) => r.error).length})`);
await service.from("rate_limits").delete().eq("chave", chave);

// 2) Permissões: a chave pública (anon) não pode nada
for (const [nome, fn] of [
  ["anon x rate_limit_hit", () => anon.rpc("rate_limit_hit", { _chave: "x", _max: 5, _janela_seg: 60 })],
  ["anon x limpar_registros_publicos", () => anon.rpc("limpar_registros_publicos")],
  ["anon x fotos_site_orfas", () => anon.rpc("fotos_site_orfas", { _limite: 5 })],
  ["anon lendo rate_limits", () => anon.from("rate_limits").select("*").limit(1)],
  ["anon inserindo em rate_limits", () => anon.from("rate_limits").insert({ chave: "x", janela: new Date().toISOString(), n: 1 })],
]) {
  const { data, error } = await fn();
  check(`${nome} negado`, !!error || (Array.isArray(data) && data.length === 0 && nome.includes("lendo")), error ? `(${error.code ?? error.message})` : "");
}

// 3) Buckets (configurados pela ferramenta de Storage)
const esperado = { pedidos: [false, 10485760, "image/heic,image/jpeg,image/png,image/webp"], catalogo: [true, 5242880, "image/jpeg,image/png,image/webp"] };
for (const [id, [pub_, lim, mimes]] of Object.entries(esperado)) {
  const { data, error } = await service.storage.getBucket(id);
  const got = [...(data?.allowed_mime_types ?? [])].sort().join();
  check(`bucket ${id}: público=${pub_}, limite=${lim}, tipos`, !error && data.public === pub_ && Number(data.file_size_limit) === lim && got === mimes,
    `(público=${data?.public}, limite=${data?.file_size_limit}, tipos=${got || "sem restrição"})`);
}

// 4) Rota de limpeza: sem token e com token errado => 401
const rota = `${app.replace(/\/$/, "")}/api/public/cron/limpeza`;
const sem = await fetch(rota, { method: "POST" });
check("rota de limpeza sem token => 401", sem.status === 401, `(HTTP ${sem.status})`);
const errado = await fetch(rota, { method: "POST", headers: { Authorization: "Bearer errado" } });
check("rota de limpeza com token errado => 401", errado.status === 401, `(HTTP ${errado.status})`);
if (cron) {
  const certo = await fetch(rota, { method: "POST", headers: { Authorization: `Bearer ${cron}` } });
  const corpo = await certo.json().catch(() => ({}));
  check("rota de limpeza com token correto => 200 e ok=true", certo.status === 200 && corpo.ok === true, `(HTTP ${certo.status}, ${JSON.stringify(corpo).slice(0, 120)})`);
} else console.log("PULOU   token correto (defina LOVABLE_CRON_SECRET para testar a execução)");

console.log(ok ? "\nTUDO OK" : "\nHÁ FALHAS");
process.exit(ok ? 0 : 1);
