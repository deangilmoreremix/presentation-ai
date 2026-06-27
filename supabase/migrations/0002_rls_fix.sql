-- 0002_rls_fix.sql
-- PostgREST honors RLS policies; the service_role key in PostgREST is
-- mapped to the `service_role` Postgres role. The 0001 migration only
-- granted policies to anon + authenticated, so server actions using the
-- service_role key hit RLS. This fix adds a service_role policy and
-- grants table-level permissions.

do $$
declare
  t text;
  tables text[] := array[
    'BaseDocument',
    'Presentation',
    'CustomTheme',
    'FavoritePresentationTheme',
    'PresentationThemeLike',
    'FontPair',
    'FavoriteDocument',
    'GeneratedImage'
  ];
begin
  foreach t in array tables loop
    execute format('grant all on table %I to anon, authenticated, service_role', t);
    execute format(
      'drop policy if exists "service_role_all" on %I',
      t
    );
    execute format(
      'create policy "service_role_all" on %I for all to service_role using (true) with check (true)',
      t
    );
  end loop;
end $$;