-- ============================================================================
-- MORDISCO - ENDURECIMIENTO P0
-- Ejecutar en Supabase SQL Editor con un usuario administrador.
--
-- Antes de ejecutar:
-- 1. Habilitar Anonymous Sign-Ins en Authentication > Providers.
-- 2. Crear el usuario admin en Authentication > Users.
-- 3. Reemplazar CAMBIAR_OTP_SERVER_SECRET por el mismo valor de
--    OTP_SERVER_SECRET en .env.local.
-- 4. Ejecutar este script una sola vez y revisar los resultados.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Configuración privada del servidor (sin acceso anon/authenticated)
-- ----------------------------------------------------------------------------
create table if not exists public.configuracion_privada (
  id integer primary key default 1 check (id = 1),
  otp_server_secret text not null,
  updated_at timestamptz not null default now()
);

alter table public.configuracion_privada enable row level security;
revoke all on table public.configuracion_privada from anon, authenticated;

insert into public.configuracion_privada (id, otp_server_secret)
values (1, 'CAMBIAR_OTP_SERVER_SECRET')
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 2. Columnas OTP
-- ----------------------------------------------------------------------------
alter table public.perfiles add column if not exists otp_intentos integer not null default 0;
alter table public.perfiles add column if not exists otp_ultimo_envio timestamptz;

-- ----------------------------------------------------------------------------
-- 3. Quitar secretos de Evolution de la tabla pública
-- ----------------------------------------------------------------------------
alter table public.configuracion_admin drop column if exists evolution_api_url;
alter table public.configuracion_admin drop column if exists evolution_api_key;

-- ----------------------------------------------------------------------------
-- 4. Helper de rol admin
-- ----------------------------------------------------------------------------
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.perfiles
    where id = (select auth.uid())
      and rol = 'admin'
  );
$$;

revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. RPC para solicitar OTP (solo el servidor conoce el secreto)
-- ----------------------------------------------------------------------------
create or replace function public.solicitar_otp_perfil(
  p_telefono text,
  p_nombre text,
  p_codigo_hash text,
  p_expira timestamptz,
  p_server_secret text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
  v_ultimo_envio timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'no_session');
  end if;

  if not exists (
    select 1
    from public.configuracion_privada
    where id = 1
      and otp_server_secret = p_server_secret
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select otp_ultimo_envio
  into v_ultimo_envio
  from public.perfiles
  where id = v_uid;

  if v_ultimo_envio is not null and v_ultimo_envio > now() - interval '60 seconds' then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  insert into public.perfiles (
    id,
    nombre_comercial,
    telefono,
    telefono_verificado,
    codigo_otp,
    otp_expira,
    otp_intentos,
    otp_ultimo_envio
  )
  values (
    v_uid,
    coalesce(nullif(trim(p_nombre), ''), 'Ofertante Mordisco'),
    p_telefono,
    false,
    p_codigo_hash,
    p_expira,
    0,
    now()
  )
  on conflict (id) do update
  set nombre_comercial = excluded.nombre_comercial,
      telefono = excluded.telefono,
      telefono_verificado = false,
      codigo_otp = excluded.codigo_otp,
      otp_expira = excluded.otp_expira,
      otp_intentos = 0,
      otp_ultimo_envio = now();

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.solicitar_otp_perfil(text, text, text, timestamptz, text) from public;
grant execute on function public.solicitar_otp_perfil(text, text, text, timestamptz, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 6. RPC para verificar OTP
-- ----------------------------------------------------------------------------
create or replace function public.verificar_otp_perfil(p_codigo_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
  v_perfil record;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'no_session');
  end if;

  select codigo_otp, otp_expira, otp_intentos, telefono_verificado
  into v_perfil
  from public.perfiles
  where id = v_uid
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_perfil.telefono_verificado then
    return jsonb_build_object('ok', true);
  end if;

  if v_perfil.otp_intentos >= 5 then
    return jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  end if;

  if v_perfil.otp_expira is null or v_perfil.otp_expira < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  if v_perfil.codigo_otp is null or v_perfil.codigo_otp <> p_codigo_hash then
    update public.perfiles
    set otp_intentos = otp_intentos + 1
    where id = v_uid;

    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  update public.perfiles
  set telefono_verificado = true,
      codigo_otp = null,
      otp_expira = null,
      otp_intentos = 0
  where id = v_uid;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.verificar_otp_perfil(text) from public;
grant execute on function public.verificar_otp_perfil(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 7. Limpiar políticas anteriores y activar RLS
-- ----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'departamentos', 'provincias', 'distritos', 'planes', 'etiquetas',
        'configuracion_admin', 'cupones', 'anuncios', 'anuncio_etiquetas',
        'perfiles', 'pagos'
      ])
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end;
$$;

alter table public.departamentos enable row level security;
alter table public.provincias enable row level security;
alter table public.distritos enable row level security;
alter table public.planes enable row level security;
alter table public.etiquetas enable row level security;
alter table public.configuracion_admin enable row level security;
alter table public.cupones enable row level security;
alter table public.anuncios enable row level security;
alter table public.anuncio_etiquetas enable row level security;
alter table public.perfiles enable row level security;
alter table public.pagos enable row level security;

-- ----------------------------------------------------------------------------
-- 8. Permisos de tablas y columnas
-- ----------------------------------------------------------------------------
revoke all on public.departamentos, public.provincias, public.distritos,
  public.planes, public.etiquetas, public.configuracion_admin, public.cupones,
  public.anuncios, public.anuncio_etiquetas, public.perfiles, public.pagos
from anon, authenticated;

grant select on public.departamentos, public.provincias, public.distritos to anon, authenticated;
grant select on public.planes, public.etiquetas, public.cupones to anon, authenticated;
grant insert, update, delete on public.planes, public.etiquetas, public.cupones to authenticated;

grant select (id, logo_url, peso_max_foto_mb, plin_activo, qr_plin_url, qr_yape_url,
  telefono_pago, titular_pago, updated_at, yape_activo, dias_espera_republicar)
on public.configuracion_admin to anon, authenticated;

grant select (id, logo_url, peso_max_foto_mb, plin_activo, qr_plin_url, qr_yape_url,
  telefono_pago, titular_pago, updated_at, yape_activo, dias_espera_republicar,
  whatsapp_admin, modo_whatsapp)
on public.configuracion_admin to authenticated;

grant update (logo_url, peso_max_foto_mb, plin_activo, qr_plin_url, qr_yape_url,
  telefono_pago, titular_pago, updated_at, yape_activo, dias_espera_republicar,
  whatsapp_admin, modo_whatsapp)
on public.configuracion_admin to authenticated;

grant select (id, nombre_comercial, telefono, telefono_verificado, rol, created_at, updated_at)
on public.perfiles to anon, authenticated;
grant update (nombre_comercial, telefono, updated_at) on public.perfiles to authenticated;

grant select on public.anuncios to anon, authenticated;
grant insert, update, delete on public.anuncios to authenticated;

grant select on public.anuncio_etiquetas to anon, authenticated;
grant insert, delete on public.anuncio_etiquetas to authenticated;

grant select, insert on public.pagos to authenticated;
grant update on public.pagos to authenticated;

-- ----------------------------------------------------------------------------
-- 9. Políticas de catálogos
-- ----------------------------------------------------------------------------
create policy "Lectura publica departamentos" on public.departamentos
  for select to public using (true);
create policy "Lectura publica provincias" on public.provincias
  for select to public using (true);
create policy "Lectura publica distritos" on public.distritos
  for select to public using (true);

create policy "Lectura publica planes activos" on public.planes
  for select to public using (activo = true);
create policy "Admin gestiona planes" on public.planes
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy "Lectura publica etiquetas activas" on public.etiquetas
  for select to public using (activo = true);
create policy "Admin gestiona etiquetas" on public.etiquetas
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy "Lectura publica configuracion" on public.configuracion_admin
  for select to public using (true);
create policy "Admin actualiza configuracion" on public.configuracion_admin
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

create policy "Lectura publica cupones vigentes" on public.cupones
  for select to public using (
    activo = true
    and (fecha_expiracion is null or fecha_expiracion > now())
    and (usos_maximos is null or coalesce(usos_actuales, 0) < usos_maximos)
  );
create policy "Admin gestiona cupones" on public.cupones
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- ----------------------------------------------------------------------------
-- 10. Perfiles
-- ----------------------------------------------------------------------------
create policy "Lectura publica de perfiles" on public.perfiles
  for select to public using (true);

create policy "Usuario actualiza su perfil" on public.perfiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ----------------------------------------------------------------------------
-- 11. Anuncios y etiquetas
-- ----------------------------------------------------------------------------
create policy "Lectura de anuncios" on public.anuncios
  for select to public using (
    (activo = true and (vigente_hasta is null or vigente_hasta > now()))
    or usuario_id = (select auth.uid())
    or public.es_admin()
  );

create policy "Crear anuncio propio" on public.anuncios
  for insert to authenticated
  with check (usuario_id = (select auth.uid()));

create policy "Actualizar anuncio propio" on public.anuncios
  for update to authenticated
  using (usuario_id = (select auth.uid()) or public.es_admin())
  with check (usuario_id = (select auth.uid()) or public.es_admin());

create policy "Eliminar anuncio propio" on public.anuncios
  for delete to authenticated
  using (usuario_id = (select auth.uid()) or public.es_admin());

create policy "Lectura publica de etiquetas de anuncios" on public.anuncio_etiquetas
  for select to public using (true);

create policy "Gestionar etiquetas de anuncios propios" on public.anuncio_etiquetas
  for all to authenticated
  using (
    exists (
      select 1
      from public.anuncios
      where anuncios.id = anuncio_etiquetas.anuncio_id
        and (anuncios.usuario_id = (select auth.uid()) or public.es_admin())
    )
  )
  with check (
    exists (
      select 1
      from public.anuncios
      where anuncios.id = anuncio_etiquetas.anuncio_id
        and (anuncios.usuario_id = (select auth.uid()) or public.es_admin())
    )
  );

-- ----------------------------------------------------------------------------
-- 12. Pagos
-- ----------------------------------------------------------------------------
create policy "Ver pagos propios" on public.pagos
  for select to authenticated
  using (
    exists (
      select 1
      from public.anuncios
      where anuncios.id = pagos.anuncio_id
        and (anuncios.usuario_id = (select auth.uid()) or public.es_admin())
    )
  );

create policy "Crear pago para anuncio propio" on public.pagos
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.anuncios
      where anuncios.id = pagos.anuncio_id
        and anuncios.usuario_id = (select auth.uid())
    )
  );

create policy "Admin actualiza pagos" on public.pagos
  for update to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- ----------------------------------------------------------------------------
-- 13. Storage
-- ----------------------------------------------------------------------------
drop policy if exists "Permitir lectura de configuracion" on storage.objects;
drop policy if exists "Permitir subida a configuracion" on storage.objects;
drop policy if exists "Permitir actualizacion en configuracion" on storage.objects;
drop policy if exists "Permitir lectura de anuncios" on storage.objects;
drop policy if exists "Permitir subida a anuncios" on storage.objects;
drop policy if exists "Permitir actualizacion en anuncios" on storage.objects;
drop policy if exists "Permitir lectura de comprobantes" on storage.objects;
drop policy if exists "Permitir subida a comprobantes" on storage.objects;
drop policy if exists "Permitir actualizacion en comprobantes" on storage.objects;

create policy "Configuracion lectura publica" on storage.objects
  for select to public
  using (bucket_id = 'configuracion');

create policy "Configuracion escritura admin" on storage.objects
  for all to authenticated
  using (bucket_id = 'configuracion' and public.es_admin())
  with check (bucket_id = 'configuracion' and public.es_admin());

create policy "Anuncios lectura publica" on storage.objects
  for select to public
  using (bucket_id = 'anuncios');

create policy "Anuncios escritura propietario" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'anuncios'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Anuncios actualizacion propietario" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'anuncios'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.es_admin())
  )
  with check (
    bucket_id = 'anuncios'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.es_admin())
  );

create policy "Anuncios eliminacion propietario" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'anuncios'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.es_admin())
  );

create policy "Comprobantes lectura autenticada" on storage.objects
  for select to authenticated
  using (bucket_id = 'comprobantes');

create policy "Comprobantes escritura propietario" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Comprobantes actualizacion propietario" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'comprobantes'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.es_admin())
  )
  with check (
    bucket_id = 'comprobantes'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.es_admin())
  );

create policy "Comprobantes eliminacion propietario" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'comprobantes'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.es_admin())
  );
