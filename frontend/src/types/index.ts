export type UserRole = 'ADMIN' | 'MEMBER';

export type AccountType = 'BANK' | 'CASH' | 'WALLET' | 'CREDIT_CARD';

export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface UserResponse {
  id: string;
  household_id: string;
  name: string;
  phone_number: string;
  role: UserRole;
  created_at: string;
}

export interface HouseholdResponse {
  id: string;
  name: string;
  created_at: string;
}

export interface HouseholdUpdate {
  name: string;
}

export interface Token {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

export interface AccountResponse {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  current_balance: number;
  created_at: string;
}

export interface AccountCreate {
  name: string;
  type?: AccountType;
  initial_balance?: number;
}

export interface AccountUpdate {
  name?: string;
  type?: AccountType;
}

export interface PersonalBalanceResponse {
  user_id: string;
  total_balance: number;
  accounts: AccountResponse[];
}

export interface HouseholdMemberBalance {
  user_id: string;
  user_name: string;
  total_balance: number;
  accounts_count: number;
}

export interface HouseholdBalanceResponse {
  household_id: string;
  total_household_balance: number;
  members: HouseholdMemberBalance[];
}

export interface TransactionResponse {
  id: string;
  account_id: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string | null;
  date: string;
  raw_sms: string | null;
  created_at: string;
}

export interface TransactionCreate {
  account_id: string;
  amount: number;
  type: TransactionType;
  category: string;
  description?: string | null;
  date?: string | null;
  raw_sms?: string | null;
}

export interface TransactionUpdate {
  amount?: number | null;
  type?: TransactionType | null;
  category?: string | null;
  description?: string | null;
  date?: string | null;
}

export interface SMSParseResult {
  amount: number | null;
  type: TransactionType | null;
  merchant: string | null;
  detected_balance: number | null;
  suggested_category: string;
  bank_name: string | null;
  confidence: ConfidenceLevel;
}

export interface CategoryBreakdownItem {
  category: string;
  total_amount: number;
  percentage: number;
}

export interface CategoryBreakdownResponse {
  total_expenses: number;
  categories: CategoryBreakdownItem[];
}

export interface MonthlySummaryResponse {
  total_income: number;
  total_expense: number;
  net_savings: number;
  savings_rate_percentage: number;
}

export interface MemberCreateRequest {
  name: string;
  phone_number: string;
  password: string;
  initial_account_name?: string;
}
