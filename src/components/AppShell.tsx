import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, Users, MapPin, FileText, CalendarDays, Wrench, HardHat, BellRing, Menu, X, ExternalLink, Snowflake,
} from "lucide-react";

export const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/ordens", label: "Ordens de serviço", icon: Wrench },
  { to: "/orcamentos", label: "Orçamentos", icon: FileText },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/locais", label: "Locais", icon: MapPin },
  { to: "/equipe", label: "Equipe", icon: HardHat },
  { to: "/lembretes", label: "Lembretes", icon: BellRing },
] as const;

const mobileTabs = ["/", "/agenda", "/ordens", "/clientes"];

function Brand() {
  return (
    <div className="flex items-center gap-2 px-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <Snowflake className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <div className="font-semibold">VM Climatização</div>
        <div className="text-xs text-sidebar-foreground/60">& Acabamentos</div>
      </div>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          activeOptions={{ exact: to === "/" }}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent !text-sidebar-accent-foreground font-medium" }}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
      <Link
        to="/agendar"
        onClick={onNavigate}
        className="mt-4 flex items-center gap-3 rounded-md border border-sidebar-border px-3 py-2.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
      >
        <ExternalLink className="h-4 w-4" /> Página de agendamento
      </Link>
    </nav>
  );
}

export function AppShell({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-6 bg-sidebar p-4 text-sidebar-foreground lg:flex">
        <Brand />
        <NavList />
        <div className="mt-auto rounded-md bg-sidebar-accent p-3 text-xs">
          <div className="font-medium text-sidebar-accent-foreground">Felipe F.</div>
          <div className="text-sidebar-foreground/60">Administrador</div>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 bg-sidebar p-4 text-sidebar-foreground">
            <div className="flex items-center justify-between">
              <Brand />
              <button aria-label="Fechar menu" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur lg:h-16 lg:px-8">
          <button className="lg:hidden" aria-label="Abrir menu" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="flex-1 truncate text-lg font-semibold">{title}</h1>
          {actions}
        </header>
        <main className="mx-auto max-w-7xl px-4 py-5 pb-24 lg:px-8 lg:py-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card lg:hidden">
        {navItems.filter((n) => mobileTabs.includes(n.to)).map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground"
            activeProps={{ className: "!text-primary font-medium" }}
          >
            <Icon className="h-5 w-5" />
            {label.split(" ")[0]}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function EmBreve({ descricao }: { descricao: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-card p-10 text-center">
      <p className="font-medium">Tela em construção</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{descricao}</p>
    </div>
  );
}
