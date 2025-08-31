import { Order, Driver, SearchFilters } from '@/types';

const API_BASE = import.meta.env.VITE_API_URL || '';

function mapOrder(row: any): Order {
  return {
    id: String(row.id),
    orderNumber: row.order_number || (row.id != null ? `ORD-${row.id}` : undefined),
    status: row.status && row.status.toLowerCase() === 'completed' ? 'Completed' : 'Pending',
    type: row.order_type === 'quick' ? 'quick-sale' : 'regular',
    createdAt: row.created_at,
    customerName: row.customer_name || '',
    supplierName: row.supplier_name || '',
    bagsCount: row.num_bags || 0,
    productName: row.product || '',
    balanceId: row.balance_id || '',
    customerAddress: row.customer_address || '',
    // billing fields
    unit: row.unit || undefined,
    pricePerUnit: row.price !== null && row.price !== undefined ? Number(row.price) : undefined,
    quantity: row.quantity !== null && row.quantity !== undefined ? Number(row.quantity) : undefined,
    totalPrice: row.total_price !== null && row.total_price !== undefined ? Number(row.total_price) : undefined,
    suggestedSellingPrice: row.suggested_selling_price !== null && row.suggested_selling_price !== undefined ? Number(row.suggested_selling_price) : undefined,
    paymentMethod: row.payment_method || undefined,
    paymentTerms: row.payment_terms || undefined,
    fees: row.fees !== null && row.fees !== undefined ? Number(row.fees) : undefined,
    signature: row.signature || undefined,
    // driver/vehicle/weights
    driverName: row.driver_name || undefined,
    plateNumber: row.plate_num || undefined,
    phoneNumber: row.driver_phone || undefined,
    firstWeightKg: row.first_weight_kg !== null ? Number(row.first_weight_kg) : undefined,
    firstWeightTimestamp: row.first_weight_time || undefined,
    secondWeightKg: row.second_weight_kg !== null ? Number(row.second_weight_kg) : undefined,
    secondWeightTimestamp: row.second_weight_time || undefined,
    netWeightKg: row.net_weight_kg !== null ? Number(row.net_weight_kg) : undefined,
  };
}

async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

export const driversApi = {
  async searchDrivers(prefix: string): Promise<Driver[]> {
    if (!prefix || prefix.length < 1) return [];
    const data = await fetchJSON(`${API_BASE}/api/drivers`);
    return data
      .filter((d: any) => d.name.toLowerCase().includes(prefix.toLowerCase()))
      .slice(0, 10)
      .map((d: any) => ({
        id: String(d.id),
        name: d.name,
        phone: d.phone || undefined,
        lastPlate: undefined,
        createdAt: '',
      }));
  },

  async findDriverByNameExact(name: string): Promise<Driver | undefined> {
    const data = await fetchJSON(`${API_BASE}/api/drivers`);
    const d = data.find((dr: any) => dr.name.toLowerCase() === name.toLowerCase());
    return d
      ? { id: String(d.id), name: d.name, phone: d.phone || undefined, lastPlate: undefined, createdAt: '' }
      : undefined;
  },

  async upsertDriver(driverData: Pick<Driver, 'name' | 'phone' | 'lastPlate'>): Promise<Driver> {
    const data = await fetchJSON(`${API_BASE}/api/drivers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: driverData.name, phone: driverData.phone }),
    });
    return {
      id: String(data.id),
      name: data.name,
      phone: data.phone || undefined,
      lastPlate: driverData.lastPlate,
      createdAt: '',
    };
  },
};

async function findOrCreateCompany(name: string, address?: string): Promise<number> {
  const list = await fetchJSON(`${API_BASE}/api/companies`);
  const existing = list.find((c: any) => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;
  const data = await fetchJSON(`${API_BASE}/api/companies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, address }),
  });
  return data.id;
}

export const ordersApi = {
  async listOrders(filters: SearchFilters = {}): Promise<Order[]> {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status.toLowerCase());
    // Optional: backend filter by order_type when provided
    if (filters.type && filters.type !== 'regular') {
      // map UI 'quick-sale' -> backend 'quick'
      params.set('order_type', filters.type === 'quick-sale' ? 'quick' : 'regular');
    }
    const data = await fetchJSON(`${API_BASE}/api/orders?${params.toString()}`);
    let orders: Order[] = data.map(mapOrder);

    if (filters.q) {
      const q = filters.q.toLowerCase();
      orders = orders.filter(o =>
        o.id.toLowerCase().includes(q) ||
        (o.orderNumber || '').toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.productName.toLowerCase().includes(q) ||
        o.driverName?.toLowerCase().includes(q) ||
        o.plateNumber?.toLowerCase().includes(q)
      );
    }

    if (filters.product) {
      orders = orders.filter(o => o.productName === filters.product);
    }

    if (filters.sort) {
      orders.sort((a, b) => {
        switch (filters.sort) {
          case 'customerName':
            return a.customerName.localeCompare(b.customerName);
          case 'productName':
            return a.productName.localeCompare(b.productName);
          case 'bagsCount':
            return (b.bagsCount ?? 0) - (a.bagsCount ?? 0);
          case 'createdAt':
          default:
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
    }

    return orders;
  },

  async getOrder(id: string): Promise<Order | null> {
    try {
      const data = await fetchJSON(`${API_BASE}/api/orders/${id}`);
      return mapOrder(data);
    } catch {
      return null;
    }
  },

  async updateOrder(id: string, patch: Partial<Order>): Promise<Order | null> {
    const payload: any = {};

    if (patch.customerName) {
      payload.customer_id = await findOrCreateCompany(patch.customerName, patch.customerAddress);
    }
    if (patch.supplierName) {
      payload.supplier_id = await findOrCreateCompany(patch.supplierName);
    }
    if (patch.driverName) {
      let driver = await driversApi.findDriverByNameExact(patch.driverName);
      if (!driver) {
        driver = await driversApi.upsertDriver({
          name: patch.driverName,
          phone: patch.phoneNumber,
          lastPlate: patch.plateNumber,
        });
      }
      payload.driver_id = driver.id;
    }
    if (patch.bagsCount !== undefined) payload.num_bags = patch.bagsCount;
    if (patch.plateNumber) payload.plate_num = patch.plateNumber;
    if (patch.productName) payload.product = patch.productName;
    if (patch.firstWeightKg !== undefined) payload.first_weight_kg = patch.firstWeightKg;
    if (patch.firstWeightTimestamp) payload.first_weight_time = patch.firstWeightTimestamp;
    if (patch.secondWeightKg !== undefined) payload.second_weight_kg = patch.secondWeightKg;
    if (patch.secondWeightTimestamp) payload.second_weight_time = patch.secondWeightTimestamp;
    if (patch.balanceId) payload.balance_id = patch.balanceId;
    if (patch.customerAddress) payload.customer_address = patch.customerAddress;
    // Optional billing fields if present on the object
    if ((patch as any).unit !== undefined) (payload as any).unit = (patch as any).unit;
    if ((patch as any).pricePerUnit !== undefined) (payload as any).price = (patch as any).pricePerUnit;
    if ((patch as any).quantity !== undefined) (payload as any).quantity = (patch as any).quantity;
    if ((patch as any).totalPrice !== undefined) (payload as any).total_price = (patch as any).totalPrice;
    if ((patch as any).suggestedSellingPrice !== undefined) (payload as any).suggested_selling_price = (patch as any).suggestedSellingPrice;
    if ((patch as any).paymentMethod !== undefined) (payload as any).payment_method = (patch as any).paymentMethod;
    if ((patch as any).paymentTerms !== undefined) (payload as any).payment_terms = (patch as any).paymentTerms;
    if ((patch as any).fees !== undefined) (payload as any).fees = (patch as any).fees;
    if ((patch as any).signature !== undefined) (payload as any).signature = (patch as any).signature;
    if (patch.status) payload.status = patch.status.toLowerCase();

    if (payload.first_weight_kg != null && payload.second_weight_kg != null) {
      payload.net_weight_kg = Math.abs(payload.second_weight_kg - payload.first_weight_kg);
    }

    await fetchJSON(`${API_BASE}/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return ordersApi.getOrder(id);
  },
};

