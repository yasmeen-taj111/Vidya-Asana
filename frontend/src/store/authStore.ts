import { create } from 'zustand';
import { User } from '../api/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
}

const savedUser = localStorage.getItem('va_user');
const initialUser: User | null = savedUser ? JSON.parse(savedUser) : null;
const savedToken = localStorage.getItem('va_token');

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  accessToken: savedToken || null,
  isAuthenticated: !!initialUser,
  setAuth: (user, token) => {
    localStorage.setItem('va_user', JSON.stringify(user));
    localStorage.setItem('va_token', token);
    set({ user, accessToken: token, isAuthenticated: true });
  },
  setUser: (user) => {
    if (user) {
      localStorage.setItem('va_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('va_user');
    }
    set({ user, isAuthenticated: !!user });
  },
  setAccessToken: (token) => {
    if (token) {
      localStorage.setItem('va_token', token);
    } else {
      localStorage.removeItem('va_token');
    }
    set({ accessToken: token });
  },
  logout: () => {
    localStorage.removeItem('va_user');
    localStorage.removeItem('va_token');
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));
