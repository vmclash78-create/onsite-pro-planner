import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { maskTel, telefoneValido } from "@/lib/telefone";

interface DefinirNomeProps {
  userId: string;
  pedirNome: boolean;
  pedirTelefone: boolean;
}

const campo = "h-10 w-full rounded-[6px] border border-input bg-background px-3 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm";

/** Aviso fixo pedindo nome de usuário e/ou WhatsApp de quem ainda não preencheu. */
export function DefinirNome({ userId, pedirNome, pedirTelefone }: DefinirNomeProps) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [salvando, setSalvando] = useState(false);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const patch: { nome?: string; telefone?: string } = {};
    if (pedirNome) {
      const v = nome.trim().replace(/\s+/g, " ");
      if (v.length < 2) { toast.error("Digite pelo menos 2 letras no nome."); return; }
      patch.nome = v.slice(0, 80);
    }
    if (pedirTelefone) {
      if (!telefoneValido(tel)) { toast.error("Digite o WhatsApp com DDD."); return; }
      patch.telefone = tel;
    }
    setSalvando(true);
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    setSalvando(false);
    if (error) { toast.error("Não foi possível salvar."); return; }
    toast.success("Dados salvos!");
    for (const k of ["me", "equipe"]) qc.invalidateQueries({ queryKey: [k] });
  };

  const titulo = pedirNome && pedirTelefone ? "Complete seu cadastro" : pedirNome ? "Defina seu nome de usuário" : "Informe seu WhatsApp";
  return (
    <form onSubmit={salvar} className="mb-5 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{titulo}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">O nome aparece no painel e nas mensagens; o WhatsApp é usado pela equipe para falar com você.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {pedirNome && <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome (ex.: Livia Souza)" autoComplete="name" maxLength={80} className={campo} aria-label="Nome de usuário" />}
            {pedirTelefone && <input value={tel} onChange={(e) => setTel(maskTel(e.target.value))} placeholder="WhatsApp (88) 99999-9999" inputMode="tel" autoComplete="tel" className={campo} aria-label="WhatsApp" />}
            <button disabled={salvando} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[6px] bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
