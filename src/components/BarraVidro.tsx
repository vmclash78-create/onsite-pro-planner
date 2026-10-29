import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, CalendarDays, Inbox, Wrench, MoreHorizontal } from "lucide-react";

interface BarraVidroProps {
  isAdmin: boolean;
}

export const BarraVidro = ({ isAdmin }: BarraVidroProps) => {
  const { pathname } = useLocation();
  const itens = [
    { to: "/inicio", label: "Início", icon: LayoutDashboard },
    { to: "/agenda", label: "Agenda", icon: CalendarDays },
    isAdmin ? { to: "/pedidos", label: "Pedidos", icon: Inbox } : { to: "/ordens", label: "Ordens", icon: Wrench },
    { to: "/mais", label: "Mais", icon: MoreHorizontal },
  ];
  const ativo = itens.findIndex((i) => pathname === i.to || pathname.startsWith(i.to + "/"));

  return (
    <nav
      className="liquid-glass fixed inset-x-3 z-30 rounded-full p-1.5 lg:hidden"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 10px)" }}
    >
      <div className="relative grid grid-cols-4">
        {ativo >= 0 && (
          <span
            aria-hidden
            className="liquid-pill absolute inset-y-0 left-0 w-1/4 rounded-full"
            style={{ transform: `translateX(${ativo * 100}%)` }}
          />
        )}
        {itens.map(({ to, label, icon: Icon }, i) => (
          <Link
            key={to}
            to={to}
            className={`relative z-10 flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors duration-300 active:scale-95 ${i === ativo ? "font-semibold text-primary" : "text-foreground/70"}`}
          >
            <Icon className={`h-5 w-5 transition-transform duration-300 ${i === ativo ? "scale-110" : ""}`} strokeWidth={i === ativo ? 2.2 : 1.75} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
};
