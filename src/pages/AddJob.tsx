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
import { ArrowLeft } from 'lucide-react';

const jobSchema = z.object({
  title: z.string().min(3, 'Job title must be at least 3 characters').max(200),
  company: z.string().min(2, 'Company name must be at least 2 characters').max(200),
  location: z.string().optional(),
  job_type: z.string().optional(),
  salary_range: z.string().optional(),
  remote_option: z.boolean().default(false),
  source_platform: z.string().optional(),
  source_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const onSubmit = async (data: JobFormData) => {
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from('jobs').insert({
        title: data.title,
        company: data.company,
        location: data.location || null,
        job_type: data.job_type || null,
        salary_range: data.salary_range || null,
        remote_option: data.remote_option,
        source_platform: data.source_platform || null,
        source_url: data.source_url || null,
        posted_date: data.posted_date || null,
        description: data.description || null,
        requirements: data.requirements || null,
        is_active: true,
      });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Job posting has been created successfully.',
      });

      navigate('/jobs');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create job posting',
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
            <CardTitle className="text-3xl">Post a Job</CardTitle>
            <CardDescription>
              Fill out the form below to create a new job posting
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  <Label htmlFor="source_url">Source URL</Label>
                  <Input
                    id="source_url"
                    type="url"
                    placeholder="https://example.com/job-posting"
                    {...register('source_url')}
                  />
                  {errors.source_url && (
                    <p className="text-sm text-destructive">{errors.source_url.message}</p>
                  )}
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
                  {isSubmitting ? 'Creating...' : 'Create Job Posting'}
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
