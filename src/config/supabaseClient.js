import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cnzynlyijrdvuxnaehvz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuenlubHlpanJkdnV4bmFlaHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzY2NDUsImV4cCI6MjEwMzc1MjY0NX0.sTugMjcw-RsJ-HW4NbcJnvTNiGFkT1PoN77CDfpmuLc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: false, // 🚨 CHANGED: Stop the background network spam
    persistSession: true,
    detectSessionInUrl: false,
  },
});