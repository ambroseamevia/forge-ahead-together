import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, MapPin, DollarSign, Briefcase, RefreshCw, Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';

export default function Jobs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

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

  // Generate autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!matches || searchQuery.length < 2) return [];

    const query = searchQuery.toLowerCase();
    const uniqueSuggestions = new Set<string>();

    matches.forEach((match: any) => {
      const job = match.jobs;
      if (!job) return;

      // Add job titles
      if (job.title.toLowerCase().includes(query)) {
        uniqueSuggestions.add(job.title);
      }

      // Add companies
      if (job.company.toLowerCase().includes(query)) {
        uniqueSuggestions.add(job.company);
      }

      // Add keywords from description and requirements
      const keywords = [
        ...job.description?.toLowerCase().split(/\W+/) || [],
        ...job.requirements?.toLowerCase().split(/\W+/) || []
      ];
      
      keywords.forEach(keyword => {
        if (keyword.length > 3 && keyword.includes(query)) {
          uniqueSuggestions.add(keyword);
        }
      });
    });

    return Array.from(uniqueSuggestions).slice(0, 8);
  }, [matches, searchQuery]);

  // Filter matches based on search query
  const filteredMatches = useMemo(() => {
    if (!matches || !searchQuery) return matches;

    const query = searchQuery.toLowerCase();
    return matches.filter((match: any) => {
      const job = match.jobs;
      if (!job) return false;

      return (
        job.title.toLowerCase().includes(query) ||
        job.company.toLowerCase().includes(query) ||
        job.location?.toLowerCase().includes(query) ||
        job.description?.toLowerCase().includes(query) ||
        job.requirements?.toLowerCase().includes(query) ||
        job.job_type?.toLowerCase().includes(query)
      );
    });
  }, [matches, searchQuery]);

  // Handle click outside autocomplete
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showAutocomplete || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          setSearchQuery(suggestions[selectedSuggestionIndex]);
          setShowAutocomplete(false);
          setSelectedSuggestionIndex(-1);
        }
        break;
      case 'Escape':
        setShowAutocomplete(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowAutocomplete(false);
    setSelectedSuggestionIndex(-1);
    searchInputRef.current?.focus();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowAutocomplete(false);
    setSelectedSuggestionIndex(-1);
    searchInputRef.current?.focus();
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
            Jobs that match your profile and preferences
          </p>
        </div>

        {/* Search Bar with Autocomplete */}
        <div className="mb-6 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search by job title, company, or keywords..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowAutocomplete(true);
                setSelectedSuggestionIndex(-1);
              }}
              onFocus={() => setShowAutocomplete(true)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-10 h-12 text-base"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showAutocomplete && suggestions.length > 0 && (
            <div
              ref={autocompleteRef}
              className="absolute z-50 w-full mt-2 bg-background border border-border rounded-lg shadow-lg overflow-hidden"
            >
              <div className="py-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`w-full text-left px-4 py-2 hover:bg-accent transition-colors ${
                      index === selectedSuggestionIndex ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Search className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{suggestion}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search Results Info */}
        {searchQuery && (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Found {filteredMatches?.length || 0} {filteredMatches?.length === 1 ? 'job' : 'jobs'} matching "{searchQuery}"
            </p>
            <Button variant="ghost" size="sm" onClick={clearSearch}>
              Clear search
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredMatches && filteredMatches.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredMatches.map((match: any) => (
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
        ) : searchQuery ? (
          <Card>
            <CardHeader>
              <CardTitle>No jobs found</CardTitle>
              <CardDescription>
                No jobs match your search "{searchQuery}". Try different keywords or{' '}
                <button onClick={clearSearch} className="text-primary hover:underline">
                  clear your search
                </button>
                .
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No job matches yet</CardTitle>
              <CardDescription>
                Click "Refresh Matches" to find jobs that match your profile
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </main>
    </div>
  );
}
