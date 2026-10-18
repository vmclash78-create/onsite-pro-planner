// Browser-only helpers; call from effects/handlers.
import { chavePublicaPush, salvarInscricaoPush } from "@/lib/push.functions";

export const suportaPush = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export const ehAppInstalado = () =>
  typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

const toBytes = (b64: string) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

export async function ativarPush() {
  if (!suportaPush()) throw new Error("NAO_SUPORTA");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("NEGADO");
  const reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  const { publicKey } = await chavePublicaPush();
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(publicKey) }));
  const j = sub.toJSON();
  await salvarInscricaoPush({ data: { endpoint: sub.endpoint, p256dh: j.keys?.p256dh ?? "", auth: j.keys?.auth ?? "", aparelho: navigator.userAgent.slice(0, 200) } });
}

export async function pushAtivo() {
  if (!suportaPush() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return !!(await reg?.pushManager.getSubscription());
}

export function definirContador(n: number) {
  const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  try { if (n > 0) void nav.setAppBadge?.(n); else void nav.clearAppBadge?.(); } catch { /* sem suporte */ }
}

let ctx: AudioContext | null = null;
/** Short two-tone chime generated in the browser. */
export function tocarAviso() {
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime;
    [880, 1320].forEach((f, i) => {
      const o = ctx!.createOscillator(), g = ctx!.createGain();
      o.frequency.value = f; o.type = "sine";
      g.gain.setValueAtTime(0.0001, t + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.3, t + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.35);
      o.connect(g).connect(ctx!.destination);
      o.start(t + i * 0.18); o.stop(t + i * 0.18 + 0.4);
    });
    navigator.vibrate?.([200, 100, 200]);
  } catch { /* sem áudio */ }
}
