import { useEffect, useState } from "react";
import { Bell, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { ativarPush, pushAtivo, suportaPush } from "@/lib/notificacoes";

const CHAVE = "vm-aviso-notif-oculto";

/** Faixa discreta pedindo para ativar as notificações neste aparelho. */
export function AvisoNotificacao() {
  const [mostrar, setMostrar] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!suportaPush() || Notification.permission === "denied") return;
    if (localStorage.getItem(CHAVE) === new Date().toISOString().slice(0, 10)) return;
    void pushAtivo().then((a) => setMostrar(!a));
  }, []);

  if (!mostrar) return null;
  const ativar = async () => {
    setOcupado(true);
    try {
      await ativarPush();
      setMostrar(false);
      toast.success("Notificações ativadas neste aparelho.");
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      toast.error(m === "NEGADO" ? "Permissão negada. Libere nos ajustes do aparelho." : "Não foi possível ativar agora.");
    } finally { setOcupado(false); }
  };
  const fechar = () => { localStorage.setItem(CHAVE, new Date().toISOString().slice(0, 10)); setMostrar(false); };

  return (
    <div className="mb-5 flex items-center gap-3 rounded-lg border bg-card p-3">
      <Bell className="h-5 w-5 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 text-sm">Ative as notificações para saber de novos pedidos e atendimentos.</p>
      <button onClick={ativar} disabled={ocupado} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[6px] bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
        {ocupado && <Loader2 className="h-4 w-4 animate-spin" />} Ativar
      </button>
      <button onClick={fechar} aria-label="Agora não" className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
    </div>
  );
}
