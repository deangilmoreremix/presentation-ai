-- Migration 016: subscriptions
--
-- Stores Stripe subscription state per user. The Stripe webhook at
-- /api/webhooks/stripe (src/app/api/webhooks/stripe/route.ts) is
-- responsible for upserting rows on `customer.subscription.*` events
-- and updating Clerk `publicMetadata.hasAccess` to gate the premium
-- features in src/components/presentation/controls/global-settings/sections/PremiumFeaturesSection.tsx.
--
-- Landmine notes (match prior migrations):
-- - snake_case columns.
-- - RLS scoped to auth.uid() (Clerk user id -> public.users.id).
-- - Use the same `users` table the Clerk webhook already syncs to.

create table if not exists public.subscriptions (
  id                     text primary key, -- Stripe subscription id (sub_...)
  user_id                uuid not null references public.users (id) on delete cascade,
  stripe_customer_id     text not null,
  stripe_price_id        text not null,
  status                 text not null, -- active | trialing | past_due | canceled | incomplete | ...
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx
  on public.subscriptions (user_id);

create index if not exists subscriptions_stripe_customer_id_idx
  on public.subscriptions (stripe_customer_id);

comment on table public.subscriptions is
  'Stripe subscription state per user. Written by the Stripe webhook (migration 016).';

alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own
  on public.subscriptions
  for select
  using (auth.uid() = user_id);
