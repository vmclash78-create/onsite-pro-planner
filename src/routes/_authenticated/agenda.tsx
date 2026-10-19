import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PrimaryButton } from "@/components/AppShell";
import { Field, FormPanel, Panel, StateRow, StatusSelect, inputCls } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { addDias, dataBR, isoLocal } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { CATEGORIAS, STATUS_AG, TIPOS, useMe } from "@/lib/staff";
import { excluirAgendamento, rotuloLembrete, textoLembrete, tipoLembrete } from "@/lib/agendamento";
import { useClientes, useTecnicos } from "./-shared";
import { WhatsButton } from "@/components/WhatsButton";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: pageHead("Agenda", "Agenda semanal de serviços por dia e técnico."),
  component: Agenda,
});


function segunda(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  const dow = (d.getDay() + 6) % 7;
  return addDias(iso, -dow);
}

function Agenda() {
  const qc = useQueryClient();
  const clientes = useClientes();
  const tecnicos = useTecnicos();
  const me = useMe();
  const [inicio, setInicio] = useState(() => segunda(isoLocal()));
  const [aberto, setAberto] = useState(false);
  const vazio = { client_id: "", categoria: "Refrigeração", tipo: "Instalação", data: isoLocal(), hora: "08:00", tecnico_id: "", descricao: "" };
  const [f, setF] = useState(vazio);
  const fim = addDias(inicio, 6);

  const q = useQuery({
    queryKey: ["agenda", inicio],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments")
        .select("id, client_id, data, hora, nome_contato, whatsapp, categoria, tipo, endereco, status, origem, tecnico_id, profiles:tecnico_id(nome)")
        .gte("data", inicio).lte("data", fim).order("data").order("hora");
      if (error) throw error;
      return data;
    },
  });
  const inval = () => { qc.invalidateQueries({ queryKey: ["agenda"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); qc.invalidateQueries({ queryKey: ["pedidos"] }); };

  const salvar = useMutation({
    mutationFn: async () => {
      if (!f.client_id) throw new Error("Escolha o cliente.");
      if (f.tecnico_id) {
        const { data: c } = await supabase.from("appointments").select("id").eq("data", f.data).eq("hora", f.hora).eq("tecnico_id", f.tecnico_id).neq("status", "Cancelada");
        if (c && c.length) throw new Error("Esse técnico já tem um serviço neste dia e horário.");
      }
      const { data: cli } = await supabase.from("clients").select("nome, whatsapp, locations(id, endereco, bairro)").eq("id", f.client_id).single();
      const loc = cli?.locations[0];
      const { error } = await supabase.from("appointments").insert({
        client_id: f.client_id, location_id: loc?.id ?? null, tecnico_id: f.tecnico_id || null,
        nome_contato: cli?.nome ?? "", whatsapp: cli?.whatsapp ?? "", endereco: loc ? `${loc.endereco}${loc.bairro ? ` — ${loc.bairro}` : ""}` : null,
        categoria: f.categoria, tipo: f.tipo, data: f.data, hora: f.hora, descricao: f.descricao || null, status: "Agendada",
      });
      if (error) throw error;
    },
    onSuccess: () => { setF(vazio); setAberto(false); inval(); },
  });
  const status = useMutation({
    mutationFn: async ({ id, s }: { id: string; s: string }) => {
      const { error } = await supabase.from("appointments").update({ status: s }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: inval,
  });
  const excluir = useMutation({
    mutationFn: async (aid: string) => {
      const { data } = await supabase.from("appointments").select("fotos").eq("id", aid).maybeSingle();
      await excluirAgendamento(aid, data?.fotos ?? []);
    },
    onSuccess: () => { inval(); toast.success("Agendamento excluído."); },
    onError: (e) => toast.error(e.message),
  });
  const hoje = isoLocal();

  const dias = Array.from({ length: 7 }, (_, i) => addDias(inicio, i));
  const nomeDia = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long" });

  return (
    <AppShell title="Agenda" actions={<PrimaryButton label="Novo agendamento" onClick={() => setAberto(true)} />}>
      {aberto && (
        <FormPanel title="Novo agendamento" onClose={() => setAberto(false)} onSubmit={() => salvar.mutate()} saving={salvar.isPending} error={salvar.error?.message}>
          <Field label="Cliente">
            <select className={inputCls} value={f.client_id} onChange={(e) => setF({ ...f, client_id: e.target.value })} required>
              <option value="">Selecione</option>
              {clientes.data?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>
          <Field label="Técnico">
            <select className={inputCls} value={f.tecnico_id} onChange={(e) => setF({ ...f, tecnico_id: e.target.value })}>
              <option value="">Sem técnico</option>
              {tecnicos.data?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </Field>
          <Field label="Categoria">
            <select className={inputCls} value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value, tipo: TIPOS[e.target.value]![0]! })}>
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Tipo">
            <select className={inputCls} value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
              {TIPOS[f.categoria]!.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Data"><input type="date" className={inputCls} value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} required /></Field>
          <Field label="Horário"><input type="time" className={inputCls} value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} required /></Field>
          <Field label="Observações" className="sm:col-span-2"><input className={inputCls} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></Field>
        </FormPanel>
      )}

      <div className="mb-4 grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2">
        <button aria-label="Semana anterior" onClick={() => setInicio(addDias(inicio, -7))} className="flex h-8 w-8 items-center justify-center rounded-[6px] border hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
        <button aria-label="Próxima semana" onClick={() => setInicio(addDias(inicio, 7))} className="flex h-8 w-8 items-center justify-center rounded-[6px] border hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
        <span className="min-w-0 text-xs tabular-nums sm:text-sm">{dataBR(inicio)} a {dataBR(fim)}</span>
        <button onClick={() => setInicio(segunda(isoLocal()))} className="ml-auto h-8 rounded-[6px] border px-3 text-xs hover:bg-muted">Hoje</button>
      </div>

      {q.isLoading || q.error ? <Panel><StateRow loading={q.isLoading} error={q.error} /></Panel> : (
        <div className="space-y-4">
          {dias.map((d) => {
            const itens = q.data?.filter((a) => a.data === d) ?? [];
            return (
              <Panel key={d} title={<span className="capitalize">{nomeDia(d)} <span className="ml-1 font-normal tabular-nums text-muted-foreground">{dataBR(d)}</span></span>}
                action={<span className="text-xs tabular-nums text-muted-foreground">{itens.length}</span>}>
                {itens.length === 0 ? <div className="px-4 py-3 text-xs text-muted-foreground">Livre</div> : (
                  <ul className="divide-y">
                    {itens.map((a) => (
                      <li key={a.id} className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-3 px-4 py-3 sm:grid-cols-[3.25rem_minmax(0,1fr)_auto]">
                        <div className="text-sm font-medium tabular-nums">{a.hora ?? "--:--"}</div>
                        <div className="min-w-0">
                          <Link to="/pedidos/$id" params={{ id: a.id }} className="block truncate text-sm font-medium hover:underline">{a.nome_contato}</Link>
                          <div className="truncate text-xs text-muted-foreground">{a.categoria} · {a.tipo}{a.profiles?.nome ? ` · ${a.profiles.nome}` : ""}</div>
                          <div className="truncate text-xs text-muted-foreground">{a.endereco}</div>
                          {a.status !== "Cancelada" && a.status !== "Concluída" && (() => {
                            const dia = a.data ?? d;
                            const servico = `${a.tipo} (${a.categoria})`;
                            const vars = { nome: a.nome_contato, servico, data: dataBR(dia), hora: a.hora ?? "", tecnico: a.profiles?.nome ?? "a definir" };
                            const p = { telefone: a.whatsapp, clienteId: a.client_id, referenciaId: a.id, vars };
                            const t = tipoLembrete(dia, hoje);
                            return (
                              <div className="mt-2 flex flex-wrap gap-2">
                                <WhatsButton label="Confirmar" chave="confirmacao" {...p} />
                                {t !== "passado" && <WhatsButton label={rotuloLembrete(dia, hoje)} chave="vespera" {...p}
                                  texto={t === "amanha" ? undefined : textoLembrete({ nome: a.nome_contato, servico, data: dia, hora: a.hora ?? "" }, hoje, "VM Climatização & Acabamentos")} />}
                                <WhatsButton label="A caminho" chave="a_caminho" {...p} />
                              </div>
                            );
                          })()}
                        </div>
                        <div className="col-start-2 flex items-center gap-1 sm:col-start-auto">
                          <StatusSelect value={a.status} options={STATUS_AG} onChange={(s) => status.mutate({ id: a.id, s })} />
                          {me.data?.isAdmin && <button type="button" aria-label="Excluir agendamento" title="Excluir"
                            onClick={() => confirm(`Excluir de vez o agendamento de ${a.nome_contato}? Isso não pode ser desfeito. (Para guardar o histórico, use "Cancelada".)`) && excluir.mutate(a.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="h-4 w-4" /></button>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
