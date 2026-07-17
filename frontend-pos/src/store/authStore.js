import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      
      setAuth: (user, token, refreshToken) => 
        set({ user, token, refreshToken }),
      
      logout: () => 
        set({ user: null, token: null, refreshToken: null }),
      
      updateUser: (userData) =>
        set((state) => ({ user: { ...state.user, ...userData } })),
    }),
    {
      name: 'auth-storage',
    }
  )
);
