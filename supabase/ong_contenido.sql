-- ═══════════════════════════════════════════════════════════════════════════
--  Almacén del contenido de la Fundación (kasadelsol.co/ong)
--  Ejecutar una sola vez en el SQL Editor del proyecto de Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.ong_contenido (
  id               text primary key default 'actual',
  documento        jsonb       not null default '{}'::jsonb,
  actualizado_en   timestamptz not null default now(),
  actualizado_por  text
);

-- La tabla se lee y escribe únicamente desde el servidor, con la llave de
-- servicio (service_role), que no pasa por RLS. Se habilita RLS y NO se crea
-- ninguna política: así las llaves públicas (anon) no pueden ni leer ni
-- escribir, aunque alguien las obtenga del navegador.
alter table public.ong_contenido enable row level security;

-- Fila única de trabajo.
insert into public.ong_contenido (id, documento)
values ('actual', '{}'::jsonb)
on conflict (id) do nothing;
