import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
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
  Calendar,
  Users,
  Download,
  Star,
  Edit,
  Trash2,
  Filter,
  Search,
  MoreHorizontal,
  ExternalLink,
  PlusCircle,
  Target,
  Award,
  Activity,
  Globe,
  Clock,
  Zap,
  TrendingDown
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

  // Analytics calculations
  const totalPlays = userBeats.reduce((sum, beat) => sum + (beat.playCount || 0), 0);
  const totalLikes = userBeats.reduce((sum, beat) => sum + (beat.likeCount || 0), 0);
  const totalEarnings = sales.reduce((sum, sale) => sum + parseFloat(sale.amount.toString()), 0);
  const avgRating = userBeats.length > 0 ? (totalLikes / Math.max(totalPlays, 1) * 5).toFixed(1) : '0.0';
  const conversionRate = totalPlays > 0 ? ((sales.length / totalPlays) * 100).toFixed(1) : '0.0';
  const topBeat = userBeats.sort((a, b) => (b.playCount || 0) - (a.playCount || 0))[0];
  
  // Monthly data for trends (mock data for demo)
  const monthlyData = [
    { month: 'Jan', plays: 120, sales: 8, revenue: 240 },
    { month: 'Feb', plays: 180, sales: 12, revenue: 360 },
    { month: 'Mar', plays: 250, sales: 18, revenue: 540 },
    { month: 'Apr', plays: 320, sales: 25, revenue: 750 },
    { month: 'May', plays: 280, sales: 22, revenue: 660 },
    { month: 'Jun', plays: 380, sales: 32, revenue: 960 }
  ];
  
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredBeats = userBeats.filter(beat => {
    const matchesSearch = beat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         beat.genre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || 
                         (selectedFilter === 'active' && beat.isActive) ||
                         (selectedFilter === 'inactive' && !beat.isActive) ||
                         (selectedFilter === 'free' && beat.isFree) ||
                         (selectedFilter === 'paid' && !beat.isFree);
    return matchesSearch && matchesFilter;
  });

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

  if (authLoading || beatsLoading || salesLoading) {
    return (
      <div className="min-h-screen bg-background text-white">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-80 bg-muted rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-96 bg-muted rounded-xl" />
              <div className="h-96 bg-muted rounded-xl" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <Header />
      
      <div className="container mx-auto px-4 py-8 space-y-8 max-w-7xl">
        {/* Dashboard Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Producer Dashboard
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Welcome back, {user?.firstName || 'Producer'}! Here's your creative empire at a glance.
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" size="lg">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
              <a href="/upload-beat" data-testid="button-upload-beat">
                <Upload className="h-4 w-4 mr-2" />
                Upload New Beat
              </a>
            </Button>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 bg-gradient-to-br from-blue-500/10 to-blue-600/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-400">Total Streams</p>
                  <p className="text-3xl font-bold mt-1">{totalPlays.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">+12% from last month</p>
                </div>
                <div className="h-12 w-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Play className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-green-500/10 to-green-600/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-400">Total Revenue</p>
                  <p className="text-3xl font-bold mt-1">${totalEarnings.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">+23% from last month</p>
                </div>
                <div className="h-12 w-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-purple-500/10 to-purple-600/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-400">Engagement</p>
                  <p className="text-3xl font-bold mt-1">{totalLikes.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">{avgRating}/5.0 avg rating</p>
                </div>
                <div className="h-12 w-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <Heart className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-orange-500/10 to-orange-600/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-400">Conversion</p>
                  <p className="text-3xl font-bold mt-1">{conversionRate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">{sales.length} total sales</p>
                </div>
                <div className="h-12 w-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <Target className="h-6 w-6 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-gray-900/50 p-1 h-auto">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-overview">
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="beats" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-my-beats">
              <Music className="h-4 w-4 mr-2" />
              Track Management
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Advanced Analytics
            </TabsTrigger>
            <TabsTrigger value="sales" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-sales">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Sales & Revenue
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Performance Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Performance Trends
                    </CardTitle>
                    <Select defaultValue="6months">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7days">7 Days</SelectItem>
                        <SelectItem value="30days">30 Days</SelectItem>
                        <SelectItem value="6months">6 Months</SelectItem>
                        <SelectItem value="1year">1 Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-80 flex items-end justify-between gap-2 p-4">
                    {monthlyData.map((data, index) => (
                      <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full bg-gray-800 rounded-lg overflow-hidden" style={{height: '200px'}}>
                          <div 
                            className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-lg transition-all duration-500"
                            style={{height: `${(data.plays / 400) * 100}%`, marginTop: 'auto'}}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{data.month}</span>
                        <span className="text-sm font-medium">{data.plays}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Award className="h-5 w-5" />
                      Top Performer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topBeat ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
                            <Music className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="font-medium">{topBeat.title}</p>
                            <p className="text-sm text-muted-foreground">{topBeat.genre}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Plays:</span>
                            <span className="font-medium">{topBeat.playCount?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Likes:</span>
                            <span className="font-medium">{topBeat.likeCount?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No tracks yet</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Globe className="h-5 w-5" />
                      Reach & Impact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Global Reach</span>
                        <span>78%</span>
                      </div>
                      <Progress value={78} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Playlist Adds</span>
                        <span>45%</span>
                      </div>
                      <Progress value={45} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Repeat Listeners</span>
                        <span>62%</span>
                      </div>
                      <Progress value={62} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sales.slice(0, 5).map((sale, index) => (
                    <div key={sale.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-900/30">
                      <div className="h-10 w-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Beat Sale - {sale.licenseType} License</p>
                        <p className="text-sm text-muted-foreground">{new Date(sale.createdAt!).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-400">${sale.amount}</p>
                        <Badge variant={sale.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                          {sale.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {sales.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="beats" className="space-y-6">
            {/* Track Management Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Track Management</h2>
                <p className="text-muted-foreground">Manage, edit, and optimize your music catalog</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="px-3 py-1">
                  {filteredBeats.length} of {userBeats.length} tracks
                </Badge>
                <Button asChild>
                  <a href="/upload-beat">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add New Track
                  </a>
                </Button>
              </div>
            </div>

            {/* Filters and Search */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search tracks by title, genre, or tags..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                    <SelectTrigger className="w-48">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tracks</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Track List */}
            {filteredBeats.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Music className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                  <h3 className="text-xl font-medium mb-2">
                    {userBeats.length === 0 ? 'No tracks uploaded yet' : 'No tracks match your filters'}
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {userBeats.length === 0 
                      ? 'Start building your catalog by uploading your first track.'
                      : 'Try adjusting your search terms or filters to find what you\'re looking for.'
                    }
                  </p>
                  {userBeats.length === 0 && (
                    <Button asChild size="lg">
                      <a href="/upload-beat">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Your First Track
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredBeats.map((beat) => (
                  <Card key={beat.id} className="hover:bg-gray-900/30 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-6">
                        {/* Track Info */}
                        <div className="h-16 w-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          {beat.artworkUrl ? (
                            <img src={beat.artworkUrl} alt={beat.title} className="h-full w-full object-cover rounded-xl" />
                          ) : (
                            <Music className="h-8 w-8 text-primary" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg mb-1 truncate">{beat.title}</h3>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                                <Badge variant="outline" className="text-xs">{beat.genre}</Badge>
                                <span>•</span>
                                <span>{beat.bpm} BPM</span>
                                <span>•</span>
                                <span>Key: {beat.key}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={beat.isActive ? 'default' : 'secondary'}>
                                {beat.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                              {beat.isFree && <Badge variant="outline">Free</Badge>}
                            </div>
                          </div>
                          
                          {/* Performance Metrics */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div className="text-center p-3 bg-gray-900/30 rounded-lg">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Play className="h-4 w-4 text-blue-400" />
                                <span className="text-sm font-medium">{(beat.playCount || 0).toLocaleString()}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">Plays</span>
                            </div>
                            <div className="text-center p-3 bg-gray-900/30 rounded-lg">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Heart className="h-4 w-4 text-red-400" />
                                <span className="text-sm font-medium">{(beat.likeCount || 0).toLocaleString()}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">Likes</span>
                            </div>
                            <div className="text-center p-3 bg-gray-900/30 rounded-lg">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <DollarSign className="h-4 w-4 text-green-400" />
                                <span className="text-sm font-medium">${beat.price}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">Price</span>
                            </div>
                            <div className="text-center p-3 bg-gray-900/30 rounded-lg">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Zap className="h-4 w-4 text-yellow-400" />
                                <span className="text-sm font-medium">{Math.round(((beat.likeCount || 0) / Math.max(beat.playCount || 1, 1)) * 100)}%</span>
                              </div>
                              <span className="text-xs text-muted-foreground">Engagement</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteBeatMutation.mutate(beat.id)}
                            disabled={deleteBeatMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Advanced Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-gray-900/30 rounded-lg">
                        <div className="text-2xl font-bold text-blue-400">{(totalPlays / Math.max(userBeats.length, 1)).toFixed(0)}</div>
                        <div className="text-sm text-muted-foreground">Avg Plays/Track</div>
                      </div>
                      <div className="text-center p-4 bg-gray-900/30 rounded-lg">
                        <div className="text-2xl font-bold text-green-400">${(totalEarnings / Math.max(userBeats.length, 1)).toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">Avg Revenue/Track</div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Play-to-Like Ratio</span>
                        <span>{((totalLikes / Math.max(totalPlays, 1)) * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={(totalLikes / Math.max(totalPlays, 1)) * 100} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Monetization Rate</span>
                        <span>{conversionRate}%</span>
                      </div>
                      <Progress value={parseFloat(conversionRate)} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Revenue Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-400">${totalEarnings.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Total Lifetime Revenue</div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">This Month</span>
                        <span className="font-medium">${(totalEarnings * 0.3).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Last Month</span>
                        <span className="font-medium">${(totalEarnings * 0.25).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Growth Rate</span>
                        <span className="font-medium text-green-400">+20%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Performing Tracks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Top Performing Tracks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userBeats
                    .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
                    .slice(0, 5)
                    .map((beat, index) => (
                      <div key={beat.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-900/30">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary/20 rounded-lg text-sm font-bold">
                          #{index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{beat.title}</p>
                          <p className="text-sm text-muted-foreground">{beat.genre}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{(beat.playCount || 0).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">plays</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Sales & Revenue</h2>
                <p className="text-muted-foreground">Track your sales performance and revenue streams</p>
              </div>
              <Badge variant="outline" className="px-3 py-1">
                {sales.length} total sales
              </Badge>
            </div>

            {sales.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                  <h3 className="text-xl font-medium mb-2">No sales yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Once you start selling beats, your sales history will appear here with detailed analytics.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Sales Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardContent className="p-6 text-center">
                      <div className="text-2xl font-bold text-green-400">${totalEarnings.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Total Revenue</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6 text-center">
                      <div className="text-2xl font-bold">{sales.length}</div>
                      <div className="text-sm text-muted-foreground">Total Sales</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6 text-center">
                      <div className="text-2xl font-bold">${(totalEarnings / Math.max(sales.length, 1)).toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Avg Sale Value</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sales List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Sales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {sales.map((sale) => (
                        <div key={sale.id} className="flex items-center gap-4 p-4 rounded-lg bg-gray-900/30">
                          <div className="h-12 w-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                            <DollarSign className="h-6 w-6 text-green-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">Beat Sale</p>
                              <Badge variant="outline" className="text-xs">{sale.licenseType}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(sale.createdAt!).toLocaleDateString()} • {new Date(sale.createdAt!).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-2xl text-green-400">${sale.amount}</p>
                            <Badge 
                              variant={sale.status === 'completed' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {sale.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}