-- Wipe all eSIM catalog data in one transaction (no PostgREST row limit).
-- Call from API via supabase.rpc('wipe_esim_catalog').
create or replace function public.wipe_esim_catalog()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  orders_updated int;
  packages_deleted int;
  region_countries_deleted int;
  countries_deleted int;
begin
  -- 1) Unlink orders from packages
  update public.esim_orders set package_id = null where package_id is not null;
  get diagnostics orders_updated = row_count;

  -- 2) Delete all packages (WHERE true satisfies "DELETE requires WHERE" / pg_safeupdate)
  delete from public.esim_packages where true;
  get diagnostics packages_deleted = row_count;

  -- 3) Delete region–country links
  delete from public.esim_region_countries where true;
  get diagnostics region_countries_deleted = row_count;

  -- 4) Delete all countries
  delete from public.esim_countries where true;
  get diagnostics countries_deleted = row_count;

  return jsonb_build_object(
    'ok', true,
    'orders_updated', orders_updated,
    'packages_deleted', packages_deleted,
    'region_countries_deleted', region_countries_deleted,
    'countries_deleted', countries_deleted
  );
end;
$$;

comment on function public.wipe_esim_catalog() is 'Wipes esim_packages, esim_region_countries, esim_countries; unlinks esim_orders.package_id. Used by /api/config/wipe-packages.';
