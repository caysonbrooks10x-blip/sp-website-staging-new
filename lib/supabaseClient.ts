import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
}

export { supabaseUrl, supabaseAnonKey };

// Export legacy secret for backward compatibility if needed, but it should be avoided
// export const supabaseLegacySecret = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
