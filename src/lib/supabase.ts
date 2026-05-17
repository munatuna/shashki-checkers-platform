import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || url.includes('your-project')) {
  console.error('[Supabase] VITE_SUPABASE_URL не настроен в .env.local');
}
if (!key || key.includes('your-anon-key')) {
  console.error('[Supabase] VITE_SUPABASE_ANON_KEY не настроен в .env.local');
}

export const supabase = createClient(url ?? '', key ?? '');
