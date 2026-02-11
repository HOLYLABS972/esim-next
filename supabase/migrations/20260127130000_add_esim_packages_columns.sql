-- Add new columns to esim_packages for additional API fields
-- plan_type: 'base' or 'topup'
-- support_topup: whether the package supports topup
-- speed: network speed info (e.g., '3G/4G/5G')
-- slug: human-readable package slug

ALTER TABLE public.esim_packages
ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'base',
ADD COLUMN IF NOT EXISTS support_topup boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS speed text,
ADD COLUMN IF NOT EXISTS slug text;

-- Add index for plan_type filtering
CREATE INDEX IF NOT EXISTS idx_esim_packages_plan_type ON public.esim_packages(plan_type);

-- Add index for topup support filtering
CREATE INDEX IF NOT EXISTS idx_esim_packages_support_topup ON public.esim_packages(support_topup);

COMMENT ON COLUMN public.esim_packages.plan_type IS 'Type of plan: base (new eSIM) or topup (recharge)';
COMMENT ON COLUMN public.esim_packages.support_topup IS 'Whether this package supports topup/recharge';
COMMENT ON COLUMN public.esim_packages.speed IS 'Network speed info (e.g., 3G/4G/5G)';
COMMENT ON COLUMN public.esim_packages.slug IS 'Human-readable package slug from API';
