CREATE TABLE public.booking_upload_authorizations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 proof_hash text NOT NULL,
 paths text[] NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT now() + interval '1 hour',
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT booking_upload_paths_count CHECK (cardinality(paths) BETWEEN 1 AND 3)
);
GRANT ALL ON public.booking_upload_authorizations TO service_role;
REVOKE ALL ON public.booking_upload_authorizations FROM anon, authenticated;
ALTER TABLE public.booking_upload_authorizations ENABLE ROW LEVEL SECURITY;
CREATE INDEX booking_upload_authorizations_expiry ON public.booking_upload_authorizations(expires_at);
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS consentimento_lgpd_em timestamptz;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS consentimento_lgpd_versao text;
COMMENT ON TABLE public.booking_upload_authorizations IS 'Server-only single-use authorization for public booking photo submission; proof stored as SHA-256, never exposed to browser reads.';