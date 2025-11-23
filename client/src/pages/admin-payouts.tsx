import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export default function AdminPayouts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  const { data: payouts } = useQuery(['admin/payouts'], async () => {
    const res = await fetch('/api/admin/payouts', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch payouts');
    return res.json();
  }, { enabled: !!user && user.role === 'admin' });

  const processMutation = useMutation({
    mutationFn: async ({ payoutId, reason }: { payoutId: string; reason?: string }) => {
      const res = await fetch('/api/payouts/process', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payoutId, reason }) });
      if (!res.ok) throw new Error('Failed to queue payout');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin/payouts']);
      toast({ title: 'Payout queued', description: 'Payout has been queued for processing' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to queue payout', variant: 'destructive' });
    }
  });

  if (!user || user.role !== 'admin') return <div>You must be an admin to view this page</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin - Payouts</h1>
      <div className="grid gap-3">
        {payouts && payouts.length === 0 && <p>No payouts</p>}
        {payouts?.map((p: any) => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle>Payout {p.id}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div>Farmer: {p.farmerId}</div>
                  <div>Amount: {p.amount}</div>
                  <div>Status: {p.status}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input className="border rounded px-2 py-1" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
                  <Button onClick={() => processMutation.mutate({ payoutId: p.id, reason })} disabled={processMutation.isPending}>Process</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
