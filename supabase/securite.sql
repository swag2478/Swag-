-- Swag : protection contre l'envoi d'e-mails à des adresses qui ne sont pas membres.
-- À coller une seule fois dans Supabase → SQL Editor → New query → Run (après setup.sql).
--
-- Pourquoi : la clé publique (anon) du site est visible de tous. Sans cette règle, quelqu'un pourrait
-- appeler directement Supabase pour faire envoyer des e-mails de connexion à n'importe quelle adresse
-- (par ton compte d'envoi d'e-mails) et créer des comptes inutiles. Avec cette règle, Supabase refuse
-- de créer un compte pour une adresse absente de la table members : aucun e-mail n'est envoyé.
-- Les membres (et les invitations envoyées depuis l'onglet Membres) ne sont pas concernés.

create or replace function public.swag_only_members() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.members where email = lower(new.email)) then
    raise exception 'Adresse non membre de Swag';
  end if;
  return new;
end $$;
revoke execute on function public.swag_only_members() from public, anon, authenticated;

drop trigger if exists swag_only_members on auth.users;
create trigger swag_only_members before insert on auth.users
  for each row execute function public.swag_only_members();

-- Vérification (doit afficher une ligne « swag_only_members ») :
-- select tgname from pg_trigger where tgname = 'swag_only_members';
