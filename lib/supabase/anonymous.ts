import type { SupabaseClient, User } from '@supabase/supabase-js';

export async function ensureAnonymousSession(supabase: SupabaseClient): Promise<User> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) return user;

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error || !data.user) {
    throw new Error(
      'No se pudo iniciar la sesión de publicación. Habilita Anonymous Sign-Ins en Supabase Auth.'
    );
  }

  return data.user;
}
