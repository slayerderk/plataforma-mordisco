import LoginForm from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const nextPath =
    params.next && params.next.startsWith('/') && !params.next.startsWith('//')
      ? params.next
      : '/ofertante';
  const mode = params.mode === 'register' ? 'register' : 'login';
  const initialError =
    params.error === 'sin_permiso'
      ? 'Esta cuenta no tiene permisos de administrador.'
      : params.error === 'anonimo'
        ? 'Debes iniciar sesion como ofertante para publicar o pagar.'
        : '';

  return <LoginForm initialError={initialError} initialMode={mode} nextPath={nextPath} />;
}
