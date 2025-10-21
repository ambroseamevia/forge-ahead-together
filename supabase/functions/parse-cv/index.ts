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
  career_level: 'entry' | 'mid' | 'senior' | 'executive';
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { cv_id, user_id } = await req.json();

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

    // Call Lovable AI for parsing
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
            content: 'You are a CV parsing expert. Extract information and return ONLY valid JSON, no markdown formatting.',
          },
          {
            role: 'user',
            content: `Extract ALL information from this CV in this exact JSON format:

{
  "personal_info": {
    "full_name": "string",
    "email": "string",
    "phone": "string",
    "location": "string"
  },
  "career_level": "entry|mid|senior|executive",
  "skills": [
    {
      "name": "string",
      "type": "technical|soft|language",
      "proficiency": "beginner|intermediate|advanced|expert"
    }
  ],
  "work_experience": [
    {
      "job_title": "string",
      "company": "string",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD or null",
      "description": "string",
      "achievements": ["string"]
    }
  ],
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "field_of_study": "string",
      "graduation_date": "YYYY-MM-DD",
      "certifications": ["string"]
    }
  ]
}

CV Content:
${fileText}

Return ONLY the JSON, no explanation or markdown.`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI parsing failed: ${await aiResponse.text()}`);
    }

    const aiResult = await aiResponse.json();
    let parsedData: ParsedCV;
    
    try {
      const content = aiResult.choices[0].message.content;
      // Remove markdown code blocks if present
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedData = JSON.parse(jsonStr);
    } catch (e: any) {
      throw new Error(`Failed to parse AI response: ${e.message || String(e)}`);
    }

    // Update profile with personal info
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: parsedData.personal_info.full_name || null,
        phone: parsedData.personal_info.phone || null,
        location: parsedData.personal_info.location || null,
        career_level: parsedData.career_level || null,
      })
      .eq('id', user_id);

    if (profileError) throw new Error(`Failed to update profile: ${profileError.message}`);

    // Insert skills
    if (parsedData.skills?.length > 0) {
      const skills = parsedData.skills.map((skill) => ({
        user_id,
        skill_name: skill.name,
        skill_type: skill.type,
        proficiency_level: skill.proficiency,
      }));
      
      const { error: skillsError } = await supabase
        .from('skills')
        .insert(skills);

      if (skillsError) console.error('Skills insert error:', skillsError);
    }

    // Insert work experience
    if (parsedData.work_experience?.length > 0) {
      const workExp = parsedData.work_experience.map((exp) => ({
        user_id,
        job_title: exp.job_title,
        company: exp.company,
        start_date: exp.start_date,
        end_date: exp.end_date,
        description: exp.description,
        achievements: exp.achievements,
      }));

      const { error: workError } = await supabase
        .from('work_experience')
        .insert(workExp);

      if (workError) console.error('Work experience insert error:', workError);
    }

    // Insert education
    if (parsedData.education?.length > 0) {
      const education = parsedData.education.map((edu) => ({
        user_id,
        degree: edu.degree,
        institution: edu.institution,
        field_of_study: edu.field_of_study,
        graduation_date: edu.graduation_date,
        certifications: edu.certifications,
      }));

      const { error: eduError } = await supabase
        .from('education')
        .insert(education);

      if (eduError) console.error('Education insert error:', eduError);
    }

    // Update CV with parsed data
    const { error: cvUpdateError } = await supabase
      .from('cvs')
      .update({ parsed_data: parsedData })
      .eq('id', cv_id);

    if (cvUpdateError) console.error('CV update error:', cvUpdateError);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          skills_count: parsedData.skills?.length || 0,
          work_experience_count: parsedData.work_experience?.length || 0,
          education_count: parsedData.education?.length || 0,
          career_level: parsedData.career_level,
        },
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
