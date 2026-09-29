-- Migration 018: add editor_mode to presentations
-- Persists the active editor identity (flow | design) with each deck.

alter table public.presentations
  add column if not exists editor_mode text not null default 'flow';

alter table public.presentations
  add constraint if not exists presentations_editor_mode_check
    check (editor_mode in ('flow', 'design'));

comment on column public.presentations.editor_mode is
  'Active presentation editor mode. Currently only flow is supported.';
