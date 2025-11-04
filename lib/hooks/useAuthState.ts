import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export function useAuthState() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await api.getCurrentUser();
        setCurrentUser(user);
      } catch (e) {
        // not authenticated
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  const refreshAuth = async () => {
    try {
      const user = await api.getCurrentUser();
      setCurrentUser(user);
    } catch (e) {
      setCurrentUser(null);
    }
  };

  return { currentUser, authLoading, refreshAuth };
}