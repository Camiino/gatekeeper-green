import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { managementApi, NewOrderInput } from '@/services/api';
import type { Order } from '@/types';

export default function ManagementDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<NewOrderInput>({
    transactionType: 'regular',
    unit: 'kg',
    paymentMethod: 'cash',
    paymentTerms: 'now',
  });

  const totalAuto = useMemo(() => {
    const p = Number(form.pricePerUnit || 0);
    const q = Number(form.quantity || 0);
    return p && q ? +(p * q).toFixed(2) : 0;
  }, [form.pricePerUnit, form.quantity]);

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

  const handleInput = (key: keyof NewOrderInput, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onCreate = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = { ...form };
      if (!payload.balanceId) {
        payload.balanceId = `BAL-${Math.floor(1000 + Math.random() * 9000)}`;
      }
      if (!payload.totalPrice && totalAuto) payload.totalPrice = totalAuto;
      const created = await managementApi.createOrder(payload);
      setSuccess(`Order created: ${created.order_number}`);
      setForm({ transactionType: 'regular', unit: 'kg', paymentMethod: 'cash', paymentTerms: 'now' });
      await loadOrders();
    } catch (e: any) {
      setError(e.message || 'Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <div className="text-red-600 text-sm">{error}</div>}
            {success && <div className="text-green-700 text-sm">{success}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Transaction Type</Label>
                <Select value={form.transactionType} onValueChange={(v) => handleInput('transactionType', v as any)}>
                  <SelectTrigger className="hgm-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="quick-sale">Quick Sale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Customer Name</Label>
                <Input value={form.customerName || ''} onChange={(e) => handleInput('customerName', e.target.value)} />
              </div>
              <div>
                <Label>Supplier</Label>
                <Input value={form.supplierName || ''} onChange={(e) => handleInput('supplierName', e.target.value)} />
              </div>
              <div>
                <Label>Num. of bags</Label>
                <Input type="number" value={form.numBags ?? ''} onChange={(e) => handleInput('numBags', e.target.value ? Number(e.target.value) : undefined)} />
              </div>
              <div>
                <Label>Product</Label>
                <Select value={form.product || ''} onValueChange={(v) => handleInput('product', v as any)}>
                  <SelectTrigger className="hgm-input"><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flour">Flour</SelectItem>
                    <SelectItem value="bran">Bran</SelectItem>
                    <SelectItem value="shawa2ib">Shawa2ib</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Balance ID (Auto Generated)</Label>
                <Input value={form.balanceId || ''} onChange={(e) => handleInput('balanceId', e.target.value)} placeholder="BAL-XXXX" />
              </div>
              <div>
                <Label>Price per unit</Label>
                <Input type="number" step="0.01" value={form.pricePerUnit ?? ''} onChange={(e) => handleInput('pricePerUnit', e.target.value ? Number(e.target.value) : undefined)} />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" step="0.01" value={form.quantity ?? ''} onChange={(e) => handleInput('quantity', e.target.value ? Number(e.target.value) : undefined)} />
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={form.unit || 'kg'} onValueChange={(v) => handleInput('unit', v)}>
                  <SelectTrigger className="hgm-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="bag">bag</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Total Price</Label>
                <Input type="number" step="0.01" value={form.totalPrice ?? totalAuto} onChange={(e) => handleInput('totalPrice', e.target.value ? Number(e.target.value) : undefined)} />
              </div>
              <div>
                <Label>Suggested Selling Price</Label>
                <Input type="number" step="0.01" value={form.suggestedSellingPrice ?? ''} onChange={(e) => handleInput('suggestedSellingPrice', e.target.value ? Number(e.target.value) : undefined)} />
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select value={form.paymentMethod || 'cash'} onValueChange={(v) => handleInput('paymentMethod', v as any)}>
                  <SelectTrigger className="hgm-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment (Now, installments or later)</Label>
                <Select value={form.paymentTerms || 'now'} onValueChange={(v) => handleInput('paymentTerms', v as any)}>
                  <SelectTrigger className="hgm-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="now">Now</SelectItem>
                    <SelectItem value="installments">Installments</SelectItem>
                    <SelectItem value="later">Later</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Signature</Label>
                <Input value={form.signature || ''} onChange={(e) => handleInput('signature', e.target.value)} placeholder="Signer name or note" />
              </div>
              <div className="md:col-span-2">
                <Label>Customer Address</Label>
                <Input value={form.customerAddress || ''} onChange={(e) => handleInput('customerAddress', e.target.value)} />
              </div>
              <div>
                <Label>Fees</Label>
                <Input type="number" step="0.01" value={form.fees ?? ''} onChange={(e) => handleInput('fees', e.target.value ? Number(e.target.value) : undefined)} />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={onCreate} disabled={saving}>{saving ? 'Creating...' : 'Create Order'}</Button>
              <Button variant="outline" onClick={() => setForm({ transactionType: 'regular', unit: 'kg', paymentMethod: 'cash', paymentTerms: 'now' })}>Reset</Button>
            </div>
          </CardContent>
        </Card>

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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

