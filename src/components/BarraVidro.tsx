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
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200/60 bg-white/80 px-2 pt-1.5 shadow-[0_-10px_25px_rgba(0,0,0,0.06)] backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/70 dark:shadow-[0_-10px_30px_rgba(0,0,0,0.4)] lg:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6px)" }}
    >
      <div className="relative grid grid-cols-4">
        {ativo >= 0 && (
          <span
            aria-hidden
            className="absolute inset-y-0.5 left-0 w-1/4 rounded-2xl bg-primary/10 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:bg-primary/20"
            style={{ transform: `translateX(${ativo * 100}%)` }}
          />
        )}
        {itens.map(({ to, label, icon: Icon }, i) => (
          <Link
            key={to}
            to={to}
            className={`relative z-10 flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors duration-300 active:scale-95 ${i === ativo ? "font-semibold text-primary" : "text-zinc-500 dark:text-zinc-400"}`}
          >
            <Icon className={`h-5 w-5 transition-transform duration-300 ${i === ativo ? "scale-110" : ""}`} strokeWidth={i === ativo ? 2.2 : 1.75} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
};
