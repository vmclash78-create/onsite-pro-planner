import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Resumo matinal da agenda (10:30 UTC = 07:30 Fortaleza). */
export const Route = createFileRoute("/api/public/cron/agenda-dia")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const negado = await authenticateCronRequest(request);
        if (negado) return negado;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { enviarPush } = await import("@/lib/push.server");
          const hoje = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
          const { data: ags } = await supabaseAdmin.from("appointments").select("tecnico_id, status").eq("data", hoje).neq("status", "Cancelada");
          const { count: pend } = await supabaseAdmin.from("appointments").select("id", { count: "exact", head: true }).eq("status", "Pendente");
          const lista = ags ?? [];
          const plural = (n: number) => `${n} atendimento${n === 1 ? "" : "s"}`;
          const extra = pend ? ` · ${pend} pedido(s) aguardando confirmação` : "";
          await enviarPush({ title: "Agenda de hoje", body: lista.length ? `Você tem ${plural(lista.length)} hoje${extra}.` : `Nenhum atendimento hoje${extra}.`, url: "/agenda", tag: "agenda-dia", badge: pend ?? 0 });
          const porTec = new Map<string, number>();
          for (const a of lista) if (a.tecnico_id) porTec.set(a.tecnico_id, (porTec.get(a.tecnico_id) ?? 0) + 1);
          for (const [id, n] of porTec) await enviarPush({ title: "Sua agenda de hoje", body: `Você tem ${plural(n)} hoje.`, url: "/agenda", tag: "agenda-dia" }, [id]);
          return Response.json({ ok: true });
        } catch {
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
