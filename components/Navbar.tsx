'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, PlusCircle, Search, ShieldCheck, Menu, X, Sparkles } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-50 glass-panel border-b border-white/10 px-4 lg:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-rose-400 flex items-center justify-center shadow-lg shadow-brand-600/30 group-hover:scale-105 transition-transform">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-brand-500 bg-clip-text text-transparent">
                MORDISCO
              </span>
              <span className="text-[10px] tracking-widest uppercase font-semibold text-zinc-400 -mt-1">
                Servicios & Talento
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link
              href="/"
              className={`transition-colors hover:text-brand-500 ${
                pathname === '/' ? 'text-brand-500 font-semibold' : 'text-zinc-300'
              }`}
            >
              Explorar Anuncios
            </Link>
            <Link
              href="/#planes"
              className="text-zinc-300 hover:text-brand-500 transition-colors"
            >
              Planes & Tarifas
            </Link>
            <Link
              href="/admin"
              className={`flex items-center gap-1.5 transition-colors hover:text-amber-400 ${
                pathname.startsWith('/admin') ? 'text-amber-400 font-semibold' : 'text-zinc-300'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Panel Admin
            </Link>
          </nav>

          {/* Action Button */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/publicar"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-rose-600 hover:from-brand-500 hover:to-rose-500 text-white font-medium text-sm shadow-md shadow-brand-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Publicar Anuncio</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-4 pb-3 border-t border-white/10 mt-3 flex flex-col gap-3">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-zinc-200 hover:bg-white/5 font-medium"
            >
              Explorar Anuncios
            </Link>
            <Link
              href="/#planes"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-zinc-200 hover:bg-white/5 font-medium"
            >
              Planes & Tarifas
            </Link>
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-amber-400 hover:bg-white/5 font-medium flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Panel Admin
            </Link>
            <Link
              href="/publicar"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-medium text-sm shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Publicar Anuncio</span>
            </Link>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar (Estilo App Nativa) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-950/90 backdrop-blur-lg border-t border-white/10 px-6 py-2.5 flex items-center justify-between text-[11px] font-medium text-zinc-400">
        <Link href="/" className={`flex flex-col items-center gap-1 ${pathname === '/' ? 'text-brand-500' : ''}`}>
          <Search className="w-5 h-5" />
          <span>Explorar</span>
        </Link>
        <Link href="/publicar" className="flex flex-col items-center gap-1 -mt-5">
          <div className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/40">
            <PlusCircle className="w-6 h-6" />
          </div>
          <span className="text-zinc-200 font-semibold">Publicar</span>
        </Link>
        <Link href="/admin" className={`flex flex-col items-center gap-1 ${pathname.startsWith('/admin') ? 'text-amber-400' : ''}`}>
          <ShieldCheck className="w-5 h-5" />
          <span>Admin</span>
        </Link>
      </div>
    </>
  );
}
