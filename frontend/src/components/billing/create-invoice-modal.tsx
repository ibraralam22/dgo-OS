import React, { useState, useMemo } from 'react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { invoicesApi, CreateInvoiceInput, InvoiceLineItemInput } from '@services/invoices-api';
import { toast } from '@utils/toast';
import { Plus, PlusCircle, MinusCircle, X, Loader2 } from 'lucide-react';

interface ICreateInvoiceModalProps {
  accounts: any[];
  onClose: () => void;
  onCreated: () => void;
}

export const CreateInvoiceModal: React.FC<ICreateInvoiceModalProps> = ({
  accounts,
  onClose,
  onCreated,
}) => {
  const [accountId, setAccountId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('0');
  const [taxPercentage, setTaxPercentage] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [memo, setMemo] = useState('');

  const [lineItems, setLineItems] = useState<InvoiceLineItemInput[]>([
    { itemName: '', description: '', quantity: 1, unitPrice: 0 },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculations live
  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const disc = parseFloat(discountPercentage) || 0;
    const tax = parseFloat(taxPercentage) || 0;
    const discountAmount = subtotal * (disc / 100);
    const taxAmount = (subtotal - discountAmount) * (tax / 100);
    const total = subtotal - discountAmount + taxAmount;
    return { subtotal, total };
  }, [lineItems, discountPercentage, taxPercentage]);

  const addLine = () => {
    setLineItems([...lineItems, { itemName: '', description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeLine = (idx: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, key: keyof InvoiceLineItemInput, val: any) => {
    setLineItems(
      lineItems.map((item, i) => {
        if (i === idx) {
          return { ...item, [key]: val };
        }
        return item;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!accountId || !uuidRegex.test(accountId)) {
      toast.error('Please select a valid Client Account');
      return;
    }
    if (lineItems.some((item) => !item.itemName.trim() || item.quantity < 1 || item.unitPrice < 0)) {
      toast.error('Please verify line items are properly filled');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateInvoiceInput = {
        accountId,
        invoiceNumber: invoiceNumber.trim() || undefined,
        issueDate: new Date(issueDate).toISOString(),
        dueDate: new Date(dueDate || issueDate).toISOString(),
        currency,
        discountPercentage: parseFloat(discountPercentage) || 0,
        taxPercentage: parseFloat(taxPercentage) || 0,
        memo: memo.trim() || undefined,
        lineItems,
      };

      await invoicesApi.create(payload);
      onCreated();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Invoice creation failed';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl glass-card bg-background border border-border/30 rounded-2xl shadow-2xl z-10 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/20 shrink-0">
          <h3 className="text-sm font-black text-foreground">Create New Invoice Draft</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 rounded-lg">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable Form body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Client Account *</label>
              <select
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer"
              >
                <option value="">— Select B2B Account —</option>
                {accounts.map((ac) => (
                  <option key={ac.id} value={ac.id}>{ac.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Invoice Number</label>
              <Input
                placeholder="INV-XXXX (Optional, auto-generated if blank)"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Issue Date *</label>
              <Input type="date" required value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Due Date *</label>
              <Input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Currency</label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Discount (%)</label>
              <Input type="number" min="0" max="100" step="0.1" value={discountPercentage} onChange={(e) => setDiscountPercentage(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tax (%)</label>
              <Input type="number" min="0" max="100" step="0.1" value={taxPercentage} onChange={(e) => setTaxPercentage(e.target.value)} />
            </div>
          </div>

          {/* Line items Section */}
          <div className="mt-2 border-t border-border/10 pt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Line Items</h4>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary-light cursor-pointer"
              >
                <PlusCircle className="h-3.5 w-3.5" /> Add Item
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {lineItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start border border-border/10 p-3 rounded-xl bg-card/5">
                  <div className="flex-1 flex flex-col gap-2">
                    <Input
                      placeholder="Item Name"
                      required
                      value={item.itemName}
                      onChange={(e) => updateLine(idx, 'itemName', e.target.value)}
                    />
                    <Input
                      placeholder="Description (Optional)"
                      value={item.description}
                      onChange={(e) => updateLine(idx, 'description', e.target.value)}
                    />
                  </div>
                  <div className="w-20 shrink-0">
                    <Input
                      type="number"
                      min="1"
                      required
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateLine(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                    />
                  </div>
                  <div className="w-28 shrink-0">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      placeholder="Price"
                      value={item.unitPrice || ''}
                      onChange={(e) => updateLine(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 shrink-0 cursor-pointer mt-1"
                    >
                      <MinusCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Memo / Notes</label>
            <textarea
              placeholder="Payment instructions, bank detail, or notes..."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Calculations Summary */}
          <div className="border-t border-border/15 pt-4 flex justify-end">
            <div className="w-64 flex flex-col gap-1.5 text-xs text-muted-foreground font-semibold">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="text-foreground">{currency} {totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-black border-t border-border/10 pt-1.5 text-foreground">
                <span>Estimated Total:</span>
                <span>{currency} {totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full mt-2 gap-2" size="sm">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Save Draft Invoice
          </Button>
        </form>
      </div>
    </div>
  );
}
