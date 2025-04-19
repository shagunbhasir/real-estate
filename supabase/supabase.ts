import { createClient } from "@supabase/supabase-js";

// Using VITE_SUPABASE_* environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Ensure variables are loaded (Error handling can be added if needed)
// if (!supabaseUrl || !supabaseAnonKey) {
//     console.error("Supabase URL or Anon Key is missing. Check your .env file and Vite configuration.");
// }

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
