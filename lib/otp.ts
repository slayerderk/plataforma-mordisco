import { createHmac, randomInt } from 'crypto';

export function generarCodigoOtp() {
  return randomInt(0, 1000000).toString().padStart(6, '0');
}

export function hashOtp(codigo: string) {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret) {
    throw new Error('Falta configurar OTP_HASH_SECRET.');
  }

  return createHmac('sha256', secret).update(codigo).digest('hex');
}

export function getOtpServerSecret() {
  const secret = process.env.OTP_SERVER_SECRET;

  if (!secret) {
    throw new Error('Falta configurar OTP_SERVER_SECRET.');
  }

  return secret;
}
