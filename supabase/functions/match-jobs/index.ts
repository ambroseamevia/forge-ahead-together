import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId } = await req.json();
    console.log('Starting job matching for user:', userId);

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // Fetch user skills
    const { data: skills } = await supabaseClient
      .from('skills')
      .select('*')
      .eq('user_id', userId);

    // Fetch user work experience
    const { data: experience } = await supabaseClient
      .from('work_experience')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    // Fetch active jobs
    const { data: jobs, error: jobsError } = await supabaseClient
      .from('jobs')
      .select('*')
      .eq('is_active', true);

    if (jobsError) throw jobsError;

    console.log(`Found ${jobs?.length || 0} active jobs to match`);

    let matchesCreated = 0;
    const userSkills = skills?.map(s => s.skill_name.toLowerCase()) || [];
    const yearsOfExperience = experience?.length || 0;

    for (const job of jobs || []) {
      // Calculate match scores
      let skillsScore = 0;
      let experienceScore = 0;
      let industryScore = 0;
      let locationScore = 0;
      let salaryScore = 0;
      let jobTypeScore = 0;

      // Skills match (40%)
      const jobRequirements = (job.requirements || '').toLowerCase();
      let matchedSkills = 0;
      userSkills.forEach(skill => {
        if (jobRequirements.includes(skill)) {
          matchedSkills++;
        }
      });
      skillsScore = userSkills.length > 0 ? (matchedSkills / Math.max(userSkills.length, 5)) * 40 : 0;

      // Experience match (20%)
      const jobDescription = (job.description + ' ' + job.requirements).toLowerCase();
      let requiredYears = 0;
      if (jobDescription.includes('senior') || jobDescription.includes('lead')) {
        requiredYears = 5;
      } else if (jobDescription.includes('mid') || jobDescription.includes('intermediate')) {
        requiredYears = 3;
      } else if (jobDescription.includes('junior') || jobDescription.includes('entry')) {
        requiredYears = 1;
      } else {
        requiredYears = 2;
      }
      
      if (yearsOfExperience >= requiredYears) {
        experienceScore = 20;
      } else if (yearsOfExperience >= requiredYears - 1) {
        experienceScore = 15;
      } else {
        experienceScore = 10;
      }

      // Industry match (15%)
      if (profile.preferred_industries && Array.isArray(profile.preferred_industries)) {
        const jobIndustry = job.company.toLowerCase();
        const hasMatch = profile.preferred_industries.some((ind: string) => 
          jobIndustry.includes(ind.toLowerCase()) || jobDescription.includes(ind.toLowerCase())
        );
        industryScore = hasMatch ? 15 : 5;
      } else {
        industryScore = 10;
      }

      // Location match (10%)
      if (job.remote_option) {
        locationScore = 10;
      } else if (profile.location_preferences && Array.isArray(profile.location_preferences)) {
        const hasMatch = profile.location_preferences.some((loc: string) =>
          job.location.toLowerCase().includes(loc.toLowerCase())
        );
        locationScore = hasMatch ? 10 : 5;
      } else {
        locationScore = 7;
      }

      // Salary match (10%)
      if (job.salary_range && profile.salary_min) {
        const salaryMatch = job.salary_range.toLowerCase();
        const userMin = profile.salary_min;
        const userMax = profile.salary_max || userMin * 2;
        
        // Extract numbers from salary range
        const numbers = salaryMatch.match(/\d+,?\d*/g);
        if (numbers && numbers.length >= 2) {
          const jobMin = parseInt(numbers[0].replace(',', ''));
          const jobMax = parseInt(numbers[1].replace(',', ''));
          
          if (jobMin <= userMax && jobMax >= userMin) {
            salaryScore = 10;
          } else {
            salaryScore = 5;
          }
        } else {
          salaryScore = 7;
        }
      } else {
        salaryScore = 7;
      }

      // Job type match (5%)
      if (profile.job_types && Array.isArray(profile.job_types) && job.job_type) {
        const hasMatch = profile.job_types.some((type: string) =>
          job.job_type.toLowerCase().includes(type.toLowerCase())
        );
        jobTypeScore = hasMatch ? 5 : 2;
      } else {
        jobTypeScore = 3;
      }

      // Calculate total match score
      const totalScore = Math.round(
        skillsScore + experienceScore + industryScore + 
        locationScore + salaryScore + jobTypeScore
      );

      console.log(`Job: ${job.title} - Score: ${totalScore}%`);

      // Only create match if score >= 50%
      if (totalScore >= 50) {
        // Check if match already exists
        const { data: existingMatch } = await supabaseClient
          .from('job_matches')
          .select('id')
          .eq('user_id', userId)
          .eq('job_id', job.id)
          .single();

        if (!existingMatch) {
          const { error: matchError } = await supabaseClient
            .from('job_matches')
            .insert([{
              user_id: userId,
              job_id: job.id,
              match_score: totalScore,
              skills_match_score: Math.round(skillsScore),
              experience_match_score: Math.round(experienceScore),
              location_match_score: Math.round(locationScore),
              salary_match_score: Math.round(salaryScore),
              status: 'new'
            }]);

          if (matchError) {
            console.error(`Error creating match: ${matchError.message}`);
          } else {
            matchesCreated++;
          }
        }
      }
    }

    console.log(`Matching complete: ${matchesCreated} matches created`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        matchesCreated 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in match-jobs function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
