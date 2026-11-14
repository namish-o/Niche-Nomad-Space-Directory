/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IRSA_BASE?: string;
  readonly VITE_SIMBAD_BASE?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string;
  readonly VITE_APP_VERSION?: string;
}
