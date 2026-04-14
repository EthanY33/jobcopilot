-- Enable RLS on all user-owned tables
alter table public.profiles enable row level security;
alter table public.resume_variants enable row level security;
alter table public.applications enable row level security;
alter table public.drafted_content enable row level security;
alter table public.target_companies enable row level security;
alter table public.discovery_events enable row level security;

-- Users table: readable only for own row
alter table public.users enable row level security;
create policy users_self_read on public.users
  for select using (auth.uid() = id);
create policy users_self_update on public.users
  for update using (auth.uid() = id);
create policy users_self_insert on public.users
  for insert with check (auth.uid() = id);

-- Helper: direct user_id policies
create policy profiles_owner on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy resume_variants_owner on public.resume_variants
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy applications_owner on public.applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy target_companies_owner on public.target_companies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy discovery_events_owner on public.discovery_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- drafted_content: access via its parent application
create policy drafted_content_owner on public.drafted_content
  for all using (
    exists (
      select 1 from public.applications a
      where a.id = application_id and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.applications a
      where a.id = application_id and a.user_id = auth.uid()
    )
  );

-- job_postings: readable by anyone authenticated (shared dimension table)
alter table public.job_postings enable row level security;
create policy job_postings_read on public.job_postings
  for select using (auth.role() = 'authenticated');
create policy job_postings_insert on public.job_postings
  for insert with check (auth.role() = 'authenticated');
-- no update/delete policies: app inserts are append-only

-- Trigger: create users row automatically on auth.users insert
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  insert into public.profiles (user_id) values (new.id);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
