import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { quotationsApi, Quotation, QuoteLineItemInput } from '@services/quotations-api';
import { toast } from '@utils/toast';
import { Loader2, X, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';

interface QuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunityId: string;
  quotation?: Quotation;
}

export default function QuotationModal({ isOpen, onClose, opportunityId, quotation }: QuotationModalProps) {
  const isEdit = !!quotation;
  const queryClient = useQueryClient();

  // Form states
  const [expiresAt, setExpiresAt] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('0');
  const [taxPercentage, setTaxPercentage] = useState('0');
  const [lineItems, setLineItems] = useState<QuoteLineItemInput[]>([
    { itemName: '', description: '', quantity: 1, unitPrice: 0 },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (isEdit && quotation) {
        const parsedDate = quotation.expiresAt ? quotation.expiresAt.split('T')[0] : '';
        setExpiresAt(parsedDate);
        setDiscountPercentage(String(quotation.discountPercentage));
        setTaxPercentage(String(quotation.taxPercentage));
        setLineItems(
          quotation.lineItems.map((item) => ({
            itemName: item.itemName,
            description: item.description || '',
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
          }))
        );
      } else {
        // Set default expiration to 30 days in future
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 30);
        setExpiresAt(defaultDate.toISOString().split('T')[0]);
        setDiscountPercentage('0');
        setTaxPercentage('0');
        setLineItems([{ itemName: '', description: '', quantity: 1, unitPrice: 0 }]);
      }
      setErrors({});
    }
  }, [isOpen, isEdit, quotation]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => quotationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations-list', opportunityId] });
      queryClient.invalidateQueries({ queryKey: ['opportunity-detail', opportunityId] });
      toast.success('Quote version created successfully');
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to create quotation';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: any }) => quotationsApi.update(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations-list', opportunityId] });
      queryClient.invalidateQueries({ queryKey: ['quotation-detail', quotation?.id] });
      queryClient.invalidateQueries({ queryKey: ['opportunity-detail', opportunityId] });
      toast.success('Quote details updated successfully');
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to update quotation';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  // Calculate live totals for rendering in UI
  const subtotal = lineItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  const discountVal = Number(discountPercentage) || 0;
  const taxVal = Number(taxPercentage) || 0;

  const discountAmount = subtotal * (discountVal / 100);
  const totalAfterDiscount = subtotal - discountAmount;
  const taxAmount = totalAfterDiscount * (taxVal / 100);
  const grandTotal = totalAfterDiscount + taxAmount;

  // Handlers for dynamic line items array
  const handleLineChange = (index: number, field: keyof QuoteLineItemInput, value: any) => {
    const updated = [...lineItems];
    if (field === 'quantity') {
      updated[index].quantity = Math.max(1, parseInt(value, 10) || 1);
    } else if (field === 'unitPrice') {
      updated[index].unitPrice = Math.max(0, parseFloat(value) || 0);
    } else {
      (updated[index] as any)[field] = value;
    }
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { itemName: '', description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) {
      toast.error('At least one line item is required');
      return;
    }
    setLineItems(lineItems.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    const newErrors: Record<string, string> = {};
    if (!expiresAt) newErrors.expiresAt = 'Expiration date is required';
    if (new Date(expiresAt) <= new Date()) {
      newErrors.expiresAt = 'Expiration date must be a future date';
    }

    const discountNum = Number(discountPercentage);
    if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
      newErrors.discountPercentage = 'Discount must be between 0 and 100';
    }

    const taxNum = Number(taxPercentage);
    if (isNaN(taxNum) || taxNum < 0 || taxNum > 100) {
      newErrors.taxPercentage = 'Tax must be between 0 and 100';
    }

    // Line item validation
    lineItems.forEach((item, idx) => {
      if (!item.itemName.trim()) {
        newErrors[`itemName_${idx}`] = 'Item name is required';
      }
      if (item.quantity <= 0) {
        newErrors[`quantity_${idx}`] = 'Quantity must be greater than 0';
      }
      if (item.unitPrice < 0) {
        newErrors[`unitPrice_${idx}`] = 'Unit price cannot be negative';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fix the validation errors in the form');
      return;
    }

    const payload = {
      opportunityId,
      expiresAt: new Date(expiresAt).toISOString(),
      discountPercentage: discountNum,
      taxPercentage: taxNum,
      lineItems,
    };

    if (isEdit && quotation) {
      updateMutation.mutate({ id: quotation.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm cursor-pointer" 
        onClick={onClose} 
      />

      {/* Container */}
      <div className="relative flex flex-col w-full max-w-4xl rounded-2xl border border-border/20 bg-background/95 shadow-2xl overflow-hidden glass-card animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/20 flex items-center justify-between">
          <h2 className="text-lg font-black tracking-tight text-foreground">
            {isEdit ? `Edit Quotation Details (v${quotation.version})` : 'Build New Quotation Proposal'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving} className="h-8 w-8 rounded-lg cursor-pointer">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6 max-h-[70vh]">
          
          {/* Metadata Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-border/10 pb-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="quote-expires-at" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Expiration Date *
              </label>
              <Input
                id="quote-expires-at"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className={errors.expiresAt ? 'border-red-500' : ''}
              />
              {errors.expiresAt && <span className="text-[10px] text-red-400 pl-0.5">{errors.expiresAt}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="quote-discount" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Discount Percentage (%)
              </label>
              <Input
                id="quote-discount"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(e.target.value)}
                className={errors.discountPercentage ? 'border-red-500' : ''}
              />
              {errors.discountPercentage && <span className="text-[10px] text-red-400 pl-0.5">{errors.discountPercentage}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="quote-tax" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                Tax Percentage (%)
              </label>
              <Input
                id="quote-tax"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxPercentage}
                onChange={(e) => setTaxPercentage(e.target.value)}
                className={errors.taxPercentage ? 'border-red-500' : ''}
              />
              {errors.taxPercentage && <span className="text-[10px] text-red-400 pl-0.5">{errors.taxPercentage}</span>}
            </div>
          </div>

          {/* Dynamic Line Items Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border/10 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Proposal Line Items</h3>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="h-7 gap-1 font-bold">
                <Plus className="h-3.5 w-3.5" />
                Add Item Line
              </Button>
            </div>

            <div className="flex flex-col gap-4">
              {lineItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-muted/5 border border-border/10 p-4 rounded-xl items-start relative group">
                  
                  {/* Name field */}
                  <div className="md:col-span-4 flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Item Name *</label>
                    <Input
                      type="text"
                      placeholder="e.g. Senior DevOps Specialist"
                      value={item.itemName}
                      onChange={(e) => handleLineChange(idx, 'itemName', e.target.value)}
                      className={errors[`itemName_${idx}`] ? 'border-red-500' : ''}
                    />
                    {errors[`itemName_${idx}`] && <span className="text-[9px] text-red-400">{errors[`itemName_${idx}`]}</span>}
                  </div>

                  {/* Description field */}
                  <div className="md:col-span-4 flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description (Optional)</label>
                    <Input
                      type="text"
                      placeholder="e.g. 160 hours/month"
                      value={item.description}
                      onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                    />
                  </div>

                  {/* Quantity */}
                  <div className="md:col-span-1.5 flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Qty *</label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                      className={errors[`quantity_${idx}`] ? 'border-red-500' : ''}
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="md:col-span-1.5 flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Price ($) *</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => handleLineChange(idx, 'unitPrice', e.target.value)}
                      className={errors[`unitPrice_${idx}`] ? 'border-red-500' : ''}
                    />
                  </div>

                  {/* Action button */}
                  <div className="md:col-span-1 flex items-center justify-end h-full pt-5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(idx)}
                      className="text-muted-foreground hover:text-red-400 rounded-lg cursor-pointer h-9 w-9"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Discount Trigger Alert Notice */}
          {discountVal > 20 && (
            <div className="flex items-center gap-3 p-4 rounded-xl border bg-amber-500/10 border-amber-500/20 text-amber-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="text-xs font-semibold leading-relaxed">
                Notice: Setting a discount greater than 20% flags this quote as requiring VP or Manager approval. It will remain locked in a draft state and cannot be marked as APPROVED until approved.
              </span>
            </div>
          )}

          {/* Summary Panel */}
          <div className="border-t border-border/10 pt-4 flex flex-col items-end gap-1 text-xs text-muted-foreground">
            <div className="flex justify-between w-[250px]">
              <span>Subtotal:</span>
              <span className="font-semibold text-foreground">${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {discountVal > 0 && (
              <div className="flex justify-between w-[250px] text-red-400">
                <span>Discount ({discountVal}%):</span>
                <span>-${discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {taxVal > 0 && (
              <div className="flex justify-between w-[250px]">
                <span>Tax ({taxVal}%):</span>
                <span className="font-semibold text-foreground">+${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between w-[250px] text-sm text-foreground font-black border-t border-border/10 pt-2 mt-1">
              <span>Grand Total:</span>
              <span className="text-primary">${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border/20 flex items-center justify-end gap-3 bg-accent/10">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving} size="sm">
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSaving} size="sm" className="gap-2">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Save Updates' : 'Generate Quotation'}
          </Button>
        </div>
      </div>
    </div>
  );
}
