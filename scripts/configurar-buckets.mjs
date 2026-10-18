// Aplica tamanho e tipos permitidos nos buckets PELA API DE STORAGE (não por SQL) e confere o resultado.
// Uso:  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/configurar-buckets.mjs
// Sem a chave service_role (ex.: Lovable Cloud), faça o mesmo pelo painel de Storage e rode o
// scripts/verificar-protecao.mjs para conferir.
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."); process.exit(2); }
const sb = createClient(url, key, { auth: { persistSession: false } });

const ALVOS = {
  pedidos: { public: false, fileSizeLimit: 10 * 1024 * 1024, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"] },
  catalogo: { public: true, fileSizeLimit: 5 * 1024 * 1024, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] },
};

let falhou = false;
for (const [id, cfg] of Object.entries(ALVOS)) {
  const { error } = await sb.storage.updateBucket(id, cfg);
  if (error) { console.error(`FALHOU  updateBucket(${id}):`, error.message); falhou = true; continue; }
  const { data } = await sb.storage.getBucket(id);
  const lim = Number(data?.file_size_limit), mimes = [...(data?.allowed_mime_types ?? [])].sort().join();
  const ok = data?.public === cfg.public && lim === cfg.fileSizeLimit && mimes === [...cfg.allowedMimeTypes].sort().join();
  console.log(`${ok ? "OK     " : "DIVERGE"} ${id}: public=${data?.public} limite=${lim} tipos=${mimes}`);
  falhou ||= !ok;
}
process.exit(falhou ? 1 : 0);
