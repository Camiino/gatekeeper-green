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
    unit: row.unit || undefined,
    pricePerUnit: row.price !== null && row.price !== undefined ? Number(row.price) : undefined,
    quantity: row.quantity !== null && row.quantity !== undefined ? Number(row.quantity) : undefined,
    totalPrice: row.total_price !== null && row.total_price !== undefined ? Number(row.total_price) : undefined,
    suggestedSellingPrice: row.suggested_selling_price !== null && row.suggested_selling_price !== undefined ? Number(row.suggested_selling_price) : undefined,
    paymentMethod: row.payment_method || undefined,
    paymentTerms: row.payment_terms || undefined,
    fees: row.fees !== null && row.fees !== undefined ? Number(row.fees) : undefined,
    signature: row.signature || undefined,
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

// Mirror driver helpers for companies: exact same pattern
export const companiesApi = {
  async list(): Promise<{ id: number; name: string; address: string | null }[]> {
    const data = await fetchJSON(`${API_BASE}/api/companies`);
    return Array.isArray(data) ? data : [];
  },

  async searchCompanies(prefix: string): Promise<{ id: string; name: string; address?: string }[]> {
    if (!prefix || prefix.length < 1) return [];
    const data = await fetchJSON(`${API_BASE}/api/companies`);
    return data
      .filter((c: any) => c.name.toLowerCase().includes(prefix.toLowerCase()))
      .slice(0, 10)
      .map((c: any) => ({ id: String(c.id), name: c.name, address: c.address || undefined }));
  },

  async findCompanyByNameExact(name: string): Promise<{ id: string; name: string; address?: string } | undefined> {
    const data = await fetchJSON(`${API_BASE}/api/companies`);
    const c = data.find((co: any) => co.name.toLowerCase() === name.toLowerCase());
    return c ? { id: String(c.id), name: c.name, address: c.address || undefined } : undefined;
  },

  async upsertCompany(companyData: { name: string; address?: string }): Promise<{ id: string; name: string; address?: string } > {
    const data = await fetchJSON(`${API_BASE}/api/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: companyData.name, address: companyData.address || null }),
    });
    return { id: String(data.id), name: data.name, address: data.address || undefined };
  },
};

async function findOrCreateCompany(name: string, address?: string): Promise<number> {
  const existing = await companiesApi.findCompanyByNameExact(name);
  if (existing) return Number(existing.id);
  const created = await companiesApi.upsertCompany({ name, address });
  return Number(created.id);
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
      let company = await companiesApi.findCompanyByNameExact(patch.customerName);
      if (!company) {
        company = await companiesApi.upsertCompany({ name: patch.customerName, address: patch.customerAddress });
      }
      payload.customer_id = company.id;
    }
    if (patch.supplierName) {
      let company = await companiesApi.findCompanyByNameExact(patch.supplierName);
      if (!company) {
        company = await companiesApi.upsertCompany({ name: patch.supplierName });
      }
      payload.supplier_id = company.id;
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
    if (patch.balanceId !== undefined) payload.balance_id = patch.balanceId;
    if (patch.customerAddress !== undefined) payload.customer_address = patch.customerAddress;
    if (patch.unit !== undefined) payload.unit = patch.unit;
    if (patch.pricePerUnit !== undefined) payload.price = patch.pricePerUnit;
    if (patch.quantity !== undefined) payload.quantity = patch.quantity;
    if (patch.totalPrice !== undefined) payload.total_price = patch.totalPrice;
    if (patch.suggestedSellingPrice !== undefined) payload.suggested_selling_price = patch.suggestedSellingPrice;
    if (patch.paymentMethod !== undefined) payload.payment_method = patch.paymentMethod;
    if (patch.paymentTerms !== undefined) payload.payment_terms = patch.paymentTerms;
    if (patch.fees !== undefined) payload.fees = patch.fees;
    if (patch.signature !== undefined) payload.signature = patch.signature;
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

export type NewOrderInput = {
  transactionType: 'regular' | 'quick-sale';
  customerName?: string;
  supplierName?: string;
  numBags?: number;
  product?: 'flour' | 'bran' | 'shawa2ib';
  balanceId?: string;
  pricePerUnit?: number;
  quantity?: number;
  unit?: string;
  totalPrice?: number;
  suggestedSellingPrice?: number;
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'other';
  paymentTerms?: 'now' | 'installments' | 'later';
  signature?: string;
  customerAddress?: string;
  fees?: number;
};

async function listCompanies(): Promise<{ id: number; name: string; address: string | null }[]> {
  const data = await fetchJSON(`${API_BASE}/api/companies`);
  return Array.isArray(data) ? data : [];
}

export const managementApi = {
  listCompanies,

  async createOrder(input: NewOrderInput): Promise<{ id: number; order_number: string }> {
    const findOrCreate = async (name?: string, address?: string) => {
      if (!name) return null;
      const companies = await listCompanies();
      const found = companies.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (found) return found.id;
      const data = await fetchJSON(`${API_BASE}/api/companies`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address })
      });
      return data.id;
    };

    const customer_id = input.customerName
      ? Number((await (companiesApi.findCompanyByNameExact(input.customerName) || Promise.resolve(undefined)))?.id
        ?? (await companiesApi.upsertCompany({ name: input.customerName, address: input.customerAddress })).id)
      : null;
    const supplier_id = input.supplierName
      ? Number((await (companiesApi.findCompanyByNameExact(input.supplierName) || Promise.resolve(undefined)))?.id
        ?? (await companiesApi.upsertCompany({ name: input.supplierName })).id)
      : null;

    const order_type = input.transactionType === 'quick-sale' ? 'quick' : 'regular';

    const payload: any = {
      customer_id,
      supplier_id,
      num_bags: input.numBags ?? null,
      plate_num: null,
      product: input.product ?? null,
      order_type,
      // balance_id auto-generated by backend if missing
      customer_address: input.customerAddress ?? null,
      fees: input.fees ?? null,
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
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    return data;
  },

  async updateOrder(id: string, input: Partial<NewOrderInput>): Promise<void> {
    const payload: any = {};
    if (input.customerName !== undefined) {
      if (input.customerName) {
        let c = await companiesApi.findCompanyByNameExact(input.customerName);
        if (!c) c = await companiesApi.upsertCompany({ name: input.customerName, address: input.customerAddress });
        payload.customer_id = c.id;
      } else {
        payload.customer_id = null;
      }
    }
    if (input.supplierName !== undefined) {
      if (input.supplierName) {
        let s = await companiesApi.findCompanyByNameExact(input.supplierName);
        if (!s) s = await companiesApi.upsertCompany({ name: input.supplierName });
        payload.supplier_id = s.id;
      } else {
        payload.supplier_id = null;
      }
    }
    if (input.numBags !== undefined) payload.num_bags = input.numBags;
    if (input.product !== undefined) payload.product = input.product;
    if (input.balanceId !== undefined) payload.balance_id = input.balanceId;
    if (input.unit !== undefined) payload.unit = input.unit;
    if (input.pricePerUnit !== undefined) payload.price = input.pricePerUnit;
    if (input.quantity !== undefined) payload.quantity = input.quantity;
    if (input.totalPrice !== undefined) payload.total_price = input.totalPrice;
    if (input.suggestedSellingPrice !== undefined) payload.suggested_selling_price = input.suggestedSellingPrice;
    if (input.paymentMethod !== undefined) payload.payment_method = input.paymentMethod;
    if (input.paymentTerms !== undefined) payload.payment_terms = input.paymentTerms;
    if (input.customerAddress !== undefined) payload.customer_address = input.customerAddress;
    if (input.fees !== undefined) payload.fees = input.fees;

    await fetchJSON(`${API_BASE}/api/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  },

  async deleteOrder(id: string): Promise<void> {
    await fetchJSON(`${API_BASE}/api/orders/${id}`, { method: 'DELETE' });
  },
};

