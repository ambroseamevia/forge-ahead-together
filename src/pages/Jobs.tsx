import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, MapPin, DollarSign, Briefcase, RefreshCw, Loader2, Search, X, Globe, Plane } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type MatchFilter = 'all' | 'excellent' | 'good' | 'fair' | 'low';

export default function Jobs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchFilter, setMatchFilter] = useState<MatchFilter>('all');
  const [visaSponsorshipOnly, setVisaSponsorshipOnly] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Fetch ALL job matches (including low scores)
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
      toast.success(`Found ${data.matchesCreated} new matches, updated ${data.matchesUpdated || 0} existing`);
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
    if (score >= 70) return 'bg-green-500/10 text-green-600 border-green-500/20';
    if (score >= 50) return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    if (score >= 40) return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    return 'bg-red-500/10 text-red-600 border-red-500/20';
  };

  const getMatchLabel = (score: number) => {
    if (score >= 70) return 'Excellent';
    if (score >= 50) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Low';
  };

  // Filter by match score
  const getScoreFilteredMatches = (matches: any[], filter: MatchFilter) => {
    if (!matches) return [];
    switch (filter) {
      case 'excellent': return matches.filter(m => m.match_score >= 70);
      case 'good': return matches.filter(m => m.match_score >= 50 && m.match_score < 70);
      case 'fair': return matches.filter(m => m.match_score >= 40 && m.match_score < 50);
      case 'low': return matches.filter(m => m.match_score < 40);
      default: return matches;
    }
  };

  // Generate autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!matches || searchQuery.length < 2) return [];

    const query = searchQuery.toLowerCase();
    const uniqueSuggestions = new Set<string>();

    matches.forEach((match: any) => {
      const job = match.jobs;
      if (!job) return;

      if (job.title.toLowerCase().includes(query)) {
        uniqueSuggestions.add(job.title);
      }
      if (job.company.toLowerCase().includes(query)) {
        uniqueSuggestions.add(job.company);
      }
    });

    return Array.from(uniqueSuggestions).slice(0, 8);
  }, [matches, searchQuery]);

  // Filter matches based on search query, score filter, and visa sponsorship
  const filteredMatches = useMemo(() => {
    let result = getScoreFilteredMatches(matches || [], matchFilter);

    // Filter by visa sponsorship
    if (visaSponsorshipOnly) {
      result = result.filter((match: any) => match.jobs?.visa_sponsorship === true);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((match: any) => {
        const job = match.jobs;
        if (!job) return false;

        return (
          job.title.toLowerCase().includes(query) ||
          job.company.toLowerCase().includes(query) ||
          job.location?.toLowerCase().includes(query) ||
          job.description?.toLowerCase().includes(query) ||
          job.requirements?.toLowerCase().includes(query)
        );
      });
    }

    return result;
  }, [matches, searchQuery, matchFilter, visaSponsorshipOnly]);

  // Get counts for each filter
  const filterCounts = useMemo(() => {
    if (!matches) return { all: 0, excellent: 0, good: 0, fair: 0, low: 0 };
    return {
      all: matches.length,
      excellent: matches.filter((m: any) => m.match_score >= 70).length,
      good: matches.filter((m: any) => m.match_score >= 50 && m.match_score < 70).length,
      fair: matches.filter((m: any) => m.match_score >= 40 && m.match_score < 50).length,
      low: matches.filter((m: any) => m.match_score < 40).length,
    };
  }, [matches]);

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
            All jobs matched to your profile • Filter by match quality
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <Tabs value={matchFilter} onValueChange={(v) => setMatchFilter(v as MatchFilter)}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                All ({filterCounts.all})
              </TabsTrigger>
              <TabsTrigger value="excellent" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Excellent</span>
                <span className="sm:hidden">70%+</span>
                <span className="ml-1">({filterCounts.excellent})</span>
              </TabsTrigger>
              <TabsTrigger value="good" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Good</span>
                <span className="sm:hidden">50-69%</span>
                <span className="ml-1">({filterCounts.good})</span>
              </TabsTrigger>
              <TabsTrigger value="fair" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Fair</span>
                <span className="sm:hidden">40-49%</span>
                <span className="ml-1">({filterCounts.fair})</span>
              </TabsTrigger>
              <TabsTrigger value="low" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Low</span>
                <span className="sm:hidden">&lt;40%</span>
                <span className="ml-1">({filterCounts.low})</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Visa Sponsorship Filter */}
        <div className="mb-6 flex items-center gap-3 p-3 bg-accent/50 rounded-lg border">
          <Plane className="h-5 w-5 text-primary" />
          <div className="flex items-center gap-2">
            <Switch
              id="visa-filter"
              checked={visaSponsorshipOnly}
              onCheckedChange={setVisaSponsorshipOnly}
            />
            <Label htmlFor="visa-filter" className="text-sm font-medium cursor-pointer">
              Visa Sponsorship Available
            </Label>
          </div>
          <span className="text-xs text-muted-foreground ml-auto">
            Show jobs offering visa sponsorship for overseas applicants
          </span>
        </div>

        {/* Search Bar */}
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

        {/* Results Info */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredMatches?.length || 0} {filteredMatches?.length === 1 ? 'job' : 'jobs'}
            {searchQuery && ` matching "${searchQuery}"`}
            {matchFilter !== 'all' && ` • ${matchFilter} matches only`}
            {visaSponsorshipOnly && ` • Visa sponsorship`}
          </p>
          {(searchQuery || matchFilter !== 'all' || visaSponsorshipOnly) && (
            <Button variant="ghost" size="sm" onClick={() => { clearSearch(); setMatchFilter('all'); setVisaSponsorshipOnly(false); }}>
              Clear filters
            </Button>
          )}
        </div>

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
                  {/* Visa Sponsorship Badge */}
                  {match.jobs.visa_sponsorship && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        <Plane className="h-3 w-3 mr-1" />
                        Visa Sponsorship
                      </Badge>
                    </div>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      {match.jobs.location || 'Location not specified'}
                      {match.jobs.remote_option && <Badge variant="outline" className="ml-2">Remote</Badge>}
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Briefcase className="h-4 w-4 mr-2" />
                      {match.jobs.job_type || 'Type not specified'}
                    </div>
                    {match.jobs.salary_range && (
                      <div className="flex items-center text-muted-foreground">
                        <DollarSign className="h-4 w-4 mr-2" />
                        {match.jobs.salary_range}
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {match.jobs.description || 'No description available'}
                  </p>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Skills Match</span>
                      <span className="font-medium">{match.skills_match_score || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Experience Match</span>
                      <span className="font-medium">{match.experience_match_score || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location Match</span>
                      <span className="font-medium">{match.location_match_score || 0}%</span>
                    </div>
                  </div>

                  <Link to={`/jobs/${match.job_id}`}>
                    <Button className="w-full">View Details</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No jobs found</CardTitle>
              <CardDescription>
                {searchQuery || matchFilter !== 'all' 
                  ? 'Try adjusting your filters or search terms'
                  : 'Click "Refresh Matches" to find jobs that match your profile'}
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </main>
    </div>
  );
}
