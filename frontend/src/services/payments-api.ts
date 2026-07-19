import { apiClient } from './api-client';

export type PaymentMethod = 'BANK_TRANSFER' | 'CREDIT_CARD' | 'CHECK' | 'CASH' | 'STRIPE' | 'OTHER';
export type PaymentStatus = 'SUCCESS' | 'FAILED' | 'VOID' | 'REFUNDED';

export interface Payment {
  id: string;
  organizationId: string;
  invoiceId: string;
  amount: string | number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  status: PaymentStatus;
  notes?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  invoice: {
    id: string;
    invoiceNumber: string;
    total: string | number;
    balanceDue: string | number;
    amountPaid: string | number;
    status: string;
    account: { id: string; name: string; domain: string };
  };
  createdBy: { id: string; firstName: string; lastName: string; email: string };
}

export interface ListPaymentsResponse {
  data: Payment[];
  total: number;
}

export interface CreatePaymentInput {
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
}

export const paymentsApi = {
  list: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    invoiceId?: string;
    paymentMethod?: string;
    search?: string;
  }): Promise<ListPaymentsResponse> => {
    const res = await apiClient.get<ListPaymentsResponse>('/payments', { params });
    return res.data;
  },

  get: async (id: string): Promise<Payment> => {
    const res = await apiClient.get<Payment>(`/payments/${id}`);
    return res.data;
  },

  create: async (data: CreatePaymentInput): Promise<Payment> => {
    const res = await apiClient.post<Payment>('/payments', data);
    return res.data;
  },

  void: async (id: string): Promise<Payment> => {
    const res = await apiClient.patch<Payment>(`/payments/${id}/void`);
    return res.data;
  },
};
