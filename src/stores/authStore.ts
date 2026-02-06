import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { auth } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, inviteCode: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,
      
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await auth.login({ email, password });
          set({
            user: response.user,
            token: response.access_token,
            isLoading: false,
          });
        } catch (e) {
          set({
            error: e instanceof Error ? e.message : 'Login failed',
            isLoading: false,
          });
          throw e;
        }
      },
      
      register: async (email, password, displayName, inviteCode) => {
        set({ isLoading: true, error: null });
        try {
          const response = await auth.register({
            email,
            password,
            display_name: displayName,
            invite_code: inviteCode,
          });
          set({
            user: response.user,
            token: response.access_token,
            isLoading: false,
          });
        } catch (e) {
          set({
            error: e instanceof Error ? e.message : 'Registration failed',
            isLoading: false,
          });
          throw e;
        }
      },
      
      logout: () => {
        auth.logout();
        set({ user: null, token: null });
      },
      
      checkAuth: async () => {
        const token = get().token;
        if (!token) {
          set({ user: null });
          return;
        }
        
        try {
          const user = await auth.me();
          set({ user });
        } catch {
          // Token invalid, clear auth
          auth.logout();
          set({ user: null, token: null });
        }
      },
      
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
