import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enviarWhatsApp } from '@/lib/whatsapp-server';
import { generarCodigoOtp, getOtpServerSecret, hashOtp } from '@/lib/otp';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const telefono = String(body.telefono || '').replace(/\D/g, '');
    const nombre = String(body.nombre || '').trim().slice(0, 120);

    if (telefono.length < 9 || telefono.length > 11) {
      return NextResponse.json(
        { ok: false, error: 'Ingresa un número de WhatsApp válido.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.is_anonymous) {
      return NextResponse.json(
        { ok: false, error: 'Debes iniciar sesión como ofertante antes de solicitar el código.' },
        { status: 401 }
      );
    }

    const codigo = generarCodigoOtp();
    const codigoHash = hashOtp(codigo);
    const expira = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { data, error } = await supabase.rpc('solicitar_otp_perfil', {
      p_telefono: telefono,
      p_nombre: nombre,
      p_codigo_hash: codigoHash,
      p_expira: expira,
      p_server_secret: getOtpServerSecret(),
    });

    if (error) {
      console.error('OTP solicitar RPC error:', error.message, error.details, error.hint);
      return NextResponse.json(
        { ok: false, error: 'No se pudo generar el código de verificación.' },
        { status: 500 }
      );
    }

    if (!data?.ok) {
      if (data?.error === 'rate_limited') {
        return NextResponse.json(
          { ok: false, error: 'Espera al menos 60 segundos antes de pedir otro código.' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { ok: false, error: 'No se pudo iniciar la verificación.' },
        { status: 400 }
      );
    }

    const mensaje =
      '🔐 *MORDISCO - VERIFICACIÓN DE WHATSAPP*\n\n' +
      `Tu código de seguridad es: *${codigo}*\n\n` +
      'Vence en 5 minutos. Si no solicitaste este código, ignora este mensaje.';

    const envio = await enviarWhatsApp(telefono, mensaje);

    if (!envio.success) {
      if (process.env.NODE_ENV !== 'production') {
        return NextResponse.json({
          ok: true,
          delivery: 'debug',
          debugCode: codigo,
          warning:
            'Evolution API no está configurada; se devolvió el código solo porque estás en desarrollo.',
        });
      }

      return NextResponse.json(
        {
          ok: false,
          error: envio.configured
            ? envio.error
            : 'El envío automático de OTP no está configurado. Contacta a soporte.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true, delivery: 'evolution' });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'No se pudo procesar la solicitud de verificación.' },
      { status: 500 }
    );
  }
}
