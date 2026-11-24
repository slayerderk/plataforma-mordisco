-- ============================================================================
-- MORDISCO - INTERACCIONES P1
-- Ejecutar después de scripts/security_p0.sql.
-- ============================================================================

create table if not exists public.anuncio_likes (
  id uuid primary key default gen_random_uuid(),
  anuncio_id uuid not null references public.anuncios(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (anuncio_id, usuario_id)
);

create table if not exists public.comentarios (
  id uuid primary key default gen_random_uuid(),
  anuncio_id uuid not null references public.anuncios(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  contenido text not null check (char_length(contenido) between 1 and 500),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.favoritos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  anuncio_id uuid not null references public.anuncios(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (usuario_id, anuncio_id)
);

create index if not exists idx_anuncio_likes_anuncio on public.anuncio_likes(anuncio_id);
create index if not exists idx_comentarios_anuncio on public.comentarios(anuncio_id, created_at desc);
create index if not exists idx_favoritos_usuario on public.favoritos(usuario_id, created_at desc);

alter table public.anuncio_likes enable row level security;
alter table public.comentarios enable row level security;
alter table public.favoritos enable row level security;

revoke all on public.anuncio_likes, public.comentarios, public.favoritos from anon, authenticated;
grant select on public.anuncio_likes, public.comentarios, public.favoritos to anon, authenticated;
grant insert, delete on public.anuncio_likes, public.comentarios, public.favoritos to authenticated;

drop policy if exists "Lectura publica de likes" on public.anuncio_likes;
create policy "Lectura publica de likes" on public.anuncio_likes
  for select to public using (true);

drop policy if exists "Usuario gestiona su like" on public.anuncio_likes;
create policy "Usuario gestiona su like" on public.anuncio_likes
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

drop policy if exists "Lectura publica de comentarios activos" on public.comentarios;
create policy "Lectura publica de comentarios activos" on public.comentarios
  for select to public using (activo = true or usuario_id = (select auth.uid()) or public.es_admin());

drop policy if exists "Usuario crea comentario" on public.comentarios;
create policy "Usuario crea comentario" on public.comentarios
  for insert to authenticated
  with check (usuario_id = (select auth.uid()));

drop policy if exists "Usuario o admin modera comentario" on public.comentarios;
create policy "Usuario o admin modera comentario" on public.comentarios
  for update to authenticated
  using (usuario_id = (select auth.uid()) or public.es_admin())
  with check (usuario_id = (select auth.uid()) or public.es_admin());

drop policy if exists "Usuario o admin elimina comentario" on public.comentarios;
create policy "Usuario o admin elimina comentario" on public.comentarios
  for delete to authenticated
  using (usuario_id = (select auth.uid()) or public.es_admin());

drop policy if exists "Usuario gestiona favoritos" on public.favoritos;
create policy "Usuario gestiona favoritos" on public.favoritos
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create or replace function public.toggle_anuncio_like(p_anuncio_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
  v_inserted integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'no_session');
  end if;

  if not exists (
    select 1
    from public.anuncios
    where id = p_anuncio_id
      and (activo = true or usuario_id = v_uid or public.es_admin())
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  insert into public.anuncio_likes (anuncio_id, usuario_id)
  values (p_anuncio_id, v_uid)
  on conflict (anuncio_id, usuario_id) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    update public.anuncios
    set total_likes = coalesce(total_likes, 0) + 1
    where id = p_anuncio_id;

    return jsonb_build_object('ok', true, 'liked', true);
  end if;

  delete from public.anuncio_likes
  where anuncio_id = p_anuncio_id
    and usuario_id = v_uid;

  update public.anuncios
  set total_likes = greatest(coalesce(total_likes, 0) - 1, 0)
  where id = p_anuncio_id;

  return jsonb_build_object('ok', true, 'liked', false);
end;
$$;

revoke all on function public.toggle_anuncio_like(uuid) from public;
grant execute on function public.toggle_anuncio_like(uuid) to authenticated;

create or replace function public.toggle_favorito(p_anuncio_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
  v_inserted integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'no_session');
  end if;

  insert into public.favoritos (usuario_id, anuncio_id)
  values (v_uid, p_anuncio_id)
  on conflict (usuario_id, anuncio_id) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    return jsonb_build_object('ok', true, 'favorito', true);
  end if;

  delete from public.favoritos
  where usuario_id = v_uid
    and anuncio_id = p_anuncio_id;

  return jsonb_build_object('ok', true, 'favorito', false);
end;
$$;

revoke all on function public.toggle_favorito(uuid) from public;
grant execute on function public.toggle_favorito(uuid) to authenticated;

create or replace function public.total_likes_anuncio(p_anuncio_id uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(total_likes, 0)::integer
  from public.anuncios
  where id = p_anuncio_id;
$$;

revoke all on function public.total_likes_anuncio(uuid) from public;
grant execute on function public.total_likes_anuncio(uuid) to anon, authenticated;
