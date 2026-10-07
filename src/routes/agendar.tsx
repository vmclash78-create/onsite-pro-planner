import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, MessageCircle, Phone, Snowflake } from "lucide-react";
import { company } from "@/lib/company";

export const Route = createFileRoute("/agendar")({
  head: () => ({
    meta: [
      { title: "Agende seu serviço — VM Climatização & Acabamentos" },
      {
        name: "description",
        content:
          "Agende refrigeração, gesso ou elétrica em Hidrolândia e região e em Fortaleza/CE. Atendimento pelo WhatsApp (88) 99640-1373.",
      },
      { property: "og:title", content: "Agende seu serviço — VM Climatização & Acabamentos" },
      {
        property: "og:description",
        content:
          "Agende refrigeração, gesso ou elétrica em Hidrolândia e região e em Fortaleza/CE. Atendimento pelo WhatsApp (88) 99640-1373.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Agendar,
});

function Agendar() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Snowflake className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">{company.name}</div>
            <div className="text-xs text-sidebar-foreground/60">Refrigeração · Gesso · Elétrica</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Agende seu serviço</h1>
        <p className="mt-2 text-muted-foreground">
          O formulário de agendamento será implementado em breve. Enquanto isso, fale direto com a gente.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a
            href={company.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
          >
            <MessageCircle className="h-5 w-5 shrink-0 text-primary" />
            <span>
              <span className="block font-medium">Chamar no WhatsApp</span>
              <span className="block text-sm text-muted-foreground">{company.phoneDisplay}</span>
            </span>
          </a>

          <a
            href={`tel:+55${company.phoneRaw}`}
            className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted"
          >
            <Phone className="h-5 w-5 shrink-0 text-primary" />
            <span>
              <span className="block font-medium">Ligar agora</span>
              <span className="block text-sm text-muted-foreground">{company.phoneDisplay}</span>
            </span>
          </a>

          <div className="flex items-start gap-3 rounded-lg border bg-card p-4 sm:col-span-2">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="text-sm">
              <div className="font-medium">{company.addressDisplay}</div>
              <div className="mt-1 text-muted-foreground">
                Atendemos {company.serviceAreaSentence}.
              </div>
            </div>
          </div>
        </div>

        <Link to="/" className="mt-8 inline-block text-sm text-primary hover:underline">
          Voltar ao painel
        </Link>
      </main>
    </div>
  );
}
