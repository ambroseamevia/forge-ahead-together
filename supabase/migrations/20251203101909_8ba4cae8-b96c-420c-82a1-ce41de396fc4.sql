-- Add visa_sponsorship column to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS visa_sponsorship BOOLEAN DEFAULT false;

-- Update existing jobs to have visa_sponsorship = false
UPDATE public.jobs SET visa_sponsorship = false WHERE visa_sponsorship IS NULL;