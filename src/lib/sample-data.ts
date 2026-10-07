export type Categoria = "Refrigeração" | "Gesso" | "Elétrica";

const hoje = new Date();
const em = (dias: number, h: number, m = 0) => {
  const d = new Date(hoje);
  d.setDate(d.getDate() + dias);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const resumo = {
  agendamentosHoje: 6,
  orcamentosPendentes: 4,
  ordensAndamento: 3,
  concluidasMes: 27,
  faturamentoMes: 18450.9,
};

export const proximosServicos: {
  id: string; cliente: string; categoria: Categoria; tipo: string;
  tecnico: string; inicio: string; bairro: string; status: "Agendada" | "Pendente" | "Em andamento";
}[] = [
  { id: "1", cliente: "Mariana Costa", categoria: "Refrigeração", tipo: "Limpeza", tecnico: "Carlos Lima", inicio: em(0, 9), bairro: "Aldeota", status: "Em andamento" },
  { id: "2", cliente: "Padaria Pão Dourado", categoria: "Elétrica", tipo: "Troca de quadro", tecnico: "Rafael Souza", inicio: em(0, 11, 30), bairro: "Meireles", status: "Agendada" },
  { id: "3", cliente: "João Pereira", categoria: "Gesso", tipo: "Forro", tecnico: "André Melo", inicio: em(0, 14), bairro: "Cocó", status: "Agendada" },
  { id: "4", cliente: "Clínica Vida", categoria: "Refrigeração", tipo: "Instalação", tecnico: "Carlos Lima", inicio: em(1, 8), bairro: "Fátima", status: "Pendente" },
  { id: "5", cliente: "Ana Ribeiro", categoria: "Elétrica", tipo: "Ponto novo", tecnico: "Rafael Souza", inicio: em(1, 15), bairro: "Benfica", status: "Agendada" },
];

export const manutencoesVencidas = [
  { id: "a", cliente: "Clínica Vida", aparelho: "Split Samsung 12.000 BTU", vencida: em(-12, 0) },
  { id: "b", cliente: "Escritório Nunes", aparelho: "Cassete LG 36.000 BTU", vencida: em(-30, 0) },
  { id: "c", cliente: "Mariana Costa", aparelho: "Split Midea 9.000 BTU", vencida: em(-3, 0) },
];
