import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Package, TrendingUp, ShoppingBag, CheckCircle, Clock, DollarSign, Sparkles } from "lucide-react";
import { formatCurrency } from '@/lib/currency';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";

interface FarmerAnalytics {
  totalListings: number;
  activeListings: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  salesByMonth: Array<{ month: string; orders: number; revenue: number }>;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-3">
        <p className="font-semibold mb-1">{label}</p>
            {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.dataKey === 'revenue' || entry.name.toLowerCase().includes('revenue') ? formatCurrency(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function FarmerAnalytics() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: analytics, isLoading } = useQuery<FarmerAnalytics>({
    queryKey: ["/api/analytics/farmer", user?.id],
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: "Total Listings",
      value: analytics?.totalListings || 0,
      icon: Package,
      color: "from-blue-500 to-cyan-500",
      bg: "from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50",
    },
    {
      title: "Active Listings",
      value: analytics?.activeListings || 0,
      icon: TrendingUp,
      color: "from-green-500 to-emerald-500",
      bg: "from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50",
    },
    {
      title: "Total Orders",
      value: analytics?.totalOrders || 0,
      icon: ShoppingBag,
      color: "from-purple-500 to-pink-500",
      bg: "from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50",
    },
    {
      title: "Completed Orders",
      value: analytics?.completedOrders || 0,
      icon: CheckCircle,
      color: "from-teal-500 to-green-500",
      bg: "from-teal-50 to-green-50 dark:from-teal-950/50 dark:to-green-950/50",
    },
    {
      title: "Pending Orders",
      value: analytics?.pendingOrders || 0,
      icon: Clock,
      color: "from-yellow-500 to-orange-500",
      bg: "from-yellow-50 to-orange-50 dark:from-yellow-950/50 dark:to-orange-950/50",
    },
    {
      title: "Total Revenue",
      value: formatCurrency(analytics?.totalRevenue || 0),
      icon: DollarSign,
      color: "from-indigo-500 to-purple-500",
      bg: "from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation("/farmer/dashboard")}
            className="rounded-full hover:scale-110 transition-transform"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary animate-pulse" />
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Farmer Analytics
              </h1>
            </div>
            <p className="text-muted-foreground mt-1">Track your sales performance and insights</p>
          </div>
        </div>

        {/* Modern Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card 
              key={index} 
              className={`relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br ${stat.bg}`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 rounded-full -mr-16 -mt-16" />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold text-foreground">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.color} shadow-xl`}>
                    <stat.icon className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sales Trends Chart */}
        <Card className="mb-8 border-0 shadow-xl bg-gradient-to-br from-background to-muted/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              Sales Trends
            </CardTitle>
            <CardDescription>Monthly sales and revenue overview</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics?.salesByMonth && analytics.salesByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={analytics.salesByMonth}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis yAxisId="left" className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="orders"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    fill="url(#colorOrders)"
                    name="Orders"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={3}
                    fill="url(#colorRevenue)"
                    name="Revenue ($)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                No sales data available yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products Chart */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-background to-muted/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500">
                <Package className="h-5 w-5 text-white" />
              </div>
              Top Selling Products
            </CardTitle>
            <CardDescription>Your best performing products by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics?.topProducts && analytics.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={analytics.topProducts}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar 
                    dataKey="revenue" 
                    fill="url(#barGradient)" 
                    name="Revenue ($)" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                No product data available yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
