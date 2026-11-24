'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogIn, UserPlus, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginForm({
  initialError,
  initialMode,
  nextPath,
}: {
  initialError: string;
  initialMode: 'login' | 'register';
  nextPath: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const isAdminFlow = nextPath.startsWith('/admin');
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreComercial, setNombreComercial] = useState('');
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  const finishLogin = async (userId: string) => {
    if (isAdminFlow) {
      const { data: perfil, error: perfilError } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', userId)
        .maybeSingle();

      if (perfilError || perfil?.rol !== 'admin') {
        await supabase.auth.signOut();
        setError('Esta cuenta no tiene permisos de administrador.');
        return false;
      }
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.is_anonymous) {
        await supabase.auth.signOut();
        setError('Debes usar una cuenta real de ofertante.');
        return false;
      }
    }

    router.replace(nextPath);
    router.refresh();
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        const response = await fetch('/api/ofertante/registro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password,
            nombre_comercial: nombreComercial.trim(),
          }),
        });
        const data = await response.json();

        if (!response.ok || !data?.ok) {
          setError(data?.error || 'No se pudo crear la cuenta.');
          return;
        }
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError || !data.user) {
        setError('Correo o contrasena incorrectos.');
        return;
      }

      await finishLogin(data.user.id);
    } catch {
      setError('No se pudo iniciar sesion. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al inicio</span>
      </Link>

      <div className="glass-panel p-6 md:p-8 rounded-2xl border border-white/10">
        <div className="flex items-center gap-2 mb-2">
          {isAdminFlow ? (
            <ShieldCheck className="w-6 h-6 text-amber-400" />
          ) : mode === 'register' ? (
            <UserPlus className="w-6 h-6 text-brand-400" />
          ) : (
            <LogIn className="w-6 h-6 text-brand-400" />
          )}
          <h1 className="text-xl font-extrabold text-white">
            {isAdminFlow
              ? 'Acceso administrativo'
              : mode === 'register'
                ? 'Crear cuenta de ofertante'
                : 'Acceso de ofertante'}
          </h1>
        </div>
        <p className="text-xs text-zinc-400 mb-6">
          {isAdminFlow
            ? 'Ingresa con una cuenta autorizada para administrar pagos, planes y etiquetas.'
            : 'Usa una cuenta real para publicar, pagar y gestionar tus anuncios.'}
        </p>

        {!isAdminFlow && (
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-dark-900 p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                mode === 'login' ? 'bg-brand-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Iniciar sesion
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                mode === 'register' ? 'bg-brand-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Crear cuenta
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isAdminFlow && mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Nombre comercial</label>
              <input
                type="text"
                value={nombreComercial}
                onChange={(e) => setNombreComercial(e.target.value)}
                autoComplete="name"
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                placeholder="Ej. Luna M."
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
              placeholder={isAdminFlow ? 'admin@mordisco.pe' : 'tu@correo.com'}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">Contrasena</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
              className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-bold transition-colors"
          >
            {mode === 'register' ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            <span>
              {loading
                ? mode === 'register'
                  ? 'Creando cuenta...'
                  : 'Ingresando...'
                : mode === 'register'
                  ? 'Crear cuenta'
                  : 'Ingresar'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
