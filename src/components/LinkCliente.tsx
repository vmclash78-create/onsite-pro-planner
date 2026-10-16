import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Copy, Eye, MessageCircle, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const MENSAGEM = "Olá! Conheça os serviços da VM Climatização & Acabamentos e agende seu atendimento ou orçamento por aqui:";

/** Cartão com o link público de agendamento: copiar, enviar no WhatsApp e ver. */
export function LinkCliente() {
  const [url, setUrl] = useState("/agendar");
  useEffect(() => {
    const o = window.location.origin;
    // Link da prévia só abre para quem está logado no editor: manda sempre o publicado.
    setUrl(/id-preview|localhost|lovableproject/.test(o) ? "https://onsite-pro-planner.lovable.app/agendar" : `${o}/agendar`);
  }, []);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar. Segure no link e copie.");
    }
  };
  return (
    <section className="rounded-lg border border-primary/30 bg-card p-4">
      <div className="flex items-center gap-2">
        <Store className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} />
        <div className="min-w-0">
          <div className="text-sm font-semibold">Link para os clientes</div>
          <div className="text-xs text-muted-foreground">Vitrine e agendamento. Use no Instagram e no WhatsApp.</div>
        </div>
      </div>
      <div className="mt-3 select-all truncate rounded-[6px] border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{url}</div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
        <Button size="sm" onClick={copiar}><Copy className="h-3.5 w-3.5" /> Copiar link</Button>
        <Button size="sm" variant="outline" asChild>
          <a href={`https://wa.me/?text=${encodeURIComponent(`${MENSAGEM} ${url}`)}`} target="_blank" rel="noreferrer"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>
        </Button>
        <Button size="sm" variant="ghost" asChild className="col-span-2 sm:col-span-1">
          <Link to="/agendar" target="_blank"><Eye className="h-3.5 w-3.5" /> Ver como o cliente vê</Link>
        </Button>
      </div>
    </section>
  );
}
