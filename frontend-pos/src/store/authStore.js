import { create } from 'zustand';

// حفظ وجلب البيانات من localStorage
const loadFromStorage = () => {
  try {
    const stored = localStorage.getItem('auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Also save token separately for backward compatibility
      if (parsed.token) {
        localStorage.setItem('token', parsed.token);
      }
      return parsed;
    }
    return { user: null, token: null, refreshToken: null };
  } catch {
    return { user: null, token: null, refreshToken: null };
  }
};

const saveToStorage = (state) => {
  try {
    localStorage.setItem('auth', JSON.stringify({
      user: state.user,
      token: state.token,
      refreshToken: state.refreshToken,
    }));
    // Also save token separately for backward compatibility
    if (state.token) {
      localStorage.setItem('token', state.token);
    } else {
      localStorage.removeItem('token');
    }
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

export const useAuthStore = create((set) => {
  // تحميل البيانات من localStorage عند البداية
  const initialState = loadFromStorage();
  
  return {
    ...initialState,
    
    setAuth: (user, token, refreshToken) => {
      const newState = { user, token, refreshToken };
      set(newState);
      saveToStorage({ user, token, refreshToken });
    },
    
    logout: () => {
      const newState = { user: null, token: null, refreshToken: null };
      set(newState);
      localStorage.removeItem('auth');
      localStorage.removeItem('token');
    },
    
    updateUser: (userData) => {
      set((state) => {
        const newUser = { ...state.user, ...userData };
        saveToStorage({ ...state, user: newUser });
        return { user: newUser };
      });
    },
  };
});
