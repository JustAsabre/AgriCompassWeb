import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Package, ShoppingBag, DollarSign, CheckCircle, Clock } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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

export default function FarmerAnalytics() {
  const { data: analytics, isLoading } = useQuery<FarmerAnalytics>({
    queryKey: ["/api/analytics/farmer"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Farmer Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track your sales performance and insights
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Listings</p>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{analytics?.totalListings || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Active Listings</p>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-600">{analytics?.activeListings || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{analytics?.totalOrders || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-600">{analytics?.completedOrders || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
                <p className="text-2xl font-bold text-yellow-600">{analytics?.pendingOrders || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-600">
                  ${analytics?.totalRevenue?.toLocaleString() || 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.salesByMonth && analytics.salesByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.salesByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="orders"
                      stroke="#8884d8"
                      name="Orders"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#82ca9d"
                      name="Revenue ($)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No sales data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.topProducts && analytics.topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.topProducts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#82ca9d" name="Revenue ($)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No product data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Products Table */}
        {analytics?.topProducts && analytics.topProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Product Performance Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-semibold">Product</th>
                      <th className="text-right p-2 font-semibold">Quantity Sold</th>
                      <th className="text-right p-2 font-semibold">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topProducts.map((product, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{product.name}</td>
                        <td className="text-right p-2">{product.quantity}</td>
                        <td className="text-right p-2 text-green-600 font-semibold">
                          ${product.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
