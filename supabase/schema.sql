-- Ejecuta este archivo en Supabase: SQL Editor > New query.
-- No incluye ni utiliza claves secretas.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  profile_type text not null default 'voluntario' check (profile_type in ('voluntario', 'coordinador')),
  created_at timestamptz not null default now()
);

create table if not exists public.activity_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_date date not null,
  start_time time not null,
  end_time time not null,
  activity_type text not null default 'Voluntariado',
  description text not null,
  location text,
  status text not null default 'pendiente' check (status in ('pendiente', 'aprobado', 'rechazado')),
  evidence_path text,
  evidence_file_name text,
  evidence_file_size bigint,
  coordinator_comment text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, profile_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'profile_type', 'voluntario')
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      profile_type = excluded.profile_type;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.activity_registrations enable row level security;

create policy "Usuarios ven su perfil" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "Usuarios actualizan su perfil" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Usuarios ven sus registros" on public.activity_registrations
  for select to authenticated using (user_id = auth.uid());
create policy "Usuarios crean sus registros" on public.activity_registrations
  for insert to authenticated with check (user_id = auth.uid());
create policy "Usuarios corrigen sus registros rechazados" on public.activity_registrations
  for update to authenticated using (user_id = auth.uid() and status = 'rechazado')
  with check (user_id = auth.uid() and status = 'pendiente');
create policy "Coordinadores gestionan todos los registros" on public.activity_registrations
  for all to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and profile_type = 'coordinador')
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and profile_type = 'coordinador')
  );
