import { supabase } from "@/integrations/supabase/client";
import { addDias, dataBR } from "@/lib/format";

/** Which reminder fits an appointment date relative to today (both ISO yyyy-mm-dd). */
export function tipoLembrete(data: string, hoje: string): "hoje" | "amanha" | "futuro" | "passado" {
  if (data < hoje) return "passado";
  if (data === hoje) return "hoje";
  if (data === addDias(hoje, 1)) return "amanha";
  return "futuro";
}

const diaSemana = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long" });

/** Reminder text naming the real day; "amanhã" only when it really is tomorrow. */
export function textoLembrete(v: { nome: string; servico: string; data: string; hora: string }, hoje: string, empresa: string) {
  const t = tipoLembrete(v.data, hoje);
  const quando = t === "hoje" ? `hoje, ${dataBR(v.data)}` : t === "amanha" ? `amanhã, ${dataBR(v.data)}` : `${diaSemana(v.data)}, ${dataBR(v.data)}`;
  return `Olá ${v.nome}! Passando para lembrar do seu atendimento de ${v.servico} ${quando}${v.hora ? ` às ${v.hora}` : ""}. Qualquer dúvida estamos à disposição! ${empresa}`;
}

export function rotuloLembrete(data: string, hoje: string) {
  const t = tipoLembrete(data, hoje);
  return t === "hoje" ? "Lembrar hoje" : t === "amanha" ? "Lembrar amanhã" : `Lembrar ${dataBR(data).slice(0, 5)}`;
}

/** Permanently deletes a request (admin only by policy), unlinking any OS and removing its photos. */
export async function excluirAgendamento(id: string, fotos: string[]) {
  const un = await supabase.from("service_orders").update({ appointment_id: null }).eq("appointment_id", id);
  if (un.error) throw un.error;
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw error;
  if (fotos.length) await supabase.storage.from("pedidos").remove(fotos);
}

/** Same-day heads-up sent shortly before leaving for the appointment. */
export function textoEmBreve(v: { nome: string; servico: string; hora: string; tecnico: string }, empresa: string) {
  return `Olá ${v.nome}! Confirmando seu atendimento de ${v.servico} hoje${v.hora ? ` às ${v.hora}` : ""}. ${v.tecnico && v.tecnico !== "a definir" ? `${v.tecnico} já está` : "Nossa equipe já está"} se organizando para ir até você. Avisaremos quando estivermos a caminho. ${empresa}`;
}
