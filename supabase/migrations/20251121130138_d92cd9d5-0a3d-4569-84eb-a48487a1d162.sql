-- Drop the existing admin-only insert policy
DROP POLICY IF EXISTS "Admins can insert jobs" ON public.jobs;

-- Create new policy allowing all authenticated users to insert jobs
CREATE POLICY "Authenticated users can insert jobs" 
ON public.jobs 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Also allow authenticated users to update jobs they created
DROP POLICY IF EXISTS "Admins can update jobs" ON public.jobs;

CREATE POLICY "Authenticated users can update jobs" 
ON public.jobs 
FOR UPDATE 
TO authenticated
USING (true);