import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill in the project values.'
  );
}

// K-Board's tables live in the mlb schema (this Supabase project also hosts
// unrelated apps in other schemas), so the client is pinned to it once here.
// Every read is additionally gated by RLS to rows visible only to callers
// present in mlb.kboard_access -- see supabase/migrations for the policies.
export const supabase = createClient<Database, 'mlb'>(url, anonKey, {
  db: { schema: 'mlb' },
});
