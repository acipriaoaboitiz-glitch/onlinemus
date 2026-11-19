-- ════════════════════════════════════════════════════════════════════════════════════
-- STACKS · esquema online de Supabase
--
-- ⚠ Este proyecto de Supabase se COMPARTE con otra app (`onlinemus`). TODO lo de STACKS lleva el prefijo `stacks_`
--   (tablas, funciones, triggers, índices y políticas). Este script NO toca, altera ni borra nada que no empiece por `stacks_`.
--
-- Cómo usarlo: Supabase → SQL Editor → pega todo el archivo → Run. Es idempotente (se puede ejecutar varias veces).
-- ANTES de jugar en red: Authentication → Providers → activa «Anonymous sign-ins» (acceso instantáneo de invitado) y, si quieres,
--   Email y Google. Authentication → URL Configuration: añade tu URL (p. ej. https://clubstacks.vercel.app y http://localhost:5173)
--   a «Redirect URLs» para el retorno de Google.
--
-- Nota de diseño: el juego en vivo (jugadas, turnos) viaja por canales Realtime (broadcast/presence) porque necesita latencia baja y
-- no tiene servidor autoritativo; `stacks_rooms` es el registro de salas (código, anfitrión, estado, jugadores). `game_state` queda
-- disponible para instantáneas, pero la app no escribe una fila por jugada.
-- ════════════════════════════════════════════════════════════════════════════════════

-- ── Utilidades ────────────────────────────────────────────────────────────────────────
create or replace function public.stacks_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Perfiles ──────────────────────────────────────────────────────────────────────────
create table if not exists public.stacks_profiles (
  id                  uuid primary key,                         -- identificador de jugador (lo genera el cliente)
  auth_id             uuid unique,                              -- usuario de Supabase Auth (anónimo, email o Google); null = solo local
  username            text not null check (char_length(username) between 1 and 16),
  tag                 text not null check (tag ~ '^#?[0-9]{4}$'),  -- «#4829» (se admite sin #)
  avatar_id           text,
  title               text,
  chips               bigint not null default 1000 check (chips >= 0),
  wins                int    not null default 0 check (wins >= 0),
  games_played        int    not null default 0 check (games_played >= 0),
  equipped_card_back  text   not null default 'emerald',
  equipped_table      text   not null default 'emerald',
  updated_at          timestamptz not null default now(),
  constraint stacks_profiles_username_tag_unique unique (username, tag)   -- «Apodo#4829» no se repite
);
create index if not exists stacks_profiles_username_idx on public.stacks_profiles (lower(username));
create index if not exists stacks_profiles_tag_idx      on public.stacks_profiles (tag);
create index if not exists stacks_profiles_chips_idx    on public.stacks_profiles (chips desc);

drop trigger if exists stacks_profiles_touch on public.stacks_profiles;
create trigger stacks_profiles_touch before update on public.stacks_profiles
  for each row execute function public.stacks_touch_updated_at();

-- ── Amistades ─────────────────────────────────────────────────────────────────────────
create table if not exists public.stacks_friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.stacks_profiles (id) on delete cascade,
  addressee_id  uuid not null references public.stacks_profiles (id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at    timestamptz not null default now(),
  constraint stacks_friendships_pair_unique unique (requester_id, addressee_id),
  constraint stacks_friendships_no_self check (requester_id <> addressee_id)
);
create index if not exists stacks_friendships_addressee_idx on public.stacks_friendships (addressee_id);
create index if not exists stacks_friendships_requester_idx on public.stacks_friendships (requester_id);

-- ── Invitaciones a partida ────────────────────────────────────────────────────────────
create table if not exists public.stacks_game_invites (
  id            uuid primary key default gen_random_uuid(),
  from_user_id  uuid not null references public.stacks_profiles (id) on delete cascade,
  to_user_id    uuid not null references public.stacks_profiles (id) on delete cascade,
  game_type     text not null,
  room_code     text not null,
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  created_at    timestamptz not null default now()
);
-- Bases ya creadas: amplía el estado permitido con 'expired' (invitaciones de salas ya cerradas).
alter table public.stacks_game_invites drop constraint if exists stacks_game_invites_status_check;
alter table public.stacks_game_invites add constraint stacks_game_invites_status_check check (status in ('pending', 'accepted', 'declined', 'expired'));
create index if not exists stacks_game_invites_to_idx on public.stacks_game_invites (to_user_id, created_at desc);

-- ── Salas multijugador ────────────────────────────────────────────────────────────────
create table if not exists public.stacks_rooms (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique check (code ~ '^[A-Z0-9]{5}$'),
  game_type    text not null,
  host_id      uuid not null,
  status       text not null default 'waiting' check (status in ('waiting', 'playing', 'closed')),
  max_players  int  not null default 4 check (max_players between 1 and 6),
  players      jsonb not null default '[]'::jsonb,
  game_state   jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);
create index if not exists stacks_rooms_status_idx on public.stacks_rooms (status, updated_at desc);

drop trigger if exists stacks_rooms_touch on public.stacks_rooms;
create trigger stacks_rooms_touch before update on public.stacks_rooms
  for each row execute function public.stacks_touch_updated_at();

-- ── Seguridad a nivel de fila (RLS) ───────────────────────────────────────────────────
alter table public.stacks_profiles     enable row level security;
alter table public.stacks_friendships  enable row level security;
alter table public.stacks_game_invites enable row level security;
alter table public.stacks_rooms        enable row level security;

-- ¿Este perfil es mío? (su auth_id es el usuario autenticado actual: anónimo, email o Google)
create or replace function public.stacks_owns_profile(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.stacks_profiles where id = p_id and auth_id = auth.uid());
$$;

-- stacks_profiles: cualquiera con sesión puede buscar y leer perfiles; solo el dueño crea, edita y borra el suyo.
drop policy if exists stacks_profiles_select on public.stacks_profiles;
create policy stacks_profiles_select on public.stacks_profiles for select to authenticated using (true);
drop policy if exists stacks_profiles_insert on public.stacks_profiles;
create policy stacks_profiles_insert on public.stacks_profiles for insert to authenticated with check (auth_id = auth.uid());
drop policy if exists stacks_profiles_update on public.stacks_profiles;
create policy stacks_profiles_update on public.stacks_profiles for update to authenticated using (auth_id = auth.uid()) with check (auth_id = auth.uid());
drop policy if exists stacks_profiles_delete on public.stacks_profiles;
create policy stacks_profiles_delete on public.stacks_profiles for delete to authenticated using (auth_id = auth.uid());

-- stacks_friendships: solo los dos implicados ven la fila; solo el solicitante la crea (siempre «pending»);
-- solo el destinatario la acepta; cualquiera de los dos puede borrarla (rechazar / eliminar amigo).
drop policy if exists stacks_friendships_select on public.stacks_friendships;
create policy stacks_friendships_select on public.stacks_friendships for select to authenticated
  using (public.stacks_owns_profile(requester_id) or public.stacks_owns_profile(addressee_id));
drop policy if exists stacks_friendships_insert on public.stacks_friendships;
create policy stacks_friendships_insert on public.stacks_friendships for insert to authenticated
  with check (public.stacks_owns_profile(requester_id) and status = 'pending');
drop policy if exists stacks_friendships_update on public.stacks_friendships;
create policy stacks_friendships_update on public.stacks_friendships for update to authenticated
  using (public.stacks_owns_profile(addressee_id)) with check (public.stacks_owns_profile(addressee_id));
drop policy if exists stacks_friendships_delete on public.stacks_friendships;
create policy stacks_friendships_delete on public.stacks_friendships for delete to authenticated
  using (public.stacks_owns_profile(requester_id) or public.stacks_owns_profile(addressee_id));

-- stacks_game_invites: el remitente invita solo a amigos aceptados; remitente y destinatario la ven; el destinatario cambia su estado.
drop policy if exists stacks_invites_select on public.stacks_game_invites;
create policy stacks_invites_select on public.stacks_game_invites for select to authenticated
  using (public.stacks_owns_profile(from_user_id) or public.stacks_owns_profile(to_user_id));
drop policy if exists stacks_invites_insert on public.stacks_game_invites;
create policy stacks_invites_insert on public.stacks_game_invites for insert to authenticated
  with check (
    public.stacks_owns_profile(from_user_id)
    and exists (
      select 1 from public.stacks_friendships f
      where f.status = 'accepted'
        and ((f.requester_id = from_user_id and f.addressee_id = to_user_id) or (f.requester_id = to_user_id and f.addressee_id = from_user_id))
    )
  );
drop policy if exists stacks_invites_update on public.stacks_game_invites;
create policy stacks_invites_update on public.stacks_game_invites for update to authenticated
  using (public.stacks_owns_profile(to_user_id) or public.stacks_owns_profile(from_user_id))
  with check (public.stacks_owns_profile(to_user_id) or public.stacks_owns_profile(from_user_id));
drop policy if exists stacks_invites_delete on public.stacks_game_invites;
create policy stacks_invites_delete on public.stacks_game_invites for delete to authenticated
  using (public.stacks_owns_profile(from_user_id) or public.stacks_owns_profile(to_user_id));

-- stacks_rooms: cualquiera con sesión puede ver las salas (para unirse por código); solo el anfitrión las crea, edita y cierra.
drop policy if exists stacks_rooms_select on public.stacks_rooms;
create policy stacks_rooms_select on public.stacks_rooms for select to authenticated using (true);
drop policy if exists stacks_rooms_insert on public.stacks_rooms;
create policy stacks_rooms_insert on public.stacks_rooms for insert to authenticated with check (public.stacks_owns_profile(host_id));
drop policy if exists stacks_rooms_update on public.stacks_rooms;
create policy stacks_rooms_update on public.stacks_rooms for update to authenticated
  using (public.stacks_owns_profile(host_id)) with check (public.stacks_owns_profile(host_id));
drop policy if exists stacks_rooms_delete on public.stacks_rooms;
create policy stacks_rooms_delete on public.stacks_rooms for delete to authenticated using (public.stacks_owns_profile(host_id));

-- ── Realtime (postgres_changes) ───────────────────────────────────────────────────────
-- La presencia en vivo (`stacks-presence`) y las salas (`stacks:CODIGO`) usan Realtime Broadcast/Presence y no necesitan nada más.
-- Para recibir cambios de estas tablas en vivo, se añaden a la publicación (si ya estaban, el error se ignora):
do $$ begin
  begin alter publication supabase_realtime add table public.stacks_rooms;        exception when others then null; end;
  begin alter publication supabase_realtime add table public.stacks_friendships;  exception when others then null; end;
  begin alter publication supabase_realtime add table public.stacks_game_invites; exception when others then null; end;
end $$;

-- Limpieza opcional (programa un cron de Supabase si la quieres automática):
-- delete from public.stacks_game_invites where created_at < now() - interval '1 day';
-- delete from public.stacks_rooms where status = 'closed' or updated_at < now() - interval '1 day';
