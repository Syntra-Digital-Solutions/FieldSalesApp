import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cnzynlyijrdvuxnaehvz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuenlubHlpanJkdnV4bmFlaHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzY2NDUsImV4cCI6MjEwMzc1MjY0NX0.sTugMjcw-RsJ-HW4NbcJnvTNiGFkT1PoN77CDfpmuLc';

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'fieldsalesapp-admin-only',
  },
});