import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import simbolo from "@/assets/logo-simbolo.png.asset.json";
import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, MapPin, FileText, CalendarDays, Wrench, HardHat, BellRing, Plus, MoreHorizontal, ChevronRight, Inbox, LogOut, Loader2, Wallet, Package, HandCoins, Settings, Store, Eye,
} from "lucide-react";
import { company } from "@/lib/company";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/staff";
import { Button } from "@/components/ui/button";
import { canOpenPanel, canSeeNav } from "@/lib/access";
import { definirContador, avisoSistema } from "@/lib/notificacoes";
import { toast } from "sonner";
import { SeletorTema } from "@/components/SeletorTema";
import { DefinirNome } from "@/components/DefinirNome";
import { AvisoNotificacao } from "@/components/AvisoNotificacao";
import { BarraVidro } from "@/components/BarraVidro";

type NavItem = { to: string; label: string; icon: typeof Users };
export const navGroups: { titulo: string; itens: NavItem[] }[] = [
  { titulo: "Dia a dia", itens: [
    { to: "/inicio", label: "Início", icon: LayoutDashboard },
    { to: "/agenda", label: "Agenda", icon: CalendarDays },
    { to: "/pedidos", label: "Pedidos do site", icon: Inbox },
    { to: "/ordens", label: "Ordens de serviço", icon: Wrench },
  ] },
  { titulo: "Clientes e vendas", itens: [
    { to: "/clientes", label: "Clientes", icon: Users },
    { to: "/orcamentos", label: "Orçamentos", icon: FileText },
    { to: "/lembretes", label: "Preventivas", icon: BellRing },
    { to: "/vitrine", label: "Minha vitrine", icon: Store },
  ] },
  { titulo: "Dinheiro e estoque", itens: [
    { to: "/receber", label: "A receber", icon: HandCoins },
    { to: "/financeiro", label: "Caixa", icon: Wallet },
    { to: "/estoque", label: "Estoque", icon: Package },
  ] },
  { titulo: "Empresa", itens: [
    { to: "/equipe", label: "Equipe", icon: HardHat },
    { to: "/locais", label: "Endereços", icon: MapPin },
    { to: "/configuracoes", label: "Configurações", icon: Settings },
  ] },
];

export const navItems = navGroups.flatMap((g) => g.itens);
const MOBILE = ["/inicio", "/agenda", "/pedidos"];
export const moreGroups = navGroups.map((g) => ({ ...g, itens: g.itens.filter((i) => !MOBILE.includes(i.to)) })).filter((g) => g.itens.length);

const ICON = "h-4 w-4 shrink-0";

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-3">
      <img src={simbolo.url} alt="" className="h-10 w-10 shrink-0 object-contain" />
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
  const path = useLocation({ select: (location) => location.pathname });
  const allowed = canOpenPanel(path, !!me.data?.isAdmin);
  const groups = navGroups.map((g) => ({ ...g, itens: g.itens.filter((i) => canSeeNav(i.to, !!me.data?.isAdmin)) })).filter((g) => g.itens.length);
  const sair = useSignOut();
  const qc = useQueryClient();
  const isStaff = !!me.data?.isStaff;
  useEffect(() => {
    if (!isStaff) return;
    const atualizarContador = async () => {
      const { count } = await supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "Pendente");
      definirContador(count ?? 0);
    };
    void atualizarContador();
    const ch = supabase.channel("appointments-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, (p) => {
        for (const k of ["pedidos", "agenda", "dashboard"]) qc.invalidateQueries({ queryKey: [k] });
        const novo = p.new as { id?: string; status?: string; nome_contato?: string } | null;
        if (p.eventType === "INSERT" && novo?.status === "Pendente") {
          void avisoSistema("Novo agendamento recebido", novo.nome_contato ?? "Toque para ver os pedidos.", `pedido-${novo.id ?? ""}`);
          toast.success("Novo agendamento recebido", { description: novo.nome_contato ?? undefined, action: { label: "Ver", onClick: () => { window.location.href = "/pedidos"; } } });
        }
        void atualizarContador();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, isStaff]);

  let body: ReactNode = children;
  if (me.isLoading) body = <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>;
  else if (!me.data) body = <div className="py-12 text-center text-sm text-muted-foreground">Nenhum registro disponível.</div>;
  else if (!me.data.isStaff)
    body = (
      <div className="max-w-md rounded-lg border bg-card p-5 text-sm">
        <p className="font-medium">Aguardando liberação</p>
        <p className="mt-1 text-muted-foreground">Sua conta ({me.data?.email ?? ""}) foi criada. Peça para o administrador liberar seu acesso na tela Equipe.</p>
      </div>
    );

  if (me.data?.isStaff && !allowed) body = <div className="text-sm text-muted-foreground">Esta área é exclusiva do administrador.</div>;

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar py-4 text-sidebar-foreground lg:flex">
        <Brand />
        <nav className="mt-5 flex flex-1 flex-col gap-4 overflow-y-auto px-2">
          {groups.map((g) => (
            <div key={g.titulo}>
              <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{g.titulo}</div>
              <div className="flex flex-col gap-0.5">
                {g.itens.map(({ to, label, icon: Icon }) => (
                  <Link key={to} to={to as "/inicio"}
                    className="relative flex items-center gap-3 rounded-[6px] px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    activeProps={{ className: "bg-sidebar-accent !text-sidebar-accent-foreground font-medium before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-primary" }}>
                    <Icon className={ICON} strokeWidth={1.75} />{label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-0.5 border-t border-sidebar-border pt-3">
<Link to="/agendar" target="_blank" className="flex items-center gap-3 rounded-[6px] px-3 py-2 text-sm hover:bg-sidebar-accent"><Eye className={ICON} strokeWidth={1.75} /> Ver como o cliente vê</Link>
          </div>
        </nav>
        <div className="mt-3 border-t border-sidebar-border px-5 pt-4 text-xs leading-relaxed text-muted-foreground">
          <div className="truncate text-sm font-medium text-sidebar-accent-foreground">{me.data?.nome ?? ""}</div>
          <div>{me.data?.isAdmin ? "Administrador" : me.data?.isStaff ? "Técnico" : "VM Climatização & Acabamentos"}</div>
          {me.data && <Button variant="ghost" onClick={sair} className="mt-2 inline-flex items-center gap-1.5 text-sidebar-foreground hover:text-foreground"><LogOut className="h-3.5 w-3.5" /> Sair</Button>}
          <a href={company.whatsappUrl} target="_blank" rel="noreferrer" className="mt-3 block tabular-nums text-sidebar-foreground hover:underline">{company.phoneDisplay}</a>
        </div>
      </aside>

      <div className="min-w-0 lg:pl-60">
        <header className="vm-topo sticky top-0 z-20 border-b px-4 pb-4 pt-5 lg:px-8 lg:pt-6">
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
            <div className="flex items-center gap-2">
              {me.data?.isAdmin && allowed && actions}
              <SeletorTema />
            </div>
          </div>
        </header>
        <main className="panel-content mx-auto min-w-0 max-w-7xl px-4 py-5 pb-28 lg:px-8 lg:py-6">
          {me.data && (me.data.precisaNome || me.data.precisaTelefone) && <DefinirNome userId={me.data.id} pedirNome={me.data.precisaNome} pedirTelefone={me.data.precisaTelefone} />}
          {me.data?.isStaff && <AvisoNotificacao />}
          {body}
        </main>
      </div>

      <BarraVidro isAdmin={!!me.data?.isAdmin} />

    </div>
  );
}
