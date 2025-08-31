import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { managementApi, NewOrderInput } from '@/services/api';
import type { Order } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import OrderForm from '@/components/OrderForm';

export default function ManagementDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await managementApi.listOrders({});
      setOrders(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const createSubmit = async (payload: NewOrderInput) => {
    setError(null);
    setSuccess(null);
    const created = await managementApi.createOrder(payload);
    setSuccess(`Order created: ${created.order_number}`);
    setShowCreate(false);
    await loadOrders();
  };

  const editSubmit = async (payload: NewOrderInput) => {
    if (!editing) return;
    setError(null);
    setSuccess(null);
    await managementApi.updateOrder(editing.id, payload);
    setSuccess(`Order ${editing.id} updated`);
    setEditing(null);
    await loadOrders();
  };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">Management Dashboard</CardTitle>
          <div className="flex gap-2">
            <Button onClick={() => setShowCreate(true)}>Create Order</Button>
          </div>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-700 text-sm">{success}</div>}

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders ({orders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Bags</TableHead>
                      <TableHead>Balance ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>{o.id}</TableCell>
                        <TableCell>{o.type === 'quick-sale' ? 'Quick' : 'Regular'}</TableCell>
                        <TableCell>{o.customerName}</TableCell>
                        <TableCell>{o.productName}</TableCell>
                        <TableCell>{o.bagsCount}</TableCell>
                        <TableCell>{o.balanceId}</TableCell>
                        <TableCell>{o.status}</TableCell>
                        <TableCell className="space-x-2">
                          <Button variant="outline" size="sm" onClick={() => setEditing(o)}>Edit</Button>
                          <Button variant="destructive" size="sm" onClick={async () => {
                            if (!confirm(`Delete order ${o.id}?`)) return;
                            try {
                              await managementApi.deleteOrder(o.id);
                              await loadOrders();
                            } catch (e: any) {
                              setError(e.message || 'Delete failed');
                            }
                          }}>Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="w-[95vw] md:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Order</DialogTitle>
          </DialogHeader>
          <OrderForm mode="create" onSubmit={async (p) => { await createSubmit(p); }} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="w-[95vw] md:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Order {editing?.id}</DialogTitle>
          </DialogHeader>
          {editing && (
            <OrderForm mode="edit" initial={editing} onSubmit={async (p) => { await editSubmit(p); }} onCancel={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
