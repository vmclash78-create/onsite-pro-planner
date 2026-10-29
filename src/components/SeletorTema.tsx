import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";

type Tema = "claro" | "escuro" | "sistema";
const CHAVE = "vm-tema";
const PROXIMO: Record<Tema, Tema> = { claro: "escuro", escuro: "sistema", sistema: "claro" };
const ROTULO: Record<Tema, string> = { claro: "Tema claro", escuro: "Tema escuro", sistema: "Tema do aparelho" };

export function aplicarTema(t: Tema) {
  const escuro = t === "escuro" || (t === "sistema" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", escuro);
  document.documentElement.style.colorScheme = escuro ? "dark" : "light";
}

export function SeletorTema() {
  const [tema, setTema] = useState<Tema>("claro");
  useEffect(() => {
    const salvo = localStorage.getItem(CHAVE) as Tema | null;
    if (salvo && salvo in PROXIMO) setTema(salvo);
  }, []);
  const trocar = () => {
    const novo = PROXIMO[tema];
    setTema(novo);
    localStorage.setItem(CHAVE, novo);
    aplicarTema(novo);
  };
  const Icone = tema === "escuro" ? Moon : tema === "sistema" ? Monitor : Sun;
  return (
    <button type="button" onClick={trocar} aria-label={ROTULO[tema]} title={ROTULO[tema]}
      className="liquid-glass inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground">
      <Icone className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}
