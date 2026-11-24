import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function OfertanteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.is_anonymous) {
    redirect('/login?mode=register&next=/ofertante');
  }

  return <>{children}</>;
}
