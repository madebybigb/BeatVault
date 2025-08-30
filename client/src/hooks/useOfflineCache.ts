import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface CachedBeat {
  beatId: string;
  title: string;
  producer: string;
  audioUrl: string;
  cacheSize: number;
  cachedAt: Date;
  lastAccessedAt: Date;
}

interface CacheStats {
  totalCached: number;
  totalSize: number;
  oldestCache: Date | null;
  newestCache: Date | null;
}

export function useOfflineCache() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get cached beats
  const { data: cachedBeats = [], isLoading: isLoadingCache } = useQuery({
    queryKey: ['/api/offline/cache'],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get cache stats
  const { data: cacheStats } = useQuery({
    queryKey: ['/api/offline/stats'],
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Cache a beat
  const cacheBeatMutation = useMutation({
    mutationFn: async ({ beatId, audioUrl, cacheSize }: { beatId: string; audioUrl: string; cacheSize: number }) => {
      return await apiRequest(`/api/offline/cache/${beatId}`, {
        method: 'POST',
        body: JSON.stringify({ audioUrl, cacheSize })
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Beat cached",
        description: "Beat is now available offline",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/offline/cache'] });
      queryClient.invalidateQueries({ queryKey: ['/api/offline/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Cache failed",
        description: error.message || "Could not cache beat for offline use",
        variant: "destructive",
      });
    }
  });

  // Remove beat from cache
  const uncacheBeatMutation = useMutation({
    mutationFn: async (beatId: string) => {
      return await apiRequest(`/api/offline/cache/${beatId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: "Beat removed",
        description: "Beat removed from offline cache",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/offline/cache'] });
      queryClient.invalidateQueries({ queryKey: ['/api/offline/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Remove failed",
        description: error.message || "Could not remove beat from cache",
        variant: "destructive",
      });
    }
  });

  // Preload popular beats
  const preloadBeatsMutation = useMutation({
    mutationFn: async (limit: number = 20) => {
      return await apiRequest('/api/offline/preload', {
        method: 'POST',
        body: JSON.stringify({ limit })
      });
    },
    onSuccess: (data) => {
      const count = data.preloadedBeats?.length || 0;
      toast({
        title: "Beats preloaded",
        description: `${count} popular beats cached for offline listening`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/offline/cache'] });
      queryClient.invalidateQueries({ queryKey: ['/api/offline/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Preload failed",
        description: error.message || "Could not preload beats",
        variant: "destructive",
      });
    }
  });

  // Utility functions
  const isBeatCached = (beatId: string): boolean => {
    return cachedBeats.some((cached: CachedBeat) => cached.beatId === beatId);
  };

  const getCachedBeat = (beatId: string): CachedBeat | undefined => {
    return cachedBeats.find((cached: CachedBeat) => cached.beatId === beatId);
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCacheUsage = (): { used: string; percentage: number } => {
    const maxSize = 500 * 1024 * 1024; // 500MB limit
    const usedSize = cacheStats?.totalSize || 0;
    return {
      used: formatSize(usedSize),
      percentage: Math.round((usedSize / maxSize) * 100)
    };
  };

  return {
    // State
    isOnline,
    cachedBeats,
    cacheStats,
    isLoadingCache,
    
    // Actions
    cacheBeat: cacheBeatMutation.mutate,
    uncacheBeat: uncacheBeatMutation.mutate,
    preloadBeats: preloadBeatsMutation.mutate,
    
    // Loading states
    isCaching: cacheBeatMutation.isPending,
    isUncaching: uncacheBeatMutation.isPending,
    isPreloading: preloadBeatsMutation.isPending,
    
    // Utilities
    isBeatCached,
    getCachedBeat,
    formatSize,
    getCacheUsage
  };
}