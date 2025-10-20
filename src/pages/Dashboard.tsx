import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Upload, User, Briefcase, FileText, LogOut } from 'lucide-react';

export default function Dashboard() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">AI Job Search Bot</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome Back!</h2>
          <p className="text-muted-foreground">
            Let's find your next opportunity
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Link to="/upload-cv">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <Upload className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Upload CV</CardTitle>
                <CardDescription>
                  Upload and parse your CV with AI
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/profile">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <User className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>My Profile</CardTitle>
                <CardDescription>
                  Manage your profile and preferences
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/jobs">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <Briefcase className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Job Matches</CardTitle>
                <CardDescription>
                  View AI-matched job opportunities
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/applications">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <FileText className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Applications</CardTitle>
                <CardDescription>
                  Track your job applications
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Follow these steps to maximize your job search</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                1
              </div>
              <div>
                <h4 className="font-semibold">Upload Your CV</h4>
                <p className="text-sm text-muted-foreground">
                  Our AI will automatically parse your CV and extract your skills, experience, and education
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                2
              </div>
              <div>
                <h4 className="font-semibold">Complete Your Profile</h4>
                <p className="text-sm text-muted-foreground">
                  Review and enhance your profile with job preferences and salary expectations
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                3
              </div>
              <div>
                <h4 className="font-semibold">Browse AI-Matched Jobs</h4>
                <p className="text-sm text-muted-foreground">
                  Get personalized job recommendations based on your profile with match scores
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                4
              </div>
              <div>
                <h4 className="font-semibold">Apply with AI-Generated Content</h4>
                <p className="text-sm text-muted-foreground">
                  Generate tailored cover letters and customized CVs for each application
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
