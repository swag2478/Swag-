-- Swag : table des membres et règles d'accès. À coller dans Supabase → SQL Editor → New query → Run.
create table public.members(
  email text primary key check (email = lower(email)),
  role text not null default 'member' check (role in ('member','admin')),
  note text, added_at timestamptz not null default now());
alter table public.members enable row level security;
create or replace function public.is_admin() returns boolean language sql stable security definer
  set search_path = public as $$ select exists(select 1 from members
    where email = lower(auth.jwt()->>'email') and role = 'admin') $$;
create or replace function public.can_join(e text) returns boolean language sql stable security definer
  set search_path = public as $$ select exists(select 1 from members where email = lower(trim(e))) $$;
grant execute on function public.can_join(text) to anon, authenticated;
create policy "lecture" on public.members for select to authenticated
  using (email = lower(auth.jwt()->>'email') or public.is_admin());
create policy "ajout admin" on public.members for insert to authenticated with check (public.is_admin());
create policy "modif admin" on public.members for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "retrait admin" on public.members for delete to authenticated using (public.is_admin());

-- Ensuite, DANS UNE REQUÊTE À PART (ne jamais écrire cette adresse dans le dépôt) :
-- insert into public.members(email, role) values ('<ton e-mail en minuscules>', 'admin');
