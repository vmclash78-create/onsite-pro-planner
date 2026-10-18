import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/**
 * Chamada pelo agendador protegido do projeto, com `Authorization: Bearer <LOVABLE_CRON_SECRET>`.
 * Uma vez por dia basta (06:15 UTC = 03:15 em Fortaleza). Atraso de ~30 s no agendador não importa:
 * as janelas de limpeza são de horas e a rotina é idempotente.
 */
export const Route = createFileRoute("/api/public/cron/limpeza")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const negado = await authenticateCronRequest(request);
        if (negado) return negado;
        try {
          const { limparPublico } = await import("@/lib/limpeza.server");
          const r = await limparPublico();
          return Response.json(r, { status: r.ok ? 200 : 500 });
        } catch {
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
