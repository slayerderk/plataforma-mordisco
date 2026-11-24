import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim();
    const password = String(body?.password || '');
    const nombreComercial = String(body?.nombre_comercial || '').trim();

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Correo y contrasena son obligatorios.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ ok: false, error: 'La contrasena debe tener al menos 6 caracteres.' }, { status: 400 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Falta SUPABASE_SERVICE_ROLE_KEY.' }, { status: 500 });
    }
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre_comercial: nombreComercial || email.split('@')[0],
      },
    });

    if (error || !data.user) {
      return NextResponse.json({ ok: false, error: error?.message || 'No se pudo crear la cuenta.' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, userId: data.user.id });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Error inesperado.' }, { status: 500 });
  }
}
