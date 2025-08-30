import { useState } from 'react';
import { User, MapPin, Calendar, Music, Users, Heart, Share2, Settings, UserPlus, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { BeatCard } from '@/components/ui/beat-card';
import { cn } from '@/lib/utils';

interface UserProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  profileImageUrl?: string;
  bannerImageUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  joinedAt: string;
  isProducer: boolean;
  isVerified: boolean;
  stats: {
    totalBeats: number;
    totalSales: number;
    totalPlays: number;
    followers: number;
    following: number;
    likes: number;
  };
  socialLinks: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    spotify?: string;
  };
  isFollowing?: boolean;
  isOwnProfile?: boolean;
}

interface UserProfileProps {
  userId: string;
  className?: string;
}

export function UserProfile({ userId, className }: UserProfileProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('beats');
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [isFollowingModalOpen, setIsFollowingModalOpen] = useState(false);

  const { data: profile, isLoading } = useQuery<UserProfileData>({
    queryKey: ['/api/users', userId, 'profile'],
    staleTime: 5 * 60 * 1000,
  });

  const { data: userBeats } = useQuery({
    queryKey: ['/api/users', userId, 'beats'],
    enabled: !!profile?.isProducer,
  });

  const { data: likedBeats } = useQuery({
    queryKey: ['/api/users', userId, 'liked-beats'],
    enabled: activeTab === 'likes',
  });

  const { data: followers } = useQuery({
    queryKey: ['/api/users', userId, 'followers'],
    enabled: isFollowersModalOpen,
  });

  const { data: following } = useQuery({
    queryKey: ['/api/users', userId, 'following'],
    enabled: isFollowingModalOpen,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: profile?.isFollowing ? 'DELETE' : 'POST',
      });
      if (!response.ok) throw new Error('Failed to update follow status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'profile'] });
      toast({
        title: profile?.isFollowing ? 'Unfollowed' : 'Following',
        description: `You ${profile?.isFollowing ? 'unfollowed' : 'are now following'} ${profile?.firstName} ${profile?.lastName}`,
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update follow status. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      if (navigator.share) {
        await navigator.share({
          title: `${profile?.firstName} ${profile?.lastName} on BeatHub`,
          text: profile?.bio || `Check out ${profile?.firstName}'s beats on BeatHub!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: 'Link copied!',
          description: 'Profile link copied to clipboard',
        });
      }
    },
  });

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="animate-pulse">
          <div className="h-48 bg-muted rounded-lg mb-4"></div>
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-muted rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-muted rounded w-1/3"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">User Not Found</h3>
          <p className="text-muted-foreground">This user profile doesn't exist or has been deleted.</p>
        </CardContent>
      </Card>
    );
  }

  const isOwnProfile = currentUser?.id === userId;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Banner and Profile Header */}
      <Card>
        <div className="relative">
          {/* Banner Image */}
          <div 
            className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-lg"
            style={{
              backgroundImage: profile.bannerImageUrl ? `url(${profile.bannerImageUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          
          {/* Profile Content */}
          <CardContent className="relative p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 -mt-12">
              {/* Avatar */}
              <Avatar className="w-24 h-24 border-4 border-background">
                <AvatarImage src={profile.profileImageUrl} alt={`${profile.firstName} ${profile.lastName}`} />
                <AvatarFallback className="text-2xl">
                  {profile.firstName?.[0]}{profile.lastName?.[0]}
                </AvatarFallback>
              </Avatar>

              {/* Profile Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-2xl font-bold">{profile.firstName} {profile.lastName}</h1>
                      {profile.isVerified && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Verified
                        </Badge>
                      )}
                      {profile.isProducer && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                          Producer
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">@{profile.username}</p>
                    {profile.bio && (
                      <p className="mt-2 text-sm">{profile.bio}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      {profile.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {profile.location}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Joined {new Date(profile.joinedAt).getFullYear()}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {!isOwnProfile && currentUser && (
                      <Button
                        variant={profile.isFollowing ? 'outline' : 'default'}
                        onClick={() => followMutation.mutate()}
                        disabled={followMutation.isPending}
                        className="flex items-center gap-2"
                        data-testid="follow-button"
                      >
                        {profile.isFollowing ? (
                          <>
                            <UserMinus className="h-4 w-4" />
                            Unfollow
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" />
                            Follow
                          </>
                        )}
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      onClick={() => shareMutation.mutate()}
                      className="flex items-center gap-2"
                      data-testid="share-button"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>

                    {isOwnProfile && (
                      <Button variant="outline" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Edit Profile
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6">
              {profile.isProducer && (
                <div className="text-center">
                  <div className="text-2xl font-bold">{profile.stats.totalBeats.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Beats</div>
                </div>
              )}
              
              <div className="text-center">
                <div className="text-2xl font-bold">{profile.stats.totalPlays.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Plays</div>
              </div>
              
              <div className="text-center cursor-pointer" onClick={() => setIsFollowersModalOpen(true)}>
                <div className="text-2xl font-bold">{profile.stats.followers.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Followers</div>
              </div>
              
              <div className="text-center cursor-pointer" onClick={() => setIsFollowingModalOpen(true)}>
                <div className="text-2xl font-bold">{profile.stats.following.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Following</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold">{profile.stats.likes.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Likes</div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          {profile.isProducer && <TabsTrigger value="beats">Beats</TabsTrigger>}
          <TabsTrigger value="likes">Liked Beats</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {profile.isProducer && (
          <TabsContent value="beats">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {userBeats?.map((beat: any) => (
                <BeatCard
                  key={beat.id}
                  beat={beat}
                  isPlaying={false}
                  onPlay={() => {}}
                  onPause={() => {}}
                />
              ))}
            </div>
          </TabsContent>
        )}

        <TabsContent value="likes">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {likedBeats?.map((beat: any) => (
              <BeatCard
                key={beat.id}
                beat={beat}
                isPlaying={false}
                onPlay={() => {}}
                onPause={() => {}}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent className="p-6 text-center">
              <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Activity Feed</h3>
              <p className="text-muted-foreground">Recent activity will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Followers Modal */}
      <Dialog open={isFollowersModalOpen} onOpenChange={setIsFollowersModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Followers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {followers?.map((follower: any) => (
              <div key={follower.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={follower.profileImageUrl} />
                    <AvatarFallback>{follower.firstName[0]}{follower.lastName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{follower.firstName} {follower.lastName}</div>
                    <div className="text-sm text-muted-foreground">@{follower.username}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm">View Profile</Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Following Modal */}
      <Dialog open={isFollowingModalOpen} onOpenChange={setIsFollowingModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Following</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {following?.map((user: any) => (
              <div key={user.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.profileImageUrl} />
                    <AvatarFallback>{user.firstName[0]}{user.lastName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{user.firstName} {user.lastName}</div>
                    <div className="text-sm text-muted-foreground">@{user.username}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm">View Profile</Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}