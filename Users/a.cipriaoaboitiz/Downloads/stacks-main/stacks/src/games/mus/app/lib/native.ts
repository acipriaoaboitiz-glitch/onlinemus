/** En STACKS no hay envoltorio nativo todavía: estas funciones son inertes. */
export const isNative = (): boolean => false;
export const platform = (): string => 'web';
export async function nativeVibrate(_ms: number): Promise<void> { /* sin plugin */ }
