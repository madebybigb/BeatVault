import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, ChevronDown, X, Filter, Mic2, Clock, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import type { SearchFilters, SearchResult } from '@shared/schema';

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  onResultsChange: (results: SearchResult | null) => void;
  isLoading?: boolean;
}

const GENRES = [
  'Hip Hop', 'Trap', 'R&B', 'Pop', 'Rock', 'Electronic', 'Jazz', 'Reggae',
  'Country', 'Blues', 'Classical', 'Alternative', 'Indie', 'Folk', 'Punk'
];

const MOODS = [
  'Aggressive', 'Chill', 'Dark', 'Energetic', 'Happy', 'Melancholic',
  'Mysterious', 'Peaceful', 'Romantic', 'Sad', 'Uplifting', 'Dreamy'
];

const KEYS = [
  'A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#',
  'Am', 'A#m', 'Bm', 'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m'
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'bpm', label: 'BPM' },
  { value: 'duration', label: 'Duration' }
];

// Debounce utility function
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function AdvancedSearch({ onSearch, onResultsChange, isLoading }: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'relevance',
    limit: 20,
    offset: 0
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [bpmRange, setBpmRange] = useState<[number, number]>([60, 200]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [durationRange, setDurationRange] = useState<[number, number]>([30, 300]);

  // Search suggestions
  const { data: suggestions = [] } = useQuery<string[]>({
    queryKey: ['/api/search/suggestions', query],
    queryFn: () => apiRequest('GET', `/api/search/suggestions?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2
  });

  // Autocomplete data
  const { data: autocomplete } = useQuery<{
    beats: string[];
    producers: string[];
    genres: string[];
    tags: string[];
  }>({
    queryKey: ['/api/search/autocomplete', query],
    queryFn: () => apiRequest('GET', `/api/search/autocomplete?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2
  });

  // Trending searches
  const { data: trending = [] } = useQuery<string[]>({
    queryKey: ['/api/search/trending'],
    queryFn: () => apiRequest('GET', '/api/search/trending')
  });

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchFilters: SearchFilters) => {
      onSearch(searchFilters);
    }, 300),
    [onSearch]
  );

  // Update filters and trigger search
  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { 
      ...filters, 
      ...newFilters, 
      query: query || undefined,
      offset: 0 // Reset pagination when filters change
    };
    setFilters(updatedFilters);
    debouncedSearch(updatedFilters);
  };

  // Handle query change
  const handleQueryChange = (value: string) => {
    setQuery(value);
    const updatedFilters = { ...filters, query: value || undefined, offset: 0 };
    setFilters(updatedFilters);
    debouncedSearch(updatedFilters);
  };

  // Handle tag selection
  const handleTagSelect = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newTags);
    updateFilters({ tags: newTags.length > 0 ? newTags : undefined });
  };

  // Clear all filters
  const clearFilters = () => {
    setQuery('');
    setSelectedTags([]);
    setBpmRange([60, 200]);
    setPriceRange([0, 100]);
    setDurationRange([30, 300]);
    const clearedFilters: SearchFilters = {
      sortBy: 'relevance',
      limit: 20,
      offset: 0
    };
    setFilters(clearedFilters);
    onSearch(clearedFilters);
  };

  // Apply advanced filters
  useEffect(() => {
    if (showAdvanced) {
      updateFilters({
        bpmMin: bpmRange[0],
        bpmMax: bpmRange[1],
        priceMin: priceRange[0],
        priceMax: priceRange[1],
        duration: {
          min: durationRange[0],
          max: durationRange[1]
        }
      });
    }
  }, [bpmRange, priceRange, durationRange, showAdvanced]);

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            data-testid="search-input"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search beats, producers, genres..."
            className="pl-10 pr-12 h-12 text-lg"
          />
          {query && (
            <Button
              data-testid="clear-search"
              variant="ghost"
              size="sm"
              onClick={() => handleQueryChange('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search Suggestions Dropdown */}
        {query.length >= 2 && (autocomplete || suggestions.length > 0) && (
          <Card className="absolute z-50 w-full mt-1 border shadow-lg">
            <CardContent className="p-4">
              {autocomplete && (
                <div className="space-y-3">
                  {autocomplete.beats && autocomplete.beats.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Mic2 className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">Beats</Label>
                      </div>
                      <div className="space-y-1">
                        {autocomplete.beats.slice(0, 3).map((beat, index) => (
                          <Button
                            key={index}
                            data-testid={`suggestion-beat-${index}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQueryChange(beat)}
                            className="w-full justify-start h-8 text-sm"
                          >
                            {beat}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {autocomplete.producers && autocomplete.producers.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Producers</Label>
                      <div className="space-y-1 mt-1">
                        {autocomplete.producers.slice(0, 3).map((producer, index) => (
                          <Button
                            key={index}
                            data-testid={`suggestion-producer-${index}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQueryChange(producer)}
                            className="w-full justify-start h-8 text-sm"
                          >
                            {producer}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {autocomplete.genres && autocomplete.genres.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Genres</Label>
                      <div className="space-y-1 mt-1">
                        {autocomplete.genres.slice(0, 3).map((genre, index) => (
                          <Button
                            key={index}
                            data-testid={`suggestion-genre-${index}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQueryChange(genre)}
                            className="w-full justify-start h-8 text-sm"
                          >
                            {genre}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Trending Searches */}
      {!query && trending.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Label className="text-sm text-muted-foreground">Trending:</Label>
          {trending.slice(0, 8).map((trend, index) => (
            <Badge
              key={index}
              data-testid={`trending-${index}`}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80"
              onClick={() => handleQueryChange(trend)}
            >
              {trend}
            </Badge>
          ))}
        </div>
      )}

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Button
          data-testid="toggle-advanced-filters"
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Advanced Filters
          <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </Button>

        <Select value={filters.sortBy} onValueChange={(value) => updateFilters({ sortBy: value as any })}>
          <SelectTrigger data-testid="sort-select" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(query || Object.keys(filters).some(key => key !== 'sortBy' && key !== 'limit' && key !== 'offset' && filters[key as keyof SearchFilters])) && (
          <Button
            data-testid="clear-filters"
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleContent>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Advanced Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Genre and Mood */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Genre</Label>
                  <Select value={filters.genre || ''} onValueChange={(value) => updateFilters({ genre: value || undefined })}>
                    <SelectTrigger data-testid="genre-select">
                      <SelectValue placeholder="Any genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any genre</SelectItem>
                      {GENRES.map((genre) => (
                        <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Mood</Label>
                  <Select value={filters.mood || ''} onValueChange={(value) => updateFilters({ mood: value || undefined })}>
                    <SelectTrigger data-testid="mood-select">
                      <SelectValue placeholder="Any mood" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any mood</SelectItem>
                      {MOODS.map((mood) => (
                        <SelectItem key={mood} value={mood}>{mood}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Key and Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Key</Label>
                  <Select value={filters.key || ''} onValueChange={(value) => updateFilters({ key: value || undefined })}>
                    <SelectTrigger data-testid="key-select">
                      <SelectValue placeholder="Any key" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any key</SelectItem>
                      {KEYS.map((key) => (
                        <SelectItem key={key} value={key}>{key}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Type</Label>
                  <div className="flex gap-2">
                    <Button
                      data-testid="filter-free"
                      variant={filters.isFree === true ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateFilters({ isFree: filters.isFree === true ? undefined : true })}
                    >
                      Free
                    </Button>
                    <Button
                      data-testid="filter-exclusive"
                      variant={filters.isExclusive === true ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateFilters({ isExclusive: filters.isExclusive === true ? undefined : true })}
                    >
                      Exclusive
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* BPM Range */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Mic2 className="h-4 w-4" />
                  <Label className="text-sm font-medium">BPM Range: {bpmRange[0]} - {bpmRange[1]}</Label>
                </div>
                <Slider
                  data-testid="bpm-slider"
                  value={bpmRange}
                  onValueChange={(value) => setBpmRange(value as [number, number])}
                  min={60}
                  max={200}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Price Range */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4" />
                  <Label className="text-sm font-medium">Price Range: ${priceRange[0]} - ${priceRange[1]}</Label>
                </div>
                <Slider
                  data-testid="price-slider"
                  value={priceRange}
                  onValueChange={(value) => setPriceRange(value as [number, number])}
                  min={0}
                  max={500}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Duration Range */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4" />
                  <Label className="text-sm font-medium">Duration: {Math.floor(durationRange[0] / 60)}:{(durationRange[0] % 60).toString().padStart(2, '0')} - {Math.floor(durationRange[1] / 60)}:{(durationRange[1] % 60).toString().padStart(2, '0')}</Label>
                </div>
                <Slider
                  data-testid="duration-slider"
                  value={durationRange}
                  onValueChange={(value) => setDurationRange(value as [number, number])}
                  min={30}
                  max={600}
                  step={15}
                  className="w-full"
                />
              </div>

              {/* Tags */}
              {autocomplete?.tags && autocomplete.tags.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {autocomplete.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        data-testid={`tag-${index}`}
                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleTagSelect(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}