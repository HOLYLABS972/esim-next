-- Wipe global and regional data only (esim_packages with package_type global/regional, and Airalo esim_regions).
-- Unlinks esim_orders from those packages; clears esim_region_countries and esim_regions.
create or replace function public.wipe_global_and_regional()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  orders_unlinked int;
  packages_deleted int;
  region_countries_deleted int;
  regions_deleted int;
begin
  -- 1) Unlink orders that reference global/regional packages
  update public.esim_orders o
  set package_id = null
  from public.esim_packages p
  where o.package_id = p.id and p.package_type in ('global','regional');
  get diagnostics orders_unlinked = row_count;

  -- 2) Delete global and regional packages
  delete from public.esim_packages where package_type in ('global','regional');
  get diagnostics packages_deleted = row_count;

  -- 3) Delete region–country links (Airalo) — WHERE required by pg_safeupdate
  delete from public.esim_region_countries where id is not null;
  get diagnostics region_countries_deleted = row_count;

  -- 4) Delete all regions (Airalo: Africa, Asia, Global, etc.) — WHERE required by pg_safeupdate
  delete from public.esim_regions where id is not null;
  get diagnostics regions_deleted = row_count;

  return jsonb_build_object(
    'ok', true,
    'orders_unlinked', orders_unlinked,
    'packages_deleted', packages_deleted,
    'region_countries_deleted', region_countries_deleted,
    'regions_deleted', regions_deleted
  );
end;
$$;

comment on function public.wipe_global_and_regional() is 'Wipes global/regional packages and Airalo esim_regions; unlinks orders from those packages.';
