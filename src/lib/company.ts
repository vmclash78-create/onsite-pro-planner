export const company = {
  name: "VM Climatização & Acabamentos",
  instagram: "@vmrefrigeracao0",
  phoneRaw: "88996401373",
  phoneDisplay: "(88) 99640-1373",
  whatsappUrl: "https://wa.me/5588996401373",
  street: "Rua Aniceta Ferreira",
  city: "Hidrolândia",
  state: "CE",
  addressDisplay: "Rua Aniceta Ferreira — Hidrolândia/CE",
  serviceAreas: ["Hidrolândia e região", "Fortaleza e região"],
  serviceAreaSentence: "Hidrolândia e região, além de Fortaleza e região",
};

export type Empresa = {
  name: string;
  razaoSocial: string;
  cnpj: string;
  instagram: string;
  phoneDisplay: string;
  street: string;
  city: string;
  state: string;
  addressDisplay: string;
};

type CfgEmpresa = {
  nome_fantasia?: string | null; razao_social?: string | null; cnpj?: string | null; telefone?: string | null;
  instagram?: string | null; endereco?: string | null; cidade?: string | null; uf?: string | null;
} | null | undefined;

/** Dados oficiais impressos nos documentos: o que foi salvo em Configurações, com o padrão como reserva. */
export function empresaDe(c: CfgEmpresa): Empresa {
  const v = (s: string | null | undefined, d: string) => (s && s.trim()) || d;
  const street = v(c?.endereco, company.street);
  const city = v(c?.cidade, company.city);
  const state = v(c?.uf, company.state).toUpperCase();
  return {
    name: v(c?.nome_fantasia, company.name),
    razaoSocial: v(c?.razao_social, ""),
    cnpj: v(c?.cnpj, ""),
    instagram: v(c?.instagram, company.instagram),
    phoneDisplay: v(c?.telefone, company.phoneDisplay),
    street, city, state,
    addressDisplay: `${street} — ${city}/${state}`,
  };
}
