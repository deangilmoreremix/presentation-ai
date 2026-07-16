-- Migration 006: set_updated_at() triggers
--
-- Landmine #7: @updatedAt was enforced by Prisma, not Postgres. Now that Prisma is
-- gone, nothing maintains updated_at. We add a BEFORE UPDATE trigger to every table
-- that has an updated_at column so it changes on every real update. The code also
-- sets updated_at manually in a couple of theme paths; both are safe (idempotent set
-- to now()).

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_users on public.users;
create trigger set_updated_at_users
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_base_documents on public.base_documents;
create trigger set_updated_at_base_documents
  before update on public.base_documents
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_presentations on public.presentations;
create trigger set_updated_at_presentations
  before update on public.presentations
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_presentation_themes on public.presentation_themes;
create trigger set_updated_at_presentation_themes
  before update on public.presentation_themes
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_font_pairs on public.font_pairs;
create trigger set_updated_at_font_pairs
  before update on public.font_pairs
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_generated_images on public.generated_images;
create trigger set_updated_at_generated_images
  before update on public.generated_images
  for each row execute function public.set_updated_at();
