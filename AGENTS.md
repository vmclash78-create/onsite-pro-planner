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
- Dashboard currently uses sample data from src/lib/sample-data.ts until the backend is connected.
