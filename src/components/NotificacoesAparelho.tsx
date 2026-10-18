import { useEffect, useState } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { ativarPush, avisoSistema, ehAppInstalado, pushAtivo, suportaPush } from "@/lib/notificacoes";
import { testarPush } from "@/lib/push.functions";

export function NotificacoesAparelho() {
  const [estado, setEstado] = useState<"carregando" | "ativo" | "inativo" | "sem-suporte">("carregando");
  const [ocupado, setOcupado] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setIos(/iphone|ipad/i.test(navigator.userAgent) && !ehAppInstalado());
    if (!suportaPush()) { setEstado("sem-suporte"); return; }
    void pushAtivo().then((a) => setEstado(a ? "ativo" : "inativo"));
  }, []);

  const ativar = async () => {
    setOcupado(true);
    try {
      await ativarPush();
      setEstado("ativo");
      await testarPush();
      toast.success("Notificações ativadas neste aparelho.");
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      toast.error(m === "NEGADO" ? "Permissão negada. Libere as notificações nos ajustes do aparelho." : m === "NAO_SUPORTA" ? "Este aparelho não aceita notificações." : "Não foi possível ativar agora. Tente novamente.");
    } finally { setOcupado(false); }
  };

  return (
    <Panel title="Notificações neste aparelho">
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">Receba aviso com som quando chegar um novo agendamento e um resumo da agenda todo dia às 07:30. O número de pedidos pendentes aparece no ícone do app.</p>
        {estado === "sem-suporte" && ios && (
          <p className="rounded-md border bg-muted/40 p-3">No iPhone, primeiro adicione o painel à Tela de Início (Compartilhar → Adicionar à Tela de Início) e abra pelo ícone. Depois volte aqui para ativar.</p>
        )}
        {estado === "sem-suporte" && !ios && <p className="text-muted-foreground">Este navegador não aceita notificações. O aviso sonoro funciona com o painel aberto.</p>}
        <div className="flex flex-wrap gap-2">
          {estado === "ativo" ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-2 font-medium text-primary"><BellRing className="h-4 w-4" /> Ativadas</span>
              <Button variant="outline" onClick={() => void testarPush().then(() => toast.success("Teste enviado."))}>Enviar teste</Button>
            </>
          ) : estado === "inativo" ? (
            <Button onClick={ativar} disabled={ocupado}>{ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />} Ativar notificações</Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">O aviso usa o som de notificação do próprio celular, escolhido nos Ajustes do aparelho.</p>
      </div>
    </Panel>
  );
}
