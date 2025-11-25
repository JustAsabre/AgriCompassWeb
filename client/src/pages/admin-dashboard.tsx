import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
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
import { Search, Filter, Calendar, BarChart3, CheckSquare, XSquare } from 'lucide-react';

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

  const moderateMutation = useMutation({
    mutationFn: async ({ id, action, reason, contentType }: { id: string, action: 'approve' | 'reject', reason?: string, contentType: 'listing' | 'message' }) => {
      const endpoint = contentType === 'listing' ? `/api/listings/${id}/moderate` : `/api/messages/${id}/moderate`;
      return apiRequest('PATCH', endpoint, { action, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/moderation/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/moderation/analytics'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/moderation/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/moderation/analytics'] });
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
    (!searchTerm || listing.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     listing.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const filteredMessages = pendingContent?.messages?.filter(message =>
    !searchTerm || message.content.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (statsLoading) return <div>Loading admin dashboard...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="moderation">Content Moderation</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalUsers ?? '-'}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Farmers: {stats?.usersByRole?.farmer ?? 0} | Buyers: {stats?.usersByRole?.buyer ?? 0} | Officers: {stats?.usersByRole?.field_officer ?? 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Listings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalListings ?? '-'}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Active: {stats?.registeredFarmers ?? 0} | Pending: {pendingContent?.listings?.length ?? 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${revenueData?.totalRevenue ?? stats?.totalRevenueFromCompleted ?? '-'}</div>
                <div className="text-xs text-gray-500 mt-1">
                  From {stats?.totalOrders ?? 0} completed orders
                </div>
              </CardContent>
            </Card>
          </div>
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
                  <div>Loading...</div>
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
                  <div>Loading...</div>
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

        <TabsContent value="users" className="space-y-6">
          <div className="text-center py-8">
            <p className="text-gray-500">User management features coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminDashboard() {
  return <AdminDashboardContent />;
}
