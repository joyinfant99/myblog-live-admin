'use client';

import { useEffect } from 'react';

/** Registers the service worker (production only, so local development is never cached). */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => { /* installing as an app still works without it */ });
  }, []);
  return null;
}
