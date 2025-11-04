import { useEffect, useState } from 'react';

/**
 * Returns a debounced version of a value. Useful for delaying API calls
 * until the user stops typing.
 */
export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
