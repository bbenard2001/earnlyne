import 'server-only';
import { createClient } from '@supabase/supabase-js';

/** Service-role client. Bypasses RLS — use ONLY on the server for trusted jobs (the Stripe webhook, account deletion). */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
