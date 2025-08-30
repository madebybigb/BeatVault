import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BeatCard } from '@/components/ui/beat-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, Clock, Music, TrendingUp, Sparkles } from 'lucide-react';
import type { SearchResult, Beat } from '@shared/schema';

interface SearchResultsProps {
  results: SearchResult | null;
  isLoading: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  query?: string;
}

export function SearchResults({ results, isLoading, onLoadMore, hasMore, query }: SearchResultsProps) {
  if (isLoading && !results) {
    return <SearchResultsSkeleton />;
  }

  if (!results) {
    return <EmptySearchState query={query} />;
  }

  const { beats, totalCount, searchTime, suggestions } = results;

  if (totalCount === 0) {
    return <NoResultsState query={query} suggestions={suggestions} />;
  }

  return (
    <div className="space-y-6">
      {/* Search Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span data-testid="search-total">
            {totalCount.toLocaleString()} beat{totalCount !== 1 ? 's' : ''} found
          </span>
          {searchTime && (
            <span data-testid="search-time" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {searchTime}ms
            </span>
          )}
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {beats.map((beat, index) => (
          <BeatCard
            key={beat.id}
            beat={beat}
            data-testid={`beat-result-${index}`}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pt-6">
          <Button
            data-testid="load-more-results"
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Loading...
              </>
            ) : (
              <>
                <Music className="h-4 w-4" />
                Load More Beats
              </>
            )}
          </Button>
        </div>
      )}

      {/* Search suggestions if available */}
      {suggestions && suggestions.length > 0 && (
        <Card className="mt-8">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">You might also like:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 6).map((suggestion, index) => (
                <Badge
                  key={index}
                  data-testid={`suggestion-${index}`}
                  variant="outline"
                  className="cursor-pointer hover:bg-secondary"
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SearchResultsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EmptySearchState({ query }: { query?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Ready to discover beats?</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        {query 
          ? "Enter a search term or use the filters above to find the perfect beats."
          : "Use the search bar above to find beats by genre, mood, BPM, or producer name."
        }
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {['Hip Hop', 'Trap', 'R&B', 'Pop', 'Electronic'].map((genre) => (
          <Badge key={genre} variant="outline" className="cursor-pointer hover:bg-secondary">
            {genre}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function NoResultsState({ query, suggestions }: { query?: string; suggestions?: string[] }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No beats found</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        {query 
          ? `We couldn't find any beats matching "${query}". Try adjusting your search terms or filters.`
          : "No beats match your current search criteria. Try adjusting your filters or search terms."
        }
      </p>
      
      {suggestions && suggestions.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-3">Try searching for:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {suggestions.slice(0, 5).map((suggestion, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="cursor-pointer hover:bg-secondary"
                data-testid={`no-results-suggestion-${index}`}
              >
                {suggestion}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 text-sm text-muted-foreground">
        <p>Search tips:</p>
        <ul className="list-disc list-inside space-y-1 text-left">
          <li>Try different keywords or synonyms</li>
          <li>Use fewer filters or broaden your criteria</li>
          <li>Check your spelling</li>
          <li>Search for producer names or specific genres</li>
        </ul>
      </div>
    </div>
  );
}