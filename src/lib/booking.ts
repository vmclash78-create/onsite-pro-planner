import { Snowflake, PaintRoller, Zap, type LucideIcon } from "lucide-react";

export type CategoriaId = "refrigeracao" | "gesso" | "eletrica";

export const categorias: { id: CategoriaId; nome: string; descricao: string; icon: LucideIcon; tipos: { id: string; nome: string; detalhe: string }[] }[] = [
  {
    id: "refrigeracao", nome: "Refrigeração", descricao: "Ar-condicionado split, cassete e janela", icon: Snowflake,
    tipos: [
      { id: "instalacao", nome: "Instalação", detalhe: "Aparelho novo, com tubulação e suporte" },
      { id: "limpeza", nome: "Limpeza", detalhe: "Higienização completa da evaporadora" },
      { id: "manutencao", nome: "Manutenção preventiva", detalhe: "Revisão, gás e componentes" },
      { id: "conserto", nome: "Conserto", detalhe: "Não gela, vaza água ou faz barulho" },
    ],
  },
  {
    id: "gesso", nome: "Gesso", descricao: "Forro, sancas, paredes e acabamentos", icon: PaintRoller,
    tipos: [
      { id: "forro", nome: "Forro", detalhe: "Gesso liso ou drywall" },
      { id: "parede", nome: "Parede em drywall", detalhe: "Divisórias e nichos" },
      { id: "sanca", nome: "Sanca", detalhe: "Com ou sem iluminação embutida" },
      { id: "reparo", nome: "Reparo", detalhe: "Trincas, infiltração e remendos" },
    ],
  },
  {
    id: "eletrica", nome: "Elétrica", descricao: "Instalações, quadros e pontos novos", icon: Zap,
    tipos: [
      { id: "instalacao", nome: "Instalação elétrica", detalhe: "Chuveiro, luminárias e ventiladores" },
      { id: "quadro", nome: "Troca de quadro", detalhe: "Disjuntores e quadro de distribuição" },
      { id: "ponto", nome: "Ponto novo", detalhe: "Tomada ou interruptor, 127V ou 220V" },
      { id: "reparo", nome: "Reparo", detalhe: "Curto, queda de energia ou fiação" },
    ],
  },
];

export type Dia = { iso: string; date: Date; semana: string; numero: string; mes: string; disponivel: boolean };

export function proximosDias(n = 14): Dia[] {
  const out: Dia[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 1; i <= n; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const domingo = d.getDay() === 0;
    const lotado = d.getDate() % 6 === 0; // exemplo: alguns dias sem vaga
    out.push({
      iso: d.toISOString().slice(0, 10),
      date: d,
      semana: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      numero: String(d.getDate()).padStart(2, "0"),
      mes: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      disponivel: !domingo && !lotado,
    });
  }
  return out;
}

const MANHA = ["08:00", "09:00", "10:00", "11:00"];
const TARDE = ["13:30", "14:30", "15:30", "16:30"];

/** Horários de exemplo. Sábado só manhã; alguns dias sem vaga. */
export async function horariosDoDia(dia: Dia): Promise<{ manha: string[]; tarde: string[] }> {
  await new Promise((r) => setTimeout(r, 350));
  if (!dia.disponivel) return { manha: [], tarde: [] };
  const seed = dia.date.getDate();
  if (seed % 5 === 0) return { manha: [], tarde: [] };
  const filtra = (l: string[]) => l.filter((_, i) => (i + seed) % 3 !== 0);
  return { manha: filtra(MANHA), tarde: dia.date.getDay() === 6 ? [] : filtra(TARDE) };
}

export const mascaraWhats = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

export const mascaraCep = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

export async function buscarCep(cep: string): Promise<{ rua: string; bairro: string; cidade: string } | null> {
  const d = cep.replace(/\D/g, "");
  if (d.length !== 8) return null;
  const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
  if (!r.ok) throw new Error("falha");
  const j = await r.json();
  if (j.erro) return null;
  return { rua: j.logradouro ?? "", bairro: j.bairro ?? "", cidade: `${j.localidade}/${j.uf}` };
}

export type PedidoAgendamento = {
  categoria: string; tipo: string; visitaOrcamento: boolean; data?: string | undefined; hora?: string | undefined;
  nome: string; whatsapp: string; endereco: string; descricao: string; fotos: File[];
};

/**
 * Envia o pedido como agendamento pendente.
 * Ainda não há banco conectado: simula o envio. Ao ativar o backend,
 * troque o corpo por uma chamada à função de servidor (sem leitura pública).
 */
export async function enviarAgendamento(_p: PedidoAgendamento): Promise<{ protocolo: string }> {
  await new Promise((r) => setTimeout(r, 900));
  return { protocolo: `AG-${String(Date.now()).slice(-6)}` };
}
