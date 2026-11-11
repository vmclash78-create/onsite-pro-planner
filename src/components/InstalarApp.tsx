import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PromptInstalacao extends Event { prompt: () => Promise<void> }
type JanelaPwa = Window & { __bip?: PromptInstalacao };

/** Botão "Instalar app": prompt nativo no Android/Chrome, instrução no iPhone. */
export function InstalarApp() {
  const [evento, setEvento] = useState<PromptInstalacao | null>(null);
  const [ios, setIos] = useState(false);
  const [instalado, setInstalado] = useState(false);

  useEffect(() => {
    const w = window as JanelaPwa;
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setInstalado(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const pegar = () => setEvento(w.__bip ?? null);
    pegar();
    window.addEventListener("vm-bip", pegar);
    const ok = () => { setInstalado(true); setEvento(null); };
    window.addEventListener("appinstalled", ok);
    return () => { window.removeEventListener("vm-bip", pegar); window.removeEventListener("appinstalled", ok); };
  }, []);

  if (instalado) return <p className="text-sm text-muted-foreground">O aplicativo já está instalado neste aparelho.</p>;
  if (evento) return (
    <Button onClick={async () => { await evento.prompt(); setEvento(null); }}>
      <Download className="mr-2 h-4 w-4" /> Instalar app
    </Button>
  );
  if (ios) return (
    <p className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      No Safari, toque em <Share className="h-4 w-4" /> <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b>.
    </p>
  );
  return <p className="text-sm text-muted-foreground">No Chrome, abra o menu ⋮ e toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>. Se não aparecer, o app pode já estar instalado.</p>;
}
