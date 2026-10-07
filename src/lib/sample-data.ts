export type Categoria = "Refrigeração" | "Gesso" | "Elétrica";

const hoje = new Date();
const em = (dias: number, h: number, m = 0) => {
  const d = new Date(hoje);
  d.setDate(d.getDate() + dias);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const indicadores = [
  { rotulo: "Agendamentos hoje", valor: 6, variacao: "+2 em relação a ontem", tom: "up" as const },
  { rotulo: "Orçamentos pendentes", valor: 4, variacao: "1 aguardando há mais de 5 dias", tom: "warn" as const },
  { rotulo: "Ordens em andamento", valor: 3, variacao: "Mesmo número da semana passada", tom: "flat" as const },
  { rotulo: "Concluídas no mês", valor: 27, variacao: "+12% sobre setembro", tom: "up" as const },
];

export type StatusAgenda = "Agendada" | "Em andamento" | "Concluída" | "Atrasada";

export const agendaHoje: {
  id: string; hora: string; cliente: string; categoria: Categoria; tipo: string;
  tecnico: string; endereco: string; status: StatusAgenda;
}[] = [
  { id: "1", hora: em(0, 8), cliente: "Francisca Holanda", categoria: "Refrigeração", tipo: "Limpeza de split 12.000 BTU", tecnico: "Carlos Lima", endereco: "Rua Tibúrcio Cavalcante, 1820 — Aldeota", status: "Concluída" },
  { id: "2", hora: em(0, 9, 30), cliente: "Padaria Pão Dourado", categoria: "Elétrica", tipo: "Troca de quadro de distribuição", tecnico: "Rafael Souza", endereco: "Av. Bezerra de Menezes, 2210 — São Gerardo", status: "Em andamento" },
  { id: "3", hora: em(0, 11), cliente: "José Wellington Rocha", categoria: "Gesso", tipo: "Forro em drywall — sala", tecnico: "André Melo", endereco: "Rua Pe. Valdevino, 455 — Joaquim Távora", status: "Atrasada" },
  { id: "4", hora: em(0, 14), cliente: "Clínica Odonto Vida", categoria: "Refrigeração", tipo: "Manutenção preventiva — 3 aparelhos", tecnico: "Carlos Lima", endereco: "Av. Santos Dumont, 3131 — Papicu", status: "Agendada" },
  { id: "5", hora: em(0, 15, 30), cliente: "Antônia Sampaio", categoria: "Elétrica", tipo: "Ponto novo de tomada 220V", tecnico: "Rafael Souza", endereco: "Rua Cel. Alexanzito, 88 — Centro, Hidrolândia", status: "Agendada" },
  { id: "6", hora: em(0, 16, 30), cliente: "Raimundo Nonato Lima", categoria: "Refrigeração", tipo: "Instalação de split 9.000 BTU", tecnico: "Carlos Lima", endereco: "Rua Aniceta Ferreira, 210 — Hidrolândia", status: "Agendada" },
];

export const orcamentosPendentes = [
  { id: "ORC-0142", cliente: "Mercadinho São José", servico: "Instalação de 2 splits 18.000 BTU", valor: 4280, enviado: em(-6, 10) },
  { id: "ORC-0145", cliente: "Luciana Bezerra", servico: "Sanca de gesso com iluminação — sala", valor: 2150, enviado: em(-3, 15) },
  { id: "ORC-0147", cliente: "Escritório Nunes Advocacia", servico: "Revisão elétrica completa", valor: 1890, enviado: em(-2, 9) },
  { id: "ORC-0148", cliente: "Pedro Henrique Alencar", servico: "Conserto de split — vazamento de gás", valor: 480, enviado: em(-1, 17) },
];

export const servicosPorCategoria: { categoria: Categoria; total: number }[] = [
  { categoria: "Refrigeração", total: 16 },
  { categoria: "Elétrica", total: 7 },
  { categoria: "Gesso", total: 4 },
];
