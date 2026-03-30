-- =====================================================================
-- Call history + reunion channels linked to calendario
-- =====================================================================

-- ── 1. historial_llamadas ─────────────────────────────────────────────────────
create table if not exists public.historial_llamadas (
  id            uuid primary key default gen_random_uuid(),
  canal_id      uuid references public.canales(id) on delete set null,
  iniciador_id  uuid references public.usuarios(id) on delete set null,
  tipo          text not null default 'audio',   -- 'audio' | 'video'
  duracion_s    integer default 0,               -- duration in seconds
  participantes jsonb default '[]',              -- [{userId, nombre, joinedAt, leftAt}]
  iniciada_en   timestamptz default now(),
  finalizada_en timestamptz
);

alter table public.historial_llamadas enable row level security;

create policy "historial_llamadas_select" on public.historial_llamadas for select
  using (auth.uid() is not null);

create policy "historial_llamadas_insert" on public.historial_llamadas for insert
  with check (auth.uid() is not null);

create policy "historial_llamadas_update" on public.historial_llamadas for update
  using (auth.uid() is not null);

-- ── 2. reunion column on eventos ─────────────────────────────────────────────
-- Link an event to a canal for auto-calls
alter table public.eventos
  add column if not exists canal_id   uuid references public.canales(id) on delete set null,
  add column if not exists con_llamada boolean default false;

-- ── 3. reunion_invitados: who's invited to a scheduled meeting ────────────────
create table if not exists public.reunion_invitados (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references public.eventos(id) on delete cascade,
  usuario_id  uuid not null references public.usuarios(id) on delete cascade,
  notificado  boolean default false,
  created_at  timestamptz default now(),
  unique(evento_id, usuario_id)
);

alter table public.reunion_invitados enable row level security;

create policy "reunion_invitados_all" on public.reunion_invitados
  using (auth.uid() is not null);
