import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ordersApi } from '@/services/mockApi';
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

    const commonInfo = (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold mb-2">Order Information</h3>
            <div className="space-y-1 text-sm">
              <div><strong>Order ID:</strong> {order.id}</div>
              <div><strong>Status:</strong> {order.status}</div>
              <div><strong>Created:</strong> {formatDate(order.createdAt)}</div>
              <div><strong>Balance ID:</strong> {order.balanceId}</div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Customer</h3>
            <div className="space-y-1 text-sm">
              <div><strong>Name:</strong> {order.customerName}</div>
              <div><strong>Address:</strong></div>
              <div className="pl-4 whitespace-pre-line">{order.customerAddress}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold mb-2">Product Details</h3>
            <div className="space-y-1 text-sm">
              <div><strong>Product:</strong> {order.productName}</div>
              <div><strong>Supplier:</strong> {order.supplierName}</div>
              <div><strong>Bags Count:</strong> {order.bagsCount}</div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Driver & Vehicle</h3>
            <div className="space-y-1 text-sm">
              <div><strong>Driver:</strong> {order.driverName || 'TBD'}</div>
              <div><strong>Plate:</strong> {order.plateNumber || 'TBD'}</div>
              <div><strong>Phone:</strong> {order.phoneNumber || 'TBD'}</div>
            </div>
          </div>
        </div>
      </div>
    );

    switch (type) {
      case 'balance-card':
        return (
          <div className="space-y-8">
            {commonInfo}
            <div>
              <h3 className="font-semibold mb-4">Weight Information</h3>
              <div className="border rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <div className="text-sm font-medium mb-1">First Weight</div>
                    <div className="text-xl">{order.firstWeightKg ? `${order.firstWeightKg.toLocaleString()} kg` : 'TBD'}</div>
                    <div className="text-sm text-gray-600">{formatDate(order.firstWeightTimestamp)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Second Weight</div>
                    <div className="text-xl">{order.secondWeightKg ? `${order.secondWeightKg.toLocaleString()} kg` : 'TBD'}</div>
                    <div className="text-sm text-gray-600">{formatDate(order.secondWeightTimestamp)}</div>
                  </div>
                </div>
                {order.netWeightKg && (
                  <div className="border-t pt-4">
                    <div className="text-center">
                      <div className="text-sm font-medium mb-1">Net Weight</div>
                      <div className="text-3xl font-bold text-green-700">
                        {order.netWeightKg.toLocaleString()} kg
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'shipping-card':
        return (
          <div className="space-y-8">
            {commonInfo}
            <div>
              <h3 className="font-semibold mb-4">Shipping Details</h3>
              <div className="border rounded-lg p-4 space-y-2">
                <div><strong>Delivery Instructions:</strong> Standard delivery</div>
                <div><strong>Special Notes:</strong> Handle with care</div>
                <div><strong>Expected Delivery:</strong> Same day</div>
              </div>
            </div>
          </div>
        );

      case 'bill':
        return (
          <div className="space-y-8">
            {commonInfo}
            <div>
              <h3 className="font-semibold mb-4">Billing Information</h3>
              <div className="border rounded-lg p-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Description</th>
                      <th className="text-right py-2">Quantity</th>
                      <th className="text-right py-2">Rate</th>
                      <th className="text-right py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2">{order.productName}</td>
                      <td className="text-right py-2">{order.bagsCount} bags</td>
                      <td className="text-right py-2">$0.00</td>
                      <td className="text-right py-2">$0.00</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t">
                      <td colSpan={3} className="text-right py-2 font-semibold">Total:</td>
                      <td className="text-right py-2 font-semibold">$0.00</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        );

      default:
        return commonInfo;
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
      <div className="no-print sticky top-0 bg-white border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold">
            {getDocumentTitle()} - {order.id}
          </h1>
          <Button onClick={handlePrint} className="hgm-input">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Print Content */}
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold text-green-700 mb-2">HGM Grain Co.</h1>
          <h2 className="text-xl font-semibold">{getDocumentTitle()}</h2>
          <p className="text-gray-600 mt-2">Generated on {new Date().toLocaleDateString()}</p>
        </div>

        {/* Document Content */}
        {getDocumentContent()}

        {/* Footer */}
        <div className="mt-12 pt-4 border-t text-center text-sm text-gray-600">
          <p>HGM Grain Co. - Gatekeeper System</p>
          <p>Document ID: {order.id}-{type?.toUpperCase()}</p>
        </div>
      </div>
    </div>
  );
}