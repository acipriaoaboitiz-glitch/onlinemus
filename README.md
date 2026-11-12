# Mus online

Mus 2 contra 2 para jugar con amigos en tiempo real: **web en navegador (móvil y ordenador), PWA instalable y app nativa Android/iOS** desde un único código.

- Baraja española de 40 (cartas de la primera baraja de **Fournier, 1878**, dominio público; ver `apps/web/public/cards/ATTRIBUTION.txt`) con **8 reyes** (el 3 es rey y el 2 es as/«cerdo»), Mus y descarte, Grande · Chica · Pares · Juego/Punto, envites, órdago y **deje**.
- **Contador automático** con piedras y amarracos (5 piedras), aviso de «dentro», juegos y vacas. Partidas a 40 o 30 (configurable).
- **Salas privadas** con código de 4 a 6 dígitos, parejas enfrentadas, bots para rellenar asientos, revancha y reconexión.
- **Señas secretas** que solo ve tu pareja (canal privado por pareja protegido con RLS).
- Móvil primero: botones grandes, cartas que se marcan deslizando hacia arriba, modo oscuro, zonas seguras, vibración y sonidos discretos. En escritorio: mesa ancha, registro de la mano y atajos de teclado.

## Probarlo en 1 minuto (sin servidor)

```bash
npm install
npm run dev          # abre http://localhost:5173  →  «Jugar contra bots»
```

Contra bots no hace falta Supabase ni cuenta. Para jugar online con amigos sigue con el siguiente apartado.

## Estructura

```
packages/engine/         Motor de reglas puro y determinista (TypeScript, sin dependencias)
  src/machine.ts           máquina de estados: act(), legalActions(), publicView()
  src/bot.ts               bots heurísticos
  src/server.ts            núcleo del servidor (arranque, validación, bots, turnos que caducan)
  test/                    35 tests: reglas, ejemplos oficiales de Pagat, bots, servidor
apps/web/                React + Vite + CSS propio (sin librerías de UI)
  src/game/                fuentes de partida: local (bots) y remota (Supabase) + backend en memoria para tests
  src/components/ pages/   mesa, mano, marcador, señas, lobby…
  capacitor.config.ts      envoltorio nativo Android/iOS
  public/sw.js             service worker (PWA)
supabase/
  migrations/              0001 tablas+RLS+Realtime · 0002 lobby (asientos, bots, ajustes, revancha)
  functions/game-action/   Edge Function: autoridad del servidor
scripts/sync-engine.mjs    copia el motor a la Edge Function
```

## Online con Supabase

El servidor es la autoridad: el cliente solo envía intenciones; el motor decide, y cada jugador solo recibe **su** mano (RLS). Las acciones se confirman en una transacción con control de versión.

```
móvil → Edge Function game-action → motor (act) → commit_game_update (atómico)
      ← Realtime: game_public (todos) · game_hands (solo su dueño) · canal privado de la pareja (señas)
```

### En local

```bash
# Requisitos: Docker y Node.js
npx supabase start                   # aplica supabase/migrations y activa el acceso anónimo (config.toml)
npm run sync:engine                  # copia el motor a la Edge Function
npx supabase functions serve game-action
cp apps/web/.env.example apps/web/.env.local   # pega la URL y la anon key que imprime `supabase start`
npm run dev
```

### En la nube

1. Crea un proyecto en Supabase y enlázalo: `npx supabase link --project-ref <ref>`.
2. `npx supabase db push` (aplica las dos migraciones).
3. En el panel: **Authentication → Providers → Anonymous sign-ins: activado**.
4. `npm run deploy:functions`.
5. Rellena `apps/web/.env.local` con la URL y la anon key del proyecto (y `VITE_PUBLIC_URL` con la dirección de tu web).

> Si la migración 0001 falla en `realtime.messages` es que el servicio Realtime aún no había creado la tabla: reintenta `npx supabase db reset` cuando `npx supabase start` haya terminado.

## Publicar la web

```bash
npm run build         # genera apps/web/dist (rutas relativas: vale en un dominio o en una subcarpeta)
```

Sube `apps/web/dist` a Netlify, Vercel, Cloudflare Pages, GitHub Pages… Es estática. Las variables `VITE_*` se incorporan **al compilar**.

## App instalable (PWA)

Al abrir la web en Chrome/Edge/Android aparece «Instalar la app» en el inicio; en iPhone/iPad, Safari → Compartir → *Añadir a pantalla de inicio*. Funciona a pantalla completa y abre sin red (para jugar online hace falta conexión).

## App nativa Android / iOS (Capacitor)

Necesitas Android Studio (Android) o un Mac con Xcode (iOS).

```bash
cd apps/web
npx cap add android              # y/o: npx cap add ios      (solo la primera vez)
npm run cap:icons                # icono y splash a partir de apps/web/assets
npm run cap:android              # compila la web, sincroniza y abre Android Studio
npm run cap:ios                  # ídem con Xcode
```

Cada vez que cambies la web: `npm run cap:sync`. Para publicar en Google Play / App Store hacen falta tus cuentas de desarrollador y firmar la app desde Android Studio / Xcode. Dentro de la app nativa se usan vibración nativa, barra de estado oscura, orientación vertical en móviles y el botón «atrás» de Android.

## Pruebas

```bash
npm test             # motor (35) + capa de juego y cliente online (11)
npm run typecheck
```

## Reglas implementadas

Contrastadas con Pagat y con el reglamento vasco.

- Mano al siguiente asiento cada mano; los empates los gana quien está más cerca de la mano.
- **Mus**: si los cuatro dicen Mus, descarte por turno (1 a 4 cartas). Basta un «No hay mus» para cortar.
- **Pares y Juego** los declara cada uno con sinceridad y solo juegan quienes los tienen; si solo los tiene una pareja no hay apuesta. Si nadie tiene juego se juega al **Punto**.
- **Apuestas**: paso · envido (mín. 2) · subida (mín. 2) · órdago · quiero · no quiero. Responde la pareja contraria: si el primero no quiere, su compañero aún puede querer.
- **Deje**: un «no quiero» paga al instante lo ya aceptado (1 piedra si era el primer envite). Lo aceptado se reparte al enseñar, en orden Grande, Chica, Pares y Juego; quien llega antes al tope gana el juego.
- **Reparto**: Grande y Chica, 1 si todos pasan o lo envidado si se ve. Pares: 1 / 2 / 3 (pares, medias, duples) por cada compañero del equipo ganador. Juego: 3 por el 31, 2 por los demás. Punto: 1 extra. Con un envite rechazado en Pares/Juego/Punto gana quien envidó, sin comparar cartas.
- **Órdago aceptado**: gana el juego quien gane ese lance; lo pendiente de lances anteriores no cuenta.
- **Configurable** por sala: 30 o 40 piedras, juegos por vaca, vacas por partida, 8 o 4 reyes, señas veraces, tiempo por turno.

Simplificaciones: «¿hay pares?» y «¿hay juego?» se declaran solos (es información pública); un envite no puede superar el tope del juego (para ir a todo está el órdago); al acabar la mano se enseñan las cuatro manos.

## Qué se ha verificado y qué no

**Verificado** en el entorno de desarrollo: 46 tests (reglas, bots, servidor y cliente online con servidor en memoria); tipos del motor y comprobaciones de la app con declaraciones mínimas de React; la app compilada con esbuild y jugada en Chromium en móvil (390×844, con toques reales) y en escritorio (1280×800): partida completa contra bots y flujo completo online (crear sala → bots → empezar → jugar) sin errores.

**No verificado**: los tipos de React con las declaraciones reales, el SQL y la Edge Function contra un Supabase real, la compilación con Vite y las apps nativas en un dispositivo o emulador. La lógica online se probó con un servidor en memoria; al conectar con Supabase, comprueba especialmente que estén habilitados el acceso anónimo y Realtime.

## Capturas

Tomadas de la propia app en Chromium (móvil 390×844): `docs/screens/`.
