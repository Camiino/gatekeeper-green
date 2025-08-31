import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ordersApi } from '@/services/api';
import { Order } from '@/types';

export default function PrintLayout() {
  const { id, type } = useParams<{ id: string; type: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const loadOrder = async () => {
      try {
        const data = await ordersApi.getOrder(id);
        setOrder(data);
      } catch (error) {
        console.error('Error loading order:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const getDocumentTitle = () => {
    switch (type) {
      case 'balance-card':
        return 'Balance Card';
      case 'shipping-card':
        return 'Shipping Card';
      case 'bill':
        return 'Bill';
      default:
        return 'Document';
    }
  };

  const getDocumentContent = () => {
    if (!order) return null;

    const formatDate = (isoString: string | undefined) => {
      if (!isoString) return 'N/A';
      return new Date(isoString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const formatDateShort = (isoString: string | undefined) => {
      if (!isoString) return 'N/A';
      return new Date(isoString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    switch (type) {
      case 'balance-card':
        return (
          <div className="space-y-6">
            {/* Balance ID Section */}
            <div className="text-center border-2 border-primary p-4 rounded-lg bg-accent">
              <h3 className="text-lg font-bold text-primary mb-2">Balance ID</h3>
              <div className="text-2xl font-bold">{order.balanceId}</div>
            </div>

            {/* Customer & Basic Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-semibold">Customer:</div>
                <div className="mb-3">{order.customerName}</div>
                
                <div className="font-semibold">Driver:</div>
                <div className="mb-3">{order.driverName || 'placeholder'}</div>
                
                <div className="font-semibold">Product:</div>
                <div>{order.productName}</div>
              </div>
              <div>
                <div className="font-semibold">Plate Number:</div>
                <div className="mb-3">{order.plateNumber || 'placeholder'}</div>
                
                <div className="font-semibold">Phone Number:</div>
                <div className="mb-3">{order.phoneNumber || '-'}</div>
                
                <div className="font-semibold">Supplier:</div>
                <div>{order.supplierName}</div>
              </div>
            </div>

            {/* Weight Information */}
            <div className="border-2 border-primary rounded-lg p-4">
              <h3 className="font-bold text-primary mb-4 text-center">WEIGHING INFORMATION</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="font-semibold text-sm">First Weight</div>
                  <div className="text-xl font-bold">{order.firstWeightKg != null ? `${order.firstWeightKg.toLocaleString()} kg` : '-'}</div>
                  <div className="text-xs text-muted-foreground">{formatDateShort(order.firstWeightTimestamp)}</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm">Second Weight</div>
                  <div className="text-xl font-bold">{order.secondWeightKg != null ? `${order.secondWeightKg.toLocaleString()} kg` : '-'}</div>
                  <div className="text-xs text-muted-foreground">{formatDateShort(order.secondWeightTimestamp)}</div>
                </div>
              </div>
              <div className="border-t-2 border-primary pt-3 text-center">
                <div className="font-semibold text-sm">NET WEIGHT</div>
                <div className="text-3xl font-bold text-primary">
                  {order.netWeightKg != null ? `${order.netWeightKg.toLocaleString()} kg` : '-'}
                </div>
              </div>
            </div>
          </div>
        );

      case 'shipping-card':
        return (
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="space-y-3">
              <div>
                <div className="font-semibold">Customer Name:</div>
                <div className="text-lg">{order.customerName}</div>
              </div>
              <div>
                <div className="font-semibold">Address:</div>
                <div className="whitespace-pre-line">{order.customerAddress}</div>
              </div>
              <div>
                <div className="font-semibold">Phone Number:</div>
                <div>{order.phoneNumber || 'placeholder'}</div>
              </div>
            </div>

            {/* Driver & Vehicle Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-semibold">Driver Name:</div>
                <div>{order.driverName || 'placeholder'}</div>
              </div>
              <div>
                <div className="font-semibold">Plate Number:</div>
                <div>{order.plateNumber || 'placeholder'}</div>
              </div>
            </div>

            {/* Product Details */}
            <div className="border-2 border-primary rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-semibold">Product:</div>
                  <div className="text-lg">{order.productName}</div>
                </div>
                <div>
                  <div className="font-semibold">Number of Bags:</div>
                  <div className="text-lg font-bold">{order.bagsCount}</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="font-semibold">Net Weight:</div>
                <div className="text-2xl font-bold text-primary">
                  {order.netWeightKg ? `${order.netWeightKg.toLocaleString()} kg` : 'placeholder'}
                </div>
              </div>
            </div>

            {/* Fees */}
            <div className="border rounded-lg p-4">
              <div className="font-semibold mb-2">Fees:</div>
              <div className="text-lg font-bold">{order.fees != null ? order.fees.toFixed(2) : '-'}</div>
            </div>
          </div>
        );

      case 'bill':
        return (
          <div className="space-y-6">
            {/* Customer & Date Info */}
            <div className="space-y-3">
              <div>
                <div className="font-semibold">Customer Name:</div>
                <div className="text-lg">{order.customerName}</div>
              </div>
              <div>
                <div className="font-semibold">Address:</div>
                <div className="whitespace-pre-line">{order.customerAddress}</div>
              </div>
              <div>
                <div className="font-semibold">Date:</div>
                <div>{formatDateShort(order.createdAt)}</div>
              </div>
            </div>

            {/* Billing Table */}
            <div className="border-2 border-primary rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-primary text-primary-foreground">
                  <tr>
                    <th className="text-left p-3">Product</th>
                    <th className="text-center p-3">Unit</th>
                    <th className="text-right p-3">Quantity</th>
                    <th className="text-right p-3">Price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-3">{order.productName}</td>
                    <td className="text-center p-3">{order.unit || 'kg'}</td>
                    <td className="text-right p-3">{(order.quantity ?? order.netWeightKg)?.toLocaleString() || '-'}</td>
                    <td className="text-right p-3">{order.pricePerUnit != null ? order.pricePerUnit.toFixed(2) : '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Pricing Details */}
            <div className="space-y-3 bg-accent p-4 rounded-lg">
              <div className="flex justify-between">
                <span className="font-semibold">Total Price:</span>
                <span className="font-bold">{order.totalPrice != null
                  ? order.totalPrice.toFixed(2)
                  : (order.pricePerUnit != null && (order.quantity ?? order.netWeightKg) != null)
                    ? (order.pricePerUnit * (order.quantity ?? order.netWeightKg)!).toFixed(2)
                    : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Suggested Price:</span>
                <span>{order.suggestedSellingPrice != null ? order.suggestedSellingPrice.toFixed(2) : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Payment Method:</span>
                <span>{order.paymentMethod || '-'}</span>
              </div>
            </div>

            {/* Signature Section */}
            <div className="border-2 border-primary rounded-lg p-6 mt-8">
              <div className="text-center font-semibold mb-4">SIGNATURE</div>
              <div className="h-16 border-b border-muted-foreground"></div>
              <div className="text-center text-sm text-muted-foreground mt-2">
                Customer Signature & Date
              </div>
            </div>
          </div>
        );

      default:
        return <div>Document type not found</div>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <p className="text-gray-600">The requested order could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Print Button - Hidden when printing */}
      <div className="no-print sticky top-0 bg-white border-b border-border p-4">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <h1 className="text-lg font-semibold">
            {getDocumentTitle()} - {order.id}
          </h1>
          <Button onClick={handlePrint} className="hgm-input">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* A5 Print Content */}
      <div className="print-a5 max-w-md mx-auto p-6 bg-white text-black">
        {/* Header */}
        <div className="text-center mb-6 pb-3 border-b-2 border-primary">
          <h1 className="text-2xl font-bold text-primary mb-1">HGM Grain Co.</h1>
          <h2 className="text-lg font-semibold">{getDocumentTitle()}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Generated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Document Content */}
        {getDocumentContent()}

        {/* Footer */}
        <div className="mt-8 pt-3 border-t text-center text-xs text-muted-foreground">
          <p>HGM Grain Co. - Gatekeeper System</p>
          <p>Doc ID: {order.id}-{type?.toUpperCase()}</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-a5 {
            width: 148mm !important;
            height: 210mm !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 15mm !important;
            font-size: 10pt !important;
            line-height: 1.2 !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            size: A5;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
