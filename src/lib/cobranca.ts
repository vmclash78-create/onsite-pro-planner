import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { brl, dataBR } from "@/lib/format";

/* ---------- Telefone / WhatsApp ---------- */

/** Returns "55"+DDD+number (12–13 digits) or null when the phone is not a valid BR number. */
export function normalizarTelefone(raw: string | null | undefined): string | null {
  let d = (raw ?? "").replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length !== 10 && d.length !== 11) return null;
  if (Number(d.slice(0, 2)) < 11) return null;
  if (d.length === 11 && d[2] !== "9") return null;
  return `55${d}`;
}

export const linkWhatsApp = (tel: string, texto: string) => `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`;

export type VarsMensagem = Partial<Record<"nome" | "servico" | "data" | "hora" | "tecnico" | "valor" | "modelo_aparelho" | "atendente", string>>;

export const preencherModelo = (texto: string, vars: VarsMensagem) =>
  texto.replace(/\{(\w+)\}/g, (m, k: string) => (vars as Record<string, string | undefined>)[k] ?? m);

/* ---------- Recebimentos ---------- */

export type StatusRec = "pendente" | "parcial" | "pago" | "atrasado";

/** "atrasado" whenever due date has passed and there is still a balance. */
export function statusRecebimento(r: { valor_total: number; valor_pago: number; vencimento: string }, hoje: string): StatusRec {
  const saldo = Number(r.valor_total) - Number(r.valor_pago);
  if (saldo <= 0.001) return "pago";
  if (r.vencimento < hoje) return "atrasado";
  return Number(r.valor_pago) > 0 ? "parcial" : "pendente";
}

/* ---------- Pix BR Code (EMV) ---------- */

const tlv = (id: string, v: string) => `${id}${String(v.length).padStart(2, "0")}${v}`;

export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const limpar = (s: string, max: number) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 ]/g, "").trim().slice(0, max).toUpperCase();

export function pixPayload({ chave, nome, cidade, valor, txid = "***" }: { chave: string; nome: string; cidade: string; valor?: number; txid?: string }) {
  const conta = tlv("00", "br.gov.bcb.pix") + tlv("01", chave.trim());
  let p = tlv("00", "01") + tlv("26", conta) + tlv("52", "0000") + tlv("53", "986");
  if (valor && valor > 0) p += tlv("54", valor.toFixed(2));
  p += tlv("58", "BR") + tlv("59", limpar(nome, 25) || "RECEBEDOR") + tlv("60", limpar(cidade, 15) || "CIDADE");
  p += tlv("62", tlv("05", txid.replace(/[^A-Za-z0-9*]/g, "").slice(0, 25) || "***"));
  p += "6304";
  return p + crc16(p);
}

export const mensagemPix = (o: { nome: string; servico: string; data: string; valor: number; codigo: string }) =>
  `Olá ${o.nome}, segue o Pix referente ao serviço ${o.servico} realizado em ${dataBR(o.data)}. Valor: ${brl(o.valor)}. Pix copia e cola: ${o.codigo}. Obrigado pela confiança! VM Climatização & Acabamentos`;

/* ---------- Hooks compartilhados ---------- */

export function useConfigEmpresa() {
  return useQuery({
    queryKey: ["config-empresa"],
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracoes_empresa").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useModelos() {
  return useQuery({
    queryKey: ["modelos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("modelos_mensagem").select("*").order("titulo");
      if (error) throw error;
      return data;
    },
  });
}

/** Last sent date per "referencia_id:tipo". */
export function useEnviadas() {
  return useQuery({
    queryKey: ["enviadas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mensagens_enviadas").select("referencia_id, tipo, data").order("data", { ascending: false }).limit(1000);
      if (error) throw error;
      const m = new Map<string, string>();
      for (const r of data) { const k = `${r.referencia_id}:${r.tipo}`; if (!m.has(k)) m.set(k, r.data); }
      return m;
    },
  });
}

export function useRegistrarEnvio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { cliente_id: string | null; tipo: string; referencia_id: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("mensagens_enviadas").insert({ ...v, enviado_por: u.user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["enviadas"] }),
  });
}

export const enviadoEm = (iso?: string) => (iso ? `enviado em ${new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}` : "");
