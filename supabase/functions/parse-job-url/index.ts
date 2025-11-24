import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JobData {
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  requirements?: string;
  salary?: string;
  jobType?: string;
  platform?: string;
}

function extractJobData(html: string, url: string): JobData {
  const jobData: JobData = {};

  // Detect platform from URL
  if (url.includes('linkedin.com')) {
    jobData.platform = 'LinkedIn';
  } else if (url.includes('indeed.com')) {
    jobData.platform = 'Indeed';
  } else if (url.includes('glassdoor.com')) {
    jobData.platform = 'Glassdoor';
  }

  // Extract JSON-LD structured data (many job sites use this)
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    for (const match of jsonLdMatch) {
      try {
        const jsonText = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        const data = JSON.parse(jsonText);
        
        if (data['@type'] === 'JobPosting' || (Array.isArray(data['@graph']) && data['@graph'].some((item: any) => item['@type'] === 'JobPosting'))) {
          const jobPosting = data['@type'] === 'JobPosting' ? data : data['@graph'].find((item: any) => item['@type'] === 'JobPosting');
          
          if (jobPosting.title) jobData.title = jobPosting.title;
          if (jobPosting.hiringOrganization?.name) jobData.company = jobPosting.hiringOrganization.name;
          if (jobPosting.jobLocation?.address) {
            const addr = jobPosting.jobLocation.address;
            jobData.location = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean).join(', ');
          }
          if (jobPosting.description) jobData.description = jobPosting.description.replace(/<[^>]*>/g, '').trim();
          if (jobPosting.qualifications) jobData.requirements = jobPosting.qualifications.replace(/<[^>]*>/g, '').trim();
          if (jobPosting.baseSalary) {
            const salary = jobPosting.baseSalary;
            if (salary.value) {
              jobData.salary = `${salary.currency || '$'}${salary.value.minValue || ''} - ${salary.value.maxValue || ''}`;
            }
          }
          if (jobPosting.employmentType) jobData.jobType = jobPosting.employmentType;
        }
      } catch (e) {
        console.log('Error parsing JSON-LD:', e);
      }
    }
  }

  // Extract Open Graph meta tags
  const ogTitle = html.match(/<meta property="og:title" content="([^"]*)"/) || html.match(/<meta name="og:title" content="([^"]*)"/);
  if (ogTitle && !jobData.title) {
    jobData.title = ogTitle[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  }

  const ogDescription = html.match(/<meta property="og:description" content="([^"]*)"/) || html.match(/<meta name="og:description" content="([^"]*)"/);
  if (ogDescription && !jobData.description) {
    jobData.description = ogDescription[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  }

  // Try to extract title from page title if not found
  if (!jobData.title) {
    const titleMatch = html.match(/<title>([^<]*)<\/title>/);
    if (titleMatch) {
      jobData.title = titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').split('|')[0].trim();
    }
  }

  // LinkedIn specific patterns
  if (url.includes('linkedin.com')) {
    const companyMatch = html.match(/"companyName":"([^"]*)"/) || html.match(/class="topcard__org-name-link[^>]*>([^<]*)</);
    if (companyMatch && !jobData.company) {
      jobData.company = companyMatch[1].trim();
    }

    const locationMatch = html.match(/"location":"([^"]*)"/) || html.match(/class="topcard__flavor[^>]*>([^<]*)</);
    if (locationMatch && !jobData.location) {
      jobData.location = locationMatch[1].trim();
    }
  }

  // Indeed specific patterns
  if (url.includes('indeed.com')) {
    const companyMatch = html.match(/data-company-name="([^"]*)"/) || html.match(/class="jobsearch-InlineCompanyRating[^>]*>[\s\S]*?<div[^>]*>([^<]*)</);
    if (companyMatch && !jobData.company) {
      jobData.company = companyMatch[1].trim();
    }

    const locationMatch = html.match(/class="jobsearch-JobInfoHeader-subtitle[^>]*>[\s\S]*?<div[^>]*>([^<]*)</);
    if (locationMatch && !jobData.location) {
      jobData.location = locationMatch[1].trim();
    }
  }

  return jobData;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching job page:', url);

    // Fetch the job page with a user agent to avoid basic blocks
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch URL:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: `Failed to fetch job page: ${response.statusText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    const jobData = extractJobData(html, url);

    console.log('Extracted job data:', jobData);

    return new Response(
      JSON.stringify({ success: true, data: jobData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error parsing job URL:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to parse job URL' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
