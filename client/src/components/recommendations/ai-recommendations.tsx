import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Clock, User, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { BeatCard } from '@/components/ui/beat-card';
import { cn } from '@/lib/utils';

interface RecommendationReason {
  type: 'genre_preference' | 'listening_history' | 'similar_users' | 'trending' | 'new_producer' | 'mood_match';
  description: string;
  confidence: number;
}

interface RecommendedBeat {
  beat: any; // Beat object
  score: number;
  reasons: RecommendationReason[];
}

interface RecommendationsData {
  forYou: RecommendedBeat[];
  trending: RecommendedBeat[];
  newReleases: RecommendedBeat[];
  similarUsers: RecommendedBeat[];
  lastUpdated: string;
  userPreferences: {
    topGenres: string[];
    favoriteProducers: string[];
    averageSessionLength: number;
    preferredMoods: string[];
  };
}

export function AIRecommendations() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('for-you');

  const { data: recommendations, isLoading, error } = useQuery<RecommendationsData>({
    queryKey: ['/api/recommendations'],
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/recommendations/refresh', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to refresh recommendations');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async ({ beatId, feedback }: { beatId: string; feedback: 'like' | 'dislike' | 'not_interested' }) => {
      const response = await fetch('/api/recommendations/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beatId, feedback }),
      });
      if (!response.ok) throw new Error('Failed to submit feedback');
      return response.json();
    },
    onSuccess: () => {
      // Refresh recommendations after feedback
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
    },
  });

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">AI-Powered Recommendations</h3>
          <p className="text-muted-foreground mb-4">
            Sign in to get personalized beat recommendations based on your listening history and preferences.
          </p>
          <Button onClick={() => window.location.href = '/api/login'}>
            Sign In to Get Recommendations
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !recommendations) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Recommendations Yet</h3>
          <p className="text-muted-foreground mb-4">
            Start listening to some beats to help us understand your preferences and provide personalized recommendations.
          </p>
          <Button onClick={() => window.location.href = '/browse'}>
            Discover Beats
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getReasonIcon = (type: RecommendationReason['type']) => {
    switch (type) {
      case 'genre_preference': return '🎵';
      case 'listening_history': return '🎧';
      case 'similar_users': return '👥';
      case 'trending': return '🔥';
      case 'new_producer': return '⭐';
      case 'mood_match': return '😊';
      default: return '✨';
    }
  };

  const RecommendationSection = ({ beats, title }: { beats: RecommendedBeat[]; title: string }) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {beats.map((recommendation) => (
          <div key={recommendation.beat.id} className="space-y-3">
            <BeatCard
              beat={recommendation.beat}
              isPlaying={false}
              onPlay={() => {}}
              onPause={() => {}}
              className="relative"
            />
            
            {/* Recommendation Reasons */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Why this beat?</span>
                <Badge variant="outline" className="text-xs">
                  {Math.round(recommendation.score * 100)}% match
                </Badge>
              </div>
              
              <div className="space-y-1">
                {recommendation.reasons.slice(0, 2).map((reason, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{getReasonIcon(reason.type)}</span>
                    <span>{reason.description}</span>
                  </div>
                ))}
              </div>

              {/* Feedback Buttons */}
              <div className="flex items-center gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => feedbackMutation.mutate({ beatId: recommendation.beat.id, feedback: 'like' })}
                  disabled={feedbackMutation.isPending}
                  className="text-xs h-6 px-2"
                >
                  👍
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => feedbackMutation.mutate({ beatId: recommendation.beat.id, feedback: 'dislike' })}
                  disabled={feedbackMutation.isPending}
                  className="text-xs h-6 px-2"
                >
                  👎
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => feedbackMutation.mutate({ beatId: recommendation.beat.id, feedback: 'not_interested' })}
                  disabled={feedbackMutation.isPending}
                  className="text-xs h-6 px-2"
                >
                  Not interested
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            AI Recommendations
          </h1>
          <p className="text-muted-foreground">
            Personalized beats curated just for you • Updated {new Date(recommendations.lastUpdated).toLocaleDateString()}
          </p>
        </div>
        
        <Button
          variant="outline"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="flex items-center gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', refreshMutation.isPending && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* User Preferences Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Music Taste</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <h4 className="font-medium mb-2">Top Genres</h4>
              <div className="flex flex-wrap gap-1">
                {recommendations.userPreferences.topGenres.slice(0, 3).map((genre) => (
                  <Badge key={genre} variant="secondary" className="text-xs">
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Favorite Producers</h4>
              <div className="flex flex-wrap gap-1">
                {recommendations.userPreferences.favoriteProducers.slice(0, 2).map((producer) => (
                  <Badge key={producer} variant="secondary" className="text-xs">
                    {producer}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Preferred Moods</h4>
              <div className="flex flex-wrap gap-1">
                {recommendations.userPreferences.preferredMoods.slice(0, 3).map((mood) => (
                  <Badge key={mood} variant="secondary" className="text-xs">
                    {mood}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Listening Pattern</h4>
              <p className="text-sm text-muted-foreground">
                Avg. {Math.floor(recommendations.userPreferences.averageSessionLength / 60)}min sessions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="for-you" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            For You
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="new-releases" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            New Releases
          </TabsTrigger>
          <TabsTrigger value="similar-users" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Similar Taste
          </TabsTrigger>
        </TabsList>

        <TabsContent value="for-you">
          <RecommendationSection beats={recommendations.forYou} title="Personalized for You" />
        </TabsContent>

        <TabsContent value="trending">
          <RecommendationSection beats={recommendations.trending} title="Trending Now" />
        </TabsContent>

        <TabsContent value="new-releases">
          <RecommendationSection beats={recommendations.newReleases} title="Fresh Drops" />
        </TabsContent>

        <TabsContent value="similar-users">
          <RecommendationSection beats={recommendations.similarUsers} title="Users Like You Love" />
        </TabsContent>
      </Tabs>
    </div>
  );
}