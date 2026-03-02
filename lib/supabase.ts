import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Use Service Role Key for backend administrative tasks (bypassing RLS)
// This is only initialized on the server side to prevent client-side errors
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = (typeof window === 'undefined' && supabaseServiceRoleKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null as any;
