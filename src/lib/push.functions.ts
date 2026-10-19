import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const chavePublicaPush = createServerFn({ method: "GET" }).handler(async () => {
  const { vapidKeys } = await import("@/lib/push.server");
  return { publicKey: (await vapidKeys()).publicKey };
});

const subSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  p256dh: z.string().min(10).max(200),
  auth: z.string().min(8).max(100),
  aparelho: z.string().max(200).optional(),
});

export const salvarInscricaoPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => subSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("push_subscriptions").upsert({ endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth, aparelho: data.aparelho ?? null, user_id: context.userId }, { onConflict: "endpoint" });
    if (error) throw new Error("Não foi possível ativar as notificações.");
    return { ok: true };
  });

export const testarPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { enviarPush } = await import("@/lib/push.server");
    const n = await enviarPush({ title: "VM Climatização", body: "Notificações ativadas neste aparelho.", url: "/inicio", tag: "teste" }, [context.userId]);
    return { enviados: n };
  });

/** Admin/dono: sends a push to one team member (e.g. the technician assigned to a job). */
export const notificarMembro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    userId: z.string().uuid(),
    titulo: z.string().trim().min(2).max(80),
    texto: z.string().trim().min(2).max(240),
    url: z.string().startsWith("/").max(200).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: isDono } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "dono" });
    if (!isAdmin && !isDono) throw new Error("Apenas administradores podem notificar a equipe.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("user_id", data.userId);
    if (!count) throw new Error("Essa pessoa não faz parte da equipe.");
    const { enviarPush } = await import("@/lib/push.server");
    const n = await enviarPush({ title: data.titulo, body: data.texto, url: data.url ?? "/agenda", tag: `aviso-${Date.now()}` }, [data.userId]);
    return { enviados: n };
  });
