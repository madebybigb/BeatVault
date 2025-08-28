import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { BeatCard } from '@/components/ui/beat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  TrendingUp, 
  DollarSign, 
  Music, 
  Play, 
  Heart, 
  ShoppingCart,
  BarChart3,
  Eye,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import type { Beat, Purchase } from '@shared/schema';

export default function ProducerDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userBeats = [], isLoading: beatsLoading } = useQuery<Beat[]>({
    queryKey: ['/api/user', user?.id, 'beats'],
    enabled: !!user?.id,
    retry: false,
  });

  const { data: sales = [], isLoading: salesLoading } = useQuery<Purchase[]>({
    queryKey: ['/api/producer/sales'],
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

  const deleteBeatMutation = useMutation({
    mutationFn: async (beatId: string) => {
      const response = await apiRequest('DELETE', `/api/beats/${beatId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user', user?.id, 'beats'] });
      toast({
        title: "Beat deleted",
        description: "Your beat has been successfully deleted.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to delete beat. Please try again.",
        variant: "destructive",
      });
    },
  });

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

  const totalEarnings = sales.reduce((sum, sale) => sum + parseFloat(sale.amount), 0);
  const totalPlays = userBeats.reduce((sum, beat) => sum + (beat.playCount || 0), 0);
  const totalLikes = userBeats.reduce((sum, beat) => sum + (beat.likeCount || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-dashboard-title">
            Producer Dashboard
          </h1>
          <p className="text-muted-foreground" data-testid="text-dashboard-welcome">
            Welcome back, {user?.firstName || user?.email?.split('@')[0] || 'Producer'}! Here's your music overview.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card data-testid="card-total-beats">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Beats</CardTitle>
              <Music className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userBeats.length}</div>
              <p className="text-xs text-muted-foreground">
                Published tracks
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-total-plays">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Plays</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPlays.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Across all beats
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-total-likes">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLikes.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Community engagement
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-total-earnings">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalEarnings.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                From {sales.length} sales
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4 mb-8">
          <Button asChild className="bg-primary hover:bg-primary/90" data-testid="button-upload-beat">
            <a href="/upload-beat">
              <Upload className="h-4 w-4 mr-2" />
              Upload New Beat
            </a>
          </Button>
          
          <Button variant="outline" asChild data-testid="button-browse-beats">
            <a href="/browse">
              <Eye className="h-4 w-4 mr-2" />
              Browse Marketplace
            </a>
          </Button>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="beats" className="space-y-4">
          <TabsList>
            <TabsTrigger value="beats" data-testid="tab-my-beats">My Beats</TabsTrigger>
            <TabsTrigger value="sales" data-testid="tab-sales">Sales</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="beats" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your Beats</h2>
              <Badge variant="secondary">{userBeats.length} total</Badge>
            </div>

            {beatsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <div className="h-48 w-full bg-muted rounded-lg animate-pulse" />
                    <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : userBeats.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No beats uploaded yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start sharing your music with the world by uploading your first beat.
                  </p>
                  <Button asChild>
                    <a href="/upload-beat">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Your First Beat
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {userBeats.map((beat) => (
                  <BeatCard
                    key={beat.id}
                    beat={beat}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sales" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Sales History</h2>
              <Badge variant="secondary">{sales.length} sales</Badge>
            </div>

            {salesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 w-full bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : sales.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No sales yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Once you start selling beats, your sales history will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sales.map((sale) => (
                  <Card key={sale.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Beat Sale</p>
                          <p className="text-sm text-muted-foreground">
                            {sale.licenseType} license • {new Date(sale.createdAt!).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">${sale.amount}</p>
                          <Badge 
                            variant={sale.status === 'completed' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {sale.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Analytics Overview</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average plays per beat</span>
                      <span className="font-medium">
                        {userBeats.length > 0 ? Math.round(totalPlays / userBeats.length) : 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average likes per beat</span>
                      <span className="font-medium">
                        {userBeats.length > 0 ? Math.round(totalLikes / userBeats.length) : 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average earnings per beat</span>
                      <span className="font-medium">
                        ${userBeats.length > 0 ? (totalEarnings / userBeats.length).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Member since</p>
                        <p className="text-xs text-muted-foreground">
                          {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Last upload</p>
                        <p className="text-xs text-muted-foreground">
                          {userBeats.length > 0 
                            ? new Date(userBeats[0].createdAt!).toLocaleDateString()
                            : 'No uploads yet'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
