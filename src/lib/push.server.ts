import { buildPushPayload } from "@block65/webcrypto-web-push";
import { p256 } from "@noble/curves/nist.js";

const b64url = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** VAPID keypair derived deterministically from the VAPID_SEED secret (private = SHA-256(seed)). */
export async function vapidKeys() {
  const seed = process.env["VAPID_SEED"];
  if (!seed) throw new Error("VAPID_SEED ausente");
  const priv = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed)));
  const pub = p256.getPublicKey(priv, false);
  return { subject: "mailto:vmrefrigeracao0@gmail.com", publicKey: b64url(pub), privateKey: b64url(priv) };
}

export interface Aviso { title: string; body: string; url?: string; badge?: number; tag?: string }

/** Sends to the given users, or to all admins when userIds is omitted. Removes expired subscriptions. */
export async function enviarPush(aviso: Aviso, userIds?: string[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let ids = userIds;
  if (!ids) {
    const { data } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
    ids = (data ?? []).map((r) => r.user_id);
  }
  if (!ids.length) return 0;
  const { data: subs } = await supabaseAdmin.from("push_subscriptions").select("id, endpoint, p256dh, auth").in("user_id", ids);
  const vapid = await vapidKeys();
  let ok = 0;
  await Promise.all((subs ?? []).map(async (s) => {
    try {
      const payload = await buildPushPayload(
        { data: JSON.stringify(aviso), options: { ttl: 3600, urgency: "high" } },
        { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh, auth: s.auth } },
        vapid,
      );
      const res = await fetch(s.endpoint, payload);
      if (res.status === 404 || res.status === 410) await supabaseAdmin.from("push_subscriptions").delete().eq("id", s.id);
      else if (res.ok) ok++;
      else console.error("push", res.status);
    } catch (e) {
      console.error("push", e instanceof Error ? e.message : e);
    }
  }));
  return ok;
}
