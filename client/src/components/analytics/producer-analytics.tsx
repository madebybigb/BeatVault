import { useState, useMemo } from 'react';
import { Calendar, DollarSign, Music, Users, TrendingUp, Download, Eye, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  totalEarnings: number;
  totalSales: number;
  totalPlays: number;
  totalLikes: number;
  monthlyEarnings: Array<{ month: string; earnings: number; sales: number }>;
  topBeats: Array<{ 
    id: string; 
    title: string; 
    earnings: number; 
    sales: number; 
    plays: number; 
    likes: number;
    conversionRate: number;
  }>;
  salesByLicense: Array<{ license: string; count: number; earnings: number }>;
  fansGrowth: Array<{ date: string; fans: number; newFans: number }>;
  geographicData: Array<{ country: string; sales: number; earnings: number }>;
  engagementMetrics: {
    averageListenTime: number;
    playThroughRate: number;
    likeRate: number;
    shareRate: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function ProducerAnalytics() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [activeTab, setActiveTab] = useState('overview');

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/producer/analytics', timeRange],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatNumber = (num: number) => num.toLocaleString();

  const earningsGrowth = useMemo(() => {
    if (!analytics?.monthlyEarnings) return 0;
    const recent = analytics.monthlyEarnings.slice(-2);
    if (recent.length < 2) return 0;
    return ((recent[1].earnings - recent[0].earnings) / recent[0].earnings) * 100;
  }, [analytics]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
          <p className="text-muted-foreground">Upload some beats to start seeing your analytics!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track your beat performance and earnings</p>
        </div>
        <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.totalEarnings)}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className={cn(
                    "h-4 w-4 mr-1",
                    earningsGrowth >= 0 ? "text-green-500" : "text-red-500"
                  )} />
                  <span className={cn(
                    "text-sm",
                    earningsGrowth >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {earningsGrowth >= 0 ? '+' : ''}{earningsGrowth.toFixed(1)}%
                  </span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">{formatNumber(analytics.totalSales)}</p>
              </div>
              <Download className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Plays</p>
                <p className="text-2xl font-bold">{formatNumber(analytics.totalPlays)}</p>
              </div>
              <Eye className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Likes</p>
                <p className="text-2xl font-bold">{formatNumber(analytics.totalLikes)}</p>
              </div>
              <Heart className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="beats">Top Beats</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Earnings Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Earnings Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.monthlyEarnings}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Area type="monotone" dataKey="earnings" stroke="#0088FE" fill="#0088FE" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Sales by License Type */}
            <Card>
              <CardHeader>
                <CardTitle>Sales by License Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.salesByLicense}
                      dataKey="count"
                      nameKey="license"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ license, percent }) => `${license} ${(percent * 100).toFixed(0)}%`}
                    >
                      {analytics.salesByLicense.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [formatNumber(value as number), name]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Engagement Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Engagement Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Avg. Listen Time</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.floor(analytics.engagementMetrics.averageListenTime / 60)}:
                      {String(analytics.engagementMetrics.averageListenTime % 60).padStart(2, '0')}
                    </span>
                  </div>
                  <Progress value={(analytics.engagementMetrics.averageListenTime / 180) * 100} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Play Through Rate</span>
                    <span className="text-sm text-muted-foreground">
                      {analytics.engagementMetrics.playThroughRate.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={analytics.engagementMetrics.playThroughRate} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Like Rate</span>
                    <span className="text-sm text-muted-foreground">
                      {analytics.engagementMetrics.likeRate.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={analytics.engagementMetrics.likeRate} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Share Rate</span>
                    <span className="text-sm text-muted-foreground">
                      {analytics.engagementMetrics.shareRate.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={analytics.engagementMetrics.shareRate} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Sales Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.monthlyEarnings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sales" fill="#0088FE" name="Sales Count" />
                  <Bar dataKey="earnings" fill="#00C49F" name="Earnings ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audience" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fan Growth */}
            <Card>
              <CardHeader>
                <CardTitle>Fan Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.fansGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="fans" stroke="#0088FE" name="Total Fans" />
                    <Line type="monotone" dataKey="newFans" stroke="#00C49F" name="New Fans" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Geographic Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Top Countries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.geographicData.slice(0, 5).map((country, index) => (
                    <div key={country.country} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{index + 1}</Badge>
                        <span className="font-medium">{country.country}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatNumber(country.sales)} sales</div>
                        <div className="text-sm text-muted-foreground">{formatCurrency(country.earnings)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="beats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Beats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topBeats.map((beat, index) => (
                  <div key={beat.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="text-lg font-bold">
                        #{index + 1}
                      </Badge>
                      <div>
                        <h3 className="font-semibold">{beat.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{formatNumber(beat.plays)} plays</span>
                          <span>{formatNumber(beat.likes)} likes</span>
                          <span>{beat.conversionRate.toFixed(1)}% conversion</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lg">{formatCurrency(beat.earnings)}</div>
                      <div className="text-sm text-muted-foreground">{formatNumber(beat.sales)} sales</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}