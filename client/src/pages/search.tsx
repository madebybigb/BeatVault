import React, { useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { AdvancedSearch } from '@/components/search/advanced-search';
import { SearchResults } from '@/components/search/search-results';
import { apiRequest } from '@/lib/queryClient';
import type { SearchFilters, SearchResult } from '@shared/schema';

export default function Search() {
  const [location, setLocation] = useLocation();
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    sortBy: 'relevance',
    limit: 20,
    offset: 0
  });
  const [hasSearched, setHasSearched] = useState(false);

  // Parse URL parameters for initial search
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    const genre = params.get('genre');
    const mood = params.get('mood');
    
    if (query || genre || mood) {
      const initialFilters: SearchFilters = {
        ...searchFilters,
        query: query || undefined,
        genre: genre || undefined,
        mood: mood || undefined
      };
      setSearchFilters(initialFilters);
      setHasSearched(true);
    }
  }, []);

  // Search query
  const {
    data: searchResults,
    isLoading,
    error,
    refetch
  } = useQuery<SearchResult>({
    queryKey: ['/api/search', searchFilters],
    queryFn: () => {
      const params = new URLSearchParams();
      
      // Add all filter parameters
      if (searchFilters.query) params.append('q', searchFilters.query);
      if (searchFilters.genre) params.append('genre', searchFilters.genre);
      if (searchFilters.mood) params.append('mood', searchFilters.mood);
      if (searchFilters.key) params.append('key', searchFilters.key);
      if (searchFilters.bpmMin) params.append('bpmMin', searchFilters.bpmMin.toString());
      if (searchFilters.bpmMax) params.append('bpmMax', searchFilters.bpmMax.toString());
      if (searchFilters.priceMin) params.append('priceMin', searchFilters.priceMin.toString());
      if (searchFilters.priceMax) params.append('priceMax', searchFilters.priceMax.toString());
      if (searchFilters.duration?.min) params.append('durationMin', searchFilters.duration.min.toString());
      if (searchFilters.duration?.max) params.append('durationMax', searchFilters.duration.max.toString());
      if (searchFilters.tags?.length) params.append('tags', searchFilters.tags.join(','));
      if (searchFilters.isFree !== undefined) params.append('isFree', searchFilters.isFree.toString());
      if (searchFilters.isExclusive !== undefined) params.append('isExclusive', searchFilters.isExclusive.toString());
      if (searchFilters.producerId) params.append('producerId', searchFilters.producerId);
      if (searchFilters.sortBy) params.append('sortBy', searchFilters.sortBy);
      if (searchFilters.limit) params.append('limit', searchFilters.limit.toString());
      if (searchFilters.offset) params.append('offset', searchFilters.offset.toString());

      return apiRequest('GET', `/api/search?${params.toString()}`);
    },
    enabled: hasSearched
  });

  // Handle search
  const handleSearch = useCallback((filters: SearchFilters) => {
    setSearchFilters(filters);
    setHasSearched(true);
    
    // Update URL with search parameters
    const params = new URLSearchParams();
    if (filters.query) params.append('q', filters.query);
    if (filters.genre) params.append('genre', filters.genre);
    if (filters.mood) params.append('mood', filters.mood);
    
    const newUrl = params.toString() ? `/search?${params.toString()}` : '/search';
    if (newUrl !== location) {
      setLocation(newUrl);
    }
  }, [location, setLocation]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (searchResults && searchFilters.limit) {
      const newFilters = {
        ...searchFilters,
        offset: (searchFilters.offset || 0) + searchFilters.limit
      };
      setSearchFilters(newFilters);
    }
  }, [searchFilters, searchResults]);

  // Calculate if there are more results
  const hasMore = searchResults 
    ? (searchFilters.offset || 0) + (searchFilters.limit || 20) < searchResults.totalCount
    : false;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Search Beats</h1>
          <p className="text-muted-foreground">
            Discover the perfect beats with our advanced search and filtering system
          </p>
        </div>

        {/* Search Interface */}
        <div className="mb-8">
          <AdvancedSearch
            onSearch={handleSearch}
            onResultsChange={() => {}} // Not needed since we manage state here
            isLoading={isLoading}
          />
        </div>

        {/* Search Results */}
        {error ? (
          <div className="text-center py-12">
            <p className="text-destructive mb-4">Something went wrong while searching.</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        ) : (
          <SearchResults
            results={searchResults || null}
            isLoading={isLoading}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            query={searchFilters.query}
          />
        )}
      </div>
    </div>
  );
}