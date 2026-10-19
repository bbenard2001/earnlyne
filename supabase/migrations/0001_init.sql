-- earnlYne initial schema.
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- Every table is private per user through Row Level Security (RLS).

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  money jsonb,                               -- take-home & reinvest settings
  accepted_terms_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- comp plans (one row per plan version; one active) ----------
create table if not exists public.comp_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My comp plan',
  quota numeric not null check (quota > 0),           -- per quarter
  base_rate numeric not null check (base_rate between 0 and 100),
  tiers jsonb not null default '[]',                  -- [{ "at": 200000, "rate": 11 }]
  tier_basis text not null default 'dollars' check (tier_basis in ('dollars','quota')),
  retro boolean not null default false,
  upfront_pct numeric not null default 50 check (upfront_pct between 0 and 100),
  renewal_rate numeric not null default 0 check (renewal_rate between 0 and 100),
  clawback_days integer not null default 0 check (clawback_days >= 0),
  base_salary numeric not null default 0,
  ote numeric not null default 0,
  effective_date date not null default current_date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists comp_plans_user_idx on public.comp_plans(user_id, is_active);

-- ---------- deals ----------
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null check (length(company) between 1 and 200),
  value numeric not null check (value > 0),
  stage text not null check (stage in ('Prospecting','Proposal','Negotiation','Closed Won','Closed Lost')),
  deal_type text not null default 'new' check (deal_type in ('new','upsell','renewal')),
  close_date date not null,
  partner text,
  collected boolean not null default false,
  paid numeric not null default 0,
  cancelled boolean not null default false,
  cancel_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists deals_user_date_idx on public.deals(user_id, close_date);

-- ---------- field-level audit trail ----------
create table if not exists public.deal_edit_history (
  id bigint generated always as identity primary key,
  deal_id uuid not null references public.deals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  field text not null,
  old_value text,
  new_value text,
  changed_at timestamptz not null default now()
);
create index if not exists deal_history_deal_idx on public.deal_edit_history(deal_id, changed_at desc);

-- ---------- billing (written only by the Stripe webhook, using the service role) ----------
create table if not exists public.billing (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  status text,                 -- active | trialing | past_due | canceled | ... | lifetime
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  lifetime boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.comp_plans enable row level security;
alter table public.deals enable row level security;
alter table public.deal_edit_history enable row level security;
alter table public.billing enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own plans" on public.comp_plans;
create policy "own plans" on public.comp_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own deals" on public.deals;
create policy "own deals" on public.deals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own history read" on public.deal_edit_history;
create policy "own history read" on public.deal_edit_history for select using (auth.uid() = user_id);
drop policy if exists "own history insert" on public.deal_edit_history;
create policy "own history insert" on public.deal_edit_history for insert with check (auth.uid() = user_id);

-- Users may READ their billing row but never write it (no insert/update policy).
drop policy if exists "own billing read" on public.billing;
create policy "own billing read" on public.billing for select using (auth.uid() = user_id);

-- ---------- automatic profile on signup ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, accepted_terms_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    case when (new.raw_user_meta_data->>'accepted_terms') = 'true' then now() else null end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- keep deals.updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists deals_touch on public.deals;
create trigger deals_touch before update on public.deals for each row execute function public.touch_updated_at();
