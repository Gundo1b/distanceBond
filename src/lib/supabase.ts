import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your current credentials
const supabaseUrl = 'https://eckxpwrnumkoqhtpqzgg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVja3hwd3JudW1rb3FodHBxemdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODk4NDgsImV4cCI6MjA5NTM2NTg0OH0._NJrFzCXnyu7iQunZQ9iXlH0DvuoQ032AmyNhZKZM98';

// Robust storage handler to prevent crashes if AsyncStorage is missing
const robustStorage = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.warn("AsyncStorage getItem failed:", e);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn("AsyncStorage setItem failed:", e);
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn("AsyncStorage removeItem failed:", e);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: robustStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
