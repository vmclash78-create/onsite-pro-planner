import { z } from "zod";

export const tiposFoto = ["image/jpeg", "image/png", "image/webp", "image/heic"] as const;
export const limiteFoto = 10 * 1024 * 1024;
export const modalidades = {
  Refrigeração: ["Instalação", "Limpeza", "Manutenção", "Conserto"],
  Gesso: ["Forro", "Parede", "Sanca", "Reparo"],
  Elétrica: ["Ponto novo", "Quadro", "Instalação", "Reparo"],
} as const;
export const horarios = ["08:00", "09:00", "10:00", "14:00", "15:00", "16:00"];
const fotoPath = /^site\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-2]\.(jpg|png|webp|heic)$/;
const antiRobo = z.string().max(0, "Não foi possível validar a solicitação.").optional();

export const prepararFotosSchema = z.object({ tipos: z.array(z.enum(tiposFoto)).max(3), website: antiRobo });

export function criarPedidoSchema(agora: () => Date = () => new Date()) {
  return z.object({
    categoria: z.enum(["Refrigeração", "Gesso", "Elétrica"]),
    tipo: z.string().trim().min(2).max(60),
    visita: z.boolean(),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    hora: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    nome: z.string().trim().min(3).max(120),
    whatsapp: z.string().trim().regex(/^\([1-9]\d\) \d{4,5}-\d{4}$/),
    cep: z.string().regex(/^\d{5}-\d{3}$/),
    descricao: z.string().trim().max(2000),
    fotos: z.array(z.string().regex(fotoPath)).max(3),
    uploadId: z.string().uuid().optional(),
    uploadProof: z.string().uuid().optional(),
    lgpd: z.literal(true),
    website: antiRobo,
  }).superRefine((d, ctx) => {
    const invalid = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (!(modalidades[d.categoria] as readonly string[]).includes(d.tipo)) invalid("tipo", "Selecione uma modalidade válida.");
    if (new Set(d.fotos).size !== d.fotos.length) invalid("fotos", "As fotos não podem se repetir.");
    if (d.fotos.length && (!d.uploadId || !d.uploadProof)) invalid("fotos", "Prepare novamente o envio das fotos.");
    const pastas = d.fotos.map((p) => p.split("/")[1]);
    if (new Set(pastas).size > 1) invalid("fotos", "Envie as fotos juntas na mesma solicitação.");
    if (d.visita) {
      if (d.data !== null || d.hora !== null) invalid("data", "Visita sem horário definido não deve conter uma reserva.");
      return;
    }
    if (!d.data || !d.hora) { invalid("data", "Escolha dia e horário."); return; }
    const dia = new Date(`${d.data}T00:00:00Z`);
    if (!Number.isFinite(dia.getTime()) || dia.toISOString().slice(0, 10) !== d.data) {
      invalid("data", "Selecione uma data válida."); return;
    }
    const hoje = new Date(agora().getTime() - 3 * 3600_000).toISOString().slice(0, 10);
    const ultimo = new Date(Date.parse(`${hoje}T00:00:00Z`) + 60 * 86400_000).toISOString().slice(0, 10);
    if (d.data <= hoje || d.data > ultimo || dia.getUTCDay() === 0) invalid("data", "Selecione um dia disponível a partir de amanhã.");
    if (!horarios.includes(d.hora)) invalid("hora", "Selecione um horário disponível.");
    if (((d.categoria === "Refrigeração" && d.tipo === "Instalação") || (d.categoria === "Elétrica" && d.tipo === "Quadro")) && !["08:00", "14:00"].includes(d.hora)) invalid("hora", "Selecione o início do turno.");
  });
}

export const pedidoSchema = criarPedidoSchema();

export function validarFotos(files: readonly { type: string; size: number }[]): string | null {
  if (files.length > 3) return "Anexe no máximo 3 fotos.";
  if (files.some((f) => !(tiposFoto as readonly string[]).includes(f.type))) return "Use fotos JPG, PNG, WebP ou HEIC.";
  if (files.some((f) => f.size <= 0 || f.size > limiteFoto)) return "Cada foto deve ter até 10 MB e não pode estar vazia.";
  return null;
}