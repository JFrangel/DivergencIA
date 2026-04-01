-- ─────────────────────────────────────────────────────────────────────────────
-- 014_platform_config.sql
-- Tabla singleton de configuración global de la plataforma (solo admins)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.configuracion_plataforma (
  id                      integer primary key default 1 check (id = 1),
  nombre_plataforma       text        not null default 'DivergencIA',
  registro_publico        boolean     not null default true,
  requiere_aprobacion     boolean     not null default false,
  athenia_activo          boolean     not null default true,
  zen_mode_activo         boolean     not null default false,
  roadmap_publico         boolean     not null default false,
  max_upload_mb           integer     not null default 50,
  email_contacto          text                 default 'admin@divergencia.com',
  actualizado_en          timestamptz          default now(),
  actualizado_por         uuid        references auth.users(id)
);

-- Fila por defecto (singleton)
insert into public.configuracion_plataforma (id)
values (1)
on conflict (id) do nothing;

-- RLS
alter table public.configuracion_plataforma enable row level security;

-- Todos pueden leer (para features públicas como registro_publico)
create policy "config_lectura_publica"
  on public.configuracion_plataforma
  for select
  using (true);

-- Solo admins y directora pueden actualizar
create policy "config_solo_admins"
  on public.configuracion_plataforma
  for update
  using (
    exists (
      select 1 from public.usuarios
      where usuarios.id = auth.uid()
        and usuarios.rol in ('admin', 'directora')
    )
  )
  with check (
    exists (
      select 1 from public.usuarios
      where usuarios.id = auth.uid()
        and usuarios.rol in ('admin', 'directora')
    )
  );
