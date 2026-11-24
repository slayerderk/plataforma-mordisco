import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string | null) {
  if (!dateString) return 'No definida';
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateString));
}

export function getPlanBeneficiosExtras(plan: { caracteristicas?: unknown }): string[] {
  return Array.isArray(plan.caracteristicas)
    ? plan.caracteristicas.filter(
        (item): item is string =>
          typeof item === 'string' &&
          item.trim().length > 0 &&
          !/^hasta\s+\d+\s+fotos?$/i.test(item.trim())
      )
    : [];
}

export function getPlanBeneficios(plan: { limite_fotos: number; caracteristicas?: unknown }): string[] {
  return [`Hasta ${plan.limite_fotos} fotos`, ...getPlanBeneficiosExtras(plan)];
}

/**
 * Optimiza y comprime una imagen en el navegador a formato WebP
 */
export async function compressImageToWebP(file: File, maxDimension = 1440, quality = 0.82): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('No se pudo inicializar el canvas'));
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('Fallo al comprimir imagen'));
            }
            const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            const newFile = new File([blob], `${cleanName}.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve(newFile);
          },
          'image/webp',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
