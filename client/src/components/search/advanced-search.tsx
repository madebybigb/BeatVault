import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

export interface SearchFilters {
  query: string;
  genre: string[];
  mood: string[];
  key: string[];
  bpmRange: [number, number];
  priceRange: [number, number];
  isFree: boolean | null;
  isExclusive: boolean | null;
  tags: string[];
  producer: string;
  sortBy: 'newest' | 'oldest' | 'popular' | 'price_low' | 'price_high' | 'bpm_low' | 'bpm_high';
}

interface AdvancedSearchProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  className?: string;
}

const GENRES = [
  'Hip Hop', 'Trap', 'R&B', 'Pop', 'Electronic', 'Rock', 'Jazz', 'Classical',
  'Reggae', 'Country', 'Folk', 'Punk', 'Metal', 'Ambient', 'House', 'Techno'
];

const MOODS = [
  'Energetic', 'Chill', 'Dark', 'Happy', 'Sad', 'Aggressive', 'Romantic',
  'Mysterious', 'Uplifting', 'Melancholic', 'Dramatic', 'Peaceful'
];

const KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'bpm_low', label: 'BPM: Low to High' },
  { value: 'bpm_high', label: 'BPM: High to Low' },
];

export function AdvancedSearch({ filters, onFiltersChange, onSearch, className }: AdvancedSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch search suggestions
  const { data: suggestions } = useQuery({
    queryKey: ['/api/search/suggestions', filters.query],
    enabled: filters.query.length > 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (suggestions && filters.query.length > 1) {
      setSearchSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [suggestions, filters.query]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !searchInputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateFilters = useCallback((updates: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  }, [filters, onFiltersChange]);

  const addArrayFilter = useCallback((key: keyof SearchFilters, value: string) => {
    const currentArray = filters[key] as string[];
    if (!currentArray.includes(value)) {
      updateFilters({ [key]: [...currentArray, value] });
    }
  }, [filters, updateFilters]);

  const removeArrayFilter = useCallback((key: keyof SearchFilters, value: string) => {
    const currentArray = filters[key] as string[];
    updateFilters({ [key]: currentArray.filter(item => item !== value) });
  }, [filters, updateFilters]);

  const clearAllFilters = useCallback(() => {
    onFiltersChange({
      query: '',
      genre: [],
      mood: [],
      key: [],
      bpmRange: [60, 200],
      priceRange: [0, 200],
      isFree: null,
      isExclusive: null,
      tags: [],
      producer: '',
      sortBy: 'newest',
    });
  }, [onFiltersChange]);

  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.genre.length > 0) count++;
    if (filters.mood.length > 0) count++;
    if (filters.key.length > 0) count++;
    if (filters.bpmRange[0] !== 60 || filters.bpmRange[1] !== 200) count++;
    if (filters.priceRange[0] !== 0 || filters.priceRange[1] !== 200) count++;
    if (filters.isFree !== null) count++;
    if (filters.isExclusive !== null) count++;
    if (filters.tags.length > 0) count++;
    if (filters.producer) count++;
    return count;
  }, [filters]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    updateFilters({ query: suggestion });
    setShowSuggestions(false);
    onSearch();
  }, [updateFilters, onSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setShowSuggestions(false);
      onSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }, [onSearch]);

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Search Input with Suggestions */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search beats, artists, tags..."
            value={filters.query}
            onChange={(e) => updateFilters({ query: e.target.value })}
            onKeyDown={handleKeyDown}
            onFocus={() => filters.query.length > 1 && setShowSuggestions(true)}
            className="pl-10 pr-12"
            data-testid="search-input"
          />
          <Button
            size="sm"
            onClick={onSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8"
            data-testid="search-button"
          >
            Search
          </Button>
        </div>

        {/* Search Suggestions */}
        {showSuggestions && searchSuggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto"
            data-testid="search-suggestions"
          >
            {searchSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-4 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors"
                data-testid={`suggestion-${index}`}
              >
                <Search className="inline h-3 w-3 mr-2 text-muted-foreground" />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Advanced Filters Toggle */}
      <div className="flex items-center justify-between">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2" data-testid="advanced-filters-toggle">
              <Filter className="h-4 w-4" />
              Advanced Filters
              {getActiveFilterCount() > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {getActiveFilterCount()}
                </Badge>
              )}
              <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Genre Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Genre</Label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((genre) => (
                    <Badge
                      key={genre}
                      variant={filters.genre.includes(genre) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() =>
                        filters.genre.includes(genre)
                          ? removeArrayFilter('genre', genre)
                          : addArrayFilter('genre', genre)
                      }
                      data-testid={`genre-filter-${genre.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {genre}
                      {filters.genre.includes(genre) && (
                        <X className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Mood Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Mood</Label>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((mood) => (
                    <Badge
                      key={mood}
                      variant={filters.mood.includes(mood) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() =>
                        filters.mood.includes(mood)
                          ? removeArrayFilter('mood', mood)
                          : addArrayFilter('mood', mood)
                      }
                      data-testid={`mood-filter-${mood.toLowerCase()}`}
                    >
                      {mood}
                      {filters.mood.includes(mood) && (
                        <X className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Key Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Key</Label>
                <div className="flex flex-wrap gap-2">
                  {KEYS.map((key) => (
                    <Badge
                      key={key}
                      variant={filters.key.includes(key) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() =>
                        filters.key.includes(key)
                          ? removeArrayFilter('key', key)
                          : addArrayFilter('key', key)
                      }
                      data-testid={`key-filter-${key.toLowerCase()}`}
                    >
                      {key}
                      {filters.key.includes(key) && (
                        <X className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* BPM Range */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  BPM Range: {filters.bpmRange[0]} - {filters.bpmRange[1]}
                </Label>
                <Slider
                  value={filters.bpmRange}
                  onValueChange={(value) => updateFilters({ bpmRange: value as [number, number] })}
                  min={60}
                  max={200}
                  step={5}
                  className="w-full"
                  data-testid="bpm-range-slider"
                />
              </div>

              {/* Price Range */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Price Range: ${filters.priceRange[0]} - ${filters.priceRange[1]}
                </Label>
                <Slider
                  value={filters.priceRange}
                  onValueChange={(value) => updateFilters({ priceRange: value as [number, number] })}
                  min={0}
                  max={200}
                  step={5}
                  className="w-full"
                  data-testid="price-range-slider"
                />
              </div>

              {/* Additional Filters */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Additional Options</Label>
                <div className="space-y-2">
                  <Select
                    value={filters.isFree === null ? 'all' : filters.isFree ? 'free' : 'paid'}
                    onValueChange={(value) =>
                      updateFilters({
                        isFree: value === 'all' ? null : value === 'free',
                      })
                    }
                  >
                    <SelectTrigger data-testid="price-type-filter">
                      <SelectValue placeholder="Price Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Beats</SelectItem>
                      <SelectItem value="free">Free Only</SelectItem>
                      <SelectItem value="paid">Paid Only</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.isExclusive === null ? 'all' : filters.isExclusive ? 'exclusive' : 'non-exclusive'}
                    onValueChange={(value) =>
                      updateFilters({
                        isExclusive: value === 'all' ? null : value === 'exclusive',
                      })
                    }
                  >
                    <SelectTrigger data-testid="exclusivity-filter">
                      <SelectValue placeholder="Exclusivity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="exclusive">Exclusive Only</SelectItem>
                      <SelectItem value="non-exclusive">Non-Exclusive Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Sort and Producer Search */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label className="text-sm font-medium">Producer</Label>
                <Input
                  type="text"
                  placeholder="Search by producer name..."
                  value={filters.producer}
                  onChange={(e) => updateFilters({ producer: e.target.value })}
                  className="mt-2"
                  data-testid="producer-search"
                />
              </div>

              <div className="flex-1">
                <Label className="text-sm font-medium">Sort By</Label>
                <Select value={filters.sortBy} onValueChange={(value) => updateFilters({ sortBy: value as any })}>
                  <SelectTrigger className="mt-2" data-testid="sort-by-select">
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
              </div>
            </div>

            {/* Clear Filters */}
            {getActiveFilterCount() > 0 && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={clearAllFilters} data-testid="clear-filters">
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}