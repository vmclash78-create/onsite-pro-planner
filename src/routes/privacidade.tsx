import { createFileRoute, Link } from "@tanstack/react-router";
import { company } from "@/lib/company";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de privacidade — VM Climatização & Acabamentos" },
      { name: "description", content: "Como a VM Climatização & Acabamentos usa os dados enviados no agendamento." },
      { property: "og:title", content: "Política de privacidade — VM Climatização & Acabamentos" },
      { property: "og:description", content: "Como usamos os dados enviados no agendamento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <main className="mx-auto max-w-[560px] px-5 py-12 text-sm leading-relaxed text-muted-foreground">
      <h1 className="text-xl font-semibold text-foreground">Política de privacidade</h1>
      <p className="mt-4">Usamos seu nome, WhatsApp, endereço, descrição e fotos apenas para agendar e realizar o serviço solicitado. Não vendemos nem compartilhamos seus dados com terceiros.</p>
      <p className="mt-3">Você pode pedir a correção ou exclusão dos seus dados a qualquer momento pelo WhatsApp {company.phoneDisplay}, conforme a LGPD (Lei 13.709/2018).</p>
      <Link to="/agendar" className="mt-6 inline-block text-primary hover:underline">Voltar ao agendamento</Link>
    </main>
  ),
});
