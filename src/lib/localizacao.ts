export type EnderecoGps = { rua: string; numero: string; bairro: string; cidade: string; uf: string; cep: string };

const UFS: Record<string, string> = {
  Acre: "AC", Alagoas: "AL", Amapá: "AP", Amazonas: "AM", Bahia: "BA", Ceará: "CE", "Distrito Federal": "DF",
  "Espírito Santo": "ES", Goiás: "GO", Maranhão: "MA", "Mato Grosso": "MT", "Mato Grosso do Sul": "MS",
  "Minas Gerais": "MG", Pará: "PA", Paraíba: "PB", Paraná: "PR", Pernambuco: "PE", Piauí: "PI",
  "Rio de Janeiro": "RJ", "Rio Grande do Norte": "RN", "Rio Grande do Sul": "RS", Rondônia: "RO",
  Roraima: "RR", "Santa Catarina": "SC", "São Paulo": "SP", Sergipe: "SE", Tocantins: "TO",
};

/** Pega a posição atual do aparelho e converte em endereço. Só roda no navegador, após um toque. */
export async function enderecoAtual(): Promise<EnderecoGps> {
  if (!("geolocation" in navigator)) throw new Error("Este aparelho não permite pegar a localização.");
  const pos = await new Promise<GeolocationPosition>((ok, fail) =>
    navigator.geolocation.getCurrentPosition(ok, (e) =>
      fail(new Error(e.code === 1 ? "Permita o acesso à localização para preencher automaticamente." : "Não foi possível pegar a localização. Tente de novo ou digite.")),
      { enableHighAccuracy: true, timeout: 15000 }));
  const { latitude, longitude } = pos.coords;
  const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=pt-BR&lat=${latitude}&lon=${longitude}`);
  if (!r.ok) throw new Error("Não foi possível descobrir o endereço. Digite manualmente.");
  const j = (await r.json()) as { address?: Partial<Record<"road" | "pedestrian" | "house_number" | "suburb" | "neighbourhood" | "quarter" | "city" | "town" | "village" | "municipality" | "state" | "postcode" | "ISO3166-2-lvl4", string>> };
  const a = j.address ?? {};
  const cepNum = (a.postcode ?? "").replace(/\D/g, "").slice(0, 8);
  return {
    rua: a.road ?? a.pedestrian ?? "",
    numero: a.house_number ?? "",
    bairro: a.suburb ?? a.neighbourhood ?? a.quarter ?? "",
    cidade: a.city ?? a.town ?? a.village ?? a.municipality ?? "",
    uf: UFS[a.state ?? ""] ?? (a["ISO3166-2-lvl4"] ?? "").replace("BR-", ""),
    cep: cepNum.length === 8 ? `${cepNum.slice(0, 5)}-${cepNum.slice(5)}` : "",
  };
}
