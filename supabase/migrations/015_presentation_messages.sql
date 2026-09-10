-- Migration 015: presentation_messages
--
-- Persists the presentation agent's chat history per presentation so that
-- `getPresentationMessages` can return real data and `clearPresentationChat`
-- can clear server-side state. Without this table, both actions are
-- no-op stubs (see src/app/_actions/presentation/getPresentationMessages.ts
-- and src/app/_actions/notebook/presentation/clearPresentationChat.ts).
--
-- INTEGRATION POINT (TODO, NOT YET WIRED):
-- The agent route at src/app/api/agent/presentation/route.ts streams
-- UIMessage[] to the client but does not write to this table. To make
-- history persist across sessions, insert one row per message in the
-- `execute` callback of `createUIMessageStream` (around line 360) and
-- insert the user's incoming messages from `body.messages` (around line
-- 355). The shape below matches the AI SDK `UIMessage` type (id, role,
-- parts as jsonb) plus presentation_id + user_id for ownership and
-- RLS.
--
-- Landmine notes (match the convention of prior migrations):
-- - snake_case columns.
-- - jsonb for `parts` (UIMessage.parts is an array of discriminated
--   text/tool/etc. parts).
-- - RLS scoped to authed users via Clerk user id -> public.users.id
--   (the Clerk webhook already upserts users into public.users).

create table if not exists public.presentation_messages (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.base_documents (id) on delete cascade,
  user_id         uuid not null references public.users (id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'system')),
  parts           jsonb not null,
  created_at      timestamp default now()
);

create index if not exists presentation_messages_presentation_id_idx
  on public.presentation_messages (presentation_id, created_at);

create index if not exists presentation_messages_user_id_idx
  on public.presentation_messages (user_id);

comment on table public.presentation_messages is
  'Persisted agent chat messages per presentation. One row per UIMessage; see migration 015 header for the agent route integration point.';

-- RLS: users can read/write their own messages. The Clerk webhook keeps
-- public.users in sync (see src/app/api/webhooks/clerk/route.ts), so
-- auth.uid() resolves to the Clerk user id.
alter table public.presentation_messages enable row level security;

drop policy if exists presentation_messages_select_own on public.presentation_messages;
create policy presentation_messages_select_own
  on public.presentation_messages
  for select
  using (auth.uid() = user_id);

drop policy if exists presentation_messages_insert_own on public.presentation_messages;
create policy presentation_messages_insert_own
  on public.presentation_messages
  for insert
  with check (auth.uid() = user_id);

drop policy if exists presentation_messages_delete_own on public.presentation_messages;
create policy presentation_messages_delete_own
  on public.presentation_messages
  for delete
  using (auth.uid() = user_id);
