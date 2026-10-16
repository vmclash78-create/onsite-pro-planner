import { createFileRoute, Link } from "@tanstack/react-router";
import logoH from "@/assets/logo-simbolo.png.asset.json";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { criarPedido, prepararFotos } from "@/lib/pedidos.functions";
import { company } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { Vitrine } from "@/components/Vitrine";
import { House, Layers, Snowflake, Zap } from "lucide-react";
import "@/styles/agendar.css";

export const Route = createFileRoute("/agendar")({
  head: () => ({
    meta: [
      { title: "Agendamento · VM Climatização & Acabamentos" },
      { name: "description", content: "Agende refrigeração, gesso ou elétrica em Hidrolândia e região e em Fortaleza/CE." },
      { property: "og:title", content: "Agendamento · VM Climatização & Acabamentos" },
      { property: "og:description", content: "Agende refrigeração, gesso ou elétrica em poucos passos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Agendar,
});

const AREAS: Record<string, [string, string[]]> = {
  Refrigeração: ["Ar-condicionado: instalação, limpeza, manutenção", ["Instalação", "Limpeza", "Manutenção", "Conserto"]],
  Gesso: ["Forro, parede, sanca e reparos", ["Forro", "Parede", "Sanca", "Reparo"]],
  Elétrica: ["Pontos, quadros e reparos", ["Ponto novo", "Quadro", "Instalação", "Reparo"]],
};
const HORAS: Record<string, string[]> = { Manhã: ["08:00", "09:00", "10:00"], Tarde: ["14:00", "15:00", "16:00"] };

const LONGOS: Record<string, string[]> = { Refrigeração: ["Instalação"], Elétrica: ["Quadro"] };
const modo = (a: string, t: string) => (a === "Gesso" ? "medicao" : LONGOS[a]?.includes(t) ? "turno" : "pontual");
const TURNOS = [
  { p: "Manhã", h: "08:00", faixa: "08h às 12h" },
  { p: "Tarde", h: "14:00", faixa: "14h às 18h" },
] as const;

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("pt-BR", o);
const maskWhats = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.length <= 2 ? d : d.length <= 7 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};
const maskCep = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

function Agendar() {
  const [dias] = useState(() => [...Array(14)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() + i + 1); return d; }));
  const [step, setStep] = useState(1);
  const [area, setArea] = useState("Refrigeração");
  const [tipo, setTipo] = useState("");
  const [data, setData] = useState<string | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [visita, setVisita] = useState(false);
  const [nome, setNome] = useState("");
  const [whats, setWhats] = useState("");
  const [cep, setCep] = useState("");
  const [desc, setDesc] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [protocolo, setProtocolo] = useState("");
  const criar = useServerFn(criarPedido);
  const preparar = useServerFn(prepararFotos);
  const [lgpd, setLgpd] = useState(false);
  const [aba, setAba] = useState<"agendar" | "vitrine">("agendar");
  const [ok, setOk] = useState(false);

  const ocup = useQuery({
    queryKey: ["ocupados", iso(dias[0]!)],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("horarios_ocupados", { _inicio: iso(dias[0]!), _fim: iso(dias[dias.length - 1]!) });
      if (error) throw error;
      return data.map((o) => `${o.data} ${o.hora}`);
    },
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });
  const OCUPADOS = ocup.data ?? [];
  const diaSel = dias.find((d) => iso(d) === data);
  const md = modo(area, tipo);
  const turnoSel = TURNOS.find((t) => t.h === hora);
  const quando = md === "turno" && turnoSel ? `turno da ${turnoSel.p.toLowerCase()} (${turnoSel.faixa})` : `às ${hora ?? ""}`;
  const resumo = visita ? "Visita técnica para orçamento" : diaSel ? `${md === "medicao" ? "Vistoria e medição: " : ""}${fmt(diaSel, { weekday: "long", day: "numeric", month: "long" })} ${quando}` : "";
  const pode = step === 1 ? !!tipo : step === 2 ? visita || (!!data && !!hora) : nome.trim().length > 2 && whats.length >= 14 && cep.length === 9 && lgpd;

  const go = (n: number) => { setStep(n); window.scrollTo(0, 0); };
  const TIPOS_OK = ["image/jpeg", "image/png", "image/webp", "image/heic"] as const;
  const enviar = async () => {
    setEnviando(true); setErroEnvio(null);
    try {
      const validas = fotos.filter((f) => (TIPOS_OK as readonly string[]).includes(f.type));
      const slots = validas.length ? await preparar({ data: { tipos: validas.map((f) => f.type as (typeof TIPOS_OK)[number]) } }) : [];
      const paths: string[] = [];
      for (let i = 0; i < slots.length; i++) {
        const { error } = await supabase.storage.from("pedidos").uploadToSignedUrl(slots[i]!.path, slots[i]!.token, validas[i]!, { contentType: validas[i]!.type });
        if (!error) paths.push(slots[i]!.path);
      }
      const r = await criar({ data: { categoria: area as "Refrigeração" | "Gesso" | "Elétrica", tipo, visita, data, hora, nome, whatsapp: whats, cep, descricao: desc, fotos: paths, lgpd: true } });
      setProtocolo(r.protocolo); setOk(true); window.scrollTo(0, 0);
    } catch (e) {
      if (e instanceof Error && e.message.includes("HORARIO_OCUPADO")) {
        void ocup.refetch(); setHora(null); go(2);
        setErroEnvio("Esse horário acabou de ser ocupado. Escolha outro.");
        return;
      }
      setErroEnvio("Não foi possível enviar agora. Tente de novo ou fale pelo WhatsApp.");
    } finally { setEnviando(false); }
  };
  const next = () => { if (!pode || enviando) return; if (step < 3) go(step + 1); else void enviar(); };

  const head = (t: string) => (
    <>
      <div className="step">Passo {step} de 3</div>
      <div className="bars">{[1, 2, 3].map((n) => <i key={n} className={n <= step ? "on" : ""} />)}</div>
      <h1>{t}</h1>
    </>
  );

  if (ok) {
    const msg = [
      `Olá, VM Climatização! Registrei uma solicitação de atendimento pelo site.`,
      ``,
      `*Protocolo:* ${protocolo}`,
      `*Serviço:* ${tipo} de ${area.toLowerCase()}`,
      `*Quando:* ${resumo}`,
      `*Nome:* ${nome}`,
      `*CEP:* ${cep}`,
      desc.trim() ? `*Problema:* ${desc.trim()}` : "",
      ``,
      `Aguardo a confirmação. Obrigado!`,
    ].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n");
    return (
      <div className="vm-ag"><div className="w">
        <Brand />
        <main className="mn">
          <h1 style={{ marginTop: 56 }}>Solicitação registrada com sucesso</h1>
          <p className="sub">Protocolo de atendimento: {protocolo}. Sua solicitação foi registrada e nossa equipe entrará em contato pelo WhatsApp para confirmar o atendimento.</p>
          <div className="card"><div><b>{tipo} · {area}</b><span>{resumo}</span></div></div>
        </main>
        <footer className="ft">
          <a className="b go" href={`${company.whatsappUrl}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer">Confirmar solicitação via WhatsApp</a>
        </footer>
      </div></div>
    );
  }

  const ICONES: Record<string, typeof Snowflake> = { Refrigeração: Snowflake, Gesso: Layers, Elétrica: Zap };
  return (
    <div className="vm-ag"><div className="w">
      <Brand />
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={aba === "agendar"} className={aba === "agendar" ? "on" : ""} onClick={() => setAba("agendar")}>Agendamento</button>
        <button role="tab" aria-selected={aba === "vitrine"} className={aba === "vitrine" ? "on" : ""} onClick={() => setAba("vitrine")}>Serviços e portfólio</button>
      </div>
      {aba === "vitrine" ? (
        <main className="mn pb-10 pt-6"><Vitrine onAgendar={() => { setAba("agendar"); go(1); }} /></main>
      ) : (<>
      <main className="mn">
        {step === 1 && (
          <>
            {head("Selecione a especialidade")}
            <p className="sub">Indique a área de atuação e a modalidade de atendimento.</p>
            <div className="areas">
              {Object.keys(AREAS).map((a) => {
                const Ic = ICONES[a]!;
                return (
                  <button key={a} className={`area ${area === a ? "on" : ""}`} aria-pressed={area === a} onClick={() => { setArea(a); setTipo(""); setHora(null); }}>
                    <Ic size={22} strokeWidth={1.75} aria-hidden />
                    <b>{a}</b>
                  </button>
                );
              })}
            </div>
            <p className="sub mt-3">{AREAS[area]![0]}</p>
            <div className="lb">Modalidade de atendimento</div>
            <div className="chips">
              {AREAS[area]![1].map((t) => (
                <Button variant="ghost" key={t} className={`chip ${tipo === t ? "on" : ""}`} aria-pressed={tipo === t} onClick={() => { setTipo(t); setHora(null); }}>{t}</Button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {head(md === "medicao" ? "Vistoria e medição técnica" : md === "turno" ? "Data e turno de atendimento" : "Data e horário de preferência")}
            {md === "medicao" && <p className="sub aviso">Serviços de gesso iniciam com vistoria no local para medição e orçamento. A execução da obra é agendada após a aprovação.</p>}
            {md === "turno" && <p className="sub aviso">Este serviço requer de 2h30 a 4h e ocupa um turno completo.</p>}
            <p className="sub" style={{ textTransform: "capitalize" }}>{fmt(dias[0]!, { month: "long", year: "numeric" })}</p>
            <div className="days">
              {dias.map((d) => {
                const todasHoras = [...HORAS["Manhã"]!, ...HORAS["Tarde"]!];
                const lotado = todasHoras.every((h) => OCUPADOS.includes(`${iso(d)} ${h}`));
                const off = visita || d.getDay() === 0 || lotado, on = data === iso(d) && !visita;
                return (
                  <Button variant="ghost" key={iso(d)} className={`day ${off ? "off" : on ? "on" : ""}`} disabled={off} aria-pressed={on}
                    title={lotado ? "Dia sem horários livres" : undefined}
                    onClick={() => { setData(iso(d)); setHora(null); setVisita(false); }}>
                    <small>{fmt(d, { weekday: "short" }).replace(".", "")}</small><strong>{d.getDate()}</strong>
                    {lotado && <small className="lotado">lotado</small>}
                  </Button>
                );
              })}
            </div>
            {md === "turno" ? (
              <div className="turnos">
                {TURNOS.map((t) => {
                  const ocupado = !!data && HORAS[t.p]!.some((h) => OCUPADOS.includes(`${data} ${h}`));
                  const off = visita || !data || ocupado, on = hora === t.h && !visita;
                  return (
                    <button type="button" key={t.p} className={`turno ${off ? "off" : on ? "on" : ""}`} disabled={off} aria-pressed={on}
                      onClick={() => { setHora(t.h); setVisita(false); }}>
                      <b>{t.p}</b><span>{ocupado ? "Indisponível" : t.faixa}</span>
                    </button>
                  );
                })}
              </div>
            ) : Object.keys(HORAS).map((p) => (
              <div key={p}>
                <div className="lb">{p}</div>
                <div className="horas">
                  {HORAS[p]!.map((h) => {
                    const ocupado = !!data && OCUPADOS.includes(`${data} ${h}`);
                    const off = visita || !data || ocupado, on = hora === h && !visita;
                    return (
                      <Button variant="ghost" key={h} className={`hr ${off ? "off" : on ? "on" : ""}`} disabled={off} aria-pressed={on}
                        onClick={() => { setHora(h); setVisita(false); }}>{ocupado ? <span className="ocp">{h}<small>ocupado</small></span> : h}</Button>
                     );
                  })}
                </div>
              </div>
            ))}
            <div className="ou"><span>ou</span></div>
            <button type="button" className={`visit2 ${visita ? "on" : ""}`} aria-pressed={visita} onClick={() => { if (visita) { setVisita(false); } else { setVisita(true); setData(null); setHora(null); } }}>
              <span className="vi"><House size={20} /></span>
              <span className="vt"><b>Solicitar visita técnica para orçamento</b><small>Sem horário definido. Nossa equipe entrará em contato.</small></span>
              <span className={`rd ${visita ? "on" : ""}`} />
            </button>
          </>
        )}

        {step === 3 && (
          <>
            {head("Dados do solicitante")}
            <div className="card">
              <div><b>{tipo} · {area}</b><span>{resumo}</span></div>
              <Button variant="link" className="lnk" onClick={() => go(1)}>Alterar</Button>
            </div>
            <label className="f" htmlFor="nome">Nome completo</label>
            <input className="t" id="nome" autoComplete="name" placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
            <label className="f" htmlFor="whats">Telefone (WhatsApp)</label>
            <input className="t" id="whats" inputMode="tel" autoComplete="tel" placeholder="(88) 90000-0000" value={whats} onChange={(e) => setWhats(maskWhats(e.target.value))} />
            <label className="f" htmlFor="cep">CEP</label>
            <input className="t" id="cep" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={cep} onChange={(e) => setCep(maskCep(e.target.value))} />
            <label className="f" htmlFor="desc">Descrição da necessidade</label>
            <textarea id="desc" placeholder="Informe detalhes do equipamento ou do serviço desejado" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <label className="ph" style={{ position: "relative" }}>
              {fotos.length ? `${fotos.length} de 3 fotos` : "Anexar fotos do local ou equipamento (até 3)"}
              <input type="file" accept="image/*" multiple onChange={(e) => { setFotos([...fotos, ...(e.target.files ?? [])].slice(0, 3)); e.target.value = ""; }} />
            </label>
            <ul className="fl">
              {fotos.map((n, i) => (
                <li key={i}><span>{n.name}</span><Button variant="link" className="lnk" onClick={() => setFotos(fotos.filter((_, j) => j !== i))}>Remover</Button></li>
              ))}
            </ul>
            <div className="lg">
              <input type="checkbox" id="lgpd" checked={lgpd} onChange={(e) => setLgpd(e.target.checked)} />
              <label htmlFor="lgpd">Autorizo o tratamento dos meus dados para contato e atendimento técnico, conforme a <Link to="/privacidade">política de privacidade</Link>.</label>
            </div>
          </>
        )}
      </main>

      <footer className="ft">
        <div className="bt">
          {step > 1 && <Button variant="ghost" className="b bk" onClick={() => go(step - 1)}>Voltar</Button>}
          <Button className="b go" disabled={!pode || enviando} onClick={next}>{step < 3 ? "Continuar" : enviando ? "Enviando..." : "Concluir solicitação"}</Button>
        </div>
        {erroEnvio && <p className="alt envio-erro" role="alert">{erroEnvio}</p>}
        {step === 1 && <p className="alt">Atendimento direto: <a href={company.whatsappUrl}>WhatsApp {company.phoneDisplay}</a></p>}
      </footer>
      </>)}
    </div></div>
  );
}

function Brand() {
  return (
    <header className="brand">
      <img src={logoH.url} alt="" style={{ objectFit: "contain" }} />
      <div style={{ minWidth: 0 }}><b>{company.name}</b><span>Climatização · Gesso · Elétrica</span><span>{company.city}/{company.state} e região</span></div>
    </header>
  );
}
