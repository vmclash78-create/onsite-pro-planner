import type { ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const inputCls =
  "h-10 w-full rounded-[6px] border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";

export function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block min-w-0 text-xs text-muted-foreground ${className}`}>
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

export function Panel({ title, action, children }: { title?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-lg border bg-card">
      {title && (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-b px-4 py-3">
          <h2 className="min-w-0 text-sm font-semibold">{title}</h2>
          <div className="shrink-0">{action}</div>
        </div>
      )}
      {children}
    </section>
  );
}

export function FormPanel({ title, onClose, onSubmit, saving, error, children }: {
  title: string; onClose: () => void; onSubmit: () => void; saving?: boolean; error?: string | null | undefined; children: ReactNode;
}) {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
      className="mb-5 rounded-lg border border-primary/40 bg-card"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button variant="ghost" size="icon" type="button" aria-label="Fechar" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></Button>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">{children}</div>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t px-4 py-3">
        {error && <p role="alert" className="w-full text-xs text-destructive">{error}</p>}
        <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
        <Button disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
        </Button>
      </div>
    </form>
  );
}

export function StateRow({ loading, error, empty, emptyText = "Nada por aqui ainda." }: { loading?: boolean; error?: unknown; empty?: boolean; emptyText?: string }) {
  if (loading) return <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>;
  if (error) return <div className="px-4 py-6 text-sm text-destructive">Não foi possível carregar os dados. Recarregue a página.</div>;
  if (empty) return <div className="px-4 py-6 text-sm text-muted-foreground">{emptyText}</div>;
  return null;
}

const tones: Record<string, string> = {
  Concluída: "text-success", Aprovado: "text-success",
  "Em andamento": "text-primary", Agendada: "text-muted-foreground", Aberta: "text-muted-foreground",
  Pendente: "text-warning", Aguardando: "text-warning", Rascunho: "text-muted-foreground",
  Cancelada: "text-destructive", Recusado: "text-destructive", Atrasada: "text-destructive",
  Alta: "text-destructive", Média: "text-warning", Baixa: "text-success",
};

export function Status({ value }: { value: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs ${tones[value] ?? "text-muted-foreground"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {value}
    </span>
  );
}

export function StatusSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <select
      aria-label="Alterar situação"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-8 rounded-[6px] border border-input bg-background px-2 text-xs ${tones[value] ?? ""}`}
    >
      {options.map((o) => <option key={o} value={o} className="text-foreground">{o}</option>)}
    </select>
  );
}
