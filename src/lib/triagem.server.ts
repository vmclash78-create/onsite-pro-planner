import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

function createRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
      const response = await fetch(input, { ...init, headers });
      runId ??= response.headers.get(LOVABLE_AIG_RUN_ID_HEADER)?.trim() || undefined;
      return response;
    },
  };
}

export const triagemSchema = z.object({
  tipo_atendimento: z.enum(["Instalação", "Limpeza", "Manutenção preventiva", "Conserto", "Orçamento / visita técnica", "Reparo", "Obra de gesso", "Instalação elétrica", "Emergência elétrica"]),
  categoria: z.enum(["Refrigeração", "Gesso", "Elétrica"]),
  urgencia: z.enum(["Baixa", "Média", "Alta"]),
  justificativa: z.string(),
  proximos_passos: z.array(z.string()),
});
export type Triagem = z.infer<typeof triagemSchema>;

const INSTRUCOES = `Você é o coordenador de atendimento da VM Climatização & Acabamentos (refrigeração, gesso e elétrica, em Hidrolândia/CE e Fortaleza/CE).
Analise a descrição e as fotos de um pedido de serviço e responda em português do Brasil:
- tipo_atendimento: o tipo de atendimento mais adequado.
- categoria: Refrigeração, Gesso ou Elétrica.
- urgencia: Alta quando há risco à segurança (cheiro de queimado, faísca, fio exposto, choque, curto, infiltração sobre fiação, forro cedendo) ou equipamento essencial parado em clínica/comércio; Média quando o equipamento não funciona mas não há risco; Baixa para serviços planejáveis (limpeza, instalação nova, acabamento).
- justificativa: uma ou duas frases curtas explicando a urgência com base no que foi descrito e visto.
- proximos_passos: de 3 a 5 ações objetivas para a equipe (ex.: confirmar pelo WhatsApp, materiais a levar, perguntas a fazer ao cliente, orientação de segurança imediata).
Não invente detalhes que não estejam na descrição ou nas fotos. Se as fotos não ajudarem, diga isso na justificativa.`;

export async function classificarPedido(opts: {
  request: Request;
  apiKey: string;
  descricao: string;
  categoriaInformada: string;
  tipoInformado: string;
  fotos: string[];
}): Promise<Triagem> {
  const runId = createRunIdFetch(opts.request.headers.get(LOVABLE_AIG_RUN_ID_HEADER) ?? undefined);
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: opts.apiKey,
    headers: { "Lovable-API-Key": opts.apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runId.fetch,
  });

  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions: INSTRUCOES,
    output: Output.object({ schema: triagemSchema }),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: `Categoria escolhida pelo cliente: ${opts.categoriaInformada}\nTipo escolhido: ${opts.tipoInformado}\nDescrição: ${opts.descricao || "(sem descrição)"}\nFotos anexadas: ${opts.fotos.length}` },
          ...opts.fotos.map((url) => ({ type: "image" as const, image: new URL(url) })),
        ],
      },
    ],
    abortSignal: opts.request.signal,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  try {
    return await result.output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error) && error.text) {
      const parsed = triagemSchema.safeParse(JSON.parse(error.text));
      if (parsed.success) return parsed.data;
    }
    throw error;
  }
}
