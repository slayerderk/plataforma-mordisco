import type { SupabaseClient } from '@supabase/supabase-js';

export async function requireOfertanteSession(
  supabase: SupabaseClient,
  router: any,
  nextPath: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.is_anonymous) {
    router.replace(`/login?mode=register&next=${encodeURIComponent(nextPath)}`);
    throw new Error('Debes iniciar sesion como ofertante.');
  }

  return user;
}
