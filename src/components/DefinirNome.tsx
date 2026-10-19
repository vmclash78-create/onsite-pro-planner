import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DefinirNomeProps { userId: string }

/** Aviso fixo pedindo que a pessoa escolha o nome exibido no sistema e nas mensagens. */
export function DefinirNome({ userId }: DefinirNomeProps) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = nome.trim().replace(/\s+/g, " ");
    if (v.length < 2) { toast.error("Digite pelo menos 2 letras."); return; }
    setSalvando(true);
    const { error } = await supabase.from("profiles").update({ nome: v.slice(0, 80) }).eq("id", userId);
    setSalvando(false);
    if (error) { toast.error("Não foi possível salvar o nome."); return; }
    toast.success("Nome salvo!");
    for (const k of ["me", "equipe"]) qc.invalidateQueries({ queryKey: [k] });
  };

  return (
    <form onSubmit={salvar} className="mb-5 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Defina seu nome de usuário</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Como você quer ser chamado(a) no painel e nas mensagens para os clientes?</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Livia Souza" autoComplete="name" maxLength={80}
              className="h-10 w-full rounded-[6px] border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            <button disabled={salvando} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[6px] bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />} Salvar nome
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
