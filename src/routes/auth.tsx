import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — VM Climatização & Acabamentos" },
      { name: "description", content: "Acesso da equipe ao painel da VM Climatização & Acabamentos." },
      { property: "og:title", content: "Entrar — VM Climatização & Acabamentos" },
      { property: "og:description", content: "Acesso da equipe ao painel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const input = "h-11 w-full rounded-[6px] border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/inicio" }); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { if (s) navigate({ to: "/inicio" }); });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null); setAviso(null); setCarregando(true);
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password: senha,
          options: { emailRedirectTo: window.location.origin + "/inicio", data: { full_name: nome } },
        });
        if (error) throw error;
        if (!data.session) setAviso("Enviamos um link de confirmação para o seu e-mail.");
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : "";
      setErro(m.includes("Invalid login") ? "E-mail ou senha incorretos." : m.includes("registered") ? "Este e-mail já tem cadastro." : "Não foi possível continuar. Tente novamente.");
    } finally { setCarregando(false); }
  };

  const google = async () => {
    setErro(null);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) setErro("Não foi possível entrar com Google.");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">VM</div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">VM Climatização & Acabamentos</div>
            <div className="text-xs text-muted-foreground">Painel da equipe</div>
          </div>
        </div>
        <div className="mt-6 rounded-lg border bg-card p-5">
          <h1 className="text-lg font-semibold">{modo === "entrar" ? "Entrar" : "Criar conta"}</h1>
          <form onSubmit={enviar} className="mt-4 space-y-3">
            {modo === "cadastrar" && (
              <input className={input} placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoComplete="name" />
            )}
            <input className={input} type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            <input className={input} type="password" placeholder="Senha (mínimo 6 caracteres)" minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete={modo === "entrar" ? "current-password" : "new-password"} />
            {erro && <p className="text-xs text-destructive">{erro}</p>}
            {aviso && <p className="text-xs text-success">{aviso}</p>}
            <button disabled={carregando} className="flex h-11 w-full items-center justify-center gap-2 rounded-[6px] bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {carregando && <Loader2 className="h-4 w-4 animate-spin" />} {modo === "entrar" ? "Entrar" : "Criar conta"}
            </button>
          </form>
          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" /></div>
          <button onClick={google} className="h-11 w-full rounded-[6px] border text-sm font-medium hover:bg-muted">Continuar com Google</button>
        </div>
        <button onClick={() => setModo(modo === "entrar" ? "cadastrar" : "entrar")} className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground">
          {modo === "entrar" ? "Não tem conta? Criar conta" : "Já tem conta? Entrar"}
        </button>
      </div>
    </main>
  );
}
