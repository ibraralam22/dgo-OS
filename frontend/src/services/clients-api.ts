import { apiClient } from './api-client';

export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'ONBOARDING';
export type ContactRole = 'DECISION_MAKER' | 'INFLUENCER' | 'GATEKEEPER' | 'USER';
export type ContactStatus = 'ACTIVE' | 'INACTIVE';

export interface AccountListItem {
  id: string;
  organizationId: string;
  parentAccountId?: string | null;
  name: string;
  domain: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: string | number;
  billingStreet?: string;
  billingCity?: string;
  billingCountry: string;
  status: AccountStatus;
  createdAt: string;
  parentAccount?: { id: string; name: string } | null;
  _count?: { contacts: number };
}

export interface ContactListItem {
  id: string;
  organizationId: string;
  accountId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  roleScope: ContactRole;
  isPrimaryBilling: boolean;
  status: ContactStatus;
  createdAt: string;
  account?: { id: string; name: string };
}

export interface ListAccountsResponse {
  data: AccountListItem[];
  total: number;
}

export interface ListContactsResponse {
  data: ContactListItem[];
  total: number;
}

export interface AccountInput {
  parentAccountId?: string;
  name: string;
  domain: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  billingStreet?: string;
  billingCity?: string;
  billingCountry: string;
  status?: AccountStatus;
}

export interface ContactInput {
  accountId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  roleScope?: ContactRole;
  isPrimaryBilling?: boolean;
  status?: ContactStatus;
}

export interface HierarchyNode {
  id: string;
  name: string;
  domain: string;
  parentAccountId?: string | null;
  subsidiaries: HierarchyNode[];
}

export interface AccountHierarchyResponse {
  success: boolean;
  hierarchy: HierarchyNode;
}

export const clientsApi = {
  // Accounts API
  listAccounts: async (params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
  }): Promise<ListAccountsResponse> => {
    const res = await apiClient.get<ListAccountsResponse>('/accounts', { params });
    return res.data;
  },

  getAccount: async (id: string): Promise<AccountListItem & { contacts: ContactListItem[] }> => {
    const res = await apiClient.get<AccountListItem & { contacts: ContactListItem[] }>(`/accounts/${id}`);
    return res.data;
  },

  getAccountHierarchy: async (id: string): Promise<AccountHierarchyResponse> => {
    const res = await apiClient.get<AccountHierarchyResponse>(`/accounts/${id}/hierarchy`);
    return res.data;
  },

  createAccount: async (data: AccountInput): Promise<AccountListItem> => {
    const res = await apiClient.post<AccountListItem>('/accounts', data);
    return res.data;
  },

  updateAccount: async (id: string, data: Partial<AccountInput>): Promise<AccountListItem> => {
    const res = await apiClient.put<AccountListItem>(`/accounts/${id}`, data);
    return res.data;
  },

  deleteAccount: async (id: string): Promise<AccountListItem> => {
    const res = await apiClient.delete<AccountListItem>(`/accounts/${id}`);
    return res.data;
  },

  // Contacts API
  listContacts: async (params: {
    accountId?: string;
    page: number;
    limit: number;
    search?: string;
  }): Promise<ListContactsResponse> => {
    const res = await apiClient.get<ListContactsResponse>('/contacts', { params });
    return res.data;
  },

  getContact: async (id: string): Promise<ContactListItem> => {
    const res = await apiClient.get<ContactListItem>(`/contacts/${id}`);
    return res.data;
  },

  createContact: async (data: ContactInput): Promise<ContactListItem> => {
    const res = await apiClient.post<ContactListItem>('/contacts', data);
    return res.data;
  },

  updateContact: async (id: string, data: Partial<ContactInput>): Promise<ContactListItem> => {
    const res = await apiClient.put<ContactListItem>(`/contacts/${id}`, data);
    return res.data;
  },

  setPrimaryContact: async (id: string): Promise<ContactListItem> => {
    const res = await apiClient.put<ContactListItem>(`/contacts/${id}/primary`);
    return res.data;
  },

  deleteContact: async (id: string): Promise<ContactListItem> => {
    const res = await apiClient.delete<ContactListItem>(`/contacts/${id}`);
    return res.data;
  },
};
