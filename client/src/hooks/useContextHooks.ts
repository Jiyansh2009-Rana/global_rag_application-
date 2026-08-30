import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '@/app/auth-provider';
import { ThemeContext } from '@/app/theme-provider';

export const useAuth = () => useContext(AuthContext);
export const useTheme = () => useContext(ThemeContext);

/**
 * Returns true when the viewport width is strictly less than `breakpoint` (default 768).
 * Updates reactively on window resize.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false,
  );
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);
  return mobile;
}
