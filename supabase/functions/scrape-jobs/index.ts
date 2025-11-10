import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

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

    console.log('Starting job scraping...');

    // Sample job data for Ghana (in a real implementation, this would scrape actual job sites)
    const sampleJobs = [
      {
        title: 'Senior Software Engineer',
        company: 'MTN Ghana',
        location: 'Accra, Ghana',
        job_type: 'Full-time',
        salary_range: 'GHS 8,000 - 12,000',
        description: 'We are seeking an experienced Senior Software Engineer to join our team. You will lead development of mobile and web applications.',
        requirements: 'Bachelor\'s degree in Computer Science, 5+ years experience in software development, proficiency in React, Node.js, TypeScript, strong problem-solving skills',
        source_url: 'https://careers.mtn.com.gh/job/12345',
        source_platform: 'MTN Careers',
        remote_option: false,
        posted_date: new Date().toISOString(),
      },
      {
        title: 'Data Analyst',
        company: 'Vodafone Ghana',
        location: 'Accra, Ghana',
        job_type: 'Full-time',
        salary_range: 'GHS 5,000 - 8,000',
        description: 'Join our analytics team to drive data-driven decision making across the organization.',
        requirements: 'Bachelor\'s degree in Statistics, Mathematics or related field, 3+ years experience in data analysis, proficiency in SQL, Python, Excel, experience with visualization tools like Tableau or Power BI',
        source_url: 'https://careers.vodafone.com.gh/job/67890',
        source_platform: 'Vodafone Careers',
        remote_option: true,
        posted_date: new Date().toISOString(),
      },
      {
        title: 'Product Manager',
        company: 'Zeepay',
        location: 'Accra, Ghana',
        job_type: 'Full-time',
        salary_range: 'GHS 10,000 - 15,000',
        description: 'Lead product strategy and execution for our fintech platform serving millions of users.',
        requirements: 'Bachelor\'s degree in Business, Technology or related field, 4+ years product management experience in fintech or tech startups, strong analytical and communication skills, experience with agile methodologies',
        source_url: 'https://careers.zeepay.co/job/prod-001',
        source_platform: 'Zeepay Careers',
        remote_option: false,
        posted_date: new Date().toISOString(),
      },
      {
        title: 'Marketing Manager',
        company: 'Jumia Ghana',
        location: 'Accra, Ghana',
        job_type: 'Full-time',
        salary_range: 'GHS 7,000 - 10,000',
        description: 'Drive marketing campaigns and brand awareness for Ghana\'s leading e-commerce platform.',
        requirements: 'Bachelor\'s degree in Marketing, Business or related field, 3+ years marketing experience in e-commerce or retail, strong digital marketing skills, experience with social media management',
        source_url: 'https://careers.jumia.com.gh/job/mkt-456',
        source_platform: 'Jumia Careers',
        remote_option: false,
        posted_date: new Date().toISOString(),
      },
      {
        title: 'Full Stack Developer',
        company: 'Hubtel',
        location: 'Accra, Ghana',
        job_type: 'Full-time',
        salary_range: 'GHS 6,000 - 9,000',
        description: 'Build and maintain scalable web applications for payment and messaging solutions.',
        requirements: 'Bachelor\'s degree in Computer Science or related field, 3+ years full stack development experience, proficiency in JavaScript, React, Node.js, database design, API development',
        source_url: 'https://careers.hubtel.com/job/dev-789',
        source_platform: 'Hubtel Careers',
        remote_option: true,
        posted_date: new Date().toISOString(),
      },
      {
        title: 'Business Analyst',
        company: 'Ecobank Ghana',
        location: 'Accra, Ghana',
        job_type: 'Full-time',
        salary_range: 'GHS 5,500 - 8,500',
        description: 'Analyze business processes and recommend solutions to improve efficiency and profitability.',
        requirements: 'Bachelor\'s degree in Business, Finance or related field, 2+ years business analysis experience, strong analytical skills, proficiency in Excel and business intelligence tools',
        source_url: 'https://careers.ecobank.com/job/ba-234',
        source_platform: 'Ecobank Careers',
        remote_option: false,
        posted_date: new Date().toISOString(),
      },
      {
        title: 'UI/UX Designer',
        company: 'Dream Oval',
        location: 'Accra, Ghana',
        job_type: 'Full-time',
        salary_range: 'GHS 4,500 - 7,000',
        description: 'Design beautiful and intuitive user interfaces for mobile games and applications.',
        requirements: 'Bachelor\'s degree in Design, HCI or related field, 2+ years UI/UX design experience, proficiency in Figma, Adobe XD, strong portfolio, understanding of mobile design patterns',
        source_url: 'https://careers.dreamoval.com/job/des-567',
        source_platform: 'Dream Oval Careers',
        remote_option: true,
        posted_date: new Date().toISOString(),
      },
      {
        title: 'DevOps Engineer',
        company: 'Farmerline',
        location: 'Accra, Ghana',
        job_type: 'Full-time',
        salary_range: 'GHS 7,000 - 11,000',
        description: 'Build and maintain cloud infrastructure and CI/CD pipelines for agricultural technology platform.',
        requirements: 'Bachelor\'s degree in Computer Science or related field, 3+ years DevOps experience, proficiency in AWS/Azure, Docker, Kubernetes, Terraform, CI/CD tools like Jenkins or GitLab CI',
        source_url: 'https://careers.farmerline.co/job/devops-890',
        source_platform: 'Farmerline Careers',
        remote_option: true,
        posted_date: new Date().toISOString(),
      }
    ];

    let newJobsCount = 0;
    let duplicatesCount = 0;

    for (const job of sampleJobs) {
      // Check for duplicates
      const { data: existing } = await supabaseClient
        .from('jobs')
        .select('id')
        .eq('title', job.title)
        .eq('company', job.company)
        .eq('location', job.location)
        .single();

      if (existing) {
        duplicatesCount++;
        console.log(`Duplicate found: ${job.title} at ${job.company}`);
        continue;
      }

      // Insert new job
      const { error } = await supabaseClient
        .from('jobs')
        .insert([{ ...job, is_active: true }]);

      if (error) {
        console.error(`Error inserting job: ${error.message}`);
      } else {
        newJobsCount++;
        console.log(`Added new job: ${job.title} at ${job.company}`);
      }
    }

    console.log(`Scraping complete: ${newJobsCount} new jobs, ${duplicatesCount} duplicates`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        newJobs: newJobsCount, 
        duplicates: duplicatesCount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scrape-jobs function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
