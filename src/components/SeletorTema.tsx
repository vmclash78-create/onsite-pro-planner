import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tema = "claro" | "escuro" | "sistema";
const CHAVE = "vm-tema";
const EVENTO = "vm-tema-mudou";
const PROXIMO: Record<Tema, Tema> = { sistema: "claro", claro: "escuro", escuro: "sistema" };
const ROTULO: Record<Tema, string> = { claro: "Tema claro", escuro: "Tema escuro", sistema: "Automático (aparelho)" };

const midia = () => window.matchMedia("(prefers-color-scheme: dark)");

export function aplicarTema(t: Tema) {
  const escuro = t === "escuro" || (t === "sistema" && midia().matches);
  document.documentElement.classList.toggle("dark", escuro);
  document.documentElement.style.colorScheme = escuro ? "dark" : "light";
}

function lerTema(): Tema {
  const s = localStorage.getItem(CHAVE);
  return s === "claro" || s === "escuro" || s === "sistema" ? s : "sistema";
}

export function salvarTema(t: Tema) {
  localStorage.setItem(CHAVE, t);
  aplicarTema(t);
  window.dispatchEvent(new Event(EVENTO));
}

/** Tema atual; acompanha mudanças do aparelho e de outras telas. */
export function useTema(): [Tema, (t: Tema) => void] {
  const [tema, setTema] = useState<Tema>("sistema");
  useEffect(() => {
    const sync = () => setTema(lerTema());
    sync();
    const mq = midia();
    const aoMudarAparelho = () => { if (lerTema() === "sistema") aplicarTema("sistema"); };
    mq.addEventListener("change", aoMudarAparelho);
    window.addEventListener(EVENTO, sync);
    window.addEventListener("storage", sync);
    return () => {
      mq.removeEventListener("change", aoMudarAparelho);
      window.removeEventListener(EVENTO, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return [tema, salvarTema];
}

const ICONE = { claro: Sun, escuro: Moon, sistema: Monitor } as const;

export function SeletorTema() {
  const [tema, setTema] = useTema();
  const Icone = ICONE[tema];
  return (
    <button type="button" onClick={() => setTema(PROXIMO[tema])} aria-label={ROTULO[tema]} title={ROTULO[tema]}
      className="liquid-glass inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground">
      <Icone className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}

const OPCOES: { v: Tema; label: string; desc: string }[] = [
  { v: "sistema", label: "Automático", desc: "Segue o aparelho" },
  { v: "claro", label: "Claro", desc: "Sempre claro" },
  { v: "escuro", label: "Escuro", desc: "Sempre escuro" },
];

export function AparenciaConfig() {
  const [tema, setTema] = useTema();
  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold">Aparência</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">No automático, o app fica claro ou escuro junto com o seu celular ou computador.</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {OPCOES.map(({ v, label, desc }) => {
          const I = ICONE[v];
          return (
            <button key={v} type="button" onClick={() => setTema(v)} aria-pressed={tema === v}
              className={cn("flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-center transition-colors",
                tema === v ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>
              <I className="h-5 w-5" strokeWidth={1.75} />
              <span className="text-sm font-medium">{label}</span>
              <span className="text-[11px] text-muted-foreground">{desc}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
