import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// African countries for visa sponsorship bonus
const africanCountries = [
  'ghana', 'nigeria', 'kenya', 'south africa', 'egypt', 'morocco', 
  'tanzania', 'uganda', 'ethiopia', 'rwanda', 'senegal', 'cameroon',
  'ivory coast', 'côte d\'ivoire', 'zimbabwe', 'zambia', 'botswana',
  'malawi', 'mozambique', 'namibia', 'africa', 'accra', 'lagos', 
  'nairobi', 'johannesburg', 'cairo', 'addis ababa', 'kampala', 'dar es salaam'
];

function isAfricanLocation(location: string | null): boolean {
  if (!location) return false;
  const normalized = location.toLowerCase();
  return africanCountries.some(country => normalized.includes(country));
}

// Skill synonyms for fuzzy matching
const skillSynonyms: Record<string, string[]> = {
  'monitoring and evaluation': ['m&e', 'monitoring & evaluation', 'me', 'monitoring evaluation'],
  'data analysis': ['data analytics', 'statistical analysis', 'data scientist', 'spss', 'stata', 'excel analysis'],
  'project management': ['pm', 'project manager', 'programme management', 'program management'],
  'javascript': ['js', 'node.js', 'nodejs', 'react', 'vue', 'angular'],
  'python': ['py', 'django', 'flask', 'pandas', 'numpy'],
  'sql': ['mysql', 'postgresql', 'database', 'sqlite', 'oracle'],
  'communication': ['communications', 'written communication', 'verbal communication', 'public speaking'],
  'microsoft office': ['ms office', 'excel', 'word', 'powerpoint', 'outlook'],
  'research': ['research skills', 'qualitative research', 'quantitative research'],
  'report writing': ['reporting', 'technical writing', 'documentation'],
};

function normalizeSkill(skill: string): string {
  return skill.toLowerCase().trim();
}

function findSkillMatches(userSkills: string[], jobText: string): { matched: string[], score: number } {
  const normalizedJobText = jobText.toLowerCase();
  const matched: string[] = [];
  
  for (const skill of userSkills) {
    const normalizedSkill = normalizeSkill(skill);
    
    // Direct match
    if (normalizedJobText.includes(normalizedSkill)) {
      matched.push(skill);
      continue;
    }
    
    // Check synonyms
    for (const [canonical, synonyms] of Object.entries(skillSynonyms)) {
      const allVariants = [canonical, ...synonyms];
      
      // If user skill matches any variant
      const userSkillMatchesVariant = allVariants.some(v => 
        normalizedSkill.includes(v) || v.includes(normalizedSkill)
      );
      
      if (userSkillMatchesVariant) {
        // Check if job text contains any variant
        const jobMatchesVariant = allVariants.some(v => normalizedJobText.includes(v));
        if (jobMatchesVariant) {
          matched.push(skill);
          break;
        }
      }
    }
  }
  
  // Calculate score: weight by relevance, not penalize for having many skills
  const matchRatio = userSkills.length > 0 ? matched.length / Math.min(userSkills.length, 10) : 0;
  return { matched, score: Math.min(matchRatio * 40, 40) };
}

function calculateYearsOfExperience(workExperience: any[]): number {
  if (!workExperience || workExperience.length === 0) return 0;
  
  let totalMonths = 0;
  
  for (const exp of workExperience) {
    const startDate = new Date(exp.start_date);
    const endDate = exp.end_date ? new Date(exp.end_date) : new Date();
    
    if (isNaN(startDate.getTime())) continue;
    
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                   (endDate.getMonth() - startDate.getMonth());
    totalMonths += Math.max(0, months);
  }
  
  return Math.round(totalMonths / 12 * 10) / 10; // Round to 1 decimal
}

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

    // Fetch ALL jobs (not just active) for comprehensive matching
    const { data: jobs, error: jobsError } = await supabaseClient
      .from('jobs')
      .select('*')
      .eq('is_active', true);

    if (jobsError) throw jobsError;

    console.log(`Found ${jobs?.length || 0} active jobs to match`);

    let matchesCreated = 0;
    let matchesUpdated = 0;
    const userSkillNames = skills?.map(s => s.skill_name) || [];
    const yearsOfExperience = calculateYearsOfExperience(experience || []);
    const userIsInAfrica = isAfricanLocation(profile.location);
    
    console.log(`User has ${userSkillNames.length} skills and ${yearsOfExperience} years of experience`);
    console.log(`User location: ${profile.location}, Is African: ${userIsInAfrica}`);

    for (const job of jobs || []) {
      // Calculate match scores
      const jobText = `${job.title} ${job.description || ''} ${job.requirements || ''}`;
      
      // Skills match (40%) - using fuzzy matching
      const { matched: matchedSkills, score: skillsScore } = findSkillMatches(userSkillNames, jobText);
      
      // Experience match (20%)
      let experienceScore = 0;
      const jobDescription = jobText.toLowerCase();
      let requiredYears = 2; // Default
      
      if (jobDescription.includes('senior') || jobDescription.includes('lead') || jobDescription.includes('10+ years') || jobDescription.includes('8+ years')) {
        requiredYears = 7;
      } else if (jobDescription.includes('5+ years') || jobDescription.includes('5 years')) {
        requiredYears = 5;
      } else if (jobDescription.includes('mid') || jobDescription.includes('intermediate') || jobDescription.includes('3+ years')) {
        requiredYears = 3;
      } else if (jobDescription.includes('junior') || jobDescription.includes('entry') || jobDescription.includes('graduate') || jobDescription.includes('1+ year')) {
        requiredYears = 1;
      }
      
      if (yearsOfExperience >= requiredYears) {
        experienceScore = 20;
      } else if (yearsOfExperience >= requiredYears * 0.7) {
        experienceScore = 15;
      } else if (yearsOfExperience >= requiredYears * 0.5) {
        experienceScore = 10;
      } else {
        experienceScore = 5;
      }

      // Industry match (15%)
      let industryScore = 8; // Default neutral
      if (profile.preferred_industries && Array.isArray(profile.preferred_industries)) {
        const hasMatch = profile.preferred_industries.some((ind: string) => 
          jobText.toLowerCase().includes(ind.toLowerCase())
        );
        industryScore = hasMatch ? 15 : 8;
      }

      // Location match (10%)
      let locationScore = 7; // Default neutral
      if (job.remote_option) {
        locationScore = 10;
      } else if (profile.location_preferences && Array.isArray(profile.location_preferences) && job.location) {
        const hasMatch = profile.location_preferences.some((loc: string) =>
          job.location.toLowerCase().includes(loc.toLowerCase())
        );
        locationScore = hasMatch ? 10 : 5;
      }

      // Salary match (10%)
      let salaryScore = 7; // Default neutral
      if (job.salary_range && profile.salary_min) {
        const salaryMatch = job.salary_range.toLowerCase();
        const userMin = profile.salary_min;
        const userMax = profile.salary_max || userMin * 2;
        
        const numbers = salaryMatch.match(/\d+,?\d*/g);
        if (numbers && numbers.length >= 1) {
          const jobSalary = parseInt(numbers[0].replace(',', ''));
          if (jobSalary >= userMin && (!userMax || jobSalary <= userMax)) {
            salaryScore = 10;
          } else if (jobSalary >= userMin * 0.8) {
            salaryScore = 7;
          } else {
            salaryScore = 4;
          }
        }
      }

      // Job type match (5%)
      let jobTypeScore = 3; // Default neutral
      if (profile.job_types && Array.isArray(profile.job_types) && job.job_type) {
        const hasMatch = profile.job_types.some((type: string) =>
          job.job_type.toLowerCase().includes(type.toLowerCase())
        );
        jobTypeScore = hasMatch ? 5 : 2;
      }

      // Visa Sponsorship Bonus (up to 10 bonus points for African users)
      let visaSponsorshipBonus = 0;
      if (userIsInAfrica && job.visa_sponsorship === true) {
        visaSponsorshipBonus = 10;
      }

      // Calculate total match score (capped at 100%)
      const totalScore = Math.min(100, Math.round(
        skillsScore + experienceScore + industryScore + 
        locationScore + salaryScore + jobTypeScore + visaSponsorshipBonus
      ));

      console.log(`Job: ${job.title} - Score: ${totalScore}% (Skills: ${Math.round(skillsScore)}, Exp: ${experienceScore}, Visa Bonus: ${visaSponsorshipBonus})`);

      // LOWERED THRESHOLD: Store ALL matches with score >= 30% (was 50%)
      // This allows users to see more options and filter themselves
      if (totalScore >= 30) {
        // Check if match already exists
        const { data: existingMatch } = await supabaseClient
          .from('job_matches')
          .select('id, match_score')
          .eq('user_id', userId)
          .eq('job_id', job.id)
          .single();

        const matchData = {
          user_id: userId,
          job_id: job.id,
          match_score: totalScore,
          skills_match_score: Math.round(skillsScore),
          experience_match_score: Math.round(experienceScore),
          location_match_score: Math.round(locationScore),
          salary_match_score: Math.round(salaryScore),
          status: totalScore >= 70 ? 'new' : totalScore >= 50 ? 'new' : 'low_match'
        };

        if (existingMatch) {
          // Update if score changed
          if (existingMatch.match_score !== totalScore) {
            const { error: updateError } = await supabaseClient
              .from('job_matches')
              .update(matchData)
              .eq('id', existingMatch.id);
            
            if (!updateError) matchesUpdated++;
          }
        } else {
          const { error: matchError } = await supabaseClient
            .from('job_matches')
            .insert([matchData]);

          if (matchError) {
            console.error(`Error creating match: ${matchError.message}`);
          } else {
            matchesCreated++;
          }
        }
      }
    }

    console.log(`Matching complete: ${matchesCreated} new, ${matchesUpdated} updated`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        matchesCreated,
        matchesUpdated,
        userStats: {
          skillsCount: userSkillNames.length,
          yearsOfExperience
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in match-jobs function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
