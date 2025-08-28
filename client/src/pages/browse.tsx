import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { BeatCard } from '@/components/ui/beat-card';
import { AudioPlayer } from '@/components/ui/audio-player';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, Grid, List } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useAudioStore } from '@/store/audio-store';
import type { Beat } from '@shared/schema';

export default function Browse() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { currentBeat, isPlaying, play, pause } = useAudioStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');
  const [priceRange, setPriceRange] = useState([0, 100]);
  const [isFree, setIsFree] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Get URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const search = urlParams.get('search');
    const genreParam = urlParams.get('genre');
    const moodParam = urlParams.get('mood');
    const freeParam = urlParams.get('isFree');
    const priceMax = urlParams.get('priceMax');
    
    if (search) setSearchQuery(search);
    if (genreParam) setGenre(genreParam);
    if (moodParam) setMood(moodParam);
    if (freeParam === 'true') setIsFree(true);
    if (priceMax) setPriceRange([0, parseInt(priceMax)]);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [user, authLoading, toast]);

  const { data: beats = [], isLoading } = useQuery<Beat[]>({
    queryKey: ['/api/beats', { 
      search: searchQuery || undefined,
      genre: genre || undefined,
      mood: mood || undefined,
      priceMin: priceRange[0],
      priceMax: priceRange[1],
      isFree: isFree || undefined,
    }],
    retry: false,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handlePlay = (beat: Beat) => {
    if (currentBeat?.id === beat.id && isPlaying) {
      pause();
    } else {
      play(beat);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="w-full lg:w-80">
            <Card data-testid="card-filters">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <form onSubmit={handleSearch} className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search beats..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-browse-search"
                    />
                  </form>
                </div>

                {/* Genre */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Genre</label>
                  <Select value={genre} onValueChange={setGenre}>
                    <SelectTrigger data-testid="select-genre">
                      <SelectValue placeholder="All genres" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All genres</SelectItem>
                      <SelectItem value="trap">Trap</SelectItem>
                      <SelectItem value="drill">Drill</SelectItem>
                      <SelectItem value="hip-hop">Hip Hop</SelectItem>
                      <SelectItem value="r&b">R&B</SelectItem>
                      <SelectItem value="pop">Pop</SelectItem>
                      <SelectItem value="electronic">Electronic</SelectItem>
                      <SelectItem value="reggaeton">Reggaeton</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Mood */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Mood</label>
                  <Select value={mood} onValueChange={setMood}>
                    <SelectTrigger data-testid="select-mood">
                      <SelectValue placeholder="All moods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All moods</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="melodic">Melodic</SelectItem>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                      <SelectItem value="chill">Chill</SelectItem>
                      <SelectItem value="upbeat">Upbeat</SelectItem>
                      <SelectItem value="emotional">Emotional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Price Range: ${priceRange[0]} - ${priceRange[1]}
                  </label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={100}
                    step={5}
                    className="mt-2"
                    data-testid="slider-price-range"
                  />
                </div>

                {/* Free Beats */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="free-beats"
                    checked={isFree}
                    onCheckedChange={setIsFree}
                    data-testid="checkbox-free-beats"
                  />
                  <label htmlFor="free-beats" className="text-sm font-medium">
                    Free beats only
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Header Controls */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-browse-title">
                  Browse Beats
                </h1>
                <p className="text-muted-foreground" data-testid="text-browse-count">
                  {isLoading ? 'Loading...' : `${beats.length} beats found`}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  onClick={() => setViewMode('grid')}
                  data-testid="button-view-grid"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  onClick={() => setViewMode('list')}
                  data-testid="button-view-list"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Results */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : beats.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg" data-testid="text-browse-no-results">
                  No beats found matching your criteria.
                </p>
                <p className="text-muted-foreground mt-2">
                  Try adjusting your filters or search terms.
                </p>
              </div>
            ) : (
              <div className={
                viewMode === 'grid' 
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "space-y-4"
              } data-testid="container-browse-results">
                {beats.map((beat) => (
                  <BeatCard
                    key={beat.id}
                    beat={beat}
                    variant={viewMode}
                    isPlaying={currentBeat?.id === beat.id && isPlaying}
                    onPlay={() => handlePlay(beat)}
                    onPause={() => pause()}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />

      {/* Audio Player */}
      <AudioPlayer currentBeat={currentBeat} isVisible={!!currentBeat} />
    </div>
  );
}
