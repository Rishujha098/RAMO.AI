-- RAMO.AI onboarding fields (MVP)

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists age int,
  add column if not exists persona text,
  add column if not exists consent_accepted boolean not null default false,
  add column if not exists consent_accepted_at timestamptz,
  add column if not exists onboarding_completed boolean not null default false;

-- Constraints (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_persona_check'
  ) then
    alter table public.profiles
      add constraint profiles_persona_check
      check (persona is null or persona in ('student', 'professional'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_age_check'
  ) then
    alter table public.profiles
      add constraint profiles_age_check
      check (age is null or (age between 10 and 120));
  end if;
end;
$$;