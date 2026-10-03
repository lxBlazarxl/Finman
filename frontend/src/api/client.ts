import axios from 'axios';
import type {
  Token,
  UserResponse,
  HouseholdResponse,
  HouseholdUpdate,
  MemberCreateRequest,
  AccountResponse,
  AccountCreate,
  AccountUpdate,
  PersonalBalanceResponse,
  HouseholdBalanceResponse,
  TransactionResponse,
  TransactionCreate,
  TransactionUpdate,
  SMSParseResult,
  CategoryBreakdownResponse,
  MonthlySummaryResponse,
} from '../types';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('finman_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('finman_token');
      localStorage.removeItem('finman_user');
      window.dispatchEvent(new Event('finman_auth_expired'));
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: async (phone_number: string, password: string): Promise<Token> => {
    const res = await apiClient.post<Token>('/auth/login', { phone_number, password });
    return res.data;
  },
  registerHousehold: async (payload: {
    household_name: string;
    admin_name: string;
    phone_number: string;
    password: string;
  }): Promise<Token> => {
    const res = await apiClient.post<Token>('/auth/register-household', payload);
    return res.data;
  },
  getMe: async (): Promise<UserResponse> => {
    const res = await apiClient.get<UserResponse>('/auth/me');
    return res.data;
  },
  getStatus: async (): Promise<{ initialized: boolean }> => {
    const res = await apiClient.get<{ initialized: boolean }>('/auth/status');
    return res.data;
  },
};

// Household
export const householdApi = {
  getHousehold: async (): Promise<HouseholdResponse> => {
    const res = await apiClient.get<HouseholdResponse>('/household');
    return res.data;
  },
  updateHousehold: async (payload: HouseholdUpdate): Promise<HouseholdResponse> => {
    const res = await apiClient.patch<HouseholdResponse>('/household', payload);
    return res.data;
  },
  getMembers: async (): Promise<UserResponse[]> => {
    const res = await apiClient.get<UserResponse[]>('/household/members');
    return res.data;
  },
  createMember: async (payload: MemberCreateRequest): Promise<UserResponse> => {
    const res = await apiClient.post<UserResponse>('/household/members', payload);
    return res.data;
  },
  deleteMember: async (userId: string): Promise<{ detail: string }> => {
    const res = await apiClient.delete<{ detail: string }>(`/household/members/${userId}`);
    return res.data;
  },
};

// Accounts
export const accountsApi = {
  getAccounts: async (): Promise<AccountResponse[]> => {
    const res = await apiClient.get<AccountResponse[]>('/accounts');
    return res.data;
  },
  getAccount: async (id: string): Promise<AccountResponse> => {
    const res = await apiClient.get<AccountResponse>(`/accounts/${id}`);
    return res.data;
  },
  createAccount: async (payload: AccountCreate): Promise<AccountResponse> => {
    const res = await apiClient.post<AccountResponse>('/accounts', payload);
    return res.data;
  },
  updateAccount: async (id: string, payload: AccountUpdate): Promise<AccountResponse> => {
    const res = await apiClient.patch<AccountResponse>(`/accounts/${id}`, payload);
    return res.data;
  },
  deleteAccount: async (id: string): Promise<{ detail: string }> => {
    const res = await apiClient.delete<{ detail: string }>(`/accounts/${id}`);
    return res.data;
  },
};

// Balances
export const balancesApi = {
  getPersonalBalance: async (): Promise<PersonalBalanceResponse> => {
    const res = await apiClient.get<PersonalBalanceResponse>('/balances/me');
    return res.data;
  },
  getHouseholdBalance: async (): Promise<HouseholdBalanceResponse> => {
    const res = await apiClient.get<HouseholdBalanceResponse>('/balances/household');
    return res.data;
  },
};

// Transactions
export const transactionsApi = {
  getTransactions: async (params?: {
    start_date?: string;
    end_date?: string;
    category?: string;
    account_id?: string;
    type?: string;
    target_user_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<TransactionResponse[]> => {
    const res = await apiClient.get<TransactionResponse[]>('/transactions', { params });
    return res.data;
  },
  getTransaction: async (id: string): Promise<TransactionResponse> => {
    const res = await apiClient.get<TransactionResponse>(`/transactions/${id}`);
    return res.data;
  },
  createTransaction: async (payload: TransactionCreate): Promise<TransactionResponse> => {
    const res = await apiClient.post<TransactionResponse>('/transactions', payload);
    return res.data;
  },
  updateTransaction: async (id: string, payload: TransactionUpdate): Promise<TransactionResponse> => {
    const res = await apiClient.patch<TransactionResponse>(`/transactions/${id}`, payload);
    return res.data;
  },
  deleteTransaction: async (id: string): Promise<{ detail: string }> => {
    const res = await apiClient.delete<{ detail: string }>(`/transactions/${id}`);
    return res.data;
  },
  parseSMS: async (sms_text: string): Promise<SMSParseResult> => {
    const res = await apiClient.post<SMSParseResult>('/transactions/parse-sms', { sms_text });
    return res.data;
  },
  getCategories: async (): Promise<string[]> => {
    const res = await apiClient.get<string[]>('/transactions/categories');
    return res.data;
  },
};

// Analytics
export const analyticsApi = {
  getCategoryBreakdown: async (params?: {
    year?: number;
    month?: number;
    scope?: 'personal' | 'household';
  }): Promise<CategoryBreakdownResponse> => {
    const res = await apiClient.get<CategoryBreakdownResponse>('/analytics/category-breakdown', { params });
    return res.data;
  },
  getMonthlySummary: async (params?: {
    year?: number;
    month?: number;
    scope?: 'personal' | 'household';
  }): Promise<MonthlySummaryResponse> => {
    const res = await apiClient.get<MonthlySummaryResponse>('/analytics/monthly-summary', { params });
    return res.data;
  },
};
