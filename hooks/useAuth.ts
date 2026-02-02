import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const { session, isLoading } = useAuthStore();

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    session,
    user: session?.user ?? null,
    isLoading,
    isAuthenticated: !!session,
    signOut,
  };
}
