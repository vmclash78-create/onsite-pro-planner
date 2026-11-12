import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "VM Climatização & Acabamentos — Gestão de Serviços" },
      { name: "description", content: "Gestão de refrigeração, gesso e elétrica" },
      { name: "application-name", content: "VM Climatização" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "author", content: "VM Climatização & Acabamentos" },
      { name: "theme-color", content: "#ffffff", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#1c1c1e", media: "(prefers-color-scheme: dark)" },
      { property: "og:site_name", content: "VM Climatização & Acabamentos" },
      { property: "og:title", content: "VM Climatização & Acabamentos — Gestão de Serviços" },
      { property: "og:description", content: "Gestão de refrigeração, gesso e elétrica" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Archivo:wght@600;800&family=Figtree:wght@400;600&display=swap" },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/manifest.json" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
        <meta name="color-scheme" content="light dark" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="VM Climatização" />
        <script dangerouslySetInnerHTML={{ __html: "addEventListener(\"beforeinstallprompt\",function(e){e.preventDefault();window.__bip=e;dispatchEvent(new Event(\"vm-bip\"))})" }} />
        <script dangerouslySetInnerHTML={{ __html: TEMA_JS }} />
        <style dangerouslySetInnerHTML={{ __html: SPLASH_CSS }} />
        <script dangerouslySetInnerHTML={{ __html: RECARREGAR_JS }} />
      </head>
      <body>
        <div id="vm-splash" aria-hidden="true">
          <img src="/favicon.png" alt="" width={84} height={84} />
          <strong>VM Climatização &amp; Acabamentos</strong>
          <span>Climatização · Gesso · Elétrica</span>
          <i><b /></i>
        </div>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// After an update, cached pages may request old code files; reload once to fetch the new version.
const RECARREGAR_JS = `(function(){var k="vm-recarga";function r(m){m=String(m||"");if(!/module script|dynamically imported|Failed to fetch|preload/i.test(m))return;var t=+sessionStorage.getItem(k)||0;if(Date.now()-t<15000)return;sessionStorage.setItem(k,Date.now());location.reload();}
window.addEventListener("vite:preloadError",function(e){e.preventDefault();r("preload")});
window.addEventListener("error",function(e){r(e.message)});
window.addEventListener("unhandledrejection",function(e){r(e.reason&&(e.reason.message||e.reason))});})();`;

const TEMA_JS = `(function(){try{var L=localStorage;if(!L.getItem("vm-tema-v2")){L.setItem("vm-tema","sistema");L.setItem("vm-tema-v2","1");}var mq=matchMedia("(prefers-color-scheme: dark)");function ap(){var t=L.getItem("vm-tema")||"sistema";var pub=/^\\/(agendar|catalogo|imprimir)/.test(location.pathname);var d=!pub&&(t==="escuro"||(t==="sistema"&&mq.matches));var h=document.documentElement;h.classList.toggle("dark",d);h.style.colorScheme=d?"dark":"light";}ap();var f=function(){if((L.getItem("vm-tema")||"sistema")==="sistema")ap();};mq.addEventListener?mq.addEventListener("change",f):mq.addListener(f);document.addEventListener("visibilitychange",function(){if(!document.hidden)f();});window.addEventListener("pageshow",f);window.addEventListener("focus",f);}catch(e){}})();`;

const SPLASH_CSS = `
html.dark,html.dark body{background:#000}
#vm-splash{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:#fff;font-family:Inter,system-ui,sans-serif;transition:opacity .45s ease,visibility .45s;}
html.dark #vm-splash{background:#1c1c1e}
#vm-splash img{object-fit:contain;animation:vmPulse 1.6s ease-in-out infinite;margin-bottom:14px}
#vm-splash strong{font-size:16px;font-weight:700;color:#111}
html.dark #vm-splash strong{color:#f5f5f5}
#vm-splash span{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8a8a8e}
#vm-splash i{display:block;width:140px;height:3px;border-radius:3px;background:#e5e7eb;overflow:hidden;margin-top:22px}
html.dark #vm-splash i{background:#2c2c2e}
#vm-splash b{display:block;width:40%;height:100%;border-radius:3px;background:#2563eb;animation:vmBar 1.1s ease-in-out infinite}
html.vm-pronto #vm-splash{opacity:0;visibility:hidden;pointer-events:none}
@keyframes vmPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.06);opacity:.85}}
@keyframes vmBar{0%{transform:translateX(-110%)}100%{transform:translateX(260%)}}
`;

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    const t = setTimeout(() => document.documentElement.classList.add("vm-pronto"), 350);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Messaging/install worker only (no caching); skipped in previews and iframes.
    const h = location.hostname.toLowerCase();
    const preview = window.self !== window.top || /^(id-preview|preview)(-[a-z0-9]+)?--/.test(h) || h.endsWith("lovableproject.com") || h === "localhost";
    if (preview || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/push-sw.js", { scope: "/" }).catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
