import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, MapPin, DollarSign, Briefcase, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function JobDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [generatedApp, setGeneratedApp] = useState<any>(null);

  const { data: matchData, isLoading } = useQuery({
    queryKey: ['job-match', id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_matches')
        .select(`
          *,
          jobs (*)
        `)
        .eq('job_id', id)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user?.id,
  });

  const { data: existingApp } = useQuery({
    queryKey: ['application-check', id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('id')
        .eq('job_id', id)
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!id && !!user?.id,
  });

  const generateApplication = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-application', {
        body: { userId: user?.id, jobId: id }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setGeneratedApp(data.application);
      queryClient.invalidateQueries({ queryKey: ['application-check'] });
      toast.success('Application generated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate application: ${error.message}`);
    },
  });

  const getMatchColor = (score: number) => {
    if (score >= 90) return 'hsl(var(--accent))';
    if (score >= 75) return 'hsl(var(--primary))';
    if (score >= 60) return 'hsl(var(--secondary))';
    return 'hsl(var(--muted))';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const job = matchData?.jobs;
  const match = matchData;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link to="/jobs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-2">{job?.title}</CardTitle>
                  <CardDescription className="text-lg">{job?.company}</CardDescription>
                </div>
                <Badge 
                  className="text-lg px-4 py-2"
                  style={{ backgroundColor: getMatchColor(match?.match_score || 0) }}
                >
                  {match?.match_score}% Match
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="h-5 w-5 mr-2" />
                  <div>
                    <div className="text-sm font-medium text-foreground">{job?.location}</div>
                    {job?.remote_option && <Badge variant="outline" className="mt-1">Remote</Badge>}
                  </div>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Briefcase className="h-5 w-5 mr-2" />
                  <div className="text-sm font-medium text-foreground">{job?.job_type}</div>
                </div>
                {job?.salary_range && (
                  <div className="flex items-center text-muted-foreground">
                    <DollarSign className="h-5 w-5 mr-2" />
                    <div className="text-sm font-medium text-foreground">{job?.salary_range}</div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                {existingApp ? (
                  <Button 
                    onClick={() => navigate(`/applications/${existingApp.id}`)}
                    className="flex-1"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    View Application
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setShowApplyDialog(true)}
                    className="flex-1"
                  >
                    Apply Now
                  </Button>
                )}
                {job?.source_url && (
                  <Button variant="outline" asChild>
                    <a href={job.source_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on {job.source_platform}
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Match Breakdown</CardTitle>
              <CardDescription>How well you match this position</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Skills Match</span>
                  <span className="text-sm font-medium">{match?.skills_match_score}%</span>
                </div>
                <Progress value={match?.skills_match_score || 0} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Experience Match</span>
                  <span className="text-sm font-medium">{match?.experience_match_score}%</span>
                </div>
                <Progress value={match?.experience_match_score || 0} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Location Match</span>
                  <span className="text-sm font-medium">{match?.location_match_score}%</span>
                </div>
                <Progress value={match?.location_match_score || 0} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Salary Match</span>
                  <span className="text-sm font-medium">{match?.salary_match_score}%</span>
                </div>
                <Progress value={match?.salary_match_score || 0} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground">{job?.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground">{job?.requirements}</p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Apply to {job?.title}</DialogTitle>
            <DialogDescription>
              {generatedApp 
                ? 'Your application has been generated. Review and edit before submitting.' 
                : 'Generate an AI-powered application tailored to this job'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!generatedApp ? (
              <Button 
                onClick={() => generateApplication.mutate()}
                disabled={generateApplication.isPending}
                className="w-full"
              >
                {generateApplication.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating Application...</>
                ) : (
                  'Generate AI Application'
                )}
              </Button>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Cover Letter Preview</h4>
                  <p className="text-sm text-muted-foreground line-clamp-4">{generatedApp.coverLetter}</p>
                </div>
                <Button 
                  onClick={() => {
                    navigate(`/applications/${generatedApp.id}`);
                    setShowApplyDialog(false);
                  }}
                  className="w-full"
                >
                  Edit Application
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
