import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, MessageCircle, Store, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Field, Panel, StateRow, inputCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useConfigEmpresa, useModelos } from "@/lib/cobranca";
import { pageHead } from "@/lib/seo";
import { useMe } from "@/lib/staff";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: pageHead("Configurações", "Chave Pix da empresa e modelos de mensagem do WhatsApp."),
  component: Configuracoes,
});

function Configuracoes() {
  const me = useMe();
  const admin = !!me.data?.isAdmin;
  return (
    <AppShell title="Configurações">
      {!admin && me.data && <p className="mb-4 text-sm text-muted-foreground">Somente administradores podem alterar estas configurações.</p>}
      <LinksCompartilhar />
      <div className="mt-5"><PixConfig admin={admin} /></div>
      <div className="mt-5"><Modelos admin={admin} /></div>
    </AppShell>
  );
}

function LinkCard({ titulo, descricao, caminho, icon: Icon, mensagem }: { titulo: string; descricao: string; caminho: string; icon: typeof Store; mensagem: string }) {
  const url = `${window.location.origin}${caminho}`;
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione e copie manualmente.");
    }
  };
  const whats = `https://wa.me/?text=${encodeURIComponent(`${mensagem} ${url}`)}`;
  return (
    <div className="p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} />
        <div className="min-w-0">
          <div className="text-sm font-medium">{titulo}</div>
          <div className="text-xs text-muted-foreground">{descricao}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-[6px] border bg-muted/50 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-xs tabular-nums text-muted-foreground">{url}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={copiar}><Copy className="h-3.5 w-3.5" /> Copiar link</Button>
        <Button size="sm" variant="outline" asChild>
          <a href={whats} target="_blank" rel="noreferrer"><MessageCircle className="h-3.5 w-3.5" /> Enviar no WhatsApp</a>
        </Button>
      </div>
    </div>
  );
}

function LinksCompartilhar() {
  return (
    <Panel title="Links para compartilhar com o cliente">
      <p className="border-b px-4 py-2 text-xs text-muted-foreground">Copie ou envie pelo WhatsApp. Qualquer pessoa com o link acessa, sem precisar de senha.</p>
      <div className="divide-y sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <LinkCard titulo="Vitrine (sua loja)" descricao="Serviços, aparelhos e fotos de obras" caminho="/catalogo" icon={Store}
          mensagem="Olá! Conheça os serviços e aparelhos da VM Climatização & Acabamentos:" />
        <LinkCard titulo="Agendamento" descricao="Página para o cliente pedir um serviço" caminho="/agendar" icon={CalendarDays}
          mensagem="Olá! Agende seu serviço com a VM Climatização & Acabamentos por aqui:" />
      </div>
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
  return (
    <li className="space-y-2 px-4 py-3">
      <div className="text-sm font-medium">{m.titulo}</div>
      <textarea className="min-h-20 w-full rounded-[6px] border border-input bg-background p-2 text-sm" disabled={!admin} value={texto} onChange={(e) => setTexto(e.target.value)} aria-label={m.titulo} />
      {salvar.error && <p role="alert" className="text-xs text-destructive">{salvar.error.message}</p>}
      {admin && texto !== m.texto && <div className="flex justify-end"><Button size="sm" disabled={salvar.isPending} onClick={() => salvar.mutate()}>Salvar modelo</Button></div>}
    </li>
  );
}
