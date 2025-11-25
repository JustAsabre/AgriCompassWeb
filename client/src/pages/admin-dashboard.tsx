import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';

function AdminDashboardContent() {
  const { data, isLoading } = useQuery({ queryKey: ['/api/admin/stats'], enabled: true });
  const { data: revenueData } = useQuery({ queryKey: ['/api/admin/revenue'], enabled: true });

  if (isLoading) return <div>Loading admin dashboard...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="card p-4 bg-white rounded shadow">
          <div className="text-sm text-gray-500">Total Users</div>
          <div className="text-xl font-bold">{(data as any)?.totalUsers ?? '-'}</div>
        </div>
        <div className="card p-4 bg-white rounded shadow">
          <div className="text-sm text-gray-500">Total Listings</div>
          <div className="text-xl font-bold">{(data as any)?.totalListings ?? '-'}</div>
        </div>
        <div className="card p-4 bg-white rounded shadow">
          <div className="text-sm text-gray-500">Total Revenue</div>
          <div className="text-xl font-bold">{(revenueData as any)?.totalRevenue ?? (data as any)?.totalRevenueFromCompleted ?? '-'}</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  // ProtectedRoute is in App; this page itself is exported and wrapped by route config
  return <AdminDashboardContent />;
}
