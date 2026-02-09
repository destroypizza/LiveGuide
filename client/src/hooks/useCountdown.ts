import { useState, useEffect } from 'react';

/**
 * Returns remaining seconds until `endsAt` ISO string.
 * Updates every 100ms for smooth display.
 */
export function useCountdown(endsAt: string | null): number {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!endsAt) {
      setRemaining(0);
      return;
    }

    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      setRemaining(Math.max(0, Math.ceil(diff / 1000)));
    };

    update();
    const interval = setInterval(update, 100);

    return () => clearInterval(interval);
  }, [endsAt]);

  return remaining;
}
