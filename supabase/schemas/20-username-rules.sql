-- The reserved account ids, in the one place that owns the list.
--
-- This file sorts before 30-tables.sql on purpose: the check constraint on
-- public.profiles.username calls this function, so the function has to exist
-- by the time the table is created.
--
-- Keeping the list in a function rather than repeating it in the constraint and
-- again in the availability functions is what makes the instruction to derived
-- projects — add your project slug and your operating name before taking real
-- users — a single edit.
--
-- IMMUTABLE is what a check constraint requires. It also means Postgres does
-- not revisit rows that already exist when this list grows, which is why the
-- list has to be settled before a project takes real users rather than after.
create function public.is_reserved_username(candidate text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select candidate = any (
    array['admin', 'administrator', 'support', 'official', 'system']
  );
$$;

comment on function public.is_reserved_username(text) is
  'True for account ids the product keeps for itself. Derived projects extend the list here.';

-- A check constraint is evaluated as whoever is writing the row, so the write
-- roles need EXECUTE here or every profile update fails on a permission error
-- rather than on the rule it was meant to enforce. `anon` writes no profiles and
-- gets nothing.
revoke all on function public.is_reserved_username(text) from public, anon;
grant execute on function public.is_reserved_username(text) to authenticated, service_role;
