import { create } from 'zustand';
import type { UserResponse, HouseholdResponse } from '../types';

interface AuthState {
  token: string | null;
  user: UserResponse | null;
  household: HouseholdResponse | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  setAuth: (token: string, user: UserResponse) => void;
  setUser: (user: UserResponse) => void;
  setHousehold: (household: HouseholdResponse) => void;
  logout: () => void;
}

const getStoredToken = () => localStorage.getItem('finman_token');
const getStoredUser = (): UserResponse | null => {
  const item = localStorage.getItem('finman_user');
  if (!item) return null;
  try {
    return JSON.parse(item);
  } catch {
    return null;
  }
};

const initialToken = getStoredToken();
const initialUser = getStoredUser();

export const useAuthStore = create<AuthState>((set) => ({
  token: initialToken,
  user: initialUser,
  household: null,
  isAuthenticated: !!initialToken && !!initialUser,
  isAdmin: initialUser?.role === 'ADMIN',

  setAuth: (token, user) => {
    localStorage.setItem('finman_token', token);
    localStorage.setItem('finman_user', JSON.stringify(user));
    set({
      token,
      user,
      isAuthenticated: true,
      isAdmin: user.role === 'ADMIN',
    });
  },

  setUser: (user) => {
    localStorage.setItem('finman_user', JSON.stringify(user));
    set({
      user,
      isAdmin: user.role === 'ADMIN',
    });
  },

  setHousehold: (household) => {
    set({ household });
  },

  logout: () => {
    localStorage.removeItem('finman_token');
    localStorage.removeItem('finman_user');
    set({
      token: null,
      user: null,
      household: null,
      isAuthenticated: false,
      isAdmin: false,
    });
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('finman_auth_expired', () => {
    useAuthStore.getState().logout();
  });
}
