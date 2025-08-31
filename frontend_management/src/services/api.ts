import { Order, SearchFilters } from '@/types';

const API_BASE = import.meta.env.VITE_API_URL || '';

function mapOrder(row: any): Order {
  return {
    id: String(row.id),
    status: row.status && row.status.toLowerCase() === 'completed' ? 'Completed' : 'Pending',
    type: row.order_type === 'quick' ? 'quick-sale' : 'regular',
    createdAt: row.created_at,

    customerName: row.customer_name || '',
    supplierName: row.supplier_name || '',
    bagsCount: row.num_bags || 0,
    productName: row.product || '',
    balanceId: row.balance_id || '',
    customerAddress: row.customer_address || '',

    // gate-editable fields
    driverName: row.driver_name || undefined,
    plateNumber: row.plate_num || undefined,
    phoneNumber: row.driver_phone || undefined,
    firstWeightKg: row.first_weight_kg != null ? Number(row.first_weight_kg) : undefined,
    firstWeightTimestamp: row.first_weight_time || undefined,
    secondWeightKg: row.second_weight_kg != null ? Number(row.second_weight_kg) : undefined,
    secondWeightTimestamp: row.second_weight_time || undefined,
    netWeightKg: row.net_weight_kg != null ? Number(row.net_weight_kg) : undefined,
  };
}

async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Request failed: ${res.status}${text ? ` - ${text}` : ''}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return {} as any;
  return res.json();
}

async function findOrCreateCompany(name?: string, address?: string): Promise<number | null> {
  if (!name) return null;
  const list = await fetchJSON(`${API_BASE}/api/companies`);
  const existing = Array.isArray(list) ? list.find((c: any) => c.name.toLowerCase() === name.toLowerCase()) : null;
  if (existing) return existing.id;
  const data = await fetchJSON(`${API_BASE}/api/companies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, address }),
  });
  return data.id;
}

export type NewOrderInput = {
  transactionType: 'regular' | 'quick-sale';
  customerName?: string;
  supplierName?: string;
  numBags?: number;
  product?: 'flour' | 'bran' | 'shawa2ib';
  balanceId?: string; // will be auto if not provided
  pricePerUnit?: number;
  quantity?: number;
  unit?: string; // 'kg' | 'bag'
  totalPrice?: number;
  suggestedSellingPrice?: number;
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'other';
  paymentTerms?: 'now' | 'installments' | 'later';
  signature?: string;
  customerAddress?: string;
  fees?: number;
};

export const managementApi = {
  async listOrders(filters: SearchFilters = {}): Promise<Order[]> {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status.toLowerCase());
    if (filters.type) params.set('order_type', filters.type === 'quick-sale' ? 'quick' : 'regular');
    const data = await fetchJSON(`${API_BASE}/api/orders?${params.toString()}`);
    return Array.isArray(data) ? data.map(mapOrder) : [];
  },

  async createOrder(input: NewOrderInput): Promise<{ id: number; order_number: string }> {
    const customer_id = await findOrCreateCompany(input.customerName, input.customerAddress);
    const supplier_id = await findOrCreateCompany(input.supplierName);

    const order_number = `ORD-${Date.now()}`;
    const balance_id = input.balanceId || `BAL-${Math.floor(1000 + Math.random() * 9000)}`;
    const order_type = input.transactionType === 'quick-sale' ? 'quick' : 'regular';

    const payload: any = {
      order_number,
      customer_id,
      supplier_id,
      num_bags: input.numBags ?? null,
      plate_num: null,
      product: input.product ?? null,
      order_type,
      balance_id,
      customer_address: input.customerAddress ?? null,
      fees: input.fees ?? null,
      bill_date: null,
      unit: input.unit ?? null,
      price: input.pricePerUnit ?? null,
      quantity: input.quantity ?? null,
      total_price: input.totalPrice ?? (input.pricePerUnit && input.quantity ? input.pricePerUnit * input.quantity : null),
      suggested_selling_price: input.suggestedSellingPrice ?? null,
      payment_method: input.paymentMethod ?? null,
      payment_terms: input.paymentTerms ?? null,
      signature: input.signature ?? null,
      status: 'pending',
    };

    const data = await fetchJSON(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return data;
  },
};

