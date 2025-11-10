import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'in_review', label: 'In Review' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
];

export default function ApplicationDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [coverLetter, setCoverLetter] = useState('');
  const [customCv, setCustomCv] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');

  const { data: application, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          jobs (
            title,
            company,
            location,
            job_type,
            salary_range,
            description,
            requirements
          )
        `)
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setCoverLetter(data.cover_letter || '');
      setCustomCv(data.custom_cv || '');
      setNotes(data.notes || '');
      setStatus(data.status);
      return data;
    },
    enabled: !!id && !!user?.id,
  });

  const { data: tracking } = useQuery({
    queryKey: ['application-tracking', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('application_tracking')
        .select('*')
        .eq('application_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const updateApplication = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('applications')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      toast.success('Application updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update application: ${error.message}`);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      // Update application status
      await updateApplication.mutateAsync({ status: newStatus });

      // Add tracking entry
      const { error } = await supabase
        .from('application_tracking')
        .insert([{
          application_id: id,
          status: newStatus,
          notes: `Status changed to ${newStatus}`
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application-tracking', id] });
      toast.success('Status updated successfully');
    },
  });

  const regenerateApplication = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-application', {
        body: { userId: user?.id, jobId: application?.job_id }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setCoverLetter(data.application.coverLetter);
      setCustomCv(data.application.customCv);
      toast.success('Application regenerated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to regenerate: ${error.message}`);
    },
  });

  const handleSave = () => {
    updateApplication.mutate({
      cover_letter: coverLetter,
      custom_cv: customCv,
      notes: notes,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link to="/applications">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Applications
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
                  <CardTitle className="text-2xl mb-1">{application?.jobs.title}</CardTitle>
                  <CardDescription className="text-lg">{application?.jobs.company}</CardDescription>
                  <p className="text-sm text-muted-foreground mt-2">
                    Applied: {new Date(application?.application_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-y-2">
                  <Select value={status} onValueChange={(val) => { setStatus(val); updateStatus.mutate(val); }}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
          </Card>

          {tracking && tracking.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Status Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tracking.map((entry: any, idx: number) => (
                    <div key={entry.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-3 w-3 rounded-full bg-primary" />
                        {idx < tracking.length - 1 && <div className="w-px h-full bg-border mt-1" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">{entry.status}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Cover Letter</CardTitle>
                {status === 'draft' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => regenerateApplication.mutate()}
                    disabled={regenerateApplication.isPending}
                  >
                    {regenerateApplication.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Regenerating...</>
                    ) : (
                      <><RefreshCw className="h-4 w-4 mr-2" /> Regenerate with AI</>
                    )}
                  </Button>
                )}
              </div>
              <CardDescription>
                {status === 'draft' ? 'Edit your cover letter before submitting' : 'Cover letter for this application'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={12}
                disabled={status !== 'draft'}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom CV Summary</CardTitle>
              <CardDescription>
                {status === 'draft' ? 'Tailored summary for this position' : 'CV summary used for this application'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={customCv}
                onChange={(e) => setCustomCv(e.target.value)}
                rows={8}
                disabled={status !== 'draft'}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes & Reminders</CardTitle>
              <CardDescription>Track your progress and important dates</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                placeholder="Add notes about the application, interview dates, follow-ups, etc."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {application?.jobs.description}
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Requirements</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {application?.jobs.requirements}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              onClick={handleSave}
              disabled={updateApplication.isPending}
            >
              {updateApplication.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Save Changes</>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
