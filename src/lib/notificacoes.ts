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
  await salvarInscricaoPush({ data: { endpoint: sub.endpoint, p256dh: j.keys?.["p256dh"] ?? "", auth: j.keys?.["auth"] ?? "", aparelho: navigator.userAgent.slice(0, 200) } });
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

// Tones inspired by classic phone alerts, synthesized in the browser (no audio files).
type Nota = { f: number; t: number; d: number; v?: number; tipo?: OscillatorType };
export const TOQUES: Record<string, { nome: string; notas: Nota[] }> = {
  nota: { nome: "Nota (estilo iPhone)", notas: [{ f: 1046.5, t: 0, d: 0.9 }, { f: 1568, t: 0.12, d: 1.1 }, { f: 2093, t: 0.12, d: 0.8, v: 0.12 }] },
  sino: { nome: "Sino (estilo WhatsApp)", notas: [{ f: 1318.5, t: 0, d: 0.5 }, { f: 1760, t: 0.1, d: 0.7 }] },
  acorde: { nome: "Acorde", notas: [{ f: 659.3, t: 0, d: 0.9 }, { f: 830.6, t: 0.08, d: 0.9 }, { f: 987.8, t: 0.16, d: 1 }] },
  gota: { nome: "Gota", notas: [{ f: 600, t: 0, d: 0.25, tipo: "triangle" }, { f: 1200, t: 0.06, d: 0.3 }] },
  alegria: { nome: "Alegria", notas: [{ f: 784, t: 0, d: 0.3 }, { f: 988, t: 0.12, d: 0.3 }, { f: 1175, t: 0.24, d: 0.3 }, { f: 1568, t: 0.36, d: 0.6 }] },
  classico: { nome: "Bipe clássico", notas: [{ f: 880, t: 0, d: 0.35 }, { f: 1320, t: 0.18, d: 0.35 }] },
};
const CHAVE = "vm-toque";
export const toqueAtual = () => { try { const t = localStorage.getItem(CHAVE); return t && TOQUES[t] ? t : "nota"; } catch { return "nota"; } };
export const escolherToque = (id: string) => { try { localStorage.setItem(CHAVE, id); } catch { /* sem armazenamento */ } };

let ctx: AudioContext | null = null;
export function tocarAviso(id?: string) {
  try {
    ctx ??= new AudioContext();
    void ctx.resume();
    const c = ctx, t0 = c.currentTime + 0.02;
    const toque = TOQUES[id ?? toqueAtual()] ?? TOQUES["nota"]!;
    toque.notas.forEach((n) => {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = n.f; o.type = n.tipo ?? "sine";
      const s = t0 + n.t;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(n.v ?? 0.28, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, s + n.d);
      o.connect(g).connect(c.destination);
      o.start(s); o.stop(s + n.d + 0.05);
    });
    navigator.vibrate?.([200, 100, 200]);
  } catch { /* sem áudio */ }
}
