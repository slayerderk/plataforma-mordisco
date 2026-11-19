import React from 'react';
import Link from 'next/link';
import { Flame, Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-dark-950 mt-20 pb-20 md:pb-12 pt-12 text-zinc-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
              <Flame className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">MORDISCO</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
            Directorio y plataforma de clasificados de servicios profesionales y talento independiente en el Perú. Conectando clientes y ofertantes de forma directa.
          </p>
        </div>

        <div>
          <h4 className="text-white font-semibold text-sm mb-3">Marco Legal & Seguridad</h4>
          <ul className="space-y-2 text-xs">
            <li className="flex items-center gap-1.5 text-zinc-400">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Verificación de contacto con código OTP</span>
            </li>
            <li>Directorio exclusivamente publicitario independiente.</li>
            <li>Prohibido el uso para actividades ilegales o menores de edad.</li>
            <li>Términos y Condiciones del Servicio en Perú.</li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold text-sm mb-3">Métodos de Pago Admitidos</h4>
          <p className="text-xs text-zinc-400 mb-3">
            Activación inmediata de planes destacados mediante validación rápida de comprobantes:
          </p>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-md bg-[#742384]/30 border border-[#742384] text-[#d672ef] text-xs font-bold">
              YAPE
            </span>
            <span className="px-3 py-1 rounded-md bg-[#00a9e0]/20 border border-[#00a9e0] text-[#4ed2ff] text-xs font-bold">
              PLIN
            </span>
            <span className="text-xs text-zinc-400">Validación IA & Realtime</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-xs text-zinc-400 gap-4">
        <p>© {new Date().getFullYear()} Mordisco. Todos los derechos reservados.</p>
        <p className="text-[11px] text-zinc-400">
          Diseñado para alta velocidad, responsive y escalabilidad a aplicación móvil.
        </p>
      </div>
    </footer>
  );
}
