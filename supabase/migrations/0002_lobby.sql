-- ════════════════════════════════════════════════════════════════════════════
-- Mus online · lobby: elegir asiento, bots, ajustes de sala, revancha y salir de una partida.
-- Mismas reglas que 0001: el cliente solo llama a estas RPC (security definer) y todas validan quién es.
-- Los códigos de error (not_host, seat_taken…) los traduce el cliente en supabaseBackend.ts.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Cambiarse de asiento (solo en el lobby y a un asiento libre) ────────────
create function public.choose_seat(p_room uuid, p_seat int) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_status public.room_status;
begin
  if p_seat not between 0 and 3 then raise exception 'bad_seat'; end if;
  select status into v_status from public.rooms where id = p_room for update;
  if not found or not public.is_room_member(p_room) then raise exception 'not_in_room'; end if;
  if v_status <> 'lobby' then raise exception 'bad_state'; end if;
  if exists (select 1 from public.room_players where room_id = p_room and seat = p_seat) then
    raise exception 'seat_taken';
  end if;
  update public.room_players set seat = p_seat
   where room_id = p_room and user_id = (select auth.uid());
end $$;

-- ── Bots (solo el anfitrión, solo en el lobby) ──────────────────────────────
create function public.add_bot(p_room uuid, p_seat int) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_room public.rooms;
begin
  if p_seat not between 0 and 3 then raise exception 'bad_seat'; end if;
  select * into v_room from public.rooms where id = p_room for update;
  if not found or v_room.host_id <> (select auth.uid()) then raise exception 'not_host'; end if;
  if v_room.status <> 'lobby' then raise exception 'bad_state'; end if;
  begin
    insert into public.room_players (room_id, seat, user_id, is_bot) values (p_room, p_seat, null, true);
  exception when unique_violation then
    raise exception 'seat_taken';
  end;
end $$;

create function public.remove_bot(p_room uuid, p_seat int) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_room public.rooms;
begin
  select * into v_room from public.rooms where id = p_room for update;
  if not found or v_room.host_id <> (select auth.uid()) then raise exception 'not_host'; end if;
  if v_room.status <> 'lobby' then raise exception 'bad_state'; end if;
  delete from public.room_players where room_id = p_room and seat = p_seat and is_bot;
end $$;

-- ── Ajustes de la sala (el motor los valida y completa con normalizeConfig al empezar) ──
create function public.set_room_config(p_room uuid, p_config jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_room public.rooms;
begin
  if p_config is null or jsonb_typeof(p_config) <> 'object' then raise exception 'bad_state'; end if;
  select * into v_room from public.rooms where id = p_room for update;
  if not found or v_room.host_id <> (select auth.uid()) then raise exception 'not_host'; end if;
  if v_room.status <> 'lobby' then raise exception 'bad_state'; end if;
  update public.rooms set config = p_config where id = p_room;
end $$;

-- ── Revancha: borra la partida y devuelve la sala al lobby (los bots se quedan sentados) ──
create function public.reset_room(p_room uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_room public.rooms;
begin
  select * into v_room from public.rooms where id = p_room for update;
  if not found or v_room.host_id <> (select auth.uid()) then raise exception 'not_host'; end if;
  if v_room.status not in ('playing', 'finished') then raise exception 'bad_state'; end if;
  delete from public.game_hands   where room_id = p_room;
  delete from public.game_public  where room_id = p_room;
  delete from public.game_private where room_id = p_room;
  delete from public.game_log     where room_id = p_room;
  update public.rooms set status = 'lobby', expires_at = now() + interval '12 hours' where id = p_room;
end $$;

-- ── Salir (sustituye a la de 0001) ──────────────────────────────────────────
--   lobby o partida terminada → se libera el asiento
--   partida en marcha         → un bot ocupa el asiento y la mesa sigue
--   si se va el anfitrión     → pasa a otro humano; si no queda ninguno, la sala se abandona
create or replace function public.leave_room(p_room uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_room public.rooms;
  v_next uuid;
begin
  select * into v_room from public.rooms where id = p_room for update;
  if not found then return; end if;

  if v_room.status = 'playing' then
    update public.room_players set user_id = null, is_bot = true where room_id = p_room and user_id = v_uid;
  else
    delete from public.room_players where room_id = p_room and user_id = v_uid;
  end if;

  if v_room.host_id = v_uid then
    select user_id into v_next from public.room_players
     where room_id = p_room and user_id is not null order by seat limit 1;
    if v_next is null then
      update public.rooms set status = 'abandoned' where id = p_room;
    else
      update public.rooms set host_id = v_next where id = p_room;
    end if;
  end if;
end $$;

revoke all on function public.choose_seat(uuid, int)        from public, anon;
revoke all on function public.add_bot(uuid, int)            from public, anon;
revoke all on function public.remove_bot(uuid, int)         from public, anon;
revoke all on function public.set_room_config(uuid, jsonb)  from public, anon;
revoke all on function public.reset_room(uuid)              from public, anon;
grant execute on function public.choose_seat(uuid, int)       to authenticated;
grant execute on function public.add_bot(uuid, int)           to authenticated;
grant execute on function public.remove_bot(uuid, int)        to authenticated;
grant execute on function public.set_room_config(uuid, jsonb) to authenticated;
grant execute on function public.reset_room(uuid)             to authenticated;
