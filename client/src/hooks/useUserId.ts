import { useState } from 'react';

/**
 * Simple hook that generates/persists a userId in sessionStorage.
 * In production, this would come from auth.
 */
export function useUserId(prefix: string = 'user'): string {
  const [userId] = useState<string>(() => {
    const key = `live_control_userId_${prefix}`;
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = `${prefix}_${Math.random().toString(36).substring(2, 8)}`;
    sessionStorage.setItem(key, id);
    return id;
  });
  return userId;
}
