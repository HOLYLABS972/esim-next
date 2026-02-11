-- Fix the package_type CHECK constraint to allow 'country', 'global', 'regional'
-- The old constraint was blocking sync because it didn't include these values.

ALTER TABLE public.esim_packages
DROP CONSTRAINT IF EXISTS esim_packages_package_type_check;

ALTER TABLE public.esim_packages
ADD CONSTRAINT esim_packages_package_type_check
CHECK (package_type IN ('country', 'global', 'regional'));
