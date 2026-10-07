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
- Internal panel pages use `AppShell` (src/components/AppShell.tsx) for sidebar/mobile nav; the public booking page (/agendar) renders without it — keeps public and staff UI separated.
- Formatting of dates/currency goes through src/lib/format.ts (pt-BR) — single source for BR formats.
- Staff panel routes live under src/routes/_authenticated/ (client-only auth gate); `/` redirects to `/inicio` — keeps every customer-data screen behind sign-in.
- Panel screens read/write through the browser Supabase client with RLS (`is_staff`) — no per-screen server functions needed for CRUD.
- Access is role-based via `user_roles` (admin/tecnico); the first account becomes admin, later accounts wait for an admin in Equipe — prevents open sign-up from exposing data.
- Public booking writes only through server functions in src/lib/pedidos.functions.ts (signed upload URLs + validated insert); anon has no table access — keeps customer data private.
- AI triage runs server-side in src/lib/triagem.server.ts (Lovable AI Gateway, Responses API, structured output) and is admin-only — keeps the key and prompts off the client.
