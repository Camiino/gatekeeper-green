import { Order, Driver, SearchFilters, OrderStatus } from '@/types';

const ORDERS_KEY = 'hgm_orders';
const DRIVERS_KEY = 'hgm_drivers';

// Seed data
const seedOrders: Order[] = [
  {
    id: 'ORD-001',
    status: 'Pending',
    type: 'regular',
    createdAt: '2024-01-15T08:30:00Z',
    customerName: 'Green Valley Farms',
    supplierName: 'HGM Grain Co.',
    bagsCount: 50,
    productName: 'Premium Wheat',
    balanceId: 'BAL-2024-001',
    customerAddress: '123 Farm Road, Green Valley, CA 95001'
  },
  {
    id: 'ORD-002',
    status: 'Pending',
    type: 'quick-sale',
    createdAt: '2024-01-15T09:15:00Z',
    customerName: 'Sunrise Agriculture',
    supplierName: 'HGM Grain Co.',
    bagsCount: 75,
    productName: 'Organic Corn',
    balanceId: 'BAL-2024-002',
    customerAddress: '456 Harvest Lane, Sunrise, CA 95002'
  },
  {
    id: 'ORD-003',
    status: 'Pending',
    type: 'regular',
    createdAt: '2024-01-15T10:00:00Z',
    customerName: 'Golden Fields Ltd',
    supplierName: 'HGM Grain Co.',
    bagsCount: 30,
    productName: 'Barley',
    balanceId: 'BAL-2024-003',
    customerAddress: '789 Golden Road, Fields City, CA 95003'
  },
  {
    id: 'ORD-004',
    status: 'Completed',
    type: 'regular',
    createdAt: '2024-01-14T14:20:00Z',
    customerName: 'Prairie Grain Corp',
    supplierName: 'HGM Grain Co.',
    bagsCount: 100,
    productName: 'Premium Wheat',
    balanceId: 'BAL-2024-004',
    customerAddress: '321 Prairie Avenue, Grain Town, CA 95004',
    driverName: 'John Martinez',
    plateNumber: 'ABC-123456',
    phoneNumber: '555-0101',
    firstWeightKg: 45000,
    firstWeightTimestamp: '2024-01-14T14:30:00Z',
    secondWeightKg: 20000,
    secondWeightTimestamp: '2024-01-14T15:45:00Z',
    netWeightKg: 25000
  },
  {
    id: 'ORD-005',
    status: 'Pending',
    type: 'quick-sale',
    createdAt: '2024-01-15T11:30:00Z',
    customerName: 'Local Farm Stand',
    supplierName: 'HGM Grain Co.',
    bagsCount: 15,
    productName: 'Organic Oats',
    balanceId: 'BAL-2024-005',
    customerAddress: '987 Market Street, Local Town, CA 95005'
  },
  {
    id: 'ORD-006',
    status: 'Completed',
    type: 'quick-sale',
    createdAt: '2024-01-14T16:45:00Z',
    customerName: 'Emergency Feed Supply',
    supplierName: 'HGM Grain Co.',
    bagsCount: 25,
    productName: 'Feed Corn',
    balanceId: 'BAL-2024-006',
    customerAddress: '654 Emergency Ave, Quick City, CA 95006',
    driverName: 'Sarah Johnson',
    plateNumber: 'DEF-789012',
    phoneNumber: '555-0102',
    firstWeightKg: 12000,
    firstWeightTimestamp: '2024-01-14T17:00:00Z',
    secondWeightKg: 5000,
    secondWeightTimestamp: '2024-01-14T17:30:00Z',
    netWeightKg: 7000
  }
];

const seedDrivers: Driver[] = [
  {
    id: 'DRV-001',
    name: 'John Martinez',
    phone: '555-0101',
    lastPlate: 'ABC-123456',
    createdAt: '2024-01-10T10:00:00Z'
  },
  {
    id: 'DRV-002',
    name: 'Sarah Johnson',
    phone: '555-0102',
    lastPlate: 'DEF-789012',
    createdAt: '2024-01-11T11:00:00Z'
  },
  {
    id: 'DRV-003',
    name: 'Mike Chen',
    phone: '555-0103',
    lastPlate: 'GHI-345678',
    createdAt: '2024-01-12T12:00:00Z'
  },
  {
    id: 'DRV-004',
    name: 'Lisa Rodriguez',
    phone: '555-0104',
    createdAt: '2024-01-13T13:00:00Z'
  }
];

// Initialize data if not exists
const initializeData = () => {
  if (!localStorage.getItem(ORDERS_KEY)) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(seedOrders));
  }
  if (!localStorage.getItem(DRIVERS_KEY)) {
    localStorage.setItem(DRIVERS_KEY, JSON.stringify(seedDrivers));
  }
};

// Orders API
export const ordersApi = {
  async listOrders(filters: SearchFilters = {}): Promise<Order[]> {
    initializeData();
    const orders: Order[] = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    
    let filtered = orders;

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(order => order.status === filters.status);
    }

    // Filter by type
    if (filters.type) {
      filtered = filtered.filter(order => order.type === filters.type);
    }

    // Search query
    if (filters.q) {
      const query = filters.q.toLowerCase();
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        order.productName.toLowerCase().includes(query) ||
        order.driverName?.toLowerCase().includes(query) ||
        order.plateNumber?.toLowerCase().includes(query)
      );
    }

    // Product filter
    if (filters.product) {
      filtered = filtered.filter(order => order.productName === filters.product);
    }

    // Sort
    if (filters.sort) {
      filtered.sort((a, b) => {
        switch (filters.sort) {
          case 'customerName':
            return a.customerName.localeCompare(b.customerName);
          case 'productName':
            return a.productName.localeCompare(b.productName);
          case 'bagsCount':
            return b.bagsCount - a.bagsCount;
          case 'createdAt':
          default:
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
    }

    return filtered;
  },

  async getOrder(id: string): Promise<Order | null> {
    initializeData();
    const orders: Order[] = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    return orders.find(order => order.id === id) || null;
  },

  async updateOrder(id: string, patch: Partial<Order>): Promise<Order | null> {
    initializeData();
    const orders: Order[] = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    const index = orders.findIndex(order => order.id === id);
    
    if (index === -1) return null;

    // Update order
    const updatedOrder = { ...orders[index], ...patch };

    // Compute net weight if both weights are present
    if (updatedOrder.firstWeightKg && updatedOrder.secondWeightKg) {
      updatedOrder.netWeightKg = Math.abs(updatedOrder.secondWeightKg - updatedOrder.firstWeightKg);
    }

    orders[index] = updatedOrder;
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    
    return updatedOrder;
  }
};

// Drivers API
export const driversApi = {
  async searchDrivers(prefix: string): Promise<Driver[]> {
    if (!prefix || prefix.length < 1) return [];
    
    initializeData();
    const drivers: Driver[] = JSON.parse(localStorage.getItem(DRIVERS_KEY) || '[]');
    
    const normalizedPrefix = prefix.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    return drivers
      .filter(driver => {
        const normalizedName = driver.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return normalizedName.includes(normalizedPrefix);
      })
      .slice(0, 10);
  },

  async findDriverByNameExact(name: string): Promise<Driver | undefined> {
    initializeData();
    const drivers: Driver[] = JSON.parse(localStorage.getItem(DRIVERS_KEY) || '[]');
    return drivers.find(driver => driver.name.toLowerCase() === name.toLowerCase());
  },

  async upsertDriver(driverData: Pick<Driver, 'name' | 'phone' | 'lastPlate'>): Promise<Driver> {
    initializeData();
    const drivers: Driver[] = JSON.parse(localStorage.getItem(DRIVERS_KEY) || '[]');
    
    // Check if driver exists
    const existingIndex = drivers.findIndex(d => d.name.toLowerCase() === driverData.name.toLowerCase());
    
    if (existingIndex >= 0) {
      // Update existing driver
      const existing = drivers[existingIndex];
      const updated = {
        ...existing,
        phone: driverData.phone || existing.phone,
        lastPlate: driverData.lastPlate || existing.lastPlate,
        updatedAt: new Date().toISOString()
      };
      drivers[existingIndex] = updated;
      localStorage.setItem(DRIVERS_KEY, JSON.stringify(drivers));
      return updated;
    } else {
      // Create new driver
      const newDriver: Driver = {
        id: `DRV-${Date.now()}`,
        name: driverData.name,
        phone: driverData.phone,
        lastPlate: driverData.lastPlate,
        createdAt: new Date().toISOString()
      };
      drivers.push(newDriver);
      localStorage.setItem(DRIVERS_KEY, JSON.stringify(drivers));
      return newDriver;
    }
  }
};