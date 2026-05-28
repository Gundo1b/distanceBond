import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your current credentials
const supabaseUrl = 'https://eckxpwrnumkoqhtpqzgg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVja3hwd3JudW1rb3FodHBxemdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODk4NDgsImV4cCI6MjA5NTM2NTg0OH0._NJrFzCXnyu7iQunZQ9iXlH0DvuoQ032AmyNhZKZM98';

const isWebServer = Platform.OS === 'web' && typeof window === 'undefined';

const webStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? webStorage : AsyncStorage,
    autoRefreshToken: !isWebServer,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
