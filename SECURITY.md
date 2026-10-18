# Security Policy

## Supported versions

Security fixes are intended for the latest version on the default branch.

## Reporting a vulnerability

Do not publish credentials, personal data, or a working exploit in a public issue. If GitHub private vulnerability reporting is enabled for this repository, use **Security → Report a vulnerability**. Otherwise, contact the repository owner privately through GitHub and include the affected route/table/function, impact, and reproduction steps. Remove tokens and personal data from logs.

## Secrets and deployment

- Never commit `.env`, service-role keys, cron tokens, or other server credentials.
- `VITE_*` variables are public build-time values and must never contain secrets.
- A Supabase publishable key is designed for client use, but RLS and server-side authorization must still protect data.
- Removing a file from the current branch does not erase it from Git history. Rotate any real secret that was committed and review history.
- Database migrations and storage policy changes must be applied and verified in the actual Supabase/Lovable environment; a passing build does not deploy migrations to production.
