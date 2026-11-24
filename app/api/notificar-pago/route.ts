import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/service';
import { buildWaMeUrl, enviarWhatsApp, getAdminWhatsApp } from '@/lib/whatsapp-server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pagoId = String(body.pagoId || '');

    if (!pagoId) {
      return NextResponse.json({ success: false, error: 'Pago no indicado.' }, { status: 400 });
    }

    const supabase =
      createServiceClient() ||
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

    const { data: pago, error } = await supabase
      .from('pagos')
      .select(
        'id, monto_esperado, comprobante_url, token_aprobacion, anuncio:anuncios(titulo, usuario:perfiles(nombre_comercial)), plan:planes(nombre)'
      )
      .eq('id', pagoId)
      .single();

    if (error || !pago) {
      return NextResponse.json(
        { success: false, error: 'No se encontró el pago.' },
        { status: 404 }
      );
    }

    let adminPhone = getAdminWhatsApp();

    if (!adminPhone) {
      const { data: config } = await supabase
        .from('configuracion_admin')
        .select('whatsapp_admin')
        .eq('id', 1)
        .maybeSingle();

      adminPhone = (config?.whatsapp_admin || '').replace(/\D/g, '');
    }

    if (!adminPhone || !pago.token_aprobacion) {
      return NextResponse.json(
        { success: false, error: 'Falta configurar el WhatsApp administrador.' },
        { status: 503 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const magicLink = `${siteUrl}/api/aprobar-pago?token=${pago.token_aprobacion}`;
    const anuncio = Array.isArray(pago.anuncio) ? pago.anuncio[0] : pago.anuncio;
    const usuario = Array.isArray(anuncio?.usuario) ? anuncio.usuario[0] : anuncio?.usuario;
    const plan = Array.isArray(pago.plan) ? pago.plan[0] : pago.plan;

    const mensaje =
      '🔔 *¡NUEVO PAGO EN MORDISCO!*\n' +
      '━━━━━━━━━━━━━━━━━━━━\n' +
      `👤 *Ofertante:* ${usuario?.nombre_comercial || 'Ofertante'}\n` +
      `📌 *Anuncio:* ${anuncio?.titulo || 'Servicio'}\n` +
      `📦 *Plan:* ${plan?.nombre || 'Destacado'}\n` +
      `💰 *Monto:* S/ ${Number(pago.monto_esperado || 0).toFixed(2)}\n` +
      '━━━━━━━━━━━━━━━━━━━━\n' +
      '👇 *APROBACIÓN INMEDIATA (1 Toque):*\n' +
      `👉 ${magicLink}\n\n` +
      '_(Al tocar el enlace, el anuncio se activa hasta las 23:59:59 automáticamente)_';

    const envio = await enviarWhatsApp(adminPhone, mensaje);

    if (envio.success) {
      return NextResponse.json({ success: true, method: 'evolution_api' });
    }

    return NextResponse.json({
      success: false,
      method: envio.configured ? 'hibrido_fallback' : 'manual',
      fallbackUrl: buildWaMeUrl(adminPhone, mensaje),
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'No se pudo notificar el pago.' },
      { status: 500 }
    );
  }
}
