import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LinkCliente } from "@/components/LinkCliente";
import { NotificacoesAparelho } from "@/components/NotificacoesAparelho";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Field, Panel, StateRow, inputCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useConfigEmpresa, useModelos } from "@/lib/cobranca";
import { pageHead } from "@/lib/seo";
import { useMe } from "@/lib/staff";
import { enderecoAtual } from "@/lib/localizacao";
import { LocateFixed, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: pageHead("Configurações", "Dados da empresa, chave Pix e modelos de mensagem do WhatsApp."),
  component: Configuracoes,
});

function Configuracoes() {
  const me = useMe();
  const admin = !!me.data?.isAdmin;
  return (
    <AppShell title="Configurações">
      {!admin && me.data && <p className="mb-4 text-sm text-muted-foreground">Somente administradores podem alterar estas configurações.</p>}
      <LinkCliente />
      <div className="mt-5"><NotificacoesAparelho /></div>
      <div className="mt-5"><DadosEmpresa admin={admin} /></div>
      <div className="mt-5"><PixConfig admin={admin} /></div>
      <div className="mt-5"><Modelos admin={admin} /></div>
    </AppShell>
  );
}


const maskCnpj = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
};
const maskTel = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
};

type FormEmpresa = { nome_fantasia: string; razao_social: string; cnpj: string; telefone: string; instagram: string; endereco: string; cidade: string; uf: string };
const vazioEmpresa: FormEmpresa = { nome_fantasia: "", razao_social: "", cnpj: "", telefone: "", instagram: "", endereco: "", cidade: "", uf: "" };

function DadosEmpresa({ admin }: { admin: boolean }) {
  const qc = useQueryClient();
  const cfg = useConfigEmpresa();
  const [f, setF] = useState<FormEmpresa>(vazioEmpresa);
  const [gps, setGps] = useState(false);
  useEffect(() => {
    const c = cfg.data;
    if (c) setF({ nome_fantasia: c.nome_fantasia ?? "", razao_social: c.razao_social ?? "", cnpj: c.cnpj ?? "", telefone: c.telefone ?? "", instagram: c.instagram ?? "", endereco: c.endereco ?? "", cidade: c.cidade ?? "", uf: c.uf ?? "" });
  }, [cfg.data]);
  const set = (k: keyof FormEmpresa, v: string) => setF((o) => ({ ...o, [k]: v }));
  const usarGps = async () => {
    setGps(true);
    try {
      const e = await enderecoAtual();
      setF((o) => ({ ...o, endereco: [e.rua, e.numero, e.bairro].filter(Boolean).join(", ") || o.endereco, cidade: e.cidade || o.cidade, uf: e.uf || o.uf }));
      toast.success("Endereço preenchido. Confira o número e salve.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível pegar a localização."); }
    finally { setGps(false); }
  };
  const m = useMutation({
    mutationFn: async () => {
      const cnpj = f.cnpj.replace(/\D/g, "");
      if (cnpj && cnpj.length !== 14) throw new Error("CNPJ incompleto: são 14 números.");
      const t = (s: string) => s.trim() || null;
      const { error } = await supabase.from("configuracoes_empresa").upsert({
        id: 1, nome_fantasia: t(f.nome_fantasia), razao_social: t(f.razao_social), cnpj: t(f.cnpj), telefone: t(f.telefone),
        instagram: t(f.instagram), endereco: t(f.endereco), cidade: t(f.cidade), uf: t(f.uf.toUpperCase()), atualizado_em: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["config-empresa"] }); toast.success("Dados da empresa salvos."); },
  });
  const inp = (k: keyof FormEmpresa, extra: React.InputHTMLAttributes<HTMLInputElement> = {}, mask?: (v: string) => string) => (
    <input className={inputCls} disabled={!admin} value={f[k]} onChange={(e) => set(k, mask ? mask(e.target.value) : e.target.value)} {...extra} />
  );
  return (
    <Panel title="Dados da empresa (saem na OS e no orçamento)">
      {cfg.isLoading || cfg.error ? <StateRow loading={cfg.isLoading} error={cfg.error} /> : (
        <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="grid gap-3 p-4 sm:grid-cols-2">
          <Field label="Nome da empresa">{inp("nome_fantasia", { placeholder: "VM Climatização & Acabamentos", maxLength: 80 })}</Field>
          <Field label="Razão social">{inp("razao_social", { placeholder: "Opcional", maxLength: 120 })}</Field>
          <Field label="CNPJ">{inp("cnpj", { inputMode: "numeric", placeholder: "00.000.000/0000-00" }, maskCnpj)}</Field>
          <Field label="WhatsApp / telefone">{inp("telefone", { inputMode: "tel", placeholder: "(88) 99640-1373" }, maskTel)}</Field>
          <Field label="Instagram">{inp("instagram", { placeholder: "@vmrefrigeracao0", maxLength: 40 })}</Field>
          <div className="sm:col-span-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-sm font-medium">Endereço</span>
              {admin && <Button type="button" variant="outline" size="sm" disabled={gps} onClick={usarGps}><LocateFixed className="mr-1 h-4 w-4" />{gps ? "Localizando..." : "Usar minha localização"}</Button>}
            </div>
            {inp("endereco", { placeholder: "Rua, número, bairro", maxLength: 160, "aria-label": "Endereço" })}
          </div>
          <Field label="Cidade">{inp("cidade", { placeholder: "Hidrolândia", maxLength: 60 })}</Field>
          <Field label="Estado (UF)">{inp("uf", { placeholder: "CE", maxLength: 2 })}</Field>
          {admin && (
            <div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-2">
              {m.error && <p role="alert" className="w-full text-xs text-destructive">{m.error.message}</p>}
              <p className="mr-auto text-xs text-muted-foreground">Campos em branco usam os dados padrão da VM.</p>
              <Button className="w-full sm:w-auto" disabled={m.isPending}>Salvar dados</Button>
            </div>
          )}
        </form>
      )}
    </Panel>
  );
}

function PixConfig({ admin }: { admin: boolean }) {
  const qc = useQueryClient();
  const cfg = useConfigEmpresa();
  const [f, setF] = useState({ pix_chave: "", pix_nome: "", pix_cidade: "" });
  useEffect(() => { if (cfg.data) setF({ pix_chave: cfg.data.pix_chave ?? "", pix_nome: cfg.data.pix_nome ?? "", pix_cidade: cfg.data.pix_cidade ?? "" }); }, [cfg.data]);
  const m = useMutation({
    mutationFn: async () => {
      if (!f.pix_chave.trim() || !f.pix_nome.trim() || !f.pix_cidade.trim()) throw new Error("Preencha chave, nome e cidade.");
      const { error } = await supabase.from("configuracoes_empresa").upsert({ id: 1, pix_chave: f.pix_chave.trim(), pix_nome: f.pix_nome.trim(), pix_cidade: f.pix_cidade.trim(), atualizado_em: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["config-empresa"] }); toast.success("Pix salvo."); },
  });
  return (
    <Panel title="Pix da empresa">
      {cfg.isLoading || cfg.error ? <StateRow loading={cfg.isLoading} error={cfg.error} /> : (
        <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="grid gap-3 p-4 sm:grid-cols-3">
          <Field label="Chave Pix"><input className={inputCls} disabled={!admin} value={f.pix_chave} onChange={(e) => setF({ ...f, pix_chave: e.target.value })} placeholder="CPF, CNPJ, e-mail, telefone ou aleatória" /></Field>
          <Field label="Nome do recebedor"><input className={inputCls} disabled={!admin} value={f.pix_nome} onChange={(e) => setF({ ...f, pix_nome: e.target.value })} maxLength={25} /></Field>
          <Field label="Cidade"><input className={inputCls} disabled={!admin} value={f.pix_cidade} onChange={(e) => setF({ ...f, pix_cidade: e.target.value })} maxLength={15} /></Field>
          {admin && (
            <div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-3">
              {m.error && <p role="alert" className="w-full text-xs text-destructive">{m.error.message}</p>}
              <p className="mr-auto text-xs text-muted-foreground">Telefone como chave: use +55 e DDD (ex.: +5588996401373).</p>
              <Button disabled={m.isPending}>Salvar</Button>
            </div>
          )}
        </form>
      )}
    </Panel>
  );
}

function Modelos({ admin }: { admin: boolean }) {
  const q = useModelos();
  return (
    <Panel title="Modelos de mensagem (WhatsApp)">
      <p className="border-b px-4 py-2 text-xs text-muted-foreground">Variáveis: {"{nome} {servico} {data} {hora} {tecnico} {valor} {modelo_aparelho}"}</p>
      {admin && <NovoModelo />}
      <StateRow loading={q.isLoading} error={q.error} empty={q.data?.length === 0} emptyText="Nenhum modelo cadastrado." />
      <ul className="divide-y">{q.data?.map((m) => <ModeloItem key={m.id} m={m} admin={admin} />)}</ul>
    </Panel>
  );
}

function ModeloItem({ m, admin }: { m: { id: string; titulo: string; texto: string }; admin: boolean }) {
  const qc = useQueryClient();
  const [texto, setTexto] = useState(m.texto);
  const salvar = useMutation({
    mutationFn: async () => {
      if (!texto.trim()) throw new Error("O texto não pode ficar vazio.");
      const { error } = await supabase.from("modelos_mensagem").update({ texto: texto.trim(), atualizado_em: new Date().toISOString() }).eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["modelos"] }); toast.success("Modelo salvo."); },
  });
  const excluir = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("modelos_mensagem").delete().eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["modelos"] }); toast.success("Modelo excluído."); },
  });
  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">{m.titulo}</div>
        {admin && <Button size="icon" variant="ghost" aria-label={`Excluir ${m.titulo}`} disabled={excluir.isPending} onClick={() => { if (confirm(`Excluir o modelo "${m.titulo}"?`)) excluir.mutate(); }}><Trash2 className="h-4 w-4" /></Button>}
      </div>
      <textarea className="min-h-24 w-full rounded-[6px] border border-input bg-background p-2 text-base sm:text-sm" disabled={!admin} value={texto} onChange={(e) => setTexto(e.target.value)} aria-label={m.titulo} />
      {salvar.error && <p role="alert" className="text-xs text-destructive">{salvar.error.message}</p>}
      {admin && texto !== m.texto && <div className="flex justify-end"><Button size="sm" disabled={salvar.isPending} onClick={() => salvar.mutate()}>Salvar modelo</Button></div>}
    </li>
  );
}

function NovoModelo() {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const criar = useMutation({
    mutationFn: async () => {
      if (titulo.trim().length < 2) throw new Error("Dê um nome ao modelo.");
      if (!texto.trim()) throw new Error("Escreva o texto da mensagem.");
      const chave = `personalizado_${Date.now().toString(36)}`;
      const { error } = await supabase.from("modelos_mensagem").insert({ chave, titulo: titulo.trim().slice(0, 80), texto: texto.trim() });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["modelos"] }); toast.success("Modelo criado."); setTitulo(""); setTexto(""); setAberto(false); },
  });
  if (!aberto) return <div className="border-b px-4 py-3"><Button className="w-full sm:w-auto" onClick={() => setAberto(true)}><Plus className="mr-1 h-4 w-4" />Novo modelo</Button></div>;
  const vars = ["{nome}", "{servico}", "{data}", "{hora}", "{tecnico}", "{valor}", "{atendente}"];
  return (
    <form className="space-y-2 border-b bg-muted/40 px-4 py-3" onSubmit={(e) => { e.preventDefault(); criar.mutate(); }}>
      <Field label="Nome do modelo"><input className={inputCls} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Aviso de garantia" maxLength={80} /></Field>
      <textarea className="min-h-28 w-full rounded-[6px] border border-input bg-background p-2 text-base sm:text-sm" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Olá {nome}, ..." aria-label="Texto do modelo" />
      <div className="flex flex-wrap gap-1.5">{vars.map((v) => <Button key={v} type="button" variant="outline" size="sm" onClick={() => setTexto((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}${v}`)}>{v}</Button>)}</div>
      {criar.error && <p role="alert" className="text-xs text-destructive">{criar.error.message}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setAberto(false)}>Cancelar</Button><Button disabled={criar.isPending}>Criar modelo</Button></div>
    </form>
  );
}
