import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { company } from "@/lib/company";
import { brl } from "@/lib/format";

const FILTROS = ["Todos", "Refrigeração", "Gesso", "Elétrica"];

export function Vitrine({ onAgendar }: { onAgendar?: () => void }) {
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
  const zap = (t: string) => `${company.whatsappUrl}?text=${encodeURIComponent(`Olá! Tenho interesse em: ${t}`)}`;

  return (
    <div>
      <h2 className="text-xl font-semibold">Serviços e preços</h2>
      <p className="mt-1 text-sm text-muted-foreground">Valores de referência em Hidrolândia e região. O preço final é confirmado na visita ou pelo WhatsApp.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {FILTROS.map((f) => <Button key={f} size="sm" variant={cat === f ? "default" : "outline"} onClick={() => setCat(f)}>{f}</Button>)}
      </div>
      {q.isLoading && <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>}
      {q.error && <p className="mt-8 text-sm text-destructive">Não foi possível carregar. Fale com a gente pelo WhatsApp.</p>}
      {!q.isLoading && !q.error && ofertas.length === 0 && obras.length === 0 && <p className="mt-8 text-sm text-muted-foreground">Nenhum item nesta categoria ainda.</p>}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {ofertas.map((i) => (
          <article key={i.id} className="flex flex-col overflow-hidden rounded-xl border bg-card">
            {i.imagem_url && <img src={i.imagem_url} alt={i.titulo} loading="lazy" className="aspect-[4/3] w-full object-cover" />}
            <div className="flex flex-1 flex-col p-4">
              <div className="text-xs text-muted-foreground">{i.tipo} · {i.categoria}</div>
              <h3 className="mt-1 font-semibold">{i.titulo}</h3>
              {i.descricao && <p className="mt-1 text-sm text-muted-foreground">{i.descricao}</p>}
              <div className="mt-auto pt-4">
                {i.preco != null && <div className="text-lg font-semibold tabular-nums">{i.a_partir && <span className="text-xs font-normal text-muted-foreground">a partir de </span>}{brl(Number(i.preco))}</div>}
                <div className="mt-3 flex gap-2">
                  {onAgendar
                    ? <Button size="sm" className="flex-1" onClick={onAgendar}>Pedir orçamento</Button>
                    : <Button asChild size="sm" className="flex-1"><a href="/agendar">Pedir orçamento</a></Button>}
                  <Button asChild size="sm" variant="outline" aria-label="Perguntar no WhatsApp"><a href={zap(i.titulo)} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /></a></Button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {obras.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Obras realizadas</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {obras.map((o) => (
              <figure key={o.id} className="overflow-hidden rounded-xl border bg-card">
                {o.imagem_url && <img src={o.imagem_url} alt={o.titulo} loading="lazy" className="aspect-[4/3] w-full object-cover" />}
                <figcaption className="p-3"><div className="text-sm font-medium">{o.titulo}</div>{o.descricao && <div className="text-xs text-muted-foreground">{o.descricao}</div>}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
