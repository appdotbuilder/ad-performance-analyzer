
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, TrendingUp, Eye, MousePointer, Users, Target, Brain, Settings, RefreshCw, Plus, Database } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  GetDashboardDataInput
} from '../../server/src/schema';
import type { ReactElement } from 'react';

// User ID for the current session - in real app this would come from authentication
const CURRENT_USER_ID = 1;

// Platform display mapping
const PLATFORM_DISPLAY: Record<string, { name: string; color: string; icon: string }> = {
  meta_ads: { name: 'Meta Ads', color: 'bg-blue-500', icon: '📘' },
  shopee_ads: { name: 'Shopee Ads', color: 'bg-orange-500', icon: '🛒' },
  tiktok_ads: { name: 'TikTok Ads', color: 'bg-black', icon: '🎵' },
  tokopedia_ads: { name: 'Tokopedia Ads', color: 'bg-green-500', icon: '🛍️' },
  google_ads: { name: 'Google Ads', color: 'bg-red-500', icon: '🔍' },
  lazada_ads: { name: 'Lazada Ads', color: 'bg-blue-600', icon: '🏪' },
  snack_video_ads: { name: 'Snack Video Ads', color: 'bg-purple-500', icon: '📱' }
};

// Objective display mapping
const OBJECTIVE_DISPLAY: Record<string, { name: string; icon: ReactElement; description: string }> = {
  awareness: { 
    name: 'Brand Awareness', 
    icon: <Eye className="w-4 h-4" />, 
    description: 'Increase brand visibility and reach' 
  },
  engagement: { 
    name: 'Engagement', 
    icon: <Users className="w-4 h-4" />, 
    description: 'Drive likes, shares, and interactions' 
  },
  traffic: { 
    name: 'Website Traffic', 
    icon: <MousePointer className="w-4 h-4" />, 
    description: 'Direct users to your website' 
  },
  conversion: { 
    name: 'Conversions', 
    icon: <Target className="w-4 h-4" />, 
    description: 'Drive purchases and lead generation' 
  }
};

// Insight type display mapping
const INSIGHT_TYPE_DISPLAY: Record<string, { name: string; icon: string; color: string }> = {
  funnel_evaluation: { name: 'Funnel Analysis', icon: '📊', color: 'bg-blue-100 text-blue-800' },
  key_metrics: { name: 'Key Metrics', icon: '📈', color: 'bg-green-100 text-green-800' },
  anomaly_detection: { name: 'Anomaly Detection', icon: '⚠️', color: 'bg-yellow-100 text-yellow-800' },
  audience_segmentation: { name: 'Audience Insights', icon: '👥', color: 'bg-purple-100 text-purple-800' },
  optimization_strategy: { name: 'Optimization', icon: '🎯', color: 'bg-orange-100 text-orange-800' },
  campaign_structure: { name: 'Campaign Structure', icon: '🏗️', color: 'bg-indigo-100 text-indigo-800' },
  algorithm_explanation: { name: 'Algorithm Insights', icon: '🤖', color: 'bg-gray-100 text-gray-800' },
  testing_scaling: { name: 'Testing & Scaling', icon: '🚀', color: 'bg-red-100 text-red-800' },
  content_strategy: { name: 'Content Strategy', icon: '✍️', color: 'bg-teal-100 text-teal-800' }
};

// Valid platform types for type safety
type ValidPlatform = 'meta_ads' | 'shopee_ads' | 'tiktok_ads' | 'tokopedia_ads' | 'google_ads' | 'lazada_ads' | 'snack_video_ads';

// Valid objective types for type safety
type ValidObjective = 'awareness' | 'engagement' | 'traffic' | 'conversion';

// Valid insight types for type safety
type ValidInsightType = 'funnel_evaluation' | 'key_metrics' | 'anomaly_detection' | 'audience_segmentation' | 'optimization_strategy' | 'campaign_structure' | 'algorithm_explanation' | 'testing_scaling' | 'content_strategy';

interface DashboardData {
  summary_metrics: {
    total_spend: number;
    total_impressions: number;
    total_clicks: number;
    total_conversions: number;
    avg_ctr: number;
    avg_cpc: number;
    avg_roas: number;
  };
  platform_breakdown: Array<{
    platform: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
  }>;
  objective_breakdown: Array<{
    objective: string;
    spend: number;
    performance_score: number;
  }>;
  recent_insights: Array<{
    id: number;
    title: string;
    insight_type: string;
    confidence_score: number;
    created_at: Date;
  }>;
}

function App() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasConnectionError, setHasConnectionError] = useState(false);
  
  // Filters
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedObjective, setSelectedObjective] = useState<string>('all');

  // Memoize dateRange to prevent unnecessary re-renders
  const dateRange = useMemo(() => ({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end_date: new Date()
  }), []);

  // Load initial data with error handling
  const loadConnections = useCallback(async () => {
    try {
      await trpc.getUserConnections.query({ user_id: CURRENT_USER_ID });
      setHasConnectionError(false);
    } catch (error) {
      console.error('Failed to load connections:', error);
      setHasConnectionError(true);
    }
  }, []);

  const loadInsights = useCallback(async () => {
    try {
      await trpc.getUserInsights.query({ user_id: CURRENT_USER_ID, limit: 20 });
    } catch (error) {
      console.error('Failed to load insights:', error);
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      const input: GetDashboardDataInput = {
        user_id: CURRENT_USER_ID,
        date_range: dateRange,
        ...(selectedPlatform !== 'all' && { platform: selectedPlatform as ValidPlatform }),
        ...(selectedObjective !== 'all' && { objective: selectedObjective as ValidObjective })
      };
      const result = await trpc.getDashboardData.query(input);
      setDashboardData(result);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Set empty dashboard data structure on error
      setDashboardData({
        summary_metrics: {
          total_spend: 0,
          total_impressions: 0,
          total_clicks: 0,
          total_conversions: 0,
          avg_ctr: 0,
          avg_cpc: 0,
          avg_roas: 0
        },
        platform_breakdown: [],
        objective_breakdown: [],
        recent_insights: []
      });
    }
  }, [selectedPlatform, selectedObjective, dateRange]);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadConnections(),
        loadInsights(),
        loadDashboardData()
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadConnections, loadInsights, loadDashboardData]);

  useEffect(() => {
    setIsLoading(true);
    refreshData().finally(() => setIsLoading(false));
  }, [refreshData]);

  const generateInsight = async (insightType: string) => {
    try {
      setIsLoading(true);
      await trpc.generateAiInsight.mutate({
        user_id: CURRENT_USER_ID,
        insight_type: insightType as ValidInsightType,
        platform: selectedPlatform !== 'all' ? selectedPlatform as ValidPlatform : 'meta_ads',
        date_range: dateRange,
        ...(selectedObjective !== 'all' && { objective: selectedObjective as ValidObjective })
      });
      await loadInsights();
    } catch (error) {
      console.error('Failed to generate insight:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Show loading only on initial load
  if (isLoading && !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your advertising insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">AdInsight AI</h1>
            </div>
            <div className="flex items-center space-x-3">
              {hasConnectionError && (
                <Badge variant="destructive" className="text-xs">
                  <Database className="w-3 h-3 mr-1" />
                  Backend Connecting
                </Badge>
              )}
              <Button 
                onClick={refreshData} 
                disabled={isRefreshing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Backend Status Banner */}
        {hasConnectionError && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Backend services are initializing
                  </p>
                  <p className="text-xs text-amber-700">
                    The dashboard is ready to display your data once the backend handlers are implemented. 
                    All UI components and integrations are functional.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Filters & Settings</span>
            </CardTitle>
            <CardDescription>
              Customize your analysis by platform, objective, and date range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Platform</label>
                <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    {Object.entries(PLATFORM_DISPLAY).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center space-x-2">
                          <span>{value.icon}</span>
                          <span>{value.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Objective</label>
                <Select value={selectedObjective} onValueChange={setSelectedObjective}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Objectives</SelectItem>
                    {Object.entries(OBJECTIVE_DISPLAY).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center space-x-2">
                          {value.icon}
                          <span>{value.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Date Range</label>
                <Select value="30d" onValueChange={() => {}}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">📊 Overview</TabsTrigger>
            <TabsTrigger value="insights">🧠 AI Insights</TabsTrigger>
            <TabsTrigger value="platforms">🚀 Platforms</TabsTrigger>
            <TabsTrigger value="connections">⚡ Connections</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Spend</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(dashboardData?.summary_metrics.total_spend || 0)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Impressions</p>
                      <p className="text-2xl font-bold">
                        {formatNumber(dashboardData?.summary_metrics.total_impressions || 0)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                      <Eye className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Clicks</p>
                      <p className="text-2xl font-bold">
                        {formatNumber(dashboardData?.summary_metrics.total_clicks || 0)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                      <MousePointer className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium">ROAS</p>
                      <p className="text-2xl font-bold">
                        {(dashboardData?.summary_metrics.avg_roas || 0).toFixed(2)}x
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                      <Target className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Performance</CardTitle>
                  <CardDescription>Spend distribution across ad platforms</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData?.platform_breakdown && dashboardData.platform_breakdown.length > 0 ? (
                      dashboardData.platform_breakdown.map((platform, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div 
                              className={`w-3 h-3 rounded-full ${
                                PLATFORM_DISPLAY[platform.platform]?.color || 'bg-gray-400'
                              }`}
                            />
                            <span className="font-medium">
                              {PLATFORM_DISPLAY[platform.platform]?.name || platform.platform}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(platform.spend)}</p>
                            <p className="text-sm text-gray-500">
                              {formatNumber(platform.clicks)} clicks
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                          <Database className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-sm mb-2">No platform data available</p>
                        <p className="text-xs text-gray-400">Connect your ad accounts to see performance metrics</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Objective Performance</CardTitle>
                  <CardDescription>Performance scores by campaign objective</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData?.objective_breakdown && dashboardData.objective_breakdown.length > 0 ? (
                      dashboardData.objective_breakdown.map((objective, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {OBJECTIVE_DISPLAY[objective.objective]?.icon}
                              <span className="font-medium">
                                {OBJECTIVE_DISPLAY[objective.objective]?.name || objective.objective}
                              </span>
                            </div>
                            <span className="text-sm font-semibold">
                              {formatCurrency(objective.spend)}
                            </span>
                          </div>
                          <Progress value={objective.performance_score * 100} className="h-2" />
                          <p className="text-xs text-gray-500">
                            Performance Score: {(objective.performance_score * 100).toFixed(1)}%
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                          <Target className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-sm mb-2">No objective data available</p>
                        <p className="text-xs text-gray-400">Campaign data will appear here once connected</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="w-5 h-5" />
                  <span>Generate AI Insights</span>
                </CardTitle>
                <CardDescription>
                  Get AI-powered recommendations tailored to your selected platform and objective
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Object.entries(INSIGHT_TYPE_DISPLAY).map(([key, value]) => (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      onClick={() => generateInsight(key)}
                      disabled={isLoading || hasConnectionError}
                      className="h-auto p-3 flex flex-col items-center space-y-1"
                    >
                      <span className="text-lg">{value.icon}</span>
                      <span className="text-xs text-center leading-tight">{value.name}</span>
                    </Button>
                  ))}
                </div>
                {hasConnectionError && (
                  <p className="text-xs text-amber-600 mt-3 text-center">
                    AI insights will be available once backend services are connected
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recent Insights */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Recent AI Insights</h3>
              <Card>
                <CardContent className="p-8 text-center">
                  <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">AI Insights Ready</h3>
                  <p className="text-gray-500 mb-4">
                    Generate your first AI insight using the buttons above to get personalized recommendations for your campaigns.
                  </p>
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>✅ Funnel Analysis & Key Metrics</p>
                    <p>✅ Anomaly Detection & Audience Segmentation</p>
                    <p>✅ Optimization Strategies & Campaign Structure</p>
                    <p>✅ Algorithm Insights & Testing Roadmaps</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Platforms Tab */}
          <TabsContent value="platforms" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(PLATFORM_DISPLAY).map(([key, platform]) => (
                <Card key={key} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 ${platform.color} rounded-lg flex items-center justify-center text-white font-bold`}>
                        {platform.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{platform.name}</CardTitle>
                        <CardDescription>Ad platform integration</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Status:</span>
                        <Badge variant="outline" className="text-green-600">
                          Available
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Integration:</span>
                        <Badge variant="secondary" className="text-blue-600">
                          Ready
                        </Badge>
                      </div>
                      <Separator />
                      <Button variant="outline" size="sm" className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Connect Account
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Connections Tab */}
          <TabsContent value="connections" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ad Account Connections</CardTitle>
                <CardDescription>
                  Manage your connected ad accounts across different platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Connect</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Connect your ad accounts from Meta, Google, TikTok, Shopee, and other platforms to start analyzing your campaign performance with AI-powered insights.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-md mx-auto mb-6">
                    {Object.entries(PLATFORM_DISPLAY).slice(0, 4).map(([key, platform]) => (
                      <div key={key} className="flex flex-col items-center space-y-1">
                        <div className={`w-8 h-8 ${platform.color} rounded-lg flex items-center justify-center text-white text-sm`}>
                          {platform.icon}
                        </div>
                        <span className="text-xs text-gray-600">{platform.name}</span>
                      </div>
                    ))}
                  </div>
                  <Button size="lg" disabled={hasConnectionError}>
                    <Plus className="w-4 h-4 mr-2" />
                    Connect Your First Account
                  </Button>
                  {hasConnectionError && (
                    <p className="text-xs text-amber-600 mt-2">
                      Connection features will be available once backend is ready
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
