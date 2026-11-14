-- Saved views for SPHEREx Blink. Paste this whole file into
-- Supabase > SQL Editor > New query, then press Run. Safe to run twice.

create table if not exists public.saved_views (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  note        text not null default '' check (char_length(note) <= 2000),
  ra          double precision not null check (ra >= 0 and ra < 360),
  dec         double precision not null check (dec between -90 and 90),
  fov         real not null,
  band        smallint not null,
  query       text not null check (char_length(query) <= 1000),
  description text check (char_length(description) <= 1000),
  created_at  timestamptz not null default now()
);

create index if not exists saved_views_user_created on public.saved_views (user_id, created_at desc);

-- Row level security: every signed-in user can only see and change their own rows.
alter table public.saved_views enable row level security;

drop policy if exists "own rows: read"   on public.saved_views;
drop policy if exists "own rows: add"    on public.saved_views;
drop policy if exists "own rows: change" on public.saved_views;
drop policy if exists "own rows: delete" on public.saved_views;

create policy "own rows: read"   on public.saved_views for select to authenticated using (auth.uid() = user_id);
create policy "own rows: add"    on public.saved_views for insert to authenticated with check (auth.uid() = user_id);
create policy "own rows: change" on public.saved_views for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows: delete" on public.saved_views for delete to authenticated using (auth.uid() = user_id);
