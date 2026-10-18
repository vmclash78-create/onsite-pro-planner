<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Shared semantic tokens define the system theme; public booking aliases those tokens and shared layout primitives constrain content widths — keeps colors and device adaptation consistent across screens.
- Internal panel pages use `AppShell` (src/components/AppShell.tsx) for sidebar/mobile nav; the public booking page (/agendar) renders without it — keeps public and staff UI separated.
- Formatting of dates/currency goes through src/lib/format.ts (pt-BR) — single source for BR formats.
- Panel routes live under src/routes/_authenticated/ with SSR disabled and a client-side session gate redirecting to /auth; the first account becomes admin — keeps private data behind login.
- Panel screens read/write through the browser Supabase client with role/assignment-scoped RLS and protected-column triggers; presentation access is centralized in src/lib/access.ts — database policies, not hidden controls, enforce permissions.
- Private photos are authorized by their order/appointment paths; booking conflicts and role changes serialize in database triggers — direct API writes and concurrent requests follow the same rules as the UI.
- Access is role-based via `user_roles` (admin/tecnico); the first account becomes admin, later accounts wait for an admin in Equipe — prevents open sign-up from exposing data.
- The last-admin guard permits role cascades only after Auth Admin has removed the underlying account with no user session; direct last-role deletion stays blocked — enables authorized full account resets without leaving orphan roles.
- Public booking writes only through server functions in src/lib/pedidos.functions.ts (signed upload URLs + validated insert); anon has no table access — keeps customer data private.
- Public booking shares its input schema between browser and server in src/lib/pedido-validation.ts; browser checks improve feedback but server validation is authoritative — prevents malformed requests bypassing the form.
- Public booking photos require a hashed, expiring, single-use upload authorization and server-side object checks; consent timestamps are saved with new bookings — prevents cross-booking photo links and preserves consent evidence.
- Response security defaults are centralized in src/lib/security-headers.ts and preserve iframe previews/OAuth popups — applies browser protections without breaking app delivery.
- AI triage runs server-side in src/lib/triagem.server.ts (Lovable AI Gateway, Responses API, structured output) and is admin-only — keeps the key and prompts off the client.
- Completed service orders create a `recebimentos` row (trigger os_financeiro); revenue reaches financial_entries only via the admin-only `registrar_pagamento` RPC — cash basis, no double counting.
- Pix BR Code, phone normalization and WhatsApp templates live in src/lib/cobranca.ts; WhatsApp sends are wa.me links logged in `mensagens_enviadas` — no paid API.
- Public catalog (/catalogo) reads catalogo_itens via anon RLS (ativo only); images in public bucket catalogo — only showcase data is public.
- Completing a service order deducts its service_order_items from stock and refreshes the linked equipment's last maintenance (trigger os_conclusao) — stock and preventive dates stay consistent.
- Service order PDFs are generated client-side with jsPDF (src/lib/osPdf.ts) on page open, previewed as page images via pdfjs-dist v4 (src/lib/pdfPreview.ts; v5 needs browser APIs older phones lack) and delivered synchronously on tap (share sheet on touch, download otherwise) — browser print and window.open fail inside the preview frame and on iOS.

- Public abuse counters use atomic service-only RPCs in rate-limit.server.ts, with keyed hashes, fixed windows, fail-open logs and no global blocking; only cf-connecting-ip is considered and hosting trust must be verified — reduces common abuse without a global denial-of-service switch.
- Public cleanup runs through an authenticated managed HTTP schedule and removes only aged unreferenced site uploads via Storage API; active upload tickets are excluded — preserves customer photos and records failures.
