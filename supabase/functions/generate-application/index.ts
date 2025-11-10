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

    const { userId, jobId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating application for user:', userId, 'job:', jobId);

    // Fetch user profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Fetch skills
    const { data: skills } = await supabaseClient
      .from('skills')
      .select('*')
      .eq('user_id', userId);

    // Fetch work experience
    const { data: experience } = await supabaseClient
      .from('work_experience')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    // Fetch education
    const { data: education } = await supabaseClient
      .from('education')
      .select('*')
      .eq('user_id', userId);

    // Fetch job details
    const { data: job } = await supabaseClient
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    // Fetch match data
    const { data: match } = await supabaseClient
      .from('job_matches')
      .select('*')
      .eq('user_id', userId)
      .eq('job_id', jobId)
      .single();

    // Build context for AI
    const userContext = `
Profile:
- Name: ${profile?.full_name || 'Candidate'}
- Location: ${profile?.location || 'Ghana'}
- Career Level: ${profile?.career_level || 'Mid-level'}

Skills:
${skills?.map(s => `- ${s.skill_name} (${s.skill_type}${s.proficiency_level ? ', ' + s.proficiency_level : ''})`).join('\n')}

Work Experience:
${experience?.map(e => `
- ${e.job_title} at ${e.company}
  ${e.start_date} - ${e.end_date || 'Present'}
  ${e.description || ''}
  Achievements: ${e.achievements?.join(', ') || 'N/A'}
`).join('\n')}

Education:
${education?.map(e => `
- ${e.degree} in ${e.field_of_study || 'N/A'}
  ${e.institution}
  ${e.graduation_date ? 'Graduated: ' + e.graduation_date : ''}
`).join('\n')}
`;

    const jobContext = `
Job Title: ${job?.title}
Company: ${job?.company}
Location: ${job?.location}
Job Type: ${job?.job_type}
Salary: ${job?.salary_range || 'Not specified'}

Description:
${job?.description}

Requirements:
${job?.requirements}

Match Score: ${match?.match_score || 'N/A'}%
- Skills Match: ${match?.skills_match_score || 0}%
- Experience Match: ${match?.experience_match_score || 0}%
`;

    // Generate cover letter
    const coverLetterPrompt = `Generate a professional cover letter for this job application. The letter should:
- Be 300-400 words
- Address the hiring manager professionally
- Highlight the candidate's most relevant skills and experiences that match this specific job
- Show enthusiasm for the role and company
- Include specific examples from their experience
- Close with a call to action

${userContext}

${jobContext}

Write only the cover letter content, no additional formatting or labels.`;

    const coverLetterResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert career advisor helping job seekers write compelling cover letters.' },
          { role: 'user', content: coverLetterPrompt }
        ],
      }),
    });

    if (!coverLetterResponse.ok) {
      const errorText = await coverLetterResponse.text();
      console.error('Lovable AI error:', coverLetterResponse.status, errorText);
      throw new Error('Failed to generate cover letter');
    }

    const coverLetterData = await coverLetterResponse.json();
    const coverLetter = coverLetterData.choices[0].message.content;

    // Generate custom CV summary
    const cvSummaryPrompt = `Generate a tailored CV summary for this job application. The summary should:
- Be 150-200 words
- Emphasize the most relevant experiences and skills for this specific role
- Highlight achievements that align with job requirements
- Be written in third person or as a professional summary

${userContext}

${jobContext}

Write only the CV summary content, no additional formatting or labels.`;

    const cvSummaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert career advisor helping job seekers create targeted CV summaries.' },
          { role: 'user', content: cvSummaryPrompt }
        ],
      }),
    });

    if (!cvSummaryResponse.ok) {
      throw new Error('Failed to generate CV summary');
    }

    const cvSummaryData = await cvSummaryResponse.json();
    const customCv = cvSummaryData.choices[0].message.content;

    // Create application
    const { data: application, error: appError } = await supabaseClient
      .from('applications')
      .insert([{
        user_id: userId,
        job_id: jobId,
        status: 'draft',
        cover_letter: coverLetter,
        custom_cv: customCv
      }])
      .select()
      .single();

    if (appError) throw appError;

    // Create tracking entry
    await supabaseClient
      .from('application_tracking')
      .insert([{
        application_id: application.id,
        status: 'draft',
        notes: 'Application generated with AI'
      }]);

    console.log('Application generated successfully:', application.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        application: {
          id: application.id,
          coverLetter,
          customCv
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-application function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
