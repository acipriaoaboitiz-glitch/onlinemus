import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Backend } from '../game/backend.ts';

interface BackendState {
  backend: Backend | null;
  loading: boolean;
}

const Ctx = createContext<BackendState>({ backend: null, loading: false });

/** `load` devuelve el backend (Supabase en producción, uno en memoria en las pruebas) o null si no hay. */
export function BackendProvider({ load, children }: { load: () => Promise<Backend | null>; children: ReactNode }) {
  const [state, setState] = useState<BackendState>({ backend: null, loading: true });
  useEffect(() => {
    let alive = true;
    load()
      .then((backend) => { if (alive) setState({ backend, loading: false }); })
      .catch(() => { if (alive) setState({ backend: null, loading: false }); });
    return () => { alive = false; };
  }, [load]);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useBackend = (): BackendState => useContext(Ctx);
