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
    const { error } = await supabaseAdmin.from("push_subscriptions").upsert({ ...data, user_id: context.userId }, { onConflict: "endpoint" });
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
