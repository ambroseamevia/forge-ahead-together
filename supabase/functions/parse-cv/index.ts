import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedCV {
  personal_info: {
    full_name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  skills: Array<{
    name: string;
    type: 'technical' | 'soft' | 'language';
    proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  }>;
  work_experience: Array<{
    job_title: string;
    company: string;
    start_date: string;
    end_date: string | null;
    description: string;
    achievements: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    field_of_study: string;
    graduation_date: string;
    certifications: string[];
  }>;
}

type CareerLevel = 'entry' | 'mid' | 'senior' | 'executive';

// Calculate career level from actual work experience dates
function calculateCareerLevel(workExperience: ParsedCV['work_experience']): CareerLevel {
  if (!workExperience || workExperience.length === 0) {
    return 'entry';
  }

  let totalMonths = 0;
  
  for (const exp of workExperience) {
    try {
      const startDate = new Date(exp.start_date);
      const endDate = exp.end_date ? new Date(exp.end_date) : new Date();
      
      if (isNaN(startDate.getTime())) continue;
      
      const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                     (endDate.getMonth() - startDate.getMonth());
      totalMonths += Math.max(0, months);
    } catch {
      continue;
    }
  }
  
  const years = totalMonths / 12;
  
  if (years >= 10) return 'executive';
  if (years >= 5) return 'senior';
  if (years >= 2) return 'mid';
  return 'entry';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { cv_id, user_id, save_data = false, parsed_data } = await req.json();

    // If this is a save request with pre-reviewed data
    if (save_data && parsed_data) {
      console.log('Saving reviewed CV data for user:', user_id);
      return await saveReviewedData(supabase, user_id, cv_id, parsed_data);
    }

    // Otherwise, parse the CV and return data for review
    console.log('Parsing CV:', cv_id, 'for user:', user_id);

    // Fetch CV from database
    const { data: cvData, error: cvError } = await supabase
      .from('cvs')
      .select('*')
      .eq('id', cv_id)
      .single();

    if (cvError) throw new Error(`CV not found: ${cvError.message}`);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('cvs')
      .download(cvData.file_path);

    if (downloadError) throw new Error(`Failed to download CV: ${downloadError.message}`);

    // Extract text from file
    const fileBuffer = await fileData.arrayBuffer();
    const fileText = new TextDecoder().decode(fileBuffer);

    console.log('CV text length:', fileText.length);

    // Call Lovable AI for parsing with STRICT instructions
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a precise CV data extractor. Your job is to extract ONLY information that is EXPLICITLY written in the CV.

CRITICAL RULES:
1. Extract ONLY what is explicitly stated - DO NOT infer, assume, or fabricate any information
2. If a skill is not explicitly mentioned, DO NOT include it
3. If dates are unclear or missing, use "Unknown" instead of guessing
4. For proficiency levels: only mark as "expert" if the CV explicitly says expert/mastery, otherwise use "intermediate"
5. Do NOT add skills that might be "implied" by a job title
6. Do NOT fabricate achievements - only include what is written
7. If the CV is poorly formatted or unclear, extract less rather than guess more
8. Return ONLY valid JSON, no markdown or explanation`,
          },
          {
            role: 'user',
            content: `Extract ONLY explicitly stated information from this CV. Return JSON in this exact format:

{
  "personal_info": {
    "full_name": "string or null if not found",
    "email": "string or null if not found",
    "phone": "string or null if not found",
    "location": "string or null if not found"
  },
  "skills": [
    {
      "name": "exact skill name as written",
      "type": "technical|soft|language",
      "proficiency": "beginner|intermediate|advanced|expert (default to intermediate if not specified)"
    }
  ],
  "work_experience": [
    {
      "job_title": "exact title as written",
      "company": "company name",
      "start_date": "YYYY-MM-DD or YYYY-MM-01 if only month/year given",
      "end_date": "YYYY-MM-DD or null if current/present",
      "description": "brief description if provided",
      "achievements": ["only explicitly listed achievements"]
    }
  ],
  "education": [
    {
      "degree": "exact degree name",
      "institution": "institution name",
      "field_of_study": "field if mentioned",
      "graduation_date": "YYYY-MM-DD or YYYY if only year",
      "certifications": ["only explicitly listed certifications"]
    }
  ]
}

IMPORTANT: If information is not clearly stated, omit it or use null. Do NOT guess or infer.

CV Content:
${fileText}

Return ONLY the JSON.`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI parsing failed:', errorText);
      throw new Error(`AI parsing failed: ${errorText}`);
    }

    const aiResult = await aiResponse.json();
    let parsedData: ParsedCV;
    
    try {
      const content = aiResult.choices[0].message.content;
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedData = JSON.parse(jsonStr);
    } catch (e: any) {
      console.error('Failed to parse AI response:', e);
      throw new Error(`Failed to parse AI response: ${e.message || String(e)}`);
    }

    // Calculate career level from actual work experience dates (not AI guess)
    const careerLevel = calculateCareerLevel(parsedData.work_experience);
    
    console.log('Parsed data:', {
      skills: parsedData.skills?.length || 0,
      experience: parsedData.work_experience?.length || 0,
      education: parsedData.education?.length || 0,
      calculatedCareerLevel: careerLevel
    });

    // Return parsed data for user review (don't save yet)
    return new Response(
      JSON.stringify({
        success: true,
        needsReview: true,
        data: {
          ...parsedData,
          career_level: careerLevel,
        },
        cv_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error parsing CV:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function saveReviewedData(supabase: any, userId: string, cvId: string, parsedData: any) {
  try {
    // Update profile with personal info
    const profileUpdate: any = {};
    if (parsedData.personal_info?.full_name) profileUpdate.full_name = parsedData.personal_info.full_name;
    if (parsedData.personal_info?.phone) profileUpdate.phone = parsedData.personal_info.phone;
    if (parsedData.personal_info?.location) profileUpdate.location = parsedData.personal_info.location;
    if (parsedData.career_level) profileUpdate.career_level = parsedData.career_level;

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', userId);

      if (profileError) console.error('Profile update error:', profileError);
    }

    // Insert skills (only the ones user approved)
    let skillsInserted = 0;
    if (parsedData.skills?.length > 0) {
      const skills = parsedData.skills.map((skill: any) => ({
        user_id: userId,
        skill_name: skill.name,
        skill_type: skill.type || 'technical',
        proficiency_level: skill.proficiency || 'intermediate',
      }));
      
      const { error: skillsError } = await supabase
        .from('skills')
        .insert(skills);

      if (skillsError) {
        console.error('Skills insert error:', skillsError);
      } else {
        skillsInserted = skills.length;
      }
    }

    // Insert work experience
    let experienceInserted = 0;
    if (parsedData.work_experience?.length > 0) {
      const workExp = parsedData.work_experience.map((exp: any) => ({
        user_id: userId,
        job_title: exp.job_title,
        company: exp.company,
        start_date: exp.start_date,
        end_date: exp.end_date,
        description: exp.description || '',
        achievements: exp.achievements || [],
      }));

      const { error: workError } = await supabase
        .from('work_experience')
        .insert(workExp);

      if (workError) {
        console.error('Work experience insert error:', workError);
      } else {
        experienceInserted = workExp.length;
      }
    }

    // Insert education
    let educationInserted = 0;
    if (parsedData.education?.length > 0) {
      const education = parsedData.education.map((edu: any) => ({
        user_id: userId,
        degree: edu.degree,
        institution: edu.institution,
        field_of_study: edu.field_of_study || '',
        graduation_date: edu.graduation_date,
        certifications: edu.certifications || [],
      }));

      const { error: eduError } = await supabase
        .from('education')
        .insert(education);

      if (eduError) {
        console.error('Education insert error:', eduError);
      } else {
        educationInserted = education.length;
      }
    }

    // Update CV with parsed data
    await supabase
      .from('cvs')
      .update({ parsed_data: parsedData })
      .eq('id', cvId);

    return new Response(
      JSON.stringify({
        success: true,
        saved: true,
        data: {
          skills_count: skillsInserted,
          work_experience_count: experienceInserted,
          education_count: educationInserted,
          career_level: parsedData.career_level,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error saving reviewed data:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
