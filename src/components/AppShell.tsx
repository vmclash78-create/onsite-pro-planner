import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard, Users, MapPin, FileText, CalendarDays, Wrench, HardHat, BellRing, ExternalLink, Plus, MoreHorizontal, ChevronRight,
} from "lucide-react";
import { company } from "@/lib/company";

export const navItems = [
  { to: "/", label: "Início", icon: LayoutDashboard },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/ordens", label: "Ordens de serviço", icon: Wrench },
  { to: "/orcamentos", label: "Orçamentos", icon: FileText },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/locais", label: "Locais", icon: MapPin },
  { to: "/equipe", label: "Equipe", icon: HardHat },
  { to: "/lembretes", label: "Lembretes", icon: BellRing },
] as const;

export const moreItems = navItems.filter((n) => !["/", "/agenda", "/clientes"].includes(n.to));

const ICON = "h-4 w-4 shrink-0";

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
        VM
      </div>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-sm font-semibold text-sidebar-accent-foreground">VM Climatização</div>
        <div className="truncate text-xs text-muted-foreground">& Acabamentos</div>
      </div>
    </div>
  );
}

export function PrimaryButton({ label, to }: { label: string; to?: string }) {
  const cls =
    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[6px] bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90";
  return to ? (
    <Link to={to} className={cls}><Plus className={ICON} strokeWidth={2} /><span className="hidden sm:inline">{label}</span></Link>
  ) : (
    <button type="button" className={cls}><Plus className={ICON} strokeWidth={2} /><span className="hidden sm:inline">{label}</span></button>
  );
}

export function AppShell({
  title, breadcrumb, actions, children,
}: { title: string; breadcrumb?: string[]; actions?: ReactNode; children: ReactNode }) {
  const crumbs = breadcrumb ?? ["Painel", title];
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar py-4 text-sidebar-foreground lg:flex">
        <Brand />
        <nav className="mt-6 flex flex-col gap-0.5 px-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="relative flex items-center gap-3 rounded-[6px] px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{
                className:
                  "bg-sidebar-accent !text-sidebar-accent-foreground font-medium before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-primary",
              }}
            >
              <Icon className={ICON} strokeWidth={1.75} />
              {label}
            </Link>
          ))}
          <Link
            to="/agendar"
            className="mt-3 flex items-center gap-3 rounded-[6px] px-3 py-2 text-sm hover:bg-sidebar-accent"
          >
            <ExternalLink className={ICON} strokeWidth={1.75} /> Página de agendamento
          </Link>
        </nav>
        <div className="mt-auto border-t border-sidebar-border px-5 pt-4 text-xs leading-relaxed text-muted-foreground">
          <div className="text-sm font-medium text-sidebar-accent-foreground">Felipe F.</div>
          <div>Administrador</div>
          <a href={company.whatsappUrl} target="_blank" rel="noreferrer" className="mt-3 block tabular-nums text-sidebar-foreground hover:underline">
            {company.phoneDisplay}
          </a>
          <div>{company.addressDisplay}</div>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="border-b px-4 pb-4 pt-5 lg:px-8 lg:pt-6">
          <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {crumbs.map((c, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="h-3 w-3" strokeWidth={1.75} />}
                    <span className={i === crumbs.length - 1 ? "text-foreground/80" : ""}>{c}</span>
                  </span>
                ))}
              </div>
              <h1 className="mt-1 truncate text-xl font-semibold tracking-tight">{title}</h1>
            </div>
            {actions}
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-5 pb-24 lg:px-8 lg:py-6">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card lg:hidden">
        {[
          { to: "/", label: "Início", icon: LayoutDashboard },
          { to: "/agenda", label: "Agenda", icon: CalendarDays },
          { to: "/clientes", label: "Clientes", icon: Users },
          { to: "/mais", label: "Mais", icon: MoreHorizontal },
        ].map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground"
            activeProps={{ className: "!text-primary font-medium" }}
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function EmBreve({ descricao }: { descricao: string }) {
  return (
    <div className="rounded-lg border bg-card p-8">
      <p className="text-sm font-medium">Tela em construção</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{descricao}</p>
    </div>
  );
}
