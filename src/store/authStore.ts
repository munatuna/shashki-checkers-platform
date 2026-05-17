import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthStore {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;

  init: () => Promise<() => void>;
  signUp: (email: string, password: string, username: string) => Promise<'ok' | 'confirm_email' | 'error'>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  loading: true,
  error: null,

  init: async () => {
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, user: data.session?.user ?? null, loading: false });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });

    return () => subscription.unsubscribe();
  },

  signUp: async (email, password, username) => {
    set({ error: null });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });

    if (error) {
      set({ error: error.message });
      return 'error';
    }

    // Email уже занят (Supabase возвращает user с пустым identities)
    if (data.user && data.user.identities?.length === 0) {
      set({ error: 'Этот email уже зарегистрирован' });
      return 'error';
    }

    // Если сразу вернулась сессия — email confirmation выключен, пользователь уже вошёл
    if (data.session) return 'ok';

    // Иначе — нужно подтверждение email
    return 'confirm_email';
  },

  signIn: async (email, password) => {
    set({ error: null });

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) set({ error: error.message });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },

  clearError: () => set({ error: null }),
}));
