import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const jobSchema = z.object({
  title: z.string().min(3, 'Job title must be at least 3 characters').max(200),
  company: z.string().min(2, 'Company name must be at least 2 characters').max(200),
  source_url: z.string().url('Must be a valid URL').min(1, 'Job URL is required'),
  location: z.string().optional(),
  job_type: z.string().optional(),
  salary_range: z.string().optional(),
  remote_option: z.boolean().default(false),
  source_platform: z.string().optional(),
  posted_date: z.string().optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
});

type JobFormData = z.infer<typeof jobSchema>;

const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'];

const sourcePlatforms = [
  'LinkedIn', 'Indeed', 'Glassdoor', 'Monster', 'CareerBuilder', 'ZipRecruiter',
  'SimplyHired', 'Dice', 'AngelList', 'Stack Overflow Jobs', 'GitHub Jobs',
  'Remote.co', 'We Work Remotely', 'FlexJobs', 'Upwork', 'Freelancer',
  'Company Website', 'Other'
];

const AddJob = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseUrl, setParseUrl] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      remote_option: false,
      posted_date: new Date().toISOString().split('T')[0],
    },
  });

  const remoteOption = watch('remote_option');

  const handleParseUrl = async () => {
    if (!parseUrl) {
      toast({
        title: 'Error',
        description: 'Please enter a job URL to parse',
        variant: 'destructive',
      });
      return;
    }

    setIsParsing(true);

    try {
      const { data, error } = await supabase.functions.invoke('parse-job-url', {
        body: { url: parseUrl },
      });

      if (error) throw error;

      if (data.success && data.data) {
        const jobData = data.data;

        // Auto-fill form fields
        if (jobData.title) setValue('title', jobData.title);
        if (jobData.company) setValue('company', jobData.company);
        if (jobData.location) setValue('location', jobData.location);
        if (jobData.description) setValue('description', jobData.description);
        if (jobData.requirements) setValue('requirements', jobData.requirements);
        if (jobData.salary) setValue('salary_range', jobData.salary);
        if (jobData.jobType) setValue('job_type', jobData.jobType);
        if (jobData.platform) setValue('source_platform', jobData.platform);
        setValue('source_url', parseUrl);

        toast({
          title: 'Success!',
          description: 'Job details extracted and form pre-filled',
        });
      } else {
        toast({
          title: 'Partial Success',
          description: 'Could not extract all details. Please fill in missing fields.',
        });
      }
    } catch (error: any) {
      console.error('Error parsing URL:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to parse job URL. Please fill the form manually.',
        variant: 'destructive',
      });
    } finally {
      setIsParsing(false);
    }
  };

  const onSubmit = async (data: JobFormData) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to save jobs',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data: jobData, error: insertError } = await supabase
        .from('jobs')
        .insert({
          title: data.title,
          company: data.company,
          location: data.location || null,
          job_type: data.job_type || null,
          salary_range: data.salary_range || null,
          remote_option: data.remote_option,
          source_platform: data.source_platform || null,
          source_url: data.source_url,
          posted_date: data.posted_date || null,
          description: data.description || null,
          requirements: data.requirements || null,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Call match-jobs function to calculate match scores
      const { data: matchData, error: matchError } = await supabase.functions.invoke('match-jobs', {
        body: { userId: user.id },
      });

      if (matchError) {
        console.error('Error matching job:', matchError);
        toast({
          title: 'Job Saved!',
          description: 'Job saved successfully. Match calculation pending.',
        });
      } else {
        toast({
          title: 'Job Saved & Matched!',
          description: `Job saved successfully! Check your match score.`,
        });
      }

      // Navigate to the Jobs page to see the new match
      navigate('/jobs');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save job',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Save Job to Apply</CardTitle>
            <CardDescription>
              Save this job posting so our AI can help you apply and track your application
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* URL Parser Section */}
            <Card className="mb-6 border-2 border-primary/20 bg-primary/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Auto-Fill from URL</CardTitle>
                </div>
                <CardDescription>
                  Paste a LinkedIn, Indeed, or other job board URL to automatically extract job details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://www.linkedin.com/jobs/view/..."
                    value={parseUrl}
                    onChange={(e) => setParseUrl(e.target.value)}
                    disabled={isParsing}
                  />
                  <Button
                    type="button"
                    onClick={handleParseUrl}
                    disabled={isParsing || !parseUrl}
                    className="whitespace-nowrap"
                  >
                    {isParsing ? 'Parsing...' : 'Parse URL'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Note: Some sites may block automated parsing. If it doesn't work, fill the form manually.
                </p>
              </CardContent>
            </Card>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g. Senior Software Engineer"
                    {...register('title')}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company Name *</Label>
                  <Input
                    id="company"
                    placeholder="e.g. Tech Corp"
                    {...register('company')}
                  />
                  {errors.company && (
                    <p className="text-sm text-destructive">{errors.company.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g. San Francisco, CA"
                      {...register('location')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="job_type">Job Type</Label>
                    <Select onValueChange={(value) => setValue('job_type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select job type" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary_range">Salary Range</Label>
                  <Input
                    id="salary_range"
                    placeholder="e.g. $80,000 - $120,000"
                    {...register('salary_range')}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remote_option"
                    checked={remoteOption}
                    onCheckedChange={(checked) => setValue('remote_option', checked as boolean)}
                  />
                  <Label htmlFor="remote_option" className="cursor-pointer">
                    Remote Position
                  </Label>
                </div>
              </div>

              {/* Source Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Source Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="source_platform">Source Platform</Label>
                    <Select onValueChange={(value) => setValue('source_platform', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {sourcePlatforms.map((platform) => (
                          <SelectItem key={platform} value={platform}>
                            {platform}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="posted_date">Posted Date</Label>
                    <Input
                      id="posted_date"
                      type="date"
                      {...register('posted_date')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source_url">Job URL *</Label>
                  <Input
                    id="source_url"
                    type="url"
                    placeholder="https://linkedin.com/jobs/... or https://indeed.com/..."
                    {...register('source_url')}
                  />
                  {errors.source_url && (
                    <p className="text-sm text-destructive">{errors.source_url.message}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Paste the link to the job posting on LinkedIn, Indeed, or any job board
                  </p>
                </div>
              </div>

              {/* Job Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Job Details</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Job Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the role, responsibilities, and what makes this opportunity great..."
                    rows={6}
                    {...register('description')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requirements">Requirements</Label>
                  <Textarea
                    id="requirements"
                    placeholder="List the required skills, experience, and qualifications..."
                    rows={6}
                    {...register('requirements')}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? 'Saving & Matching...' : 'Save Job & Match'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddJob;
