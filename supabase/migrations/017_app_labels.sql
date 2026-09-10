-- Formalize app_migration_metadata table for tracking which migrations belong to which app
-- This labels migrations 001-016 as belonging to the "presentation-ai" app

CREATE TABLE IF NOT EXISTS public.app_migration_metadata (
  version text PRIMARY KEY,
  app_name text NOT NULL DEFAULT 'presentation-ai',
  applied_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.app_migration_metadata IS 'Tracks which database migrations belong to which application for reproducibility';
COMMENT ON COLUMN public.app_migration_metadata.version IS 'Migration version identifier (e.g., 001, 20250101000001)';
COMMENT ON COLUMN public.app_migration_metadata.app_name IS 'Application name that owns this migration';
COMMENT ON COLUMN public.app_migration_metadata.applied_at IS 'When the migration was applied';

-- Index for querying migrations by app
CREATE INDEX IF NOT EXISTS idx_app_migration_metadata_app_name 
  ON public.app_migration_metadata(app_name);

-- Insert metadata for existing migrations if not already present
INSERT INTO public.app_migration_metadata (version, app_name)
VALUES
  ('001', 'presentation-ai'),
  ('002', 'presentation-ai'),
  ('003', 'presentation-ai'),
  ('004', 'presentation-ai'),
  ('005', 'presentation-ai'),
  ('006', 'presentation-ai'),
  ('007', 'presentation-ai'),
  ('008', 'presentation-ai'),
  ('009', 'presentation-ai'),
  ('010', 'presentation-ai'),
  ('011', 'presentation-ai'),
  ('012', 'presentation-ai'),
  ('013', 'presentation-ai'),
  ('014', 'presentation-ai'),
  ('015', 'presentation-ai'),
  ('016', 'presentation-ai')
ON CONFLICT (version) DO NOTHING;
