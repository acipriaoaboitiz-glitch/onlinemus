// Copia el motor a la carpeta que la Edge Function importa (copia en vez de enlace: funciona igual en Windows).
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'packages/engine/src');
const dst = join(root, 'supabase/functions/_shared/engine');

rmSync(dst, { recursive: true, force: true });
mkdirSync(dst, { recursive: true });
cpSync(src, dst, { recursive: true });
console.log(`Motor copiado a ${dst}`);
