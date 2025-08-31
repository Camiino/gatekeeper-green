import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle, Printer, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import StatusBadge from '@/components/StatusBadge';
import DriverAutocomplete from '@/components/DriverAutocomplete';
import { ordersApi, driversApi } from '@/services/api';
import { Order } from '@/types';

export default function OrderViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    
    const loadOrder = async () => {
      try {
        const data = await ordersApi.getOrder(id);
        if (data) {
          setOrder(data);
        } else {
          toast({
            title: "Order not found",
            description: "The requested order could not be found.",
            variant: "destructive"
          });
          navigate('/orders');
        }
      } catch (error) {
        console.error('Error loading order:', error);
        toast({
          title: "Error",
          description: "Failed to load order data.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id, navigate, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          handleSave();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleComplete();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [order]);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const updateOrder = async (updates: Partial<Order>) => {
    if (!order || !id) return;
    
    const updatedOrder = { ...order, ...updates };
    setOrder(updatedOrder);
    setHasUnsavedChanges(true);
    
    // Clear related validation errors
    const newErrors = { ...validationErrors };
    Object.keys(updates).forEach(key => {
      delete newErrors[key];
    });
    setValidationErrors(newErrors);
  };

  const validateOrder = (orderData: Order): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    // For quick-sale orders, validate all fields since they're all editable
    if (orderData.type === 'quick-sale') {
      if (!orderData.customerName?.trim()) {
        errors.customerName = 'Customer name is required';
      }
      
      if (!orderData.supplierName?.trim()) {
        errors.supplierName = 'Supplier name is required';
      }
      
      if (!orderData.productName?.trim()) {
        errors.productName = 'Product name is required';
      }
      
      if (!orderData.bagsCount || orderData.bagsCount < 1) {
        errors.bagsCount = 'Bags count must be at least 1';
      }
      
      if (!orderData.balanceId?.trim()) {
        errors.balanceId = 'Balance ID is required';
      }
      
      if (!orderData.customerAddress?.trim()) {
        errors.customerAddress = 'Customer address is required';
      }
    }
    
    // Common validations for all order types
    if (!orderData.driverName?.trim()) {
      errors.driverName = 'Driver name is required';
    }
    
    if (!orderData.plateNumber?.trim()) {
      errors.plateNumber = 'Plate number is required';
    }
    
    if (orderData.firstWeightKg === undefined || orderData.firstWeightKg < 0) {
      errors.firstWeightKg = 'First weight must be a non-negative number';
    }
    
    if (orderData.secondWeightKg === undefined || orderData.secondWeightKg < 0) {
      errors.secondWeightKg = 'Second weight must be a non-negative number';
    }
    
    return errors;
  };

  const handleSave = async () => {
    if (!order || !id) return;
    
    setSaving(true);
    try {
      const updatedOrder = await ordersApi.updateOrder(id, order);
      if (updatedOrder) {
        setOrder(updatedOrder);
        setHasUnsavedChanges(false);
        toast({
          title: "Order saved",
          description: "Changes have been saved successfully."
        });
      }
    } catch (error) {
      console.error('Error saving order:', error);
      toast({
        title: "Error",
        description: "Failed to save changes.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!order || !id) return;
    
    const errors = validateOrder(order);
    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors below before completing the order.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      // Create driver if new
      if (order.driverName) {
        const existing = await driversApi.findDriverByNameExact(order.driverName);
        if (!existing) {
          await driversApi.upsertDriver({
            name: order.driverName,
            phone: order.phoneNumber,
            lastPlate: order.plateNumber
          });
        }
      }

      const updatedOrder = await ordersApi.updateOrder(id, {
        ...order,
        status: 'Completed'
      });
      
      if (updatedOrder) {
        setOrder(updatedOrder);
        setHasUnsavedChanges(false);
        toast({
          title: "Order completed",
          description: "Order has been marked as completed successfully."
        });
      }
    } catch (error) {
      console.error('Error completing order:', error);
      toast({
        title: "Error",
        description: "Failed to complete order.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDriverChange = (name: string, phone?: string) => {
    updateOrder({ 
      driverName: name,
      phoneNumber: phone || order?.phoneNumber || ''
    });
  };

  const handleNowClick = (field: 'firstWeightTimestamp' | 'secondWeightTimestamp') => {
    updateOrder({
      [field]: new Date().toISOString()
    });
  };

  const formatDateTime = (isoString: string | undefined) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const printOptions = [
    { id: 'balance-card', name: 'Balance Card', description: 'Weight and balance information' },
    { id: 'shipping-card', name: 'Shipping Card', description: 'Shipping and delivery details' },
    { id: 'bill', name: 'Bill', description: 'Invoice and billing information' }
  ].filter((opt) => !(opt.id === 'bill' && order?.customerName === 'HGM'));

  const handlePrintOption = (type: string) => {
    setShowPrintDialog(false);
    window.open(`/orders/${id}/print/${type}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="animate-pulse space-y-6">
            <div className="h-16 bg-muted rounded"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-96 bg-muted rounded"></div>
              <div className="h-96 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">Order not found</p>
            <Button asChild className="mt-4">
              <a href="/orders">Back to Orders</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const netWeight = order.firstWeightKg && order.secondWeightKg 
    ? Math.abs(order.secondWeightKg - order.firstWeightKg)
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-6xl mx-auto p-4 lg:p-8">
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/orders')}
              className="hgm-input"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{order.orderNumber || `ORD-${order.id}`}</h1>
              <div className="flex items-center gap-2">
                <StatusBadge status={order.status} />
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                  order.type === 'quick-sale' 
                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' 
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                }`}>
                  {order.type === 'quick-sale' ? 'Quick Sale' : 'Regular'}
                </span>
              </div>
            </div>
          </div>            {hasUnsavedChanges && (
              <div className="text-sm text-muted-foreground">
                Unsaved changes
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 lg:p-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Order Details
                {order.type === 'quick-sale' && (
                  <span className="text-sm font-normal text-muted-foreground">
                    All fields editable for Quick Sale
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="customer-name">Customer Name</Label>
                  {order.type === 'quick-sale' ? (
                    <div className="space-y-1">
                      <Input
                        id="customer-name"
                        value={order.customerName}
                        onChange={(e) => updateOrder({ customerName: e.target.value })}
                        className={`hgm-input mt-1 ${validationErrors.customerName ? 'border-destructive' : ''}`}
                        placeholder="Enter customer name"
                      />
                      {validationErrors.customerName && (
                        <p className="text-sm text-destructive">{validationErrors.customerName}</p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1 p-3 bg-muted text-muted-foreground rounded-md cursor-default">
                      {order.customerName}
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="supplier">Supplier</Label>
                  {order.type === 'quick-sale' ? (
                    <div className="space-y-1">
                      <Input
                        id="supplier"
                        value={order.supplierName}
                        onChange={(e) => updateOrder({ supplierName: e.target.value })}
                        className={`hgm-input mt-1 ${validationErrors.supplierName ? 'border-destructive' : ''}`}
                        placeholder="Enter supplier name"
                      />
                      {validationErrors.supplierName && (
                        <p className="text-sm text-destructive">{validationErrors.supplierName}</p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1 p-3 bg-muted text-muted-foreground rounded-md cursor-default">
                      {order.supplierName}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="product">Product</Label>
                    {order.type === 'quick-sale' ? (
                      <div className="space-y-1">
                        <Input
                          id="product"
                          value={order.productName}
                          onChange={(e) => updateOrder({ productName: e.target.value })}
                          className={`hgm-input mt-1 ${validationErrors.productName ? 'border-destructive' : ''}`}
                          placeholder="Enter product name"
                        />
                        {validationErrors.productName && (
                          <p className="text-sm text-destructive">{validationErrors.productName}</p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-1 p-3 bg-muted text-muted-foreground rounded-md cursor-default">
                        {order.productName}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="bags-count">Bags Count</Label>
                    {order.type === 'quick-sale' ? (
                      <div className="space-y-1">
                        <Input
                          id="bags-count"
                          type="number"
                          min="1"
                          value={order.bagsCount}
                          onChange={(e) => updateOrder({ bagsCount: parseInt(e.target.value) || 1 })}
                          className={`hgm-input mt-1 ${validationErrors.bagsCount ? 'border-destructive' : ''}`}
                          placeholder="Enter bags count"
                        />
                        {validationErrors.bagsCount && (
                          <p className="text-sm text-destructive">{validationErrors.bagsCount}</p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-1 p-3 bg-muted text-muted-foreground rounded-md cursor-default">
                        {order.bagsCount}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label>Order ID</Label>
                  <div className="mt-1 p-3 bg-muted text-muted-foreground rounded-md cursor-default">
                    {order.orderNumber || `ORD-${order.id}`}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="customer-address">Customer Address</Label>
                  {order.type === 'quick-sale' ? (
                    <div className="space-y-1">
                      <Textarea
                        id="customer-address"
                        value={order.customerAddress}
                        onChange={(e) => updateOrder({ customerAddress: e.target.value })}
                        className={`hgm-input mt-1 ${validationErrors.customerAddress ? 'border-destructive' : ''}`}
                        rows={3}
                        placeholder="Enter customer address"
                      />
                      {validationErrors.customerAddress && (
                        <p className="text-sm text-destructive">{validationErrors.customerAddress}</p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1 p-3 bg-muted text-muted-foreground rounded-md cursor-default whitespace-pre-wrap">
                      {order.customerAddress}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Driver & Weights (Editable) */}
          <Card>
            <CardHeader>
              <CardTitle>Driver & Weights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Driver Info */}
              <div className="space-y-4">
                <DriverAutocomplete
                  value={order.driverName || ''}
                  onChange={handleDriverChange}
                  error={validationErrors.driverName}
                />
                
                <div className="space-y-2">
                  <Label htmlFor="plate-number">Plate Number *</Label>
                  <Input
                    id="plate-number"
                    value={order.plateNumber || ''}
                    onChange={(e) => updateOrder({ plateNumber: e.target.value })}
                    placeholder="AAA-123456"
                    className={`hgm-input ${validationErrors.plateNumber ? 'border-destructive' : ''}`}
                  />
                  {validationErrors.plateNumber && (
                    <p className="text-sm text-destructive">{validationErrors.plateNumber}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone-number">Phone Number</Label>
                  <Input
                    id="phone-number"
                    type="tel"
                    value={order.phoneNumber || ''}
                    onChange={(e) => updateOrder({ phoneNumber: e.target.value })}
                    placeholder="555-0123"
                    className="hgm-input"
                  />
                </div>
              </div>

              {/* Weights */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">Weights</h3>
                
                {/* First Weight */}
                <div className="space-y-2">
                  <Label htmlFor="first-weight">First Weight (kg) *</Label>
                  <Input
                    id="first-weight"
                    type="number"
                    min="0"
                    step="0.01"
                    value={order.firstWeightKg || ''}
                    onChange={(e) => updateOrder({ firstWeightKg: parseFloat(e.target.value) || 0 })}
                    className={`hgm-input ${validationErrors.firstWeightKg ? 'border-destructive' : ''}`}
                  />
                  {validationErrors.firstWeightKg && (
                    <p className="text-sm text-destructive">{validationErrors.firstWeightKg}</p>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleNowClick('firstWeightTimestamp')}
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      Now
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(order.firstWeightTimestamp)}
                    </span>
                  </div>
                </div>
                
                {/* Second Weight */}
                <div className="space-y-2">
                  <Label htmlFor="second-weight">Second Weight (kg) *</Label>
                  <Input
                    id="second-weight"
                    type="number"
                    min="0"
                    step="0.01"
                    value={order.secondWeightKg || ''}
                    onChange={(e) => updateOrder({ secondWeightKg: parseFloat(e.target.value) || 0 })}
                    className={`hgm-input ${validationErrors.secondWeightKg ? 'border-destructive' : ''}`}
                  />
                  {validationErrors.secondWeightKg && (
                    <p className="text-sm text-destructive">{validationErrors.secondWeightKg}</p>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleNowClick('secondWeightTimestamp')}
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      Now
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(order.secondWeightTimestamp)}
                    </span>
                  </div>
                </div>
                
                {/* Net Weight */}
                {netWeight !== undefined && (
                  <div className="space-y-2">
                    <Label>Net Weight</Label>
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {netWeight.toLocaleString()} kg
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 z-10 bg-background border-t border-border">
        <div className="max-w-6xl mx-auto p-4 lg:p-8">
          <div className="flex flex-wrap gap-3 justify-between">
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges}
                className="hgm-input"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
              
              <Button
                onClick={handleComplete}
                disabled={saving || order.status === 'Completed'}
                className="hgm-input"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Completed
              </Button>
            </div>
            
            <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="hgm-input">
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Print Options</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-4">
                  {printOptions.map((option) => (
                    <Button
                      key={option.id}
                      variant="outline"
                      className="w-full hgm-input justify-start h-auto p-4"
                      onClick={() => handlePrintOption(option.id)}
                    >
                      <div className="text-left">
                        <div className="font-medium">{option.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
