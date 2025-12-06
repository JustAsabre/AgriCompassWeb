import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Search, Filter, Calendar, BarChart3, CheckSquare, XSquare, Shield, AlertTriangle, Users } from 'lucide-react';
import { Loader } from "@/components/ui/loader";
import {
  fadeInUp,
  staggerContainer,
  staggerItem
} from "@/lib/animations";

interface AdminStats {
  totalUsers: number;
  usersByRole: {
    farmer: number;
    buyer: number;
    field_officer: number;
    admin: number;
  };
  totalListings: number;
  registeredFarmers: number;
  totalRevenueFromCompleted: number;
  totalOrders: number;
}

interface RevenueData {
  totalRevenue: number;
}

interface PendingContent {
  listings: any[];
  messages: any[];
}

interface ModerationAnalytics {
  summary: {
    listings: { total: number; approved: number; rejected: number; pending: number };
    messages: { total: number; approved: number; rejected: number; pending: number };
    reviews: { total: number; approved: number; rejected: number; pending: number };
  };
  averageModerationTime: {
    listings: number;
    messages: number;
    reviews: number;
  };
  dailyStats: any[];
  period: string;
}

interface Escrow {
  id: string;
  orderId: string;
  buyerId: string;
  farmerId: string;
  amount: number | string;
  upfrontAmount: number | string;
  remainingAmount: number | string;
  status: 'pending' | 'upfront_held' | 'remaining_released' | 'completed' | 'disputed';
  disputeReason?: string;
  disputeResolution?: 'buyer' | 'farmer' | 'split';
  createdAt: string;
  updatedAt: string;
  disputedAt?: string;
  disputeResolvedAt?: string;
}

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'farmer' | 'buyer' | 'field_officer' | 'admin';
  phone?: string;
  region?: string;
  verified: boolean;
  isActive: boolean;
  createdAt: string;
  walletBalance: string;
  businessName?: string;
  farmSize?: string;
}

function AdminDashboardContent() {
  const [activeTab, setActiveTab] = useState('overview');
  const [moderationAction, setModerationAction] = useState<{ type: 'approve' | 'reject', id: string, contentType: 'listing' | 'message' } | null>(null);
  const [moderationReason, setModerationReason] = useState('');

  // Moderation filtering and bulk operations
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ id: string; type: 'listing' | 'message' }[]>([]);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null);

  // Escrow management
  const [escrowStatusFilter, setEscrowStatusFilter] = useState('all');
  const [escrowResolution, setEscrowResolution] = useState<{ escrowId: string; resolution: 'buyer' | 'farmer' | 'split' } | null>(null);
  const [escrowAction, setEscrowAction] = useState<{ escrowId: string; action: 'release' | 'refund'; reason?: string } | null>(null);

  // User management
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');

  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({ queryKey: ['/api/admin/stats'], enabled: true });
  const { data: revenueData } = useQuery<RevenueData>({ queryKey: ['/api/admin/revenue'], enabled: true });
  const { data: pendingContent, isLoading: pendingLoading } = useQuery<PendingContent>({
    queryKey: ['/api/admin/moderation/pending', { status: statusFilter, category: categoryFilter, dateFrom, dateTo }],
    enabled: activeTab === 'moderation'
  });
  const { data: analytics, isLoading: analyticsLoading } = useQuery<ModerationAnalytics>({
    queryKey: ['/api/admin/moderation/analytics'],
    enabled: activeTab === 'moderation'
  });

  // Escrow queries
  const { data: escrows, isLoading: escrowsLoading } = useQuery<Escrow[]>({
    queryKey: ['/api/admin/escrow'],
    enabled: activeTab === 'escrow'
  });

  // User management queries
  const { data: usersResponse, isLoading: usersLoading } = useQuery<{ users: User[]; pagination: any }>({
    queryKey: ['/api/admin/users'],
    enabled: activeTab === 'users'
  });
  const allUsers = usersResponse?.users || [];

  const moderateMutation = useMutation({
    mutationFn: async ({ id, action, reason, contentType }: { id: string, action: 'approve' | 'reject', reason?: string, contentType: 'listing' | 'message' }) => {
      const endpoint = contentType === 'listing' ? `/api/listings/${id}/moderate` : `/api/messages/${id}/moderate`;
      return apiRequest('PATCH', endpoint, { action, reason });
    },
    onSuccess: () => {
      // Invalidate specific queries for instant updates
      queryClient.invalidateQueries({ queryKey: ['/api/admin/moderation/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/moderation/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
      toast({
        title: "Content moderated successfully",
        description: "The content has been updated and the user has been notified."
      });
      setModerationAction(null);
      setModerationReason('');
    },
    onError: (error: any) => {
      toast({
        title: "Moderation failed",
        description: error.message || "Failed to moderate content",
        variant: "destructive"
      });
    }
  });

  const bulkModerateMutation = useMutation({
    mutationFn: async ({ items, action, reason }: { items: { id: string; type: 'listing' | 'message' }[], action: 'approve' | 'reject', reason?: string }) => {
      return apiRequest('POST', '/api/admin/moderation/bulk', { items, action, reason });
    },
    onSuccess: () => {
      // Invalidate specific queries for instant updates
      queryClient.invalidateQueries({ queryKey: ['/api/admin/moderation/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/moderation/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
      toast({
        title: "Bulk moderation completed",
        description: "Selected content has been moderated successfully."
      });
      setSelectedItems([]);
      setBulkAction(null);
    },
    onError: (error: any) => {
      toast({
        title: "Bulk moderation failed",
        description: error.message || "Failed to moderate selected content",
        variant: "destructive"
      });
    }
  });

  // Escrow resolution mutation
  const resolveEscrowMutation = useMutation({
    mutationFn: async ({ escrowId, resolution }: { escrowId: string; resolution: 'buyer' | 'farmer' | 'split' }) => {
      return apiRequest('POST', `/api/admin/escrow/${escrowId}/resolve`, { resolution });
    },
    onSuccess: () => {
      // Invalidate escrow query for instant updates
      queryClient.invalidateQueries({ queryKey: ['/api/admin/escrow'] });
      toast({
        title: "Escrow dispute resolved",
        description: "The escrow dispute has been resolved and both parties have been notified."
      });
      setEscrowResolution(null);
    },
    onError: (error: any) => {
      toast({
        title: "Resolution failed",
        description: error.message || "Failed to resolve escrow dispute",
        variant: "destructive"
      });
    }
  });

  const releaseEscrowMutation = useMutation({
    mutationFn: async ({ escrowId, reason }: { escrowId: string; reason?: string }) => {
      return apiRequest('POST', `/api/admin/escrow/${escrowId}/release`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/escrow'] });
      toast({
        title: "Escrow released",
        description: "Funds have been released to the farmer."
      });
      setEscrowAction(null);
    },
    onError: (error: any) => {
      toast({
        title: "Release failed",
        description: error.message || "Failed to release escrow",
        variant: "destructive"
      });
    }
  });

  const refundEscrowMutation = useMutation({
    mutationFn: async ({ escrowId, reason }: { escrowId: string; reason: string }) => {
      return apiRequest('POST', `/api/admin/escrow/${escrowId}/refund`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/escrow'] });
      toast({
        title: "Escrow refunded",
        description: "Funds have been refunded to the buyer."
      });
      setEscrowAction(null);
    },
    onError: (error: any) => {
      toast({
        title: "Refund failed",
        description: error.message || "Failed to refund escrow",
        variant: "destructive"
      });
    }
  });

  // User management mutations
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      return apiRequest('PATCH', `/api/admin/users/${userId}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User status updated",
        description: "The user account status has been changed."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update user status",
        variant: "destructive"
      });
    }
  });

  const handleModerate = (id: string, action: 'approve' | 'reject', contentType: 'listing' | 'message') => {
    if (action === 'reject' && !moderationReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for rejecting this content.",
        variant: "destructive"
      });
      return;
    }

    moderateMutation.mutate({ id, action, reason: moderationReason, contentType });
  };

  const handleSelectItem = (id: string, type: 'listing' | 'message') => {
    setSelectedItems(prev => {
      const exists = prev.some(item => item.id === id && item.type === type);
      if (exists) {
        return prev.filter(item => !(item.id === id && item.type === type));
      } else {
        return [...prev, { id, type }];
      }
    });
  };

  const handleSelectAll = (items: any[], type: 'listing' | 'message') => {
    const itemIds = items.map(item => ({ id: item.id, type }));
    const allSelected = itemIds.every(item => selectedItems.some(selected => selected.id === item.id && selected.type === item.type));

    if (allSelected) {
      setSelectedItems(prev => prev.filter(selected => !itemIds.some(item => item.id === selected.id && item.type === selected.type)));
    } else {
      setSelectedItems(prev => {
        const filtered = prev.filter(selected => !itemIds.some(item => item.id === selected.id && item.type === selected.type));
        return [...filtered, ...itemIds];
      });
    }
  };

  const handleBulkAction = (action: 'approve' | 'reject') => {
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to moderate.",
        variant: "destructive"
      });
      return;
    }

    if (action === 'reject' && !moderationReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for rejecting content.",
        variant: "destructive"
      });
      return;
    }

    bulkModerateMutation.mutate({ items: selectedItems, action, reason: moderationReason });
  };

  const filteredListings = pendingContent?.listings?.filter(listing =>
    !searchTerm || 
    (listing.productName && listing.productName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (listing.description && listing.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const filteredMessages = pendingContent?.messages?.filter(message =>
    !searchTerm || message.content.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Escrow helper functions
  const getEscrowStatusBadge = (status: Escrow['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'upfront_held':
        return <Badge variant="outline">Upfront Held</Badge>;
      case 'remaining_released':
        return <Badge variant="default">Remaining Released</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'disputed':
        return <Badge variant="destructive">Disputed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getEscrowStatusDescription = (escrow: Escrow) => {
    const upfront = parseFloat(escrow.upfrontAmount as any) || 0;
    const remaining = parseFloat(escrow.remainingAmount as any) || 0;
    const total = parseFloat(escrow.amount as any) || 0;
    
    switch (escrow.status) {
      case 'pending':
        return `Waiting for upfront payment of ${formatCurrency(upfront)}`;
      case 'upfront_held':
        return `Upfront payment of ${formatCurrency(upfront)} held, waiting for order acceptance`;
      case 'remaining_released':
        return `Remaining payment of ${formatCurrency(remaining)} released, waiting for delivery confirmation`;
      case 'completed':
        return escrow.disputeResolution
          ? `Dispute resolved in favor of ${escrow.disputeResolution}`
          : `Order completed, full payment of ${formatCurrency(total)} released`;
      case 'disputed':
        return `Dispute filed: ${escrow.disputeReason}`;
      default:
        return escrow.status;
    }
  };

  const filteredEscrows = escrows?.filter(escrow =>
    escrowStatusFilter === 'all' || escrow.status === escrowStatusFilter
  ) || [];

  // User management helper functions
  const getRoleBadgeColor = (role: User['role']) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'farmer': return 'default';
      case 'buyer': return 'secondary';
      case 'field_officer': return 'outline';
      default: return 'secondary';
    }
  };

  const filteredUsers = allUsers?.filter(user => {
    const matchesSearch = !userSearchTerm || 
      user.fullName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchTerm.toLowerCase());
    const matchesRole = userRoleFilter === 'all' || user.role === userRoleFilter;
    const matchesStatus = userStatusFilter === 'all' || 
      (userStatusFilter === 'active' && user.isActive) ||
      (userStatusFilter === 'inactive' && !user.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  }) || [];

  if (statsLoading) return <div>Loading admin dashboard...</div>;

  return (
    <motion.div 
      className="p-6 min-h-screen bg-gradient-subtle"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <motion.h1 className="text-2xl font-bold mb-6" variants={fadeInUp}>Admin Dashboard</motion.h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="moderation">Content Moderation</TabsTrigger>
          <TabsTrigger value="escrow">Escrow Management</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Top Stats Cards */}
          <motion.div className="grid grid-cols-1 md:grid-cols-4 gap-4" variants={staggerContainer}>
            <motion.div variants={staggerItem}>
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
                    Total Users
                    <span className="text-2xl">👥</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{stats?.totalUsers ?? '-'}</div>
                  <div className="text-xs text-gray-500 mt-2 space-y-1">
                    <div>🌾 Farmers: {stats?.usersByRole?.farmer ?? 0}</div>
                    <div>🛒 Buyers: {stats?.usersByRole?.buyer ?? 0}</div>
                    <div>👮 Officers: {stats?.usersByRole?.field_officer ?? 0}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={staggerItem}>
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
                    Total Listings
                    <span className="text-2xl">📦</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{stats?.totalListings ?? '-'}</div>
                  <div className="text-xs text-gray-500 mt-2 space-y-1">
                    <div>✅ Approved: {(stats?.totalListings ?? 0) - (pendingContent?.listings?.length ?? 0)}</div>
                    <div>⏳ Pending: {pendingContent?.listings?.length ?? 0}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={staggerItem}>
              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
                    Total Orders
                    <span className="text-2xl">📋</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">{stats?.totalOrders ?? '-'}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    Marketplace transactions
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={staggerItem}>
              <Card className="border-l-4 border-l-emerald-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
                    Platform Revenue
                    <span className="text-2xl">💰</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-600">{formatCurrency(revenueData?.totalRevenue ?? 0)}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    From completed orders
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Moderation Activity Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Content Moderation Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending Approval</span>
                    <Badge variant="secondary">{(pendingContent?.listings?.length ?? 0) + (pendingContent?.messages?.length ?? 0)}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">📝 Listings</span>
                    <span className="text-sm font-medium">{pendingContent?.listings?.length ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">💬 Messages</span>
                    <span className="text-sm font-medium">{pendingContent?.messages?.length ?? 0}</span>
                  </div>
                </div>
                {analytics && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm font-medium mb-2">Approval Rate</div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div>Listings: {analytics.summary.listings.total > 0 ? ((analytics.summary.listings.approved / analytics.summary.listings.total) * 100).toFixed(1) : 0}%</div>
                      <div>Messages: {analytics.summary.messages.total > 0 ? ((analytics.summary.messages.approved / analytics.summary.messages.total) * 100).toFixed(1) : 0}%</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Escrow Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Escrows</span>
                    <span className="text-sm font-bold">{escrows?.length ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">⚠️ Disputed</span>
                    <Badge variant="destructive">{escrows?.filter(e => e.status === 'disputed').length ?? 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">✅ Completed</span>
                    <span className="text-sm font-medium text-green-600">{escrows?.filter(e => e.status === 'completed').length ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">🔒 Active</span>
                    <span className="text-sm font-medium">{escrows?.filter(e => e.status === 'upfront_held' || e.status === 'remaining_released').length ?? 0}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm font-medium mb-1">Total Protected Value</div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(escrows?.reduce((sum, e) => sum + (parseFloat(e.amount as any) || 0), 0) ?? 0)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Requires Immediate Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(pendingContent?.listings?.length ?? 0) > 0 && (
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center">
                      <CheckSquare className="h-5 w-5 mr-3 text-yellow-600" />
                      <div>
                        <div className="font-medium text-sm">Pending Listings</div>
                        <div className="text-xs text-gray-600">{pendingContent?.listings?.length ?? 0} listings waiting for approval</div>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => setActiveTab('moderation')}>Review</Button>
                  </div>
                )}
                {(escrows?.filter(e => e.status === 'disputed').length ?? 0) > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center">
                      <Shield className="h-5 w-5 mr-3 text-red-600" />
                      <div>
                        <div className="font-medium text-sm">Disputed Escrows</div>
                        <div className="text-xs text-gray-600">{escrows?.filter(e => e.status === 'disputed').length ?? 0} disputes require resolution</div>
                      </div>
                    </div>
                    <Button size="sm" variant="destructive" onClick={() => setActiveTab('escrow')}>Resolve</Button>
                  </div>
                )}
                {(pendingContent?.listings?.length ?? 0) === 0 && (escrows?.filter(e => e.status === 'disputed').length ?? 0) === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckSquare className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p className="font-medium">All caught up!</p>
                    <p className="text-sm">No pending actions require your attention.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moderation" className="space-y-6">
          {/* Moderation Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Total Moderated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(analytics?.summary?.listings?.total || 0) + (analytics?.summary?.messages?.total || 0) + (analytics?.summary?.reviews?.total || 0)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Last {analytics?.period || '30 days'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Approval Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(() => {
                    const total = (analytics?.summary?.listings?.total || 0) + (analytics?.summary?.messages?.total || 0) + (analytics?.summary?.reviews?.total || 0);
                    const approved = (analytics?.summary?.listings?.approved || 0) + (analytics?.summary?.messages?.approved || 0) + (analytics?.summary?.reviews?.approved || 0);
                    return total > 0 ? Math.round((approved / total) * 100) : 0;
                  })()}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Content approved
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <XSquare className="h-4 w-4 mr-2" />
                  Pending Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(pendingContent?.listings?.length || 0) + (pendingContent?.messages?.length || 0)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Requires attention
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Content Moderation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search content..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="vegetables">Vegetables</SelectItem>
                      <SelectItem value="fruits">Fruits</SelectItem>
                      <SelectItem value="grains">Grains</SelectItem>
                      <SelectItem value="livestock">Livestock</SelectItem>
                      <SelectItem value="dairy">Dairy</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      placeholder="From"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                    <Input
                      type="date"
                      placeholder="To"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedItems.length > 0 && (
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium">
                    {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleBulkAction('approve')}
                      disabled={bulkModerateMutation.isPending}
                    >
                      <CheckSquare className="h-4 w-4 mr-1" />
                      Approve Selected
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setBulkAction('reject')}
                        >
                          <XSquare className="h-4 w-4 mr-1" />
                          Reject Selected
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Bulk Reject Content</AlertDialogTitle>
                          <AlertDialogDescription>
                            Please provide a reason for rejecting the selected content. All selected items will be rejected with this reason.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4">
                          <Label htmlFor="bulk-reason">Reason</Label>
                          <Textarea
                            id="bulk-reason"
                            value={moderationReason}
                            onChange={(e) => setModerationReason(e.target.value)}
                            placeholder="Enter rejection reason..."
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setBulkAction(null)}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleBulkAction('reject')}
                            disabled={!moderationReason.trim() || bulkModerateMutation.isPending}
                          >
                            Reject All Selected
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedItems([])}
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Listings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Pending Listings
                  <Badge variant="outline">{filteredListings.length}</Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={filteredListings.length > 0 && filteredListings.every(listing =>
                      selectedItems.some(item => item.id === listing.id && item.type === 'listing')
                    )}
                    onCheckedChange={() => handleSelectAll(filteredListings, 'listing')}
                  />
                  <span className="text-sm text-gray-600">Select All</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingLoading ? (
                  <div className="flex justify-center p-8"><Loader /></div>
                ) : filteredListings.length > 0 ? (
                  filteredListings.map((listing: any) => (
                    <div key={listing.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedItems.some(item => item.id === listing.id && item.type === 'listing')}
                          onCheckedChange={() => handleSelectItem(listing.id, 'listing')}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{listing.productName}</h4>
                              <p className="text-sm text-gray-600">{listing.description}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="secondary">{listing.category}</Badge>
                                {listing.subcategory && <Badge variant="outline">{listing.subcategory}</Badge>}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">By: {listing.farmer?.fullName}</p>
                            </div>
                            <Badge variant="secondary">Pending</Badge>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={() => handleModerate(listing.id, 'approve', 'listing')}
                              disabled={moderateMutation.isPending}
                            >
                              Approve
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setModerationAction({ type: 'reject', id: listing.id, contentType: 'listing' })}
                                >
                                  Reject
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reject Listing</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Please provide a reason for rejecting this listing. The farmer will be notified.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="py-4">
                                  <Label htmlFor="reason">Reason</Label>
                                  <Textarea
                                    id="reason"
                                    value={moderationReason}
                                    onChange={(e) => setModerationReason(e.target.value)}
                                    placeholder="Enter rejection reason..."
                                  />
                                </div>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setModerationAction(null)}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleModerate(listing.id, 'reject', 'listing')}
                                    disabled={!moderationReason.trim() || moderateMutation.isPending}
                                  >
                                    Reject Listing
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No pending listings match your filters</p>
                )}
              </CardContent>
            </Card>

            {/* Pending Messages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Pending Messages
                  <Badge variant="outline">{filteredMessages.length}</Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={filteredMessages.length > 0 && filteredMessages.every(message =>
                      selectedItems.some(item => item.id === message.id && item.type === 'message')
                    )}
                    onCheckedChange={() => handleSelectAll(filteredMessages, 'message')}
                  />
                  <span className="text-sm text-gray-600">Select All</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingLoading ? (
                  <div className="flex justify-center p-8"><Loader /></div>
                ) : filteredMessages.length > 0 ? (
                  filteredMessages.map((message: any) => (
                    <div key={message.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedItems.some(item => item.id === message.id && item.type === 'message')}
                          onCheckedChange={() => handleSelectItem(message.id, 'message')}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{message.content}</p>
                              <p className="text-xs text-gray-500">
                                From: {message.sender?.fullName} | To: {message.receiver?.fullName}
                              </p>
                              {message.listingId && (
                                <p className="text-xs text-gray-500">
                                  About listing: {message.listing?.productName}
                                </p>
                              )}
                            </div>
                            <Badge variant="secondary">Pending</Badge>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={() => handleModerate(message.id, 'approve', 'message')}
                              disabled={moderateMutation.isPending}
                            >
                              Approve
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setModerationAction({ type: 'reject', id: message.id, contentType: 'message' })}
                                >
                                  Reject
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reject Message</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Please provide a reason for rejecting this message. The sender will be notified.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="py-4">
                                  <Label htmlFor="reason">Reason</Label>
                                  <Textarea
                                    id="reason"
                                    value={moderationReason}
                                    onChange={(e) => setModerationReason(e.target.value)}
                                    placeholder="Enter rejection reason..."
                                  />
                                </div>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setModerationAction(null)}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleModerate(message.id, 'reject', 'message')}
                                    disabled={!moderationReason.trim() || moderateMutation.isPending}
                                  >
                                    Reject Message
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No pending messages match your filters</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="escrow" className="space-y-6">
          {/* Escrow Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Total Escrows
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{escrows?.length ?? 0}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Active escrow transactions
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Disputed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {escrows?.filter(e => e.status === 'disputed').length ?? 0}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Require resolution
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {escrows?.filter(e => e.status === 'completed').length ?? 0}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Successfully resolved
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(escrows?.reduce((sum, e) => sum + (parseFloat(e.amount as any) || 0), 0) ?? 0)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Protected by escrow
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Escrow Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Escrow Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="escrow-status">Status Filter</Label>
                  <Select value={escrowStatusFilter} onValueChange={setEscrowStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="upfront_held">Upfront Held</SelectItem>
                      <SelectItem value="remaining_released">Remaining Released</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="disputed">Disputed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Escrow List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Escrow Transactions
                <Badge variant="outline">{filteredEscrows.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {escrowsLoading ? (
                <div>Loading escrows...</div>
              ) : filteredEscrows.length > 0 ? (
                filteredEscrows.map((escrow) => (
                  <div key={escrow.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">Order #{escrow.orderId}</h4>
                          {getEscrowStatusBadge(escrow.status)}
                        </div>
                        <p className="text-sm text-gray-600">{getEscrowStatusDescription(escrow)}</p>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>Total: {formatCurrency(parseFloat(escrow.amount as any) || 0)}</span>
                          <span>Upfront: {formatCurrency(parseFloat(escrow.upfrontAmount as any) || 0)}</span>
                          <span>Remaining: {formatCurrency(parseFloat(escrow.remainingAmount as any) || 0)}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Created: {new Date(escrow.createdAt).toLocaleDateString()}
                          {escrow.disputedAt && ` | Disputed: ${new Date(escrow.disputedAt).toLocaleDateString()}`}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {/* Dispute Resolution */}
                        {escrow.status === 'disputed' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setEscrowResolution({ escrowId: escrow.id, resolution: 'buyer' })}
                              >
                                <Shield className="h-4 w-4 mr-1" />
                                Resolve Dispute
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Resolve Escrow Dispute</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Resolve the dispute for Order #{escrow.orderId}. Choose who should receive the escrowed funds.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="py-4 space-y-4">
                                <div className="space-y-2">
                                  <Label>Dispute Reason</Label>
                                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                    {escrow.disputeReason}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <Label>Resolution</Label>
                                  <Select
                                    value={escrowResolution?.resolution || 'buyer'}
                                    onValueChange={(value: 'buyer' | 'farmer' | 'split') =>
                                      setEscrowResolution(prev => prev ? { ...prev, resolution: value } : null)
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="buyer">Return to Buyer</SelectItem>
                                      <SelectItem value="farmer">Release to Farmer</SelectItem>
                                      <SelectItem value="split">Split 50/50</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setEscrowResolution(null)}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => resolveEscrowMutation.mutate({
                                    escrowId: escrow.id,
                                    resolution: escrowResolution?.resolution || 'buyer'
                                  })}
                                  disabled={resolveEscrowMutation.isPending}
                                >
                                  Resolve Dispute
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}

                        {/* Release to Farmer (for UPFRONT_HELD or REMAINING_RELEASED) */}
                        {(escrow.status === 'upfront_held' || escrow.status === 'remaining_released') && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => setEscrowAction({ escrowId: escrow.id, action: 'release' })}
                              >
                                <CheckSquare className="h-4 w-4 mr-1" />
                                Release to Farmer
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Release Escrow to Farmer</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Release {formatCurrency(parseFloat(escrow.amount as any) || 0)} to the farmer for Order #{escrow.orderId}.
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="py-4 space-y-2">
                                <Label htmlFor="release-reason">Reason (Optional)</Label>
                                <Input
                                  id="release-reason"
                                  placeholder="e.g., Order confirmed complete"
                                  value={escrowAction?.reason || ''}
                                  onChange={(e) => setEscrowAction(prev => prev ? { ...prev, reason: e.target.value } : null)}
                                />
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setEscrowAction(null)}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => releaseEscrowMutation.mutate({
                                    escrowId: escrow.id,
                                    reason: escrowAction?.reason
                                  })}
                                  disabled={releaseEscrowMutation.isPending}
                                >
                                  Release Funds
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}

                        {/* Refund to Buyer (for UPFRONT_HELD or REMAINING_RELEASED) */}
                        {(escrow.status === 'upfront_held' || escrow.status === 'remaining_released') && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEscrowAction({ escrowId: escrow.id, action: 'refund' })}
                              >
                                <AlertTriangle className="h-4 w-4 mr-1" />
                                Refund to Buyer
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Refund Escrow to Buyer</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Refund {formatCurrency(parseFloat(escrow.amount as any) || 0)} to the buyer for Order #{escrow.orderId}.
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="py-4 space-y-2">
                                <Label htmlFor="refund-reason">Reason (Required)</Label>
                                <Input
                                  id="refund-reason"
                                  placeholder="e.g., Farmer cannot fulfill order"
                                  value={escrowAction?.reason || ''}
                                  onChange={(e) => setEscrowAction(prev => prev ? { ...prev, reason: e.target.value } : null)}
                                  required
                                />
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setEscrowAction(null)}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    if (!escrowAction?.reason?.trim()) {
                                      toast({
                                        title: "Reason required",
                                        description: "Please provide a reason for the refund.",
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    refundEscrowMutation.mutate({
                                      escrowId: escrow.id,
                                      reason: escrowAction.reason
                                    });
                                  }}
                                  disabled={refundEscrowMutation.isPending}
                                >
                                  Refund to Buyer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No escrows match your filters</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          {/* User Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{allUsers?.length ?? 0}</div>
                <div className="text-xs text-gray-500 mt-1">Registered accounts</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {allUsers?.filter(u => u.isActive).length ?? 0}
                </div>
                <div className="text-xs text-gray-500 mt-1">Can access platform</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Verified</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {allUsers?.filter(u => u.verified).length ?? 0}
                </div>
                <div className="text-xs text-gray-500 mt-1">Email verified</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Inactive</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {allUsers?.filter(u => !u.isActive).length ?? 0}
                </div>
                <div className="text-xs text-gray-500 mt-1">Deactivated accounts</div>
              </CardContent>
            </Card>
          </div>

          {/* User Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user-search">Search Users</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="user-search"
                      placeholder="Name or email..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-role-filter">Role Filter</Label>
                  <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="farmer">Farmers</SelectItem>
                      <SelectItem value="buyer">Buyers</SelectItem>
                      <SelectItem value="field_officer">Field Officers</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-status-filter">Status Filter</Label>
                  <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Users
                <Badge variant="outline">{filteredUsers.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-4">Loading users...</div>
              ) : filteredUsers.length > 0 ? (
                <div className="space-y-3">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{user.fullName}</h3>
                            <Badge variant={getRoleBadgeColor(user.role)}>
                              {user.role.replace('_', ' ')}
                            </Badge>
                            {user.verified && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                ✓ Verified
                              </Badge>
                            )}
                            {!user.isActive && (
                              <Badge variant="destructive">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>📧 {user.email}</div>
                            {user.phone && <div>📱 {user.phone}</div>}
                            {user.region && <div>📍 {user.region}</div>}
                            {user.businessName && <div>🏢 {user.businessName}</div>}
                            {user.farmSize && <div>🌾 {user.farmSize}</div>}
                            <div>💰 Wallet: {formatCurrency(parseFloat(user.walletBalance || '0'))}</div>
                            <div className="text-xs text-gray-400">
                              Joined: {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant={user.isActive ? "destructive" : "default"}
                                disabled={toggleUserStatusMutation.isPending}
                              >
                                {user.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {user.isActive ? 'Deactivate' : 'Activate'} User Account
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {user.isActive 
                                    ? `This will prevent ${user.fullName} from accessing their account. They will not be able to log in or use any platform features.`
                                    : `This will restore ${user.fullName}'s access to their account. They will be able to log in and use all platform features.`
                                  }
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => toggleUserStatusMutation.mutate({ 
                                    userId: user.id, 
                                    isActive: !user.isActive 
                                  })}
                                  className={user.isActive ? 'bg-red-600 hover:bg-red-700' : ''}
                                >
                                  {user.isActive ? 'Deactivate Account' : 'Activate Account'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No users found</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

export default function AdminDashboard() {
  return <AdminDashboardContent />;
}
