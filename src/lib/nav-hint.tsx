'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/** Lets a page tell the sidebar which section it belongs to (an inspiration lives under /notes/[id] but belongs to Inspiration). */
const Ctx = createContext<{ hint: string | null; setHint: (h: string | null) => void }>({ hint: null, setHint: () => {} });

export function NavHintProvider({ children }: { children: ReactNode }) {
  const [hint, setHint] = useState<string | null>(null);
  return <Ctx.Provider value={{ hint, setHint }}>{children}</Ctx.Provider>;
}
export const useNavHint = () => useContext(Ctx).hint;
export function useSetNavHint(h: string | null) {
  const { setHint } = useContext(Ctx);
  useEffect(() => { setHint(h); return () => setHint(null); }, [h, setHint]);
}
