import { apiClient } from './api-client';

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'VOID';

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  itemName: string;
  description?: string | null;
  quantity: number;
  unitPrice: string | number;
  subtotal: string | number;
}

export interface Invoice {
  id: string;
  organizationId: string;
  accountId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  discountPercentage: string | number;
  taxPercentage: string | number;
  subtotal: string | number;
  total: string | number;
  amountPaid: string | number;
  balanceDue: string | number;
  currency: string;
  memo?: string | null;
  opportunityId?: string | null;
  quotationId?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  account: { id: string; name: string; domain: string };
  createdBy: { id: string; firstName: string; lastName: string; email: string };
  lineItems: InvoiceLineItem[];
  opportunity?: { id: string; name: string } | null;
  quotation?: { id: string; version: number } | null;
}

export interface InvoiceKpis {
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueCount: number;
}

export interface ListInvoicesResponse {
  data: Invoice[];
  total: number;
}

export interface InvoiceLineItemInput {
  itemName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateInvoiceInput {
  accountId: string;
  invoiceNumber?: string;
  issueDate: string;
  dueDate: string;
  currency?: string;
  discountPercentage?: number;
  taxPercentage?: number;
  memo?: string;
  opportunityId?: string;
  quotationId?: string;
  lineItems: InvoiceLineItemInput[];
}

export interface UpdateInvoiceInput {
  accountId?: string;
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  currency?: string;
  discountPercentage?: number;
  taxPercentage?: number;
  memo?: string;
  opportunityId?: string;
  quotationId?: string;
  lineItems?: InvoiceLineItemInput[];
}

export const invoicesApi = {
  kpis: async (): Promise<InvoiceKpis> => {
    const res = await apiClient.get<InvoiceKpis>('/invoices/kpis');
    return res.data;
  },

  list: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    accountId?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<ListInvoicesResponse> => {
    const res = await apiClient.get<ListInvoicesResponse>('/invoices', { params });
    return res.data;
  },

  get: async (id: string): Promise<Invoice> => {
    const res = await apiClient.get<Invoice>(`/invoices/${id}`);
    return res.data;
  },

  create: async (data: CreateInvoiceInput): Promise<Invoice> => {
    const res = await apiClient.post<Invoice>('/invoices', data);
    return res.data;
  },

  update: async (id: string, data: UpdateInvoiceInput): Promise<Invoice> => {
    const res = await apiClient.put<Invoice>(`/invoices/${id}`, data);
    return res.data;
  },

  patchStatus: async (id: string, status: 'SENT' | 'VOID' | 'OVERDUE'): Promise<Invoice> => {
    const res = await apiClient.patch<Invoice>(`/invoices/${id}/status`, { status });
    return res.data;
  },

  recordPayment: async (id: string, amount: number): Promise<Invoice> => {
    const res = await apiClient.post<Invoice>(`/invoices/${id}/payments`, { amount });
    return res.data;
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    const res = await apiClient.delete<{ success: boolean }>(`/invoices/${id}`);
    return res.data;
  },
};
