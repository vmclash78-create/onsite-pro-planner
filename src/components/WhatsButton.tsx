import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { enviadoEm, linkWhatsApp, normalizarTelefone, preencherModelo, useEnviadas, useModelos, useRegistrarEnvio, type VarsMensagem } from "@/lib/cobranca";
import { useMe } from "@/lib/staff";

/** Opens wa.me with a filled template and logs the send to avoid duplicates. */
export function WhatsButton({ label, chave, telefone, vars, clienteId, referenciaId, texto }: {
  label: string; chave: string; telefone: string | null | undefined; vars: VarsMensagem; clienteId: string | null; referenciaId: string; texto?: string | undefined;
}) {
  const modelos = useModelos();
  const me = useMe();
  const enviadas = useEnviadas();
  const registrar = useRegistrarEnvio();
  const ultimo = enviadas.data?.get(`${referenciaId}:${chave}`);
  const abrir = () => {
    const tel = normalizarTelefone(telefone);
    if (!tel) { toast.error("Telefone inválido. Cadastre DDD + número."); return; }
    const m = modelos.data?.find((x) => x.chave === chave);
    if (!texto && !m) { toast.error("Modelo de mensagem não encontrado em Configurações."); return; }
    if (ultimo && !confirm(`Essa mensagem já foi ${enviadoEm(ultimo)}. Enviar de novo?`)) return;
    const atendente = (me.data?.nome ?? "").split(" ")[0] ?? "";
    window.open(linkWhatsApp(tel, texto ?? preencherModelo(m!.texto, { atendente, ...vars })), "_blank", "noopener");
    registrar.mutate({ cliente_id: clienteId, tipo: chave, referencia_id: referenciaId });
  };
  return (
    <span className="inline-flex flex-col items-start">
      <button type="button" onClick={abrir} disabled={modelos.isLoading} className="inline-flex h-7 items-center gap-1 rounded-[6px] border px-2 text-[11px] hover:bg-muted disabled:opacity-50">
        <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.75} /> {label}
      </button>
      {ultimo && <span className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">{enviadoEm(ultimo)}</span>}
    </span>
  );
}
