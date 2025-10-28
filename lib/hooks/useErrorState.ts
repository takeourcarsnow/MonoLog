import { useState } from 'react';

export function useErrorState() {
  const [error, setError] = useState<string | null>(null);
  const clearError = () => setError(null);
  const handleError = (e: any) => setError(e?.message || 'An error occurred');
  return { error, setError, clearError, handleError };
}

export async function withErrorHandling<T>(fn: () => Promise<T>, handleError: (e: any) => void): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    handleError(e);
    return null;
  }
}