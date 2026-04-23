import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lrjdtnkoljuftssakvlc.supabase.co'

export const getSupabase = (anonKey) => {
  const key = anonKey || localStorage.getItem('supabase_anon_key') || 'YOUR_ANON_KEY';
  return createClient(supabaseUrl, key);
};

// For backward compatibility or default use
export const supabase = getSupabase();
