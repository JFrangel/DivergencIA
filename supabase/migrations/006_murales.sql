-- =====================================================================
-- Murales table for the collaborative whiteboard feature
-- =====================================================================

create table if not exists public.murales (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  tipo        text not null default 'privado',
  -- tipo: 'general' | 'publico' | 'privado' | 'compartido'
  creador_id  uuid references public.usuarios(id) on delete set null,
  shared_with uuid[] default '{}',
  data        jsonb default '[]',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Enable RLS
alter table public.murales enable row level security;

-- SELECT: general/public murals, own murals, or murals shared with current user
create policy "murales_select" on public.murales for select
  using (
    tipo = 'general' or
    tipo = 'publico' or
    creador_id = auth.uid() or
    (shared_with @> array[auth.uid()]::uuid[])
  );

-- INSERT: any authenticated user can create
create policy "murales_insert" on public.murales for insert
  with check (auth.uid() is not null);

-- UPDATE: general/public murals open to all auth users; private/compartido to owner+shared
create policy "murales_update" on public.murales for update
  using (
    tipo = 'general' or
    tipo = 'publico' or
    creador_id = auth.uid() or
    (shared_with @> array[auth.uid()]::uuid[])
  );

-- DELETE: only the creator
create policy "murales_delete" on public.murales for delete
  using (creador_id = auth.uid());

-- Seed the general mural (static UUID so all users share it)
insert into public.murales (id, titulo, tipo, creador_id, shared_with, data)
values (
  '00000000-0000-0000-0000-000000000001',
  'Mural General',
  'general',
  null,
  '{}',
  '[]'
) on conflict (id) do nothing;
