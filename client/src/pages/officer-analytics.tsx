import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ShieldCheck, Clock, CheckCircle, XCircle } from "lucide-react";
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface OfficerAnalytics {
  totalFarmers: number;
  verifiedFarmers: number;
  pendingVerifications: number;
  approvedVerifications: number;
  rejectedVerifications: number;
  verificationsByMonth: Array<{
    month: string;
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  }>;
  farmersByRegion: Array<{ region: string; count: number }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

export default function OfficerAnalytics() {
  const { user } = useAuth();
  
  const { data: analytics, isLoading } = useQuery<OfficerAnalytics>({
    queryKey: ["/api/analytics/officer", user?.id],
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
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
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Officer Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Monitor verification progress and farmer statistics
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Farmers</p>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{analytics?.totalFarmers || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Verified</p>
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-600">{analytics?.verifiedFarmers || 0}</p>
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
                <p className="text-2xl font-bold text-yellow-600">{analytics?.pendingVerifications || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Approved</p>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-600">{analytics?.approvedVerifications || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
                <p className="text-2xl font-bold text-red-600">{analytics?.rejectedVerifications || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Verifications Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Verifications Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.verificationsByMonth && analytics.verificationsByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.verificationsByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#8884d8" name="Total" />
                    <Line type="monotone" dataKey="approved" stroke="#82ca9d" name="Approved" />
                    <Line type="monotone" dataKey="rejected" stroke="#ff7300" name="Rejected" />
                    <Line type="monotone" dataKey="pending" stroke="#ffc658" name="Pending" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No verification data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Farmers by Region */}
          <Card>
            <CardHeader>
              <CardTitle>Farmers by Region</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.farmersByRegion && analytics.farmersByRegion.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.farmersByRegion}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ region, count }) => `${region}: ${count}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics.farmersByRegion.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No regional data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Verification Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Verification Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    {
                      name: 'Status',
                      Approved: analytics.approvedVerifications,
                      Pending: analytics.pendingVerifications,
                      Rejected: analytics.rejectedVerifications,
                    },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Approved" fill="#82ca9d" />
                  <Bar dataKey="Pending" fill="#ffc658" />
                  <Bar dataKey="Rejected" fill="#ff7300" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Regional Distribution Table */}
        {analytics?.farmersByRegion && analytics.farmersByRegion.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Regional Distribution Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-semibold">Region</th>
                      <th className="text-right p-2 font-semibold">Number of Farmers</th>
                      <th className="text-right p-2 font-semibold">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.farmersByRegion.map((region, index) => {
                      const percentage = ((region.count / analytics.totalFarmers) * 100).toFixed(1);
                      return (
                        <tr key={index} className="border-b">
                          <td className="p-2">{region.region}</td>
                          <td className="text-right p-2">{region.count}</td>
                          <td className="text-right p-2 text-blue-600 font-semibold">
                            {percentage}%
                          </td>
                        </tr>
                      );
                    })}
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
