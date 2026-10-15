import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, MessageCircle, Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { company } from "@/lib/company";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/catalogo")({
  head: () => ({
    meta: [
      { title: "Serviços, aparelhos e obras — VM Climatização & Acabamentos" },
      { name: "description", content: "Preços de higienização, instalação de ar-condicionado, forro de gesso, sanca e elétrica em Hidrolândia e Fortaleza/CE." },
      { property: "og:title", content: "Serviços e obras — VM Climatização & Acabamentos" },
      { property: "og:description", content: "Ar-condicionado, gesso e elétrica com preço de referência e portfólio de obras." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Catalogo,
});

const FILTROS = ["Todos", "Refrigeração", "Gesso", "Elétrica"];

function Catalogo() {
  const [cat, setCat] = useState("Todos");
  const q = useQuery({
    queryKey: ["catalogo-publico"],
    queryFn: async () => {
      const { data, error } = await supabase.from("catalogo_itens").select("id, tipo, categoria, titulo, descricao, preco, a_partir, imagem_url").eq("ativo", true).order("ordem");
      if (error) throw error;
      return data;
    },
  });
  const itens = (q.data ?? []).filter((i) => cat === "Todos" || i.categoria === cat);
  const obras = itens.filter((i) => i.tipo === "Obra");
  const ofertas = itens.filter((i) => i.tipo !== "Obra");
  const zap = (t: string) => `https://wa.me/${company.whatsappUrl.replace(/\D/g, "").slice(-13)}?text=${encodeURIComponent(`Olá! Tenho interesse em: ${t}`)}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground"><Snowflake className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1 leading-tight"><div className="truncate text-sm font-semibold">VM Climatização & Acabamentos</div><div className="text-xs text-muted-foreground">Ar-condicionado · Gesso · Elétrica</div></div>
          <Button asChild size="sm"><Link to="/agendar">Agendar</Link></Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Serviços e preços</h1>
        <p className="mt-1 text-sm text-muted-foreground">Valores de referência em Hidrolândia e região. O preço final é confirmado na visita ou pelo WhatsApp.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {FILTROS.map((f) => <Button key={f} size="sm" variant={cat === f ? "default" : "outline"} onClick={() => setCat(f)}>{f}</Button>)}
        </div>
        {q.isLoading && <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>}
        {q.error && <p className="mt-8 text-sm text-destructive">Não foi possível carregar. Fale com a gente pelo WhatsApp.</p>}
        {!q.isLoading && !q.error && ofertas.length === 0 && obras.length === 0 && <p className="mt-8 text-sm text-muted-foreground">Nenhum item nesta categoria ainda.</p>}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ofertas.map((i) => (
            <article key={i.id} className="flex flex-col overflow-hidden rounded-xl border bg-card">
              {i.imagem_url && <img src={i.imagem_url} alt={i.titulo} loading="lazy" className="aspect-[4/3] w-full object-cover" />}
              <div className="flex flex-1 flex-col p-4">
                <div className="text-xs text-muted-foreground">{i.tipo} · {i.categoria}</div>
                <h2 className="mt-1 font-semibold">{i.titulo}</h2>
                {i.descricao && <p className="mt-1 text-sm text-muted-foreground">{i.descricao}</p>}
                <div className="mt-auto pt-4">
                  {i.preco != null && <div className="text-lg font-semibold tabular-nums">{i.a_partir && <span className="text-xs font-normal text-muted-foreground">a partir de </span>}{brl(Number(i.preco))}</div>}
                  <div className="mt-3 flex gap-2">
                    <Button asChild size="sm" className="flex-1"><Link to="/agendar">Pedir orçamento</Link></Button>
                    <Button asChild size="sm" variant="outline" aria-label="Perguntar no WhatsApp"><a href={zap(i.titulo)} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /></a></Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {obras.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold">Obras realizadas</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {obras.map((o) => (
                <figure key={o.id} className="overflow-hidden rounded-xl border bg-card">
                  {o.imagem_url && <img src={o.imagem_url} alt={o.titulo} loading="lazy" className="aspect-[4/3] w-full object-cover" />}
                  <figcaption className="p-3"><div className="text-sm font-medium">{o.titulo}</div>{o.descricao && <div className="text-xs text-muted-foreground">{o.descricao}</div>}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}
        <footer className="mt-12 border-t pt-4 text-xs text-muted-foreground">{company.addressDisplay} · <a href={company.whatsappUrl} className="tabular-nums text-foreground">{company.phoneDisplay}</a></footer>
      </main>
    </div>
  );
}
