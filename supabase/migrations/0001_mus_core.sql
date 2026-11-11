-- ════════════════════════════════════════════════════════════════════════════
-- Mus online · esquema base (Supabase · Postgres 15+)
--
-- Principio: el cliente solo LEE (RLS). Toda escritura de partida pasa por la
-- Edge Function `game-action`, que valida con el motor y confirma el cambio de
-- forma atómica con la RPC `commit_game_update` (solo service_role).
--
--   game_private  estado completo (manos, mazo, semilla)  → nadie del cliente lo lee
--   game_public   vista pública (PublicState)             → miembros de la sala
--   game_hands    una fila por asiento                    → solo su dueño
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

-- ── Perfiles ────────────────────────────────────────────────────────────────
-- Auth anónimo + apodo para entrar rápido; se puede ascender a email/Google después.
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 20),
  avatar       text,
  created_at   timestamptz not null default now()
);

-- ── Salas ───────────────────────────────────────────────────────────────────
create type public.room_status as enum ('lobby', 'playing', 'finished', 'abandoned');

create table public.rooms (
  id         uuid primary key default gen_random_uuid(),
  code       text not null check (code ~ '^[0-9]{4,6}$'),
  host_id    uuid not null references public.profiles (id),
  status     public.room_status not null default 'lobby',
  config     jsonb not null default '{}'::jsonb,        -- RoomConfig del motor (se valida con normalizeConfig)
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '12 hours'
);

-- El código solo tiene que ser único entre salas vivas, así se reciclan.
create unique index rooms_live_code_uq on public.rooms (code) where status in ('lobby', 'playing');

create table public.room_players (
  room_id   uuid not null references public.rooms (id) on delete cascade,
  seat      smallint not null check (seat between 0 and 3),   -- 0-2 = pareja A · 1-3 = pareja B
  user_id   uuid references public.profiles (id),             -- null = bot
  is_bot    boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (room_id, seat),
  unique (room_id, user_id)
);

-- ── Partida ─────────────────────────────────────────────────────────────────
create table public.game_private (
  room_id    uuid primary key references public.rooms (id) on delete cascade,
  version    int not null,
  state      jsonb not null,                                   -- MusState completo
  updated_at timestamptz not null default now()
);

create table public.game_public (
  room_id    uuid primary key references public.rooms (id) on delete cascade,
  version    int not null,
  view       jsonb not null,                                   -- PublicState
  events     jsonb not null default '[]'::jsonb,               -- eventos del último movimiento (animaciones)
  updated_at timestamptz not null default now()
);

create table public.game_hands (
  room_id uuid not null references public.rooms (id) on delete cascade,
  seat    smallint not null check (seat between 0 and 3),
  user_id uuid,                                                -- dueño de la mano (para RLS)
  version int not null,
  cards   jsonb not null,
  primary key (room_id, seat)
);

-- Registro append-only: auditoría, repeticiones y estadísticas.
create table public.game_log (
  id         bigint generated always as identity primary key,
  room_id    uuid not null references public.rooms (id) on delete cascade,
  version    int not null,
  seat       smallint,
  action     jsonb,
  events     jsonb,
  created_at timestamptz not null default now()
);
create index game_log_room_idx on public.game_log (room_id, version);

-- ── Seguridad por filas ─────────────────────────────────────────────────────
-- Función auxiliar con security definer: una política que consulta su propia tabla recursaría.
create function public.is_room_member(p_room uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.room_players
    where room_id = p_room and user_id = (select auth.uid())
  );
$$;

alter table public.profiles     enable row level security;
alter table public.rooms        enable row level security;
alter table public.room_players enable row level security;
alter table public.game_private enable row level security;   -- sin políticas: solo service_role
alter table public.game_log     enable row level security;   -- sin políticas: solo service_role
alter table public.game_public  enable row level security;
alter table public.game_hands   enable row level security;

create policy profiles_read   on public.profiles for select to authenticated using (true);
create policy profiles_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy rooms_read        on public.rooms        for select to authenticated using (public.is_room_member(id));
create policy room_players_read on public.room_players for select to authenticated using (public.is_room_member(room_id));
create policy game_public_read  on public.game_public for select to authenticated using (public.is_room_member(room_id));
create policy game_hands_read   on public.game_hands  for select to authenticated using (user_id = (select auth.uid()));

-- ── Tiempo real: cambios de tabla (RLS decide quién recibe qué) ─────────────
alter publication supabase_realtime add table
  public.rooms, public.room_players, public.game_public, public.game_hands;

-- ── RPC: crear sala (código numérico de 4 a 6 dígitos) ──────────────────────
create function public.create_room(p_config jsonb default '{}'::jsonb, p_code_len int default 6)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_code text;
  v_id   uuid;
  v_try  int := 0;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_code_len not between 4 and 6 then raise exception 'bad_code_length'; end if;

  loop
    v_code := lpad(
      ((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % (10 ^ p_code_len)::bigint)::text,
      p_code_len, '0');
    begin
      insert into public.rooms (code, host_id, config)
      values (v_code, v_uid, coalesce(p_config, '{}'::jsonb))
      returning id into v_id;
      exit;
    exception when unique_violation then
      v_try := v_try + 1;
      if v_try >= 10 then raise exception 'no_free_codes'; end if;
    end;
  end loop;

  insert into public.room_players (room_id, seat, user_id) values (v_id, 0, v_uid);
  return jsonb_build_object('room_id', v_id, 'code', v_code, 'seat', 0);
end $$;

-- ── RPC: entrar con código (también sirve para reconectar) ──────────────────
create function public.join_room(p_code text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_room public.rooms;
  v_seat smallint;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_room from public.rooms
   where code = p_code and status in ('lobby', 'playing')
   for update;                                              -- serializa las entradas simultáneas
  if not found then raise exception 'room_not_found'; end if;

  select seat into v_seat from public.room_players where room_id = v_room.id and user_id = v_uid;
  if found then                                             -- ya estaba sentado: reconexión
    return jsonb_build_object('room_id', v_room.id, 'seat', v_seat);
  end if;

  if v_room.status <> 'lobby' then raise exception 'room_in_progress'; end if;

  select gs.seat into v_seat
    from generate_series(0, 3) as gs(seat)
   where not exists (select 1 from public.room_players rp where rp.room_id = v_room.id and rp.seat = gs.seat)
   order by gs.seat limit 1;
  if v_seat is null then raise exception 'room_full'; end if;

  insert into public.room_players (room_id, seat, user_id) values (v_room.id, v_seat, v_uid);
  return jsonb_build_object('room_id', v_room.id, 'seat', v_seat);
end $$;

create function public.leave_room(p_room uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.room_players rp
   using public.rooms r
   where rp.room_id = p_room and r.id = rp.room_id and r.status = 'lobby'
     and rp.user_id = (select auth.uid());
end $$;

-- ── RPC interna: confirmar un movimiento de forma atómica ───────────────────
-- Control de concurrencia optimista: si `version` ya no es la esperada devuelve false y el llamante reintenta.
-- p_expected = -1 crea la partida. Los eventos de Realtime salen todos de esta misma transacción.
create function public.commit_game_update(
  p_room uuid, p_expected int, p_private jsonb, p_public jsonb, p_hands jsonb,
  p_events jsonb, p_seat int, p_action jsonb
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_new  int := (p_private ->> 'version')::int;
  v_rows int;
  v_seat int;
begin
  if p_expected < 0 then
    insert into public.game_private (room_id, version, state) values (p_room, v_new, p_private)
    on conflict (room_id) do nothing;
  else
    update public.game_private set state = p_private, version = v_new, updated_at = now()
     where room_id = p_room and version = p_expected;
  end if;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return false; end if;

  insert into public.game_public (room_id, version, view, events)
  values (p_room, v_new, p_public, p_events)
  on conflict (room_id) do update
    set version = excluded.version, view = excluded.view, events = excluded.events, updated_at = now();

  for v_seat in 0..3 loop
    insert into public.game_hands (room_id, seat, user_id, version, cards)
    values (
      p_room, v_seat,
      (select user_id from public.room_players where room_id = p_room and seat = v_seat),
      v_new, p_hands -> v_seat
    )
    on conflict (room_id, seat) do update
      set cards = excluded.cards, version = excluded.version, user_id = excluded.user_id;
  end loop;

  insert into public.game_log (room_id, version, seat, action, events)
  values (p_room, v_new, p_seat, p_action, p_events);
  return true;
end $$;

revoke all on function public.create_room(jsonb, int) from public, anon;
revoke all on function public.join_room(text)         from public, anon;
revoke all on function public.leave_room(uuid)        from public, anon;
revoke all on function public.commit_game_update(uuid, int, jsonb, jsonb, jsonb, jsonb, int, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_room(jsonb, int) to authenticated;
grant execute on function public.join_room(text)         to authenticated;
grant execute on function public.leave_room(uuid)        to authenticated;
grant execute on function public.commit_game_update(uuid, int, jsonb, jsonb, jsonb, jsonb, int, jsonb)
  to service_role;

-- ── Canales privados de Realtime ────────────────────────────────────────────
--   room:<uuid>             → presencia y eventos de mesa: solo miembros de la sala
--   room:<uuid>:team:<0|1>  → SEÑAS: solo los dos compañeros de esa pareja (asientos pares = 0, impares = 1)
-- El cliente debe abrir el canal con { config: { private: true } }.
create function public.can_use_room_topic(p_topic text) returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_room uuid;
  v_team int;
begin
  if p_topic ~ '^room:[0-9a-f-]{36}$' then
    return public.is_room_member(substr(p_topic, 6)::uuid);
  elsif p_topic ~ '^room:[0-9a-f-]{36}:team:[01]$' then
    v_room := split_part(p_topic, ':', 2)::uuid;
    v_team := split_part(p_topic, ':', 4)::int;
    return exists (
      select 1 from public.room_players
      where room_id = v_room and user_id = (select auth.uid()) and seat % 2 = v_team
    );
  end if;
  return false;
end $$;

create policy realtime_room_read on realtime.messages for select to authenticated
  using (realtime.messages.extension in ('broadcast', 'presence')
         and public.can_use_room_topic((select realtime.topic())));

create policy realtime_room_write on realtime.messages for insert to authenticated
  with check (realtime.messages.extension in ('broadcast', 'presence')
              and public.can_use_room_topic((select realtime.topic())));

-- ── Limpieza de salas caducadas (activa pg_cron en el panel de Supabase) ────
-- select cron.schedule('mus-expire-rooms', '*/10 * * * *',
--   $$ update public.rooms set status = 'abandoned'
--       where status in ('lobby', 'playing') and expires_at < now() $$);
