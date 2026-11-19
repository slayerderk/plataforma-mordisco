import { createClient } from './supabase/client';

export interface WhatsAppConfig {
  whatsapp_admin: string;
  modo_whatsapp: 'autonomo' | 'manual' | 'hibrido';
  evolution_api_url?: string;
  evolution_api_key?: string;
}

/**
 * Envía un mensaje vía Evolution API (o servicio Baileys)
 * Si falla o está en modo manual/híbrido, genera el enlace de respaldo wa.me
 */
export async function notificarAdminPorWhatsApp({
  anuncioId,
  tituloAnuncio,
  nombreOfertante,
  planNombre,
  monto,
  tokenAprobacion,
  comprobanteUrl,
  config,
}: {
  anuncioId: string;
  tituloAnuncio: string;
  nombreOfertante: string;
  planNombre: string;
  monto: number;
  tokenAprobacion: string;
  comprobanteUrl: string;
  config: WhatsAppConfig;
}) {
  const adminPhone = config.whatsapp_admin.replace(/\D/g, '') || '51935910409';
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
  const magicLink = `${siteUrl}/api/aprobar-pago?token=${tokenAprobacion}`;

  // Formato del mensaje para WhatsApp
  const mensajeTexto = `🔔 *¡NUEVO PAGO EN MORDISCO!*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Ofertante:* ${nombreOfertante}\n` +
    `📌 *Anuncio:* ${tituloAnuncio}\n` +
    `📦 *Plan:* ${planNombre}\n` +
    `💰 *Monto:* S/ ${monto.toFixed(2)}\n` +
    `🖼️ *Comprobante:* ${comprobanteUrl}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 *APROBACIÓN INMEDIATA (1 Toque):*\n` +
    `👉 ${magicLink}\n\n` +
    `_(Al tocar el enlace, el anuncio se activa hasta las 23:59:59 automáticamente)_`;

  const waMeUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(mensajeTexto)}`;

  // 1. Si está en modo Manual, retorna directamente el wa.me
  if (config.modo_whatsapp === 'manual') {
    return { success: false, fallbackUrl: waMeUrl, method: 'manual' };
  }

  // 2. Si está en modo Autónomo o Híbrido, intentamos llamar a Evolution API
  if (config.evolution_api_url && config.evolution_api_key) {
    try {
      const endpoint = `${config.evolution_api_url.replace(/\/$/, '')}/message/sendText/mordisco`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: config.evolution_api_key,
        },
        body: JSON.stringify({
          number: adminPhone,
          text: mensajeTexto,
        }),
      });

      if (res.ok) {
        return { success: true, method: 'evolution_api' };
      }
    } catch (err) {
      console.warn('Evolution API no respondió o falló:', err);
    }
  }

  // 3. Respaldo (Fallback): si falló la API pero es modo híbrido
  return { success: false, fallbackUrl: waMeUrl, method: 'hibrido_fallback' };
}
