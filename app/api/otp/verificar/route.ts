import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hashOtp } from '@/lib/otp';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const codigo = String(body.codigo || '').replace(/\D/g, '');

    if (!/^\d{6}$/.test(codigo)) {
      return NextResponse.json(
        { ok: false, error: 'Ingresa el código de 6 dígitos.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

  if (!user || user.is_anonymous) {
    return NextResponse.json(
      { ok: false, error: 'Debes iniciar sesión como ofertante antes de verificar el código.' },
      { status: 401 }
    );
  }

    const { data, error } = await supabase.rpc('verificar_otp_perfil', {
      p_codigo_hash: hashOtp(codigo),
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: 'No se pudo verificar el código.' },
        { status: 500 }
      );
    }

    if (!data?.ok) {
      if (data?.error === 'too_many_attempts') {
        return NextResponse.json(
          { ok: false, error: 'Demasiados intentos. Solicita un nuevo código.' },
          { status: 429 }
        );
      }

      if (data?.error === 'expired') {
        return NextResponse.json(
          { ok: false, error: 'El código expiró. Solicita uno nuevo.' },
          { status: 410 }
        );
      }

      return NextResponse.json(
        { ok: false, error: 'El código es incorrecto. Revísalo e intenta de nuevo.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'No se pudo procesar la verificación.' },
      { status: 500 }
    );
  }
}
