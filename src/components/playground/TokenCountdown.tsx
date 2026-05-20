'use client';

import { useEffect, useState } from 'react';

/**
 * Isolated countdown so a 1-second timer doesn't force the whole
 * playground tree to re-render. Returns null when expired.
 */
export default function TokenCountdown({
  expiresAt,
  onExpired,
}: {
  expiresAt: number | null;
  onExpired?: () => void;
}) {
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) { setSeconds(null); return; }
    const tick = () => {
      const s = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setSeconds(s);
      if (s === 0) onExpired?.();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpired]);

  if (seconds === null) return null;
  return <span>{seconds}s</span>;
}
