export type OrderStatus = 'Pending' | 'Completed';
export type OrderType = 'regular' | 'quick-sale';

export type Order = {
  id: string;
  orderNumber?: string;
  status: OrderStatus;
  type: OrderType;
  createdAt: string;

  // view-only (manager-set)
  customerName: string;
  supplierName: string;
  bagsCount: number;
  productName: string;
  balanceId: string;
  customerAddress: string;

  // editable (gate)
  driverName?: string;
  plateNumber?: string;
  phoneNumber?: string;
  firstWeightKg?: number;
  firstWeightTimestamp?: string;
  secondWeightKg?: number;
  secondWeightTimestamp?: string;

  // computed
  netWeightKg?: number;

  // billing (manager/admin)
  unit?: string;
  pricePerUnit?: number;
  quantity?: number;
  totalPrice?: number;
  suggestedSellingPrice?: number;
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'other';
  paymentTerms?: 'now' | 'installments' | 'later';
  signature?: string;
  fees?: number;
};

export type Driver = {
  id: string;
  name: string;
  phone?: string;
  lastPlate?: string;
  createdAt: string;
  updatedAt?: string;
};

export type SearchFilters = {
  status?: OrderStatus;
  type?: OrderType;
  q?: string;
  sort?: string;
  dateFrom?: string;
  dateTo?: string;
  product?: string;
};
