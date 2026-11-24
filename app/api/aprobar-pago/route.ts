import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/service';

const supabase =
  createServiceClient() ||
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return new NextResponse(renderHtml('Error de Solicitud', 'No se proporcionó ningún token de aprobación.', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // 1. Buscar el pago asociado al token
  const { data: pago, error: searchError } = await supabase
    .from('pagos')
    .select('id, estado, token_usado, monto_esperado, created_at, plan:planes(nombre, dias_duracion)')
    .eq('token_aprobacion', token)
    .single();

  if (searchError || !pago) {
    return new NextResponse(
      renderHtml('Token Inválido', 'El enlace de aprobación no existe o ha expirado.', false),
      {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }

  const tokenAgeMs = pago.created_at
    ? Date.now() - new Date(pago.created_at).getTime()
    : Number.POSITIVE_INFINITY;

  if (tokenAgeMs > 24 * 60 * 60 * 1000) {
    return new NextResponse(
      renderHtml('Enlace Expirado', 'Este enlace de aprobación superó su vigencia de 24 horas.', false),
      {
        status: 410,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }

  if (pago.token_usado || pago.estado === 'aprobado') {
    return new NextResponse(
      renderHtml('Pago Ya Aprobado', 'Este pago ya fue procesado y su plan se encuentra activo.', true),
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }

  // 2. Ejecutar la función PostgreSQL de activación precisa
  const { data: rpcResult, error: rpcError } = await supabase.rpc('aprobar_pago_con_vigencia', {
    p_pago_id: pago.id,
    p_origen: 'whatsapp_magic_link',
  });

  if (rpcError) {
    return new NextResponse(
      renderHtml('Error al Activar', `Hubo un error al activar el pago: ${rpcError.message}`, false),
      {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }

  if (!rpcResult?.ok && !rpcResult?.success) {
    return new NextResponse(
      renderHtml(
        'No se pudo aprobar el pago',
        `El pago no se activó: ${rpcResult?.error || rpcResult?.message || 'resultado inválido'}.`,
        false
      ),
      {
        status: 409,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }

  const vigencia = rpcResult?.vigente_hasta
    ? new Date(rpcResult.vigente_hasta).toLocaleString('es-PE', {
        dateStyle: 'full',
        timeStyle: 'medium',
      })
    : '23:59:59 del último día';

  return new NextResponse(
    renderHtml(
      '¡Pago Aprobado con Éxito!',
      `El anuncio ha sido activado inmediatamente con el plan adquirido. La vigencia está calculada hasta las 23:59:59 garantizadas.`,
      true,
      vigencia
    ),
    {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderHtml(titulo: string, descripcion: string, exito: boolean, fechaFin?: string) {
  const safeTitulo = escapeHtml(titulo);
  const safeDescripcion = escapeHtml(descripcion);
  const safeFechaFin = fechaFin ? escapeHtml(fechaFin) : '';

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${safeTitulo} | Mordisco Admin</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background-color: #070709;
            color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
          }
          .card {
            background: #12131a;
            border: 1px solid ${exito ? '#10b981' : '#f43f5e'};
            border-radius: 20px;
            padding: 32px 24px;
            max-width: 440px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.6);
          }
          .icon {
            width: 64px;
            height: 64px;
            margin: 0 auto 20px;
            border-radius: 50%;
            background: ${exito ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)'};
            color: ${exito ? '#10b981' : '#f43f5e'};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            font-weight: bold;
          }
          h1 { font-size: 22px; margin-bottom: 12px; font-weight: 800; }
          p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin-bottom: 20px; }
          .date-box {
            background: #191b24;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 12px;
            padding: 14px;
            margin-bottom: 24px;
            text-align: left;
          }
          .date-title { font-size: 11px; text-transform: uppercase; color: #cbd5e1; font-weight: bold; margin-bottom: 4px; }
          .date-val { font-size: 14px; color: #10b981; font-weight: bold; }
          .btn {
            display: inline-block;
            width: 100%;
            background: #e11d48;
            color: white;
            padding: 12px;
            border-radius: 12px;
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">${exito ? '✓' : '✕'}</div>
          <h1>${safeTitulo}</h1>
          <p>${safeDescripcion}</p>
          ${
            fechaFin
              ? `
            <div class="date-box">
              <div class="date-title">Vigencia Oficial Activada:</div>
              <div class="date-val">${safeFechaFin}</div>
            </div>
          `
              : ''
          }
          <a href="/" class="btn">Ir a Mordisco</a>
        </div>
      </body>
    </html>
  `;
}
