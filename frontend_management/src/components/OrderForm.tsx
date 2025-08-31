import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import CompanyAutocomplete from '@/components/CompanyAutocomplete';
import type { Order } from '@/types';
import type { NewOrderInput } from '@/services/api';

type Props = {
  mode: 'create' | 'edit';
  initial?: Partial<Order>;
  onSubmit: (input: NewOrderInput) => Promise<void> | void;
  onCancel?: () => void;
};

export default function OrderForm({ mode, initial, onSubmit, onCancel }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<NewOrderInput>({
    transactionType: initial?.type === 'quick-sale' ? 'quick-sale' : 'regular',
    customerName: initial?.customerName || '',
    supplierName: initial?.supplierName || '',
    numBags: initial?.bagsCount,
    product: (initial?.productName as any) || undefined,
    balanceId: initial?.balanceId,
    pricePerUnit: initial?.pricePerUnit,
    quantity: initial?.quantity,
    unit: initial?.unit || 'kg',
    totalPrice: initial?.totalPrice,
    suggestedSellingPrice: initial?.suggestedSellingPrice,
    paymentMethod: (initial?.paymentMethod as any) || 'cash',
    paymentTerms: (initial?.paymentTerms as any) || 'now',
    signature: undefined,
    customerAddress: initial?.customerAddress,
    fees: (initial as any)?.fees,
  } as any);

  const totalAuto = useMemo(() => {
    const p = Number(form.pricePerUnit || 0);
    const q = Number(form.quantity || 0);
    return p && q ? +(p * q).toFixed(2) : 0;
  }, [form.pricePerUnit, form.quantity]);

  const handleInput = (key: keyof NewOrderInput, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.totalPrice && totalAuto) payload.totalPrice = totalAuto;
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
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
          <CompanyAutocomplete value={form.customerName || ''} onChange={(v) => handleInput('customerName', v)} placeholder="Select or type customer" />
        </div>
        <div>
          <Label>Supplier</Label>
          <CompanyAutocomplete value={form.supplierName || ''} onChange={(v) => handleInput('supplierName', v)} placeholder="Select or type supplier" />
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
          <Label>Balance ID</Label>
          <Input value={form.balanceId || ''} onChange={(e) => handleInput('balanceId', e.target.value)} placeholder="Auto if empty" />
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
          <Label>Suggested Selling price</Label>
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
          <Label>Customer Address</Label>
          <Input value={form.customerAddress || ''} onChange={(e) => handleInput('customerAddress', e.target.value)} />
        </div>
        <div>
          <Label>Fees</Label>
          <Input type="number" step="0.01" value={form.fees ?? ''} onChange={(e) => handleInput('fees', e.target.value ? Number(e.target.value) : undefined)} />
        </div>
        <div className="md:col-span-2">
          <Label>Signature</Label>
          <Input value={form.signature || ''} onChange={(e) => handleInput('signature', e.target.value)} placeholder="Signer name or note" />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={submit} disabled={saving}>{saving ? (mode === 'create' ? 'Creating...' : 'Saving...') : (mode === 'create' ? 'Create Order' : 'Save Changes')}</Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </div>
  );
}
