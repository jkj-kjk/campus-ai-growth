-- Campus AI Challenge: Supabase schema
-- Prototype-first schema. This intentionally exposes only safe RPC results to anonymous users.
-- Run this in Supabase SQL Editor before connecting the frontend.

create extension if not exists pgcrypto;

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  college_name text not null,
  graduation_year integer not null check (graduation_year between 2020 and 2035),
  source text not null default 'Other',
  referral_code text not null unique,
  referred_by uuid references public.registrations(id) on delete set null,
  message_variant text,
  created_at timestamptz not null default now()
);

create index if not exists registrations_referral_code_idx on public.registrations(referral_code);
create index if not exists registrations_referred_by_idx on public.registrations(referred_by);
create index if not exists registrations_college_idx on public.registrations(college_name);
create index if not exists registrations_source_idx on public.registrations(source);

alter table public.registrations enable row level security;

-- Anonymous visitors should NOT be allowed to read the table directly.
revoke all on table public.registrations from anon, authenticated;

-- Safe registration RPC.
create or replace function public.register_student(
  p_name text,
  p_email text,
  p_college_name text,
  p_graduation_year integer,
  p_source text,
  p_referral_code text default null,
  p_message_variant text default null
)
returns table (
  registration_id uuid,
  referral_code text,
  college_name text,
  referrals bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_referrer uuid;
  v_code text;
  v_college text;
begin
  if length(trim(p_name)) < 2 then
    raise exception 'Invalid name';
  end if;

  if position('@' in p_email) < 2 then
    raise exception 'Invalid email';
  end if;

  if p_referral_code is not null and length(trim(p_referral_code)) > 0 then
    select id into v_referrer
    from public.registrations
    where upper(referral_code) = upper(trim(p_referral_code))
    limit 1;
  end if;

  -- Generate a short human-friendly code.
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.registrations
    (name, email, college_name, graduation_year, source, referral_code, referred_by, message_variant)
  values
    (trim(p_name), lower(trim(p_email)), trim(p_college_name), p_graduation_year,
     trim(p_source), v_code, v_referrer, p_message_variant)
  on conflict (email) do nothing
  returning id, referral_code, college_name
  into v_id, v_code, v_college;

  -- Returning an existing registration makes demo replays idempotent.
  if v_id is null then
    select r.id, r.referral_code, r.college_name
    into v_id, v_code, v_college
    from public.registrations r
    where r.email = lower(trim(p_email))
    limit 1;
  end if;

  return query
  select v_id, v_code, v_college,
         (select count(*) from public.registrations x where x.referred_by = v_id);
end;
$$;

grant execute on function public.register_student(text, text, text, integer, text, text, text) to anon;

-- Safe leaderboard RPC; returns aggregate data only.
create or replace function public.get_leaderboard()
returns table (
  college_name text,
  registrations bigint,
  referrals bigint
)
language sql
security definer
set search_path = public
as $$
  select
    r.college_name,
    count(*)::bigint as registrations,
    count(*) filter (where r.referred_by is not null)::bigint as referrals
  from public.registrations r
  group by r.college_name
  order by registrations desc, college_name asc
  limit 25;
$$;

grant execute on function public.get_leaderboard() to anon;
