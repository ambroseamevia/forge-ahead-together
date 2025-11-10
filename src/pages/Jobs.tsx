import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, DollarSign, Briefcase, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Jobs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch job matches with job details
  const { data: matches, isLoading } = useQuery({
    queryKey: ['job-matches', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_matches')
        .select(`
          *,
          jobs (*)
        `)
        .eq('user_id', user?.id)
        .order('match_score', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const scrapeJobs = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('scrape-jobs');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Jobs scraped successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to scrape jobs: ${error.message}`);
    },
  });

  const matchJobs = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('match-jobs', {
        body: { userId: user?.id }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['job-matches'] });
      toast.success(`Found ${data.matchesCreated} new matches`);
      setIsRefreshing(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to match jobs: ${error.message}`);
      setIsRefreshing(false);
    },
  });

  const handleRefreshMatches = async () => {
    setIsRefreshing(true);
    await scrapeJobs.mutateAsync();
    await matchJobs.mutateAsync();
  };

  const getMatchColor = (score: number) => {
    if (score >= 90) return 'bg-accent text-accent-foreground';
    if (score >= 75) return 'bg-primary text-primary-foreground';
    if (score >= 60) return 'bg-secondary text-secondary-foreground';
    return 'bg-muted text-muted-foreground';
  };

  const getMatchLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Great';
    if (score >= 60) return 'Good';
    return 'Fair';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <Button 
              onClick={handleRefreshMatches} 
              disabled={isRefreshing}
              size="sm"
            >
              {isRefreshing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Refreshing...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" /> Refresh Matches</>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Job Matches</h2>
          <p className="text-muted-foreground">
            AI-powered job recommendations tailored to your profile
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !matches || matches.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Job Matches Yet</CardTitle>
              <CardDescription>
                Click "Refresh Matches" to find jobs that match your profile
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {matches.map((match: any) => (
              <Card key={match.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-1">{match.jobs.title}</CardTitle>
                      <CardDescription className="font-medium">{match.jobs.company}</CardDescription>
                    </div>
                    <Badge className={getMatchColor(match.match_score)}>
                      {match.match_score}% {getMatchLabel(match.match_score)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      {match.jobs.location}
                      {match.jobs.remote_option && <Badge variant="outline" className="ml-2">Remote</Badge>}
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Briefcase className="h-4 w-4 mr-2" />
                      {match.jobs.job_type}
                    </div>
                    {match.jobs.salary_range && (
                      <div className="flex items-center text-muted-foreground">
                        <DollarSign className="h-4 w-4 mr-2" />
                        {match.jobs.salary_range}
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {match.jobs.description}
                  </p>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Skills Match</span>
                      <span className="font-medium">{match.skills_match_score}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Experience Match</span>
                      <span className="font-medium">{match.experience_match_score}%</span>
                    </div>
                  </div>

                  <Link to={`/jobs/${match.job_id}`}>
                    <Button className="w-full">View Details</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
