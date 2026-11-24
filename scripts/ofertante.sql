-- ============================================================================
-- MORDISCO - OFERTANTE, VISITAS, PAGO Y REPUBLICACION
-- Ejecutar despues de scripts/security_p0.sql e scripts/interacciones.sql.
-- ============================================================================

create or replace function public.es_ofertante()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;

revoke all on function public.es_ofertante() from public;
grant execute on function public.es_ofertante() to anon, authenticated;

-- ----------------------------------------------------------------------------
-- OTP: no permitir sesiones anonimas
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
  if v_uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
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
  if v_uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
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

-- ----------------------------------------------------------------------------
-- RLS: publicar y pagar requieren ofertante real
-- ----------------------------------------------------------------------------
drop policy if exists "Crear anuncio propio" on public.anuncios;
create policy "Crear anuncio ofertante" on public.anuncios
  for insert to authenticated
  with check (usuario_id = (select auth.uid()) and public.es_ofertante());

drop policy if exists "Actualizar anuncio propio" on public.anuncios;
create policy "Actualizar anuncio ofertante o admin" on public.anuncios
  for update to authenticated
  using (usuario_id = (select auth.uid()) or public.es_admin())
  with check (usuario_id = (select auth.uid()) or public.es_admin());

drop policy if exists "Crear pago para anuncio propio" on public.pagos;
create policy "Crear pago ofertante" on public.pagos
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.anuncios
      where anuncios.id = pagos.anuncio_id
        and anuncios.usuario_id = (select auth.uid())
    )
    and public.es_ofertante()
  );

-- ----------------------------------------------------------------------------
-- Visits
-- ----------------------------------------------------------------------------
create table if not exists public.anuncio_visitas (
  id uuid primary key default gen_random_uuid(),
  anuncio_id uuid not null references public.anuncios(id) on delete cascade,
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  visitante_id uuid references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_anuncio_visitas_perfil on public.anuncio_visitas (perfil_id, created_at desc);
create index if not exists idx_anuncio_visitas_anuncio on public.anuncio_visitas (anuncio_id, created_at desc);

alter table public.anuncio_visitas enable row level security;
revoke all on public.anuncio_visitas from anon, authenticated;
grant select on public.anuncio_visitas to authenticated;

drop policy if exists "Visitas visibles para dueño o admin" on public.anuncio_visitas;
create policy "Visitas visibles para dueño o admin" on public.anuncio_visitas
  for select to authenticated
  using (
    exists (
      select 1
      from public.anuncios
      where anuncios.id = anuncio_visitas.anuncio_id
        and (anuncios.usuario_id = (select auth.uid()) or public.es_admin())
    )
  );

create or replace function public.registrar_visita_anuncio(p_anuncio_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid;
  v_visitante uuid := (select auth.uid());
  v_id uuid;
begin
  select usuario_id into v_owner
  from public.anuncios
  where id = p_anuncio_id;

  if v_owner is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_visitante is not null and exists (
    select 1
    from public.anuncio_visitas
    where anuncio_id = p_anuncio_id
      and visitante_id = v_visitante
      and created_at > now() - interval '1 day'
  ) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  insert into public.anuncio_visitas (anuncio_id, perfil_id, visitante_id)
  values (p_anuncio_id, v_owner, v_visitante)
  returning id into v_id;

  update public.anuncios
  set total_vistas = coalesce(total_vistas, 0) + 1
  where id = p_anuncio_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

revoke all on function public.registrar_visita_anuncio(uuid) from public;
grant execute on function public.registrar_visita_anuncio(uuid) to anon, authenticated;

create or replace function public.listar_visitas_ofertante(p_limite integer default 50)
returns table (
  id uuid,
  anuncio_id uuid,
  anuncio_titulo text,
  visitante_id uuid,
  visitante_nombre text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'no_session';
  end if;

  return query
  select
    v.id,
    v.anuncio_id,
    a.titulo,
    v.visitante_id,
    coalesce(p.nombre_comercial, 'Invitado') as visitante_nombre,
    v.created_at
  from public.anuncio_visitas v
  join public.anuncios a on a.id = v.anuncio_id
  left join public.perfiles p on p.id = v.visitante_id
  where a.usuario_id = (select auth.uid()) or public.es_admin()
  order by v.created_at desc
  limit least(greatest(coalesce(p_limite, 50), 1), 200);
end;
$$;

revoke all on function public.listar_visitas_ofertante(integer) from public;
grant execute on function public.listar_visitas_ofertante(integer) to authenticated;

-- ----------------------------------------------------------------------------
-- Approval: activate ad, set expiry, consume coupon once
-- ----------------------------------------------------------------------------
create or replace function public.aprobar_pago_con_vigencia(
  p_pago_id uuid,
  p_origen text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pago record;
  v_anuncio record;
  v_plan record;
  v_cupon record;
  v_vigente timestamptz;
begin
  select * into v_pago
  from public.pagos
  where id = p_pago_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_pago.estado = 'aprobado' then
    select vigente_hasta into v_vigente
    from public.anuncios
    where id = v_pago.anuncio_id;
    return jsonb_build_object('ok', true, 'success', true, 'already_approved', true, 'vigente_hasta', v_vigente);
  end if;

  select * into v_anuncio
  from public.anuncios
  where id = v_pago.anuncio_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'anuncio_not_found');
  end if;

  select * into v_plan
  from public.planes
  where id = v_pago.plan_id and activo = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'plan_not_found');
  end if;

  if v_pago.cupon_id is not null then
    select * into v_cupon
    from public.cupones
    where id = v_pago.cupon_id
    for update;

    if not found or v_cupon.activo is not true then
      return jsonb_build_object('ok', false, 'error', 'cupon_invalido');
    end if;

    if v_cupon.fecha_expiracion is not null and v_cupon.fecha_expiracion < now() then
      return jsonb_build_object('ok', false, 'error', 'cupon_expirado');
    end if;

    if v_cupon.usos_maximos is not null and coalesce(v_cupon.usos_actuales, 0) >= v_cupon.usos_maximos then
      return jsonb_build_object('ok', false, 'error', 'cupon_agotado');
    end if;

    update public.cupones
    set usos_actuales = coalesce(usos_actuales, 0) + 1
    where id = v_cupon.id;
  end if;

  v_vigente := date_trunc('day', greatest(now(), coalesce(v_anuncio.vigente_hasta, now())) + make_interval(days => v_plan.dias_duracion)) + interval '23 hours 59 minutes 59 seconds';

  update public.pagos
  set estado = 'aprobado',
      fecha_aprobacion = now(),
      aprobado_por = coalesce((select auth.uid()), aprobado_por),
      token_usado = true,
      origen_aprobacion = coalesce(p_origen, origen_aprobacion)
  where id = v_pago.id;

  update public.anuncios
  set activo = true,
      es_vip = coalesce(v_plan.es_destacado, false),
      plan_id = v_plan.id,
      vigente_hasta = v_vigente,
      ultima_republicacion = now(),
      updated_at = now()
  where id = v_anuncio.id;

  return jsonb_build_object(
    'ok', true,
    'success', true,
    'vigente_hasta', v_vigente,
    'message', 'Pago aprobado correctamente.'
  );
end;
$$;

revoke all on function public.aprobar_pago_con_vigencia(uuid, text) from public;
grant execute on function public.aprobar_pago_con_vigencia(uuid, text) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Manual republish
-- ----------------------------------------------------------------------------
create or replace function public.republicar_anuncio(p_anuncio_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
  v_anuncio record;
  v_plan record;
  v_dias integer;
  v_base timestamptz;
  v_fecha_habil timestamptz;
  v_vigente timestamptz;
begin
  if v_uid is null or (not public.es_ofertante() and not public.es_admin()) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_anuncio
  from public.anuncios
  where id = p_anuncio_id
  for update;

  if not found or (v_anuncio.usuario_id <> v_uid and not public.es_admin()) then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not exists (
    select 1
    from public.pagos
    where anuncio_id = p_anuncio_id
      and estado = 'aprobado'
  ) then
    return jsonb_build_object('ok', false, 'error', 'sin_pago_aprobado');
  end if;

  select coalesce(dias_espera_republicar, 0) into v_dias
  from public.configuracion_admin
  where id = 1;

  v_base := coalesce(v_anuncio.ultima_republicacion, v_anuncio.created_at, now());
  v_fecha_habil := v_base + make_interval(days => v_dias);

  if now() < v_fecha_habil then
    return jsonb_build_object(
      'ok', false,
      'error', 'en_espera',
      'dias_restantes', ceil(extract(epoch from (v_fecha_habil - now())) / 86400.0)::int,
      'fecha_habil', v_fecha_habil
    );
  end if;

  select * into v_plan
  from public.planes
  where id = v_anuncio.plan_id and activo = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'plan_not_found');
  end if;

  v_vigente := date_trunc('day', greatest(now(), coalesce(v_anuncio.vigente_hasta, now())) + make_interval(days => v_plan.dias_duracion)) + interval '23 hours 59 minutes 59 seconds';

  update public.anuncios
  set activo = true,
      es_vip = coalesce(v_plan.es_destacado, false),
      plan_id = v_plan.id,
      vigente_hasta = v_vigente,
      ultima_republicacion = now(),
      updated_at = now()
  where id = p_anuncio_id;

  return jsonb_build_object(
    'ok', true,
    'vigente_hasta', v_vigente,
    'dias_espera', v_dias
  );
end;
$$;

revoke all on function public.republicar_anuncio(uuid) from public;
grant execute on function public.republicar_anuncio(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Comments: owner of the ad can moderate comments
-- ----------------------------------------------------------------------------
drop policy if exists "Dueño del anuncio modera comentarios" on public.comentarios;
create policy "Dueño del anuncio modera comentarios" on public.comentarios
  for update to authenticated
  using (
    exists (
      select 1
      from public.anuncios
      where anuncios.id = comentarios.anuncio_id
        and anuncios.usuario_id = (select auth.uid())
    )
    or public.es_admin()
  )
  with check (
    exists (
      select 1
      from public.anuncios
      where anuncios.id = comentarios.anuncio_id
        and anuncios.usuario_id = (select auth.uid())
    )
    or public.es_admin()
  );

drop policy if exists "Dueño del anuncio elimina comentarios" on public.comentarios;
create policy "Dueño del anuncio elimina comentarios" on public.comentarios
  for delete to authenticated
  using (
    exists (
      select 1
      from public.anuncios
      where anuncios.id = comentarios.anuncio_id
        and anuncios.usuario_id = (select auth.uid())
    )
    or public.es_admin()
  );
