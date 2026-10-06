import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { sessionExpired } from '../features/auth/hooks/useAuth.js';

// Redirect once when a protected query reports 401 (expired/invalid token).
// Public queries must never use this — their 401s stay inline.
export function useProtected401(error) {
  const location = useLocation();
  useEffect(() => {
    if (error?.status === 401) {
      sessionExpired(location.pathname + location.search);
    }
  }, [error, location.pathname, location.search]);
}
