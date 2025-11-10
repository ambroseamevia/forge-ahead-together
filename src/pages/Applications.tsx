import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, FileText, Plus } from 'lucide-react';

const STATUS_COLUMNS = [
  { status: 'draft', label: 'Draft', color: 'bg-muted text-muted-foreground' },
  { status: 'submitted', label: 'Submitted', color: 'bg-primary text-primary-foreground' },
  { status: 'in_review', label: 'In Review', color: 'bg-secondary text-secondary-foreground' },
  { status: 'interview', label: 'Interview', color: 'bg-accent text-accent-foreground' },
  { status: 'offer', label: 'Offer', color: 'bg-accent text-accent-foreground' },
  { status: 'rejected', label: 'Rejected', color: 'bg-destructive text-destructive-foreground' },
];

export default function Applications() {
  const { user } = useAuth();

  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          jobs (
            title,
            company,
            location
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const getApplicationsByStatus = (status: string) => {
    return applications?.filter(app => app.status === status) || [];
  };

  const getTotalStats = () => {
    const total = applications?.length || 0;
    const submitted = applications?.filter(a => a.status !== 'draft').length || 0;
    const interviews = applications?.filter(a => a.status === 'interview').length || 0;
    const offers = applications?.filter(a => a.status === 'offer').length || 0;

    return { total, submitted, interviews, offers };
  };

  const stats = getTotalStats();

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
            <Link to="/jobs">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Application
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">My Applications</h2>
          <p className="text-muted-foreground">
            Track and manage your job applications
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Applications</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Submitted</CardDescription>
              <CardTitle className="text-3xl">{stats.submitted}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Interviews</CardDescription>
              <CardTitle className="text-3xl">{stats.interviews}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Offers</CardDescription>
              <CardTitle className="text-3xl">{stats.offers}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !applications || applications.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Applications Yet</CardTitle>
              <CardDescription>
                Start by finding jobs that match your profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/jobs">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Browse Jobs
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {STATUS_COLUMNS.map(column => {
              const apps = getApplicationsByStatus(column.status);
              return (
                <div key={column.status} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{column.label}</h3>
                    <Badge variant="secondary">{apps.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {apps.map((app: any) => (
                      <Link key={app.id} to={`/applications/${app.id}`}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardHeader className="p-4">
                            <CardTitle className="text-sm line-clamp-2">{app.jobs.title}</CardTitle>
                            <CardDescription className="text-xs">{app.jobs.company}</CardDescription>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center">
                                <FileText className="h-3 w-3 mr-1" />
                                {new Date(app.application_date).toLocaleDateString()}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
