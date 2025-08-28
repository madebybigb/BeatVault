import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { BeatCard } from '@/components/ui/beat-card';
import { CategoryCard } from '@/components/ui/category-card';
import { AudioPlayer } from '@/components/ui/audio-player';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import { 
  Star, 
  Heart, 
  BarChart3, 
  Circle, 
  Tag, 
  Music, 
  Disc 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useAudioStore } from '@/store/audio-store';
import type { Beat } from '@shared/schema';

const categories = [
  {
    id: 'new-notable',
    name: 'New & Notable',
    icon: Star,
    gradient: 'category-gradient-purple',
    href: '/browse?category=new',
  },
  {
    id: 'for-you',
    name: 'For You',
    icon: Heart,
    gradient: 'category-gradient-red',
    href: '/browse?category=recommended',
  },
  {
    id: 'top-charts',
    name: 'Top Charts',
    icon: BarChart3,
    gradient: 'category-gradient-blue',
    href: '/browse?category=trending',
  },
  {
    id: 'exclusive',
    name: 'Exclusive Only',
    icon: Circle,
    gradient: 'category-gradient-gray',
    href: '/browse?exclusive=true',
  },
  {
    id: 'under-20',
    name: 'Under $20',
    icon: Tag,
    gradient: 'category-gradient-green',
    href: '/browse?priceMax=20',
  },
  {
    id: 'free-beats',
    name: 'Free Beats',
    icon: Music,
    gradient: 'category-gradient-yellow',
    href: '/browse?isFree=true',
  },
  {
    id: 'all-beats',
    name: 'All Beats',
    icon: Disc,
    gradient: 'category-gradient-indigo',
    href: '/browse',
  },
];

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const { currentBeat, isPlaying, play, pause } = useAudioStore();

  const { data: popularBeats = [], isLoading: popularLoading } = useQuery<Beat[]>({
    queryKey: ['/api/beats/popular'],
    retry: false,
  });

  const { data: trendingBeats = [], isLoading: trendingLoading } = useQuery<Beat[]>({
    queryKey: ['/api/beats/trending'],
    retry: false,
  });

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/browse?search=${encodeURIComponent(searchQuery)}`;
    }
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
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-purple-600/10"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.02%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
        
        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6" data-testid="text-home-hero-title">
              <span className="gradient-text">
                YOUR FIRST HIT
              </span>
              <br />
              <span className="text-foreground">STARTS HERE</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto" data-testid="text-home-hero-description">
              Welcome back, {user?.firstName || 'Creator'}! Discover premium beats from top producers and start creating your next masterpiece.
            </p>
            
            <div className="flex justify-center mb-12">
              <div className="relative max-w-2xl w-full">
                <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <form onSubmit={handleSearch} className="relative">
                  <Input
                    type="text"
                    placeholder="Try searching Trap or Drill or Juice WRLD..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-14 pr-32 py-6 text-lg bg-card border-border rounded-xl focus:ring-primary focus:border-primary"
                    data-testid="input-home-search"
                  />
                  <Button 
                    type="submit"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-3"
                    data-testid="button-home-search"
                  >
                    Search
                  </Button>
                </form>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3 text-sm">
              <span className="text-muted-foreground">What's trending right now:</span>
              <Button variant="ghost" size="sm" className="bg-secondary hover:bg-secondary/80 rounded-full">
                gunna type beat
              </Button>
              <Button variant="ghost" size="sm" className="bg-secondary hover:bg-secondary/80 rounded-full">
                lil durk
              </Button>
              <Button variant="ghost" size="sm" className="bg-secondary hover:bg-secondary/80 rounded-full">
                drake type beat
              </Button>
              <Button variant="ghost" size="sm" className="bg-secondary hover:bg-secondary/80 rounded-full">
                trap
              </Button>
              <Button variant="ghost" size="sm" className="bg-secondary hover:bg-secondary/80 rounded-full">
                rnb
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Category Grid */}
      <section className="py-12 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold" data-testid="text-category-title">
              Browse by Category
            </h2>
            <Button variant="ghost" className="text-primary hover:text-primary/80" data-testid="button-show-all-categories">
              Show all
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                {...category}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Popular Beats */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold" data-testid="text-popular-beats-title">
              Popular Beats
            </h2>
            <Button variant="ghost" className="text-primary hover:text-primary/80" asChild>
              <a href="/browse">Show all</a>
            </Button>
          </div>
          
          {popularLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-48 w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : popularBeats.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No popular beats found. Upload some beats to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {popularBeats.slice(0, 8).map((beat) => (
                <BeatCard
                  key={beat.id}
                  beat={beat}
                  isPlaying={currentBeat?.id === beat.id && isPlaying}
                  onPlay={() => handlePlay(beat)}
                  onPause={() => pause()}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trending Tracks */}
      <section className="py-12 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold" data-testid="text-trending-beats-title">
              Trending Now
            </h2>
            <Button variant="ghost" className="text-primary hover:text-primary/80" asChild>
              <a href="/browse?category=trending">See more</a>
            </Button>
          </div>
          
          {trendingLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-48 w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : trendingBeats.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No trending beats found. Check back later!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {trendingBeats.slice(0, 8).map((beat) => (
                <BeatCard
                  key={beat.id}
                  beat={beat}
                  isPlaying={currentBeat?.id === beat.id && isPlaying}
                  onPlay={() => handlePlay(beat)}
                  onPause={() => pause()}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />

      {/* Audio Player */}
      <AudioPlayer currentBeat={currentBeat} isVisible={!!currentBeat} />
    </div>
  );
}
