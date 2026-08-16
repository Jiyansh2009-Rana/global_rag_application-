import { useContext } from 'react';
import { AuthContext } from '@/app/auth-provider';
import { ThemeContext } from '@/app/theme-provider';

export const useAuth = () => useContext(AuthContext);
export const useTheme = () => useContext(ThemeContext);
