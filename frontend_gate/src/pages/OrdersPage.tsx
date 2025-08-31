import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/StatusBadge';
import { ordersApi, gateManagementApi, NewOrderInput } from '@/services/api';
import { Order, SearchFilters } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select as UiSelect, SelectContent as UiSelectContent, SelectItem as UiSelectItem, SelectTrigger as UiSelectTrigger, SelectValue as UiSelectValue } from '@/components/ui/select';
import CompanyAutocomplete from '@/components/CompanyAutocomplete';
import DriverAutocomplete from '@/components/DriverAutocomplete';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SearchFilters>({ status: 'Pending' });
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<NewOrderInput>({ unit: 'kg', paymentMethod: 'cash', paymentTerms: 'now' });

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await ordersApi.listOrders(filters);
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [filters]);

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDriverChange = (name: string, phone?: string) => {
    setForm(prev => ({ ...prev, driverName: name, phoneNumber: phone ?? prev.phoneNumber }));
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await gateManagementApi.createQuickSale(form);
      setShowCreate(false);
      setForm({ unit: 'kg', paymentMethod: 'cash', paymentTerms: 'now' });
      await loadOrders();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">HGM Gatekeeper</h1>
            <p className="text-muted-foreground mt-1">Order Dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowCreate(true)}>Create Quick Sale</Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Order ID, Customer, Driver..."
                    value={filters.q || ''}
                    onChange={(e) => handleFilterChange('q', e.target.value)}
                    className="hgm-input pl-9"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={filters.status || 'Pending'}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger className="hgm-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Order Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Order Type</label>
                <Select
                  value={filters.type || 'all'}
                  onValueChange={(value) => handleFilterChange('type', value === 'all' ? '' : value)}
                >
                  <SelectTrigger className="hgm-input">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="quick-sale">Quick Sale</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort By</label>
                <Select
                  value={filters.sort || 'createdAt'}
                  onValueChange={(value) => handleFilterChange('sort', value)}
                >
                  <SelectTrigger className="hgm-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Created Date</SelectItem>
                    <SelectItem value="customerName">Customer</SelectItem>
                    <SelectItem value="productName">Product</SelectItem>
                    <SelectItem value="bagsCount">Bags Count</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              <div className="space-y-2">
                <label className="text-sm font-medium invisible">Actions</label>
                <Button
                  variant="outline"
                  onClick={() => setFilters({ status: 'Pending' })}
                  className="hgm-input w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Orders ({orders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-muted rounded"></div>
                  </div>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No orders found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Try adjusting your filters to see more results
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Bags</TableHead>
                                  <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.orderNumber || `ORD-${order.id}`}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            order.type === 'quick-sale' 
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' 
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {order.type === 'quick-sale' ? 'Quick Sale' : 'Regular'}
                          </span>
                        </TableCell>
                        <TableCell>{order.customerName}</TableCell>
                        <TableCell>{order.productName}</TableCell>
                        <TableCell>{order.bagsCount}</TableCell>
                        <TableCell>{formatDate(order.createdAt)}</TableCell>
                        <TableCell>
                          <StatusBadge status={order.status} />
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/orders/${order.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Link>
                          </Button>
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
        <DialogContent className="w-[95vw] md:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Quick Sale</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Customer Name</Label>
              <CompanyAutocomplete value={form.customerName} onChange={(name, address) => setForm({ ...form, customerName: name, customerAddress: address ?? form.customerAddress })} placeholder="Select or type customer" />
            </div>
            <div>
              <Label>Supplier</Label>
              <CompanyAutocomplete value={form.supplierName} onChange={(name) => setForm({ ...form, supplierName: name })} placeholder="Select or type supplier" />
            </div>
            <div>
              <DriverAutocomplete value={form.driverName || ''} onChange={handleDriverChange} />
            </div>
            <div>
              <Label>Plate Number</Label>
              <Input value={form.plateNumber || ''} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} />
            </div>
            <div>
              <Label>Product</Label>
              <UiSelect value={(form.product as any) || ''} onValueChange={(v) => setForm({ ...form, product: v as any })}>
                <UiSelectTrigger className="hgm-input"><UiSelectValue placeholder="Select product" /></UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem value="flour">Flour</UiSelectItem>
                  <UiSelectItem value="bran">Bran</UiSelectItem>
                  <UiSelectItem value="shawa2ib">Shawa2ib</UiSelectItem>
                </UiSelectContent>
              </UiSelect>
            </div>
            <div>
              <Label>Bags Count</Label>
              <Input type="number" value={form.numBags ?? ''} onChange={(e) => setForm({ ...form, numBags: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <Label>First Weight (kg)</Label>
              <Input type="number" step="0.01" value={form.firstWeightKg ?? ''} onChange={(e) => setForm({ ...form, firstWeightKg: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <Label>Second Weight (kg)</Label>
              <Input type="number" step="0.01" value={form.secondWeightKg ?? ''} onChange={(e) => setForm({ ...form, secondWeightKg: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <Label>Unit</Label>
              <UiSelect value={form.unit || 'kg'} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <UiSelectTrigger className="hgm-input"><UiSelectValue /></UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem value="kg">kg</UiSelectItem>
                  <UiSelectItem value="ton">ton</UiSelectItem>
                </UiSelectContent>
              </UiSelect>
            </div>
            <div>
              <Label>Price per unit</Label>
              <Input type="number" step="0.01" value={form.pricePerUnit ?? ''} onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" step="0.01" value={form.quantity ?? ''} onChange={(e) => setForm({ ...form, quantity: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <Label>Total Price</Label>
              <Input type="number" step="0.01" value={form.totalPrice ?? (form.pricePerUnit && form.quantity ? form.pricePerUnit * form.quantity : '')} onChange={(e) => setForm({ ...form, totalPrice: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <Label>Suggested Selling price</Label>
              <Input type="number" step="0.01" value={form.suggestedSellingPrice ?? ''} onChange={(e) => setForm({ ...form, suggestedSellingPrice: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <Label>Payment Method</Label>
              <UiSelect value={form.paymentMethod || 'cash'} onValueChange={(v) => setForm({ ...form, paymentMethod: v as any })}>
                <UiSelectTrigger className="hgm-input"><UiSelectValue /></UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem value="cash">Cash</UiSelectItem>
                  <UiSelectItem value="card">Card</UiSelectItem>
                  <UiSelectItem value="transfer">Transfer</UiSelectItem>
                  <UiSelectItem value="other">Other</UiSelectItem>
                </UiSelectContent>
              </UiSelect>
            </div>
            <div>
              <Label>Payment Terms</Label>
              <UiSelect value={form.paymentTerms || 'now'} onValueChange={(v) => setForm({ ...form, paymentTerms: v as any })}>
                <UiSelectTrigger className="hgm-input"><UiSelectValue /></UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem value="now">Now</UiSelectItem>
                  <UiSelectItem value="installments">Installments</UiSelectItem>
                  <UiSelectItem value="later">Later</UiSelectItem>
                </UiSelectContent>
              </UiSelect>
            </div>
            <div className="md:col-span-2">
              <Label>Customer Address</Label>
              <Input value={form.customerAddress || ''} onChange={(e) => setForm({ ...form, customerAddress: e.target.value })} />
            </div>
            <div>
              <Label>Fees</Label>
              <Input type="number" step="0.01" value={form.fees ?? ''} onChange={(e) => setForm({ ...form, fees: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div className="md:col-span-2">
              <Label>Signature</Label>
              <Input value={form.signature || ''} onChange={(e) => setForm({ ...form, signature: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create'}</Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
