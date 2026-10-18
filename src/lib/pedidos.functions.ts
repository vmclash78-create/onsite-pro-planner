import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { pedidoSchema, prepararFotosSchema, validarFotos } from "@/lib/pedido-validation";
import { authorizedUpload, hashUploadProof } from "@/lib/upload-authorization";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };

/** Public: reserves up to 3 one-time upload slots for booking photos (no read access is granted). */
export const prepararFotos = createServerFn({ method: "POST" })
  .inputValidator((d) => prepararFotosSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!data.tipos.length) return [];
    const { limitarFotos } = await import("@/lib/rate-limit.server");
    await limitarFotos();
    const pasta = crypto.randomUUID();
    const slots: { path: string; token: string }[] = [];
    for (let i = 0; i < data.tipos.length; i++) {
      const mime = data.tipos[i];
      if (!mime) continue;
      const path = `site/${pasta}/${i}.${EXT[mime]}`;
      const { data: s, error } = await supabaseAdmin.storage.from("pedidos").createSignedUploadUrl(path);
      if (error || !s) throw new Error("Não foi possível preparar o envio das fotos.");
      slots.push({ path, token: s.token });
    }
    const proof = crypto.randomUUID();
    const { data: ticket, error: ticketError } = await supabaseAdmin.from("booking_upload_authorizations").insert({ proof_hash: await hashUploadProof(proof), paths: slots.map((s) => s.path) }).select("id").single();
    if (ticketError || !ticket) throw new Error("Não foi possível autorizar o envio das fotos.");
    return slots.map((slot) => ({ ...slot, uploadId: ticket.id, uploadProof: proof }));
  });

/** Public: creates a pending appointment from the booking page. Returns only the protocol id. */
export const criarPedido = createServerFn({ method: "POST" })
  .inputValidator((d) => pedidoSchema.parse(d))
  .handler(async ({ data }) => {
    const { limitarPedido } = await import("@/lib/rate-limit.server");
    await limitarPedido(data.whatsapp);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!data.visita && data.data && data.hora) {
      const { data: livre, error: disponibilidade } = await supabaseAdmin.rpc("horarios_ocupados", { _inicio: data.data, _fim: data.data });
      if (disponibilidade) throw new Error("Não foi possível verificar o horário. Tente novamente.");
      const longo = (data.categoria === "Refrigeração" && data.tipo === "Instalação") || (data.categoria === "Elétrica" && data.tipo === "Quadro");
      const manha = data.hora < "12:00";
      const precisa = longo ? (manha ? ["08:00", "09:00", "10:00"] : ["14:00", "15:00", "16:00"]) : [data.hora];
      if (livre?.some((o) => precisa.includes(o.hora))) throw new Error("HORARIO_OCUPADO");
    }
    if (data.fotos.length) {
      if (!data.uploadId || !data.uploadProof) throw new Error("Prepare novamente o envio das fotos.");
      const hash = await hashUploadProof(data.uploadProof);
      const { data: ticket, error: ticketError } = await supabaseAdmin.from("booking_upload_authorizations").select("proof_hash,paths,expires_at").eq("id", data.uploadId).single();
      if (ticketError || !ticket || !authorizedUpload(ticket, hash, data.fotos)) throw new Error("Envio de fotos inválido ou expirado.");
      for (const path of data.fotos) {
        const { data: info, error: infoError } = await supabaseAdmin.storage.from("pedidos").info(path);
        if (infoError || !info || typeof info.contentType !== "string" || typeof info.size !== "number" || validarFotos([{ type: info.contentType, size: info.size }])) throw new Error("Envie novamente as fotos em um formato válido.");
      }
      // Atomic consumption makes the authorization single-use even under concurrent requests.
      const { data: consumed, error: consumeError } = await supabaseAdmin.from("booking_upload_authorizations").delete().eq("id", data.uploadId).eq("proof_hash", hash).gt("expires_at", new Date().toISOString()).select("id").maybeSingle();
      if (consumeError || !consumed) throw new Error("O envio das fotos já foi utilizado. Envie novamente.");
    }
    const { data: row, error } = await supabaseAdmin
      .from("appointments")
      .insert({
        categoria: data.categoria,
        tipo: data.tipo,
        visita_orcamento: data.visita,
        data: data.visita ? null : data.data,
        hora: data.visita ? null : data.hora,
        nome_contato: data.nome,
        whatsapp: data.whatsapp,
        cep: data.cep,
        endereco: `CEP ${data.cep}`,
        descricao: data.descricao || null,
        fotos: data.fotos,
        status: "Pendente",
        origem: "site",
        consentimento_lgpd_em: new Date().toISOString(),
        consentimento_lgpd_versao: "privacidade-v1",
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505" && error.message.includes("HORARIO_OCUPADO")) throw new Error("HORARIO_OCUPADO");
      console.error("criarPedido", error.code);
      throw new Error("Não foi possível registrar o pedido.");
    }
    return { protocolo: row.id.slice(0, 8).toUpperCase() };
  });

/** Admin only: classifies a request with Lovable AI and saves the result on the appointment. */
export const analisarPedido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Apenas administradores podem usar a análise.");

    const { data: p, error } = await supabase.from("appointments").select("id, categoria, tipo, descricao, fotos").eq("id", data.id).single();
    if (error || !p) throw new Error("Pedido não encontrado.");
    if (!p.descricao?.trim() && p.fotos.length === 0) throw new Error("Informe a descrição ou envie fotos antes de analisar.");

    let urls: string[] = [];
    if (p.fotos.length) {
      const { data: s } = await supabase.storage.from("pedidos").createSignedUrls(p.fotos, 600);
      urls = (s ?? []).flatMap((x) => (x.signedUrl ? [x.signedUrl] : []));
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("A análise com IA não está configurada.");
    const { classificarPedido } = await import("./triagem.server");
    let r;
    try {
      r = await classificarPedido({ request: getRequest(), apiKey, descricao: p.descricao ?? "", categoriaInformada: p.categoria, tipoInformado: p.tipo, fotos: urls });
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      console.error("analisarPedido", status ?? "AI_ERROR");
      if (status === 429) throw new Error("Muitas análises seguidas. Aguarde um minuto e tente de novo.");
      if (status === 402 || status === 403) throw new Error("Os créditos de IA acabaram ou estão bloqueados. Verifique em Configurações → Planos e créditos.");
      throw new Error("A análise falhou. Tente novamente em instantes.");
    }

    const { error: upErr } = await supabase.from("appointments").update({
      ia_tipo: r.tipo_atendimento,
      ia_urgencia: r.urgencia,
      ia_justificativa: `${r.categoria}: ${r.justificativa}`,
      ia_proximos_passos: r.proximos_passos,
      ia_analisado_em: new Date().toISOString(),
    }).eq("id", p.id);
    if (upErr) throw new Error("Análise feita, mas não foi possível salvar.");
    return r;
  });
