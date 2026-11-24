-- ============================================================================
-- MORDISCO - CREAR/ASCENDER ADMIN
-- 1. Crea el usuario en Supabase Authentication > Users.
-- 2. Reemplaza admin@mordisco.pe por el correo real.
-- 3. Ejecuta este script en Supabase SQL Editor.
-- ============================================================================

insert into public.perfiles (
  id,
  nombre_comercial,
  telefono,
  telefono_verificado,
  rol
)
select
  id,
  coalesce(nullif(raw_user_meta_data->>'nombre_comercial', ''), split_part(email, '@', 1)),
  '',
  true,
  'admin'
from auth.users
where email = 'admin@mordisco.com'
on conflict (id) do update
set rol = 'admin',
    telefono_verificado = true;
