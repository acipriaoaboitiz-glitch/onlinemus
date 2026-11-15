/** localStorage a prueba de fallos (modo privado, cuotas, SSR). */
export const store = {
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* sin almacenamiento: no pasa nada */ }
  },
};
