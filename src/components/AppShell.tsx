import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, MapPin, FileText, CalendarDays, Wrench, HardHat, BellRing, ExternalLink, Plus, MoreHorizontal, ChevronRight, Inbox, LogOut, Loader2, Wallet, Package, HandCoins, Settings,
} from "lucide-react";
import { company } from "@/lib/company";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/staff";
import { Button } from "@/components/ui/button";

export const navItems = [
  { to: "/inicio", label: "Início", icon: LayoutDashboard },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/pedidos", label: "Pedidos", icon: Inbox },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/orcamentos", label: "Orçamentos", icon: FileText },
  { to: "/ordens", label: "Ordens de serviço", icon: Wrench },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/receber", label: "A receber", icon: HandCoins },
  { to: "/estoque", label: "Estoque", icon: Package },
  { to: "/equipe", label: "Equipe", icon: HardHat },
  { to: "/locais", label: "Locais", icon: MapPin },
  { to: "/lembretes", label: "Lembretes", icon: BellRing },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export const moreItems = navItems.filter((n) => !["/inicio", "/agenda", "/clientes"].includes(n.to));

const ICON = "h-4 w-4 shrink-0";

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">VM</div>
      <div className="min-w-0 leading-tight">
        <div className="text-sm font-semibold text-sidebar-accent-foreground">VM Climatização & Acabamentos</div>
        <div className="truncate text-xs text-muted-foreground">Hidrolândia/CE</div>
      </div>
    </div>
  );
}

export function PrimaryButton({ label, to, onClick }: { label: string; to?: string; onClick?: () => void }) {
  const cls = "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[6px] bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90";
  const inner = <><Plus className={ICON} strokeWidth={2} /><span className="hidden sm:inline">{label}</span></>;
  return to ? <Button asChild className={cls}><Link to={to} aria-label={label}>{inner}</Link></Button> : <Button type="button" onClick={onClick} className={cls} aria-label={label}>{inner}</Button>;
}

export function useSignOut() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return async () => {
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/auth" });
  };
}

export function AppShell({ title, breadcrumb, actions, children }: { title: string; breadcrumb?: string[]; actions?: ReactNode; children: ReactNode }) {
  const crumbs = breadcrumb ?? ["Painel", title];
  const me = useMe();
  const sair = useSignOut();
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase.channel("appointments-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
        for (const k of ["pedidos", "agenda", "dashboard"]) qc.invalidateQueries({ queryKey: [k] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  let body: ReactNode = children;
  if (me.isLoading) body = <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>;
  else if (!me.data)
    body = (
      <>
        <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-warning/40 bg-card px-4 py-3 text-sm">
          <p className="min-w-0 text-muted-foreground">Você não está conectado: as listas ficam vazias e os botões de criar e salvar ficam escondidos. Entre uma vez e o navegador lembra sua conta.</p>
          <Button asChild size="sm"><Link to="/auth">Entrar</Link></Button>
        </div>
        {children}
      </>
    );
  else if (me.data && !me.data.isStaff)
    body = (
      <div className="max-w-md rounded-lg border bg-card p-5 text-sm">
        <p className="font-medium">Aguardando liberação</p>
        <p className="mt-1 text-muted-foreground">Sua conta ({me.data.email}) foi criada. Peça para o administrador liberar seu acesso na tela Equipe.</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar py-4 text-sidebar-foreground lg:flex">
        <Brand />
        <nav className="mt-6 flex flex-col gap-0.5 px-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}
              className="relative flex items-center gap-3 rounded-[6px] px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-accent !text-sidebar-accent-foreground font-medium before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-primary" }}>
              <Icon className={ICON} strokeWidth={1.75} />{label}
            </Link>
          ))}
          <Link to="/agendar" className="mt-3 flex items-center gap-3 rounded-[6px] px-3 py-2 text-sm hover:bg-sidebar-accent">
            <ExternalLink className={ICON} strokeWidth={1.75} /> Página de agendamento
          </Link>
        </nav>
        <div className="mt-auto border-t border-sidebar-border px-5 pt-4 text-xs leading-relaxed text-muted-foreground">
          <div className="truncate text-sm font-medium text-sidebar-accent-foreground">{me.data?.nome ?? ""}</div>
          <div>{me.data?.isAdmin ? "Administrador" : me.data?.isStaff ? "Técnico" : "Sem acesso"}</div>
          <button onClick={sair} className="mt-2 inline-flex items-center gap-1.5 text-sidebar-foreground hover:text-foreground"><LogOut className="h-3.5 w-3.5" /> Sair</button>
          <a href={company.whatsappUrl} target="_blank" rel="noreferrer" className="mt-3 block tabular-nums text-sidebar-foreground hover:underline">{company.phoneDisplay}</a>
        </div>
      </aside>

      <div className="min-w-0 lg:pl-60">
        <header className="border-b px-4 pb-4 pt-5 lg:px-8 lg:pt-6">
          <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-muted-foreground">
                {crumbs.map((c, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="h-3 w-3" strokeWidth={1.75} />}
                    <span className={i === crumbs.length - 1 ? "text-foreground/80" : ""}>{c}</span>
                  </span>
                ))}
              </div>
              <h1 className="mt-1 text-xl font-semibold">{title}</h1>
            </div>
            {me.data?.isStaff && actions}
          </div>
        </header>
        <main className="panel-content mx-auto min-w-0 max-w-7xl px-4 py-5 pb-24 lg:px-8 lg:py-6">{body}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
        {[
          { to: "/inicio", label: "Início", icon: LayoutDashboard },
          { to: "/agenda", label: "Agenda", icon: CalendarDays },
          { to: "/clientes", label: "Clientes", icon: Users },
          { to: "/mais", label: "Mais", icon: MoreHorizontal },
        ].map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground" activeProps={{ className: "!text-primary font-medium" }}>
            <Icon className="h-5 w-5" strokeWidth={1.75} />{label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
