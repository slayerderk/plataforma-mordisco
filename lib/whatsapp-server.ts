import { normalizarTelefonoPeru } from './whatsapp';

export function getAdminWhatsApp() {
  return (process.env.WHATSAPP_ADMIN || '').replace(/\D/g, '');
}

export function buildWaMeUrl(numero: string, texto: string) {
  return `https://wa.me/${normalizarTelefonoPeru(numero)}?text=${encodeURIComponent(texto)}`;
}

export async function enviarWhatsApp(numero: string, texto: string) {
  const baseUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE || 'mordisco';

  if (!baseUrl || !apiKey) {
    return { success: false, configured: false as const };
  }

  try {
    const response = await fetch(`${baseUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: normalizarTelefonoPeru(numero),
        text: texto,
      }),
    });

    if (response.ok) {
      return { success: true, configured: true as const };
    }

    return {
      success: false,
      configured: true as const,
      error: `Evolution API respondió con estado ${response.status}.`,
    };
  } catch {
    return {
      success: false,
      configured: true as const,
      error: 'No se pudo conectar con Evolution API.',
    };
  }
}
