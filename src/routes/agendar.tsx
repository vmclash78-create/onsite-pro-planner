import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft, Check, ChevronRight, MessageCircle, Zap, ShieldCheck, Award, ClipboardList,
  ImagePlus, X, Loader2, CalendarPlus, Pencil, AlertCircle, CalendarX,
} from "lucide-react";
import { company } from "@/lib/company";
import {
  categorias, proximosDias, horariosDoDia, mascaraWhats, mascaraCep, buscarCep, enviarAgendamento,
  type CategoriaId, type Dia,
} from "@/lib/booking";
import { dataBR } from "@/lib/format";

export const Route = createFileRoute("/agendar")({
  head: () => ({
    meta: [
      { title: "Agende seu serviço — VM Climatização & Acabamentos" },
      { name: "description", content: "Agende refrigeração, gesso ou elétrica em menos de 2 minutos. Hidrolândia e região e Fortaleza/CE." },
      { property: "og:title", content: "Agende seu serviço — VM Climatização & Acabamentos" },
      { property: "og:description", content: "Agende refrigeração, gesso ou elétrica em menos de 2 minutos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Agendar,
});

const PASSOS = ["Serviço", "Data e horário", "Seus dados", "Confirmação"];
const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const selCard = (on: boolean) =>
  `${focusRing} rounded-xl border text-left transition-colors ${on ? "border-primary bg-primary/10" : "bg-card hover:border-muted-foreground/40 hover:bg-muted/60"}`;

type Dados = { nome: string; whats: string; cep: string; rua: string; numero: string; bairro: string; descricao: string; lgpd: boolean };

function Agendar() {
  const [passo, setPasso] = useState(0);
  const [cat, setCat] = useState<CategoriaId | null>(null);
  const [tipo, setTipo] = useState<string | null>(null);
  const [dia, setDia] = useState<Dia | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [visita, setVisita] = useState(false);
  const [dados, setDados] = useState<Dados>({ nome: "", whats: "", cep: "", rua: "", numero: "", bairro: "", descricao: "", lgpd: false });
  const [fotos, setFotos] = useState<File[]>([]);
  const [erros, setErros] = useState<Partial<Record<keyof Dados, string | undefined>>>({});
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const topo = useRef<HTMLDivElement>(null);

  const categoria = categorias.find((c) => c.id === cat);
  const tipoObj = categoria?.tipos.find((t) => t.id === tipo);
  const endereco = [dados.rua && `${dados.rua}${dados.numero ? `, ${dados.numero}` : ""}`, dados.bairro].filter(Boolean).join(" — ");

  const ir = (p: number) => { setPasso(p); topo.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  const validarDados = () => {
    const e: typeof erros = {};
    if (dados.nome.trim().length < 3) e.nome = "Informe seu nome completo";
    if (dados.whats.replace(/\D/g, "").length < 11) e.whats = "WhatsApp com DDD, ex.: (88) 99999-9999";
    if (!dados.rua.trim()) e.rua = "Informe a rua";
    if (!dados.numero.trim()) e.numero = "Informe o número";
    if (!dados.bairro.trim()) e.bairro = "Informe o bairro";
    if (dados.descricao.trim().length < 10) e.descricao = "Descreva o problema em poucas palavras";
    if (!dados.lgpd) e.lgpd = "É preciso aceitar para continuar";
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const podeAvancar = [!!tipo, visita || (!!dia && !!hora), true, true][passo];
  const avancar = async () => {
    if (passo === 2 && !validarDados()) return;
    if (passo < 3) return ir(passo + 1);
    setEnviando(true); setErroEnvio(null);
    try {
      const r = await enviarAgendamento({
        categoria: categoria!.nome, tipo: tipoObj!.nome, visitaOrcamento: visita,
        data: dia?.iso, hora: hora ?? undefined, nome: dados.nome, whatsapp: dados.whats,
        endereco, descricao: dados.descricao, fotos,
      });
      setProtocolo(r.protocolo);
    } catch {
      setErroEnvio("Não foi possível enviar agora. Verifique sua conexão e tente de novo.");
    } finally { setEnviando(false); }
  };

  const quando = visita ? "Visita para orçamento — a equipe combina o melhor dia" : dia && hora ? `${dataBR(dia.date)}, às ${hora}` : "";

  return (
    <div className="min-h-screen bg-background" style={{ backgroundImage: "var(--gradient-top)", backgroundRepeat: "no-repeat", backgroundSize: "100% 420px" }}>
      <header className="mx-auto flex max-w-[560px] items-center justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">VM</div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold">VM Climatização</div>
            <div className="truncate text-xs text-muted-foreground">& Acabamentos</div>
          </div>
        </div>
        <a href={company.whatsappUrl} target="_blank" rel="noreferrer"
          className={`${focusRing} inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm hover:bg-muted`}>
          <MessageCircle className="h-4 w-4 text-success" strokeWidth={1.75} /> WhatsApp
        </a>
      </header>

      <main className="mx-auto max-w-[560px] px-5 pb-32 sm:pb-12" ref={topo}>
        {protocolo ? (
          <Sucesso protocolo={protocolo} servico={`${categoria?.nome} · ${tipoObj?.nome}`} quando={quando} endereco={endereco} dia={dia} hora={hora} visita={visita} />
        ) : (
          <>
            {passo === 0 && (
              <div className="pb-5 pt-2">
                <h1 className="text-2xl font-semibold tracking-tight">Agende seu serviço em menos de 2 minutos</h1>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[[Zap, "Atendimento rápido"], [ClipboardList, "Orçamento sem compromisso"], [Award, "Equipe qualificada"]].map(([I, t]) => {
                    const Icon = I as typeof Zap;
                    return (
                      <span key={t as string} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground">
                        <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} /> {t as string}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-xl border bg-card sm:shadow-[var(--shadow-soft)]">
              <div className="h-1 overflow-hidden rounded-t-xl bg-muted" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={passo + 1} aria-label="Progresso">
                <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${((passo + 1) / 4) * 100}%` }} />
              </div>
              <div className="flex items-center justify-between px-5 pt-4 text-xs text-muted-foreground">
                {passo > 0 ? (
                  <button onClick={() => ir(passo - 1)} className={`${focusRing} -ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground`}>
                    <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} /> Voltar
                  </button>
                ) : <span />}
                <span className="tabular-nums">Passo {passo + 1} de 4 · {PASSOS[passo]}</span>
              </div>

              <div key={passo} className="animate-step p-5 pt-3">
                {passo === 0 && (
                  <PassoServico cat={cat} tipo={tipo} onCat={(c) => { setCat(c); setTipo(null); }} onTipo={setTipo} />
                )}
                {passo === 1 && (
                  <PassoData dia={dia} hora={hora} visita={visita}
                    onDia={(d) => { setDia(d); setHora(null); setVisita(false); }}
                    onHora={(h) => { setHora(h); setVisita(false); }}
                    onVisita={(v) => { setVisita(v); if (v) setHora(null); }} />
                )}
                {passo === 2 && (
                  <PassoDados dados={dados} setDados={setDados} erros={erros} setErros={setErros} fotos={fotos} setFotos={setFotos} />
                )}
                {passo === 3 && (
                  <div>
                    <h2 className="text-lg font-semibold">Confira seu pedido</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Se algo estiver errado, toque em editar.</p>
                    <dl className="mt-4 divide-y rounded-xl border">
                      <Linha rotulo="Serviço" valor={`${categoria?.nome} · ${tipoObj?.nome}`} onEdit={() => ir(0)} />
                      <Linha rotulo={visita ? "Atendimento" : "Data e horário"} valor={quando} onEdit={() => ir(1)} />
                      <Linha rotulo="Endereço" valor={endereco} onEdit={() => ir(2)} />
                      <Linha rotulo="Contato" valor={`${dados.nome} · ${dados.whats}`} onEdit={() => ir(2)} />
                      {fotos.length > 0 && <Linha rotulo="Fotos" valor={`${fotos.length} anexada${fotos.length > 1 ? "s" : ""}`} onEdit={() => ir(2)} />}
                    </dl>
                    {erroEnvio && (
                      <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 px-3 py-2.5 text-sm text-destructive">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} /> {erroEnvio}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-4 sm:static sm:border-t-0 sm:bg-transparent sm:px-5 sm:pb-5 sm:pt-0">
                <button onClick={avancar} disabled={!podeAvancar || enviando}
                  style={{ backgroundImage: "var(--gradient-cta)" }}
                  className={`${focusRing} mx-auto flex h-12 w-full max-w-[520px] items-center justify-center gap-2 rounded-lg text-sm font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40`}>
                  {enviando ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> :
                    passo === 3 ? "Confirmar agendamento" : <>Continuar <ChevronRight className="h-4 w-4" strokeWidth={2} /></>}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function PassoServico({ cat, tipo, onCat, onTipo }: { cat: CategoriaId | null; tipo: string | null; onCat: (c: CategoriaId) => void; onTipo: (t: string) => void }) {
  const categoria = categorias.find((c) => c.id === cat);
  return (
    <div>
      <h2 className="text-lg font-semibold">Qual serviço você precisa?</h2>
      <div className="mt-4 grid gap-3" role="radiogroup" aria-label="Categoria">
        {categorias.map((c) => {
          const on = c.id === cat;
          return (
            <button key={c.id} role="radio" aria-checked={on} onClick={() => onCat(c.id)}
              className={`${selCard(on)} flex items-center gap-4 p-4`}>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${on ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                <c.icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{c.nome}</span>
                <span className="block truncate text-sm text-muted-foreground">{c.descricao}</span>
              </span>
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${on ? "border-primary bg-primary text-primary-foreground" : ""}`}>
                {on && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
      {categoria && (
        <div key={categoria.id} className="animate-step mt-6">
          <h3 className="text-sm font-medium">Tipo de serviço</h3>
          <div className="mt-2 divide-y overflow-hidden rounded-xl border" role="radiogroup" aria-label="Tipo de serviço">
            {categoria.tipos.map((t) => {
              const on = t.id === tipo;
              return (
                <button key={t.id} role="radio" aria-checked={on} onClick={() => onTipo(t.id)}
                  className={`${focusRing} flex w-full items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:ring-inset focus-visible:ring-offset-0 ${on ? "bg-primary/10" : "hover:bg-muted/60"}`}>
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${on ? "border-primary" : ""}`}>
                    {on && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{t.nome}</span>
                    <span className="block text-xs text-muted-foreground">{t.detalhe}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PassoData({ dia, hora, visita, onDia, onHora, onVisita }: {
  dia: Dia | null; hora: string | null; visita: boolean; onDia: (d: Dia) => void; onHora: (h: string) => void; onVisita: (v: boolean) => void;
}) {
  const [dias] = useState(() => proximosDias(14));
  const [slots, setSlots] = useState<{ manha: string[]; tarde: string[] } | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!dia) return;
    let ativo = true;
    setCarregando(true); setErro(false);
    horariosDoDia(dia).then((s) => ativo && setSlots(s)).catch(() => ativo && setErro(true)).finally(() => ativo && setCarregando(false));
    return () => { ativo = false; };
  }, [dia, tentativa]);

  const vazio = slots && slots.manha.length + slots.tarde.length === 0;

  return (
    <div>
      <h2 className="text-lg font-semibold">Quando fica melhor?</h2>
      <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1" role="radiogroup" aria-label="Dia">
        {dias.map((d) => {
          const on = dia?.iso === d.iso;
          return (
            <button key={d.iso} role="radio" aria-checked={on} disabled={!d.disponivel} onClick={() => onDia(d)}
              aria-label={`${d.semana} ${d.numero} de ${d.mes}${d.disponivel ? "" : ", sem vagas"}`}
              className={`${selCard(on)} flex w-14 shrink-0 flex-col items-center py-2.5 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-card`}>
              <span className="text-[11px] capitalize text-muted-foreground">{d.semana}</span>
              <span className="text-lg font-semibold tabular-nums">{d.numero}</span>
              <span className="text-[11px] text-muted-foreground">{d.mes}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 min-h-[140px]">
        {!dia && <p className="text-sm text-muted-foreground">Escolha um dia para ver os horários.</p>}
        {dia && carregando && (
          <div className="space-y-3" aria-busy="true">
            {[0, 1].map((i) => (
              <div key={i}>
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                <div className="mt-2 grid grid-cols-4 gap-2">{[0, 1, 2, 3].map((j) => <div key={j} className="h-10 animate-pulse rounded-lg bg-muted" />)}</div>
              </div>
            ))}
          </div>
        )}
        {dia && !carregando && erro && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 px-3 py-2.5 text-sm text-destructive">
            Não foi possível carregar os horários.
            <button onClick={() => setTentativa((t) => t + 1)} className={`${focusRing} rounded font-medium underline`}>Tentar de novo</button>
          </div>
        )}
        {dia && !carregando && !erro && vazio && (
          <div className="flex items-center gap-3 rounded-lg border border-dashed px-4 py-4 text-sm text-muted-foreground">
            <CalendarX className="h-5 w-5 shrink-0" strokeWidth={1.75} /> Nenhum horário disponível neste dia, escolha outro.
          </div>
        )}
        {dia && !carregando && !erro && slots && !vazio && (
          <div className="animate-step space-y-4">
            {(["manha", "tarde"] as const).map((p) => slots[p].length > 0 && (
              <div key={p}>
                <div className="text-xs font-medium text-muted-foreground">{p === "manha" ? "Manhã" : "Tarde"}</div>
                <div className="mt-2 grid grid-cols-4 gap-2" role="radiogroup" aria-label={p === "manha" ? "Manhã" : "Tarde"}>
                  {slots[p].map((h) => {
                    const on = hora === h;
                    return (
                      <button key={h} role="radio" aria-checked={on} onClick={() => onHora(h)}
                        className={`${focusRing} h-10 rounded-lg border text-sm font-medium tabular-nums transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-muted-foreground/40 hover:bg-muted/60"}`}>
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" /></div>
      <button role="checkbox" aria-checked={visita} onClick={() => onVisita(!visita)} className={`${selCard(visita)} flex w-full items-center gap-3 p-4`}>
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border ${visita ? "border-primary bg-primary text-primary-foreground" : ""}`}>
          {visita && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
        <span>
          <span className="block text-sm font-medium">Prefiro receber uma visita para orçamento</span>
          <span className="block text-xs text-muted-foreground">A equipe combina o dia com você pelo WhatsApp</span>
        </span>
      </button>
    </div>
  );
}

function Campo({ label, value, onChange, erro, type = "text", inputMode, autoComplete, onBlur, sufixo, multiline }: {
  label: string; value: string; onChange: (v: string) => void; erro?: string | undefined; type?: string;
  inputMode?: "numeric" | "tel" | "text"; autoComplete?: string; onBlur?: () => void; sufixo?: ReactNode; multiline?: boolean;
}) {
  const id = useId();
  const base = `peer w-full rounded-lg border bg-background px-3 pt-5 text-sm outline-none transition-colors placeholder:text-transparent focus:border-primary focus:ring-1 focus:ring-primary ${erro ? "border-destructive" : "border-input"}`;
  return (
    <div>
      <div className="relative">
        {multiline ? (
          <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={label} rows={3}
            aria-invalid={!!erro} aria-describedby={erro ? `${id}-e` : undefined} className={`${base} min-h-[96px] resize-none pb-2`} />
        ) : (
          <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} placeholder={label}
            inputMode={inputMode} autoComplete={autoComplete} aria-invalid={!!erro} aria-describedby={erro ? `${id}-e` : undefined}
            className={`${base} h-12 pb-1.5 ${sufixo ? "pr-10" : ""}`} />
        )}
        <label htmlFor={id}
          className="pointer-events-none absolute left-3 top-1.5 text-[11px] text-muted-foreground transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-primary">
          {label}
        </label>
        {sufixo && <span className="absolute right-3 top-3.5">{sufixo}</span>}
      </div>
      {erro && <p id={`${id}-e`} className="mt-1 text-xs text-destructive">{erro}</p>}
    </div>
  );
}

function PassoDados({ dados, setDados, erros, setErros, fotos, setFotos }: {
  dados: Dados; setDados: (f: (d: Dados) => Dados) => void; erros: Partial<Record<keyof Dados, string | undefined>>;
  setErros: (f: (e: Partial<Record<keyof Dados, string | undefined>>) => Partial<Record<keyof Dados, string | undefined>>) => void;
  fotos: File[]; setFotos: (f: File[]) => void;
}) {
  const [cepEstado, setCepEstado] = useState<"idle" | "carregando" | "ok" | "nao" | "erro">("idle");
  const [cidade, setCidade] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = fotos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [fotos]);

  const set = (k: keyof Dados) => (v: string | boolean) => {
    setDados((d) => ({ ...d, [k]: v }));
    if (erros[k]) setErros((e) => ({ ...e, [k]: undefined }));
  };

  const consultarCep = async (cep: string) => {
    if (cep.replace(/\D/g, "").length !== 8) return;
    setCepEstado("carregando");
    try {
      const r = await buscarCep(cep);
      if (!r) return setCepEstado("nao");
      setDados((d) => ({ ...d, rua: r.rua || d.rua, bairro: r.bairro || d.bairro }));
      setErros((e) => ({ ...e, rua: undefined, bairro: undefined }));
      setCidade(r.cidade); setCepEstado("ok");
    } catch { setCepEstado("erro"); }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold">Seus dados</h2>
      <p className="mt-1 text-sm text-muted-foreground">Usamos apenas para confirmar e realizar o serviço.</p>
      <div className="mt-4 space-y-3">
        <Campo label="Nome completo" value={dados.nome} onChange={set("nome")} erro={erros.nome} autoComplete="name" />
        <Campo label="WhatsApp" value={dados.whats} onChange={(v) => set("whats")(mascaraWhats(v))} erro={erros.whats} type="tel" inputMode="tel" autoComplete="tel" />
        <div>
          <Campo label="CEP (opcional)" value={dados.cep} inputMode="numeric" autoComplete="postal-code"
            onChange={(v) => { const m = mascaraCep(v); set("cep")(m); if (m.length === 9) consultarCep(m); }}
            sufixo={cepEstado === "carregando" ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : cepEstado === "ok" ? <Check className="h-4 w-4 text-success" /> : null} />
          {cepEstado === "ok" && <p className="mt-1 text-xs text-muted-foreground">{cidade}</p>}
          {cepEstado === "nao" && <p className="mt-1 text-xs text-warning">CEP não encontrado. Preencha o endereço abaixo.</p>}
          {cepEstado === "erro" && <p className="mt-1 text-xs text-warning">Não foi possível buscar o CEP. Preencha manualmente.</p>}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
          <Campo label="Rua" value={dados.rua} onChange={set("rua")} erro={erros.rua} autoComplete="address-line1" />
          <Campo label="Número" value={dados.numero} onChange={set("numero")} erro={erros.numero} inputMode="numeric" />
        </div>
        <Campo label="Bairro" value={dados.bairro} onChange={set("bairro")} erro={erros.bairro} />
        <Campo label="Descreva o problema" value={dados.descricao} onChange={set("descricao")} erro={erros.descricao} multiline />

        <div>
          <div className="text-sm font-medium">Fotos <span className="font-normal text-muted-foreground">(opcional, até 3)</span></div>
          <div className="mt-2 flex gap-2">
            {previews.map((src, i) => (
              <div key={src} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                <img src={src} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                <button type="button" aria-label={`Remover foto ${i + 1}`} onClick={() => setFotos(fotos.filter((_, j) => j !== i))}
                  className={`${focusRing} absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground`}>
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            ))}
            {fotos.length < 3 && (
              <button type="button" onClick={() => fileRef.current?.click()}
                className={`${focusRing} flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground hover:border-primary hover:text-foreground`}>
                <ImagePlus className="h-5 w-5" strokeWidth={1.75} /> Adicionar
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden
            onChange={(e) => { const novos = Array.from(e.target.files ?? []); setFotos([...fotos, ...novos].slice(0, 3)); e.target.value = ""; }} />
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" checked={dados.lgpd} onChange={(e) => set("lgpd")(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary" aria-invalid={!!erros.lgpd} />
            <span className="text-muted-foreground">
              Autorizo o uso dos meus dados para este atendimento, conforme a{" "}
              <Link to="/privacidade" target="_blank" className="text-primary underline-offset-2 hover:underline">política de privacidade</Link>.
            </span>
          </label>
          {erros.lgpd && <p className="ml-7 mt-1 text-xs text-destructive">{erros.lgpd}</p>}
        </div>
      </div>
    </div>
  );
}

function Linha({ rotulo, valor, onEdit }: { rotulo: string; valor: string; onEdit: () => void }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-muted-foreground">{rotulo}</dt>
        <dd className="mt-0.5 text-sm">{valor}</dd>
      </div>
      <button onClick={onEdit} aria-label={`Editar ${rotulo.toLowerCase()}`}
        className={`${focusRing} inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-xs text-primary hover:bg-primary/10`}>
        <Pencil className="h-3 w-3" strokeWidth={1.75} /> Editar
      </button>
    </div>
  );
}

function Sucesso({ protocolo, servico, quando, endereco, dia, hora, visita }: {
  protocolo: string; servico: string; quando: string; endereco: string; dia: Dia | null; hora: string | null; visita: boolean;
}) {
  const baixarIcs = () => {
    if (!dia || !hora) return;
    const [h = 0, m = 0] = hora.split(":").map(Number);
    const ini = new Date(dia.date); ini.setHours(h, m);
    const fim = new Date(ini.getTime() + 2 * 3600e3);
    const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VM Climatizacao//PT-BR", "BEGIN:VEVENT", `UID:${protocolo}@vm`,
      `DTSTAMP:${f(new Date())}`, `DTSTART:${f(ini)}`, `DTEND:${f(fim)}`, `SUMMARY:${servico} — ${company.name}`,
      `LOCATION:${endereco}`, `DESCRIPTION:Pedido ${protocolo}. Aguardando confirmação pelo WhatsApp.`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a"); a.href = url; a.download = `agendamento-${protocolo}.ics`; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="animate-step rounded-xl border bg-card p-6 text-center sm:shadow-[var(--shadow-soft)]" role="status">
      <div className="animate-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-primary" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path className="check-path" d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </div>
      <h1 className="mt-4 text-xl font-semibold">Pedido enviado</h1>
      <p className="mt-1 text-sm text-muted-foreground">Nossa equipe vai confirmar o horário pelo WhatsApp em breve.</p>
      <dl className="mt-5 divide-y rounded-xl border text-left">
        {[["Protocolo", protocolo], ["Serviço", servico], [visita ? "Atendimento" : "Data e horário", quando], ["Endereço", endereco]].map(([k, v]) => (
          <div key={k} className="px-4 py-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-0.5 text-sm tabular-nums">{v}</dd></div>
        ))}
      </dl>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {!visita && (
          <button onClick={baixarIcs} className={`${focusRing} inline-flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-medium hover:bg-muted`}>
            <CalendarPlus className="h-4 w-4" strokeWidth={1.75} /> Adicionar ao calendário
          </button>
        )}
        <a href={company.whatsappUrl} target="_blank" rel="noreferrer"
          className={`${focusRing} inline-flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-medium hover:bg-muted ${visita ? "sm:col-span-2" : ""}`}>
          <ShieldCheck className="h-4 w-4" strokeWidth={1.75} /> Falar no WhatsApp
        </a>
      </div>
    </div>
  );
}
