import { createClient } from "@supabase/supabase-js";

/**
 * Learner's Note: How import.meta.env Works in Vite
 * ─────────────────────────────────────────────────
 * In Vite, environment variables are accessed via the `import.meta.env` object.
 * Variables must be prefixed with VITE_ to be exposed to client-side code.
 *
 * Example .env file:
 *   VITE_SUPABASE_URL=https://your-project.supabase.co
 *   VITE_SUPABASE_ANON_KEY=your-anon-key
 *
 * Access in code:
 *   import.meta.env.VITE_SUPABASE_URL
 *   import.meta.env.VITE_SUPABASE_ANON_KEY
 *
 * Important: Never expose your service/secret key to the client.
 * The anon key is safe for client-side use as it respects RLS policies.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);