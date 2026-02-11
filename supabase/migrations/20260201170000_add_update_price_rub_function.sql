-- Update all price_rub in esim_packages from price_usd * rate (same pattern as update_price_ils)
CREATE OR REPLACE FUNCTION public.update_price_rub(usd_to_rub_rate numeric DEFAULT 95)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.esim_packages
  SET price_rub = ROUND((COALESCE(price_usd, 0) * usd_to_rub_rate)::numeric, 2)
  WHERE price_usd IS NOT NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
COMMENT ON FUNCTION public.update_price_rub(numeric) IS 'Backfill price_rub from price_usd * rate; call after fetching usd_to_rub rate';
