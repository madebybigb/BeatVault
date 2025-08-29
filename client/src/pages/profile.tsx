import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useGlobalPlayer } from '@/hooks/useGlobalPlayer';
import { Calendar, Music, Play, Pause, Users, Grid3X3, List, MoreHorizontal } from 'lucide-react';
import { isUnauthorizedError } from '@/lib/authUtils';
import type { Beat, User } from '@shared/schema';

export default function Profile() {
  const [, params] = useRoute('/profile/:userId');
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { currentBeat, isPlaying, play, pause } = useGlobalPlayer();

  const userId = params?.userId || currentUser?.id;

  useEffect(() => {
    if (!authLoading && !currentUser) {
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
  }, [currentUser, authLoading, toast]);

  const { data: profileUser } = useQuery<User>({
    queryKey: ['/api/users', userId],
    queryFn: async () => {
      if (userId === currentUser?.id) {
        return currentUser;
      }
      const response = await fetch(`/api/users/${userId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!userId,
    retry: false,
  });

  const { data: userBeats = [], isLoading: beatsLoading } = useQuery<Beat[]>({
    queryKey: ['/api/user', userId, 'beats'],
    enabled: !!userId,
    retry: false,
  });

  const { data: userStats } = useQuery({
    queryKey: ['/api/user', userId, 'stats'],
    queryFn: async () => {
      // Mock stats for now - would come from backend
      return {
        tracks: userBeats.length || 0,
        plays: userBeats.reduce((total, beat) => total + (beat.playCount || 0), 0),
        followers: 0,
        following: 0,
      };
    },
    enabled: !!userId && userBeats.length >= 0,
  });

  const handlePlayBeat = (beat: Beat) => {
    if (currentBeat?.id === beat.id && isPlaying) {
      pause();
    } else {
      play({
        id: beat.id,
        title: beat.title,
        producer: beat.producerId,
        artworkUrl: beat.artworkUrl || undefined,
        audioUrl: beat.audioUrl,
        beatTagUrl: beat.beatTagUrl || undefined,
      });
    }
  };

  const getUserInitials = (user?: User) => {
    if (!user) return 'U';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';
  };

  const getUserDisplayName = (user?: User) => {
    if (!user) return 'User';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email?.split('@')[0] || 'User';
  };

  const isOwnProfile = userId === currentUser?.id;

  if (authLoading || beatsLoading) {
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
      <div className="relative">
        {/* Background gradient */}
        <div className="h-64 bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20"></div>
        
        {/* Profile Content */}
        <div className="container mx-auto px-4">
          <div className="relative -mt-32 pb-8">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
              <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                <AvatarImage 
                  src={profileUser?.profileImageUrl} 
                  alt={getUserDisplayName(profileUser)} 
                />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {getUserInitials(profileUser)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-3xl font-bold" data-testid="text-profile-name">
                    {getUserDisplayName(profileUser)}
                  </h1>
                  <p className="text-muted-foreground">
                    @{profileUser?.email?.split('@')[0] || 'user'}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Joined {new Date(profileUser?.createdAt ?? Date.now()).toLocaleDateString('en-US', { 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </div>
                  </div>
                </div>
                
                {!isOwnProfile && (
                  <div className="flex gap-3">
                    <Button variant="default" data-testid="button-follow">
                      <Users className="h-4 w-4 mr-2" />
                      Follow
                    </Button>
                    <Button variant="outline" data-testid="button-message">
                      Message
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">
                    {userStats?.tracks || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Tracks</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-500">
                    {userStats?.plays || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Plays</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {userStats?.followers || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Followers</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-500">
                    {userStats?.following || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Following</div>
                </CardContent>
              </Card>
            </div>

            {/* Popular Tags */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Popular Tags</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">trap</Badge>
                  <Badge variant="secondary">hip-hop</Badge>
                  <Badge variant="secondary">dark</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Tracks Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">My Tracks</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  data-testid="button-grid-view"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  data-testid="button-list-view"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tracks Grid/List */}
            {userBeats.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No tracks yet</h3>
                  <p className="text-muted-foreground">
                    {isOwnProfile 
                      ? "Upload your first beat to get started!" 
                      : "This user hasn't uploaded any tracks yet."
                    }
                  </p>
                  {isOwnProfile && (
                    <Button className="mt-4" asChild>
                      <a href="/upload-beat">Upload Your First Beat</a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" 
                : "space-y-4"
              }>
                {userBeats.map((beat, index) => (
                  <Card key={beat.id} className="group hover:shadow-lg transition-shadow">
                    <CardContent className={viewMode === 'grid' ? "p-0" : "p-4"}>
                      {viewMode === 'grid' ? (
                        <div className="relative">
                          <div className="aspect-square bg-gradient-to-br from-purple-500 to-pink-500 rounded-t-lg relative overflow-hidden">
                            {beat.artworkUrl ? (
                              <img 
                                src={beat.artworkUrl} 
                                alt={beat.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Music className="h-12 w-12 text-white/50" />
                              </div>
                            )}
                            
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button
                                size="lg"
                                className="rounded-full"
                                onClick={() => handlePlayBeat(beat)}
                                data-testid={`button-play-${beat.id}`}
                              >
                                {currentBeat?.id === beat.id && isPlaying ? (
                                  <Pause className="h-6 w-6" />
                                ) : (
                                  <Play className="h-6 w-6" />
                                )}
                              </Button>
                            </div>
                          </div>
                          
                          <div className="p-4">
                            <h3 className="font-semibold truncate" data-testid={`text-title-${beat.id}`}>
                              {beat.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {beat.genre} • {beat.bpm} BPM
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <Badge variant="outline" className="text-xs">
                                {beat.isFree ? 'FREE' : `$${beat.price}`}
                              </Badge>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex-shrink-0">
                            <span className="text-white font-bold text-sm">
                              {index + 1}
                            </span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate" data-testid={`text-title-${beat.id}`}>
                              {beat.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {beat.genre} • {beat.bpm} BPM
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {beat.isFree ? 'FREE' : `$${beat.price}`}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePlayBeat(beat)}
                              data-testid={`button-play-${beat.id}`}
                            >
                              {currentBeat?.id === beat.id && isPlaying ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}