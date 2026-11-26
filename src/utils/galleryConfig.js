// Theme gallery backend (Supabase). Fill both values from the project's
// Settings → API page: the project URL and the *publishable* key (sb_publishable_…).
// The publishable key is meant to ship in clients; the database only lets it call the
// gallery_* functions in supabase/migrations. Never put a secret/service_role key here.
// Empty values = the Gallery shows "not set up yet".
export const GALLERY_CONFIG = {
  url: 'https://oacycvusaanwbfqnqhva.supabase.co',
  publishableKey: 'sb_publishable_HRb31fAJbDUAyV6KdMN7_w_id_8JRCh',
};

export const GALLERY_PAGE_SIZE = 30;
