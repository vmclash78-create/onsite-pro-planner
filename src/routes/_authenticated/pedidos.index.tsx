import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Panel, StateRow, Status, inputCls } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { dataBR } from "@/lib/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/pedidos/")({
  head: pageHead("Pedidos", "Pedidos de serviço recebidos pela página de agendamento e pelo painel."),
  component: Pedidos,
});

function Pedidos() {
  const [filtro, setFiltro] = useState("Pendente");
  const q = useQuery({
    queryKey: ["pedidos", filtro],
    queryFn: async () => {
      let qb = supabase.from("appointments").select("id, created_at, nome_contato, whatsapp, categoria, tipo, data, hora, visita_orcamento, status, origem, fotos, ia_urgencia").order("created_at", { ascending: false }).limit(100);
      if (filtro !== "Todos") qb = qb.eq("status", filtro);
      const { data, error } = await qb;
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell title="Pedidos">
      <Panel title={`${q.data?.length ?? 0} pedido(s)`} action={
        <select aria-label="Filtrar" className={`${inputCls} h-8 w-36`} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          {["Pendente", "Agendada", "Em andamento", "Concluída", "Cancelada", "Todos"].map((s) => <option key={s}>{s}</option>)}
        </select>}>
        <StateRow loading={q.isLoading} error={q.error} empty={q.data?.length === 0} emptyText="Nenhum pedido nesta situação." />
        <ul className="divide-y">
          {q.data?.map((p) => (
            <li key={p.id}>
              <Link to="/pedidos/$id" params={{ id: p.id }} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3 hover:bg-muted/50">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{p.nome_contato} <span className="font-normal text-muted-foreground">· {p.categoria} · {p.tipo}</span></div>
                  <div className="truncate text-xs tabular-nums text-muted-foreground">
                    {p.visita_orcamento ? "Visita para orçamento" : p.data ? `${dataBR(p.data)} ${p.hora ?? ""}` : "Sem data"} · {p.whatsapp} · {p.origem === "site" ? "pelo site" : "pelo painel"}{p.fotos.length ? ` · ${p.fotos.length} foto(s)` : ""}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Status value={p.status} />
                  {p.ia_urgencia && <span className="text-[11px] text-muted-foreground">Urgência: <span className={p.ia_urgencia === "Alta" ? "text-destructive" : p.ia_urgencia === "Média" ? "text-warning" : "text-success"}>{p.ia_urgencia}</span></span>}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </AppShell>
  );
}
