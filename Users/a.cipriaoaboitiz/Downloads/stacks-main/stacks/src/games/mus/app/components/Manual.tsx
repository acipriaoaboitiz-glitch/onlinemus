import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SIGNS } from '@mus/engine';
import type { Card } from '@mus/engine';
import { CardFace } from './CardFace.tsx';
import { IconChevronLeft, IconChevronRight, IconClose } from './icons.tsx';

export type ManualTab = 'basico' | 'mano' | 'lances' | 'apuestas' | 'puntos' | 'senas' | 'app';

const TABS: { id: ManualTab; label: string }[] = [
  { id: 'basico', label: 'Lo básico' },
  { id: 'mano', label: 'La mano' },
  { id: 'lances', label: 'Lances' },
  { id: 'apuestas', label: 'Apuestas' },
  { id: 'puntos', label: 'Puntos' },
  { id: 'senas', label: 'Señas' },
  { id: 'app', label: 'En la app' },
];

// ───────────────────────── Piezas de maquetación ─────────────────────────

const H = ({ children }: { children: ReactNode }) => (
  <h3 className="font-[var(--font-display)] text-[19px] font-bold leading-tight text-amber-200">{children}</h3>
);
const P = ({ children }: { children: ReactNode }) => <p className="text-[14px] leading-[1.6] text-stone-300">{children}</p>;

function Block({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="grid gap-2.5 rounded-2xl border border-white/10 bg-white/[.035] p-4">
      {title && <H>{title}</H>}
      {children}
    </section>
  );
}

function Callout({ label, children }: { label: string; children: ReactNode }) {
  return (
    <aside className="grid gap-1 rounded-2xl border border-amber-300/25 bg-gradient-to-br from-amber-300/[.12] to-transparent p-4">
      <span className="text-[10px] font-extrabold uppercase tracking-[.22em] text-amber-300">{label}</span>
      <p className="text-[14px] leading-[1.55] text-amber-50/90">{children}</p>
    </aside>
  );
}

function Steps({ items }: { items: { title: string; text: string }[] }) {
  return (
    <ol className="grid gap-3">
      {items.map((s, i) => (
        <li key={s.title} className="grid grid-cols-[34px_1fr] gap-3">
          <span className="grid size-[34px] place-items-center rounded-full border border-amber-300/40 bg-amber-300/10 font-[var(--font-display)] text-[16px] font-bold text-amber-200">{i + 1}</span>
          <div className="grid gap-0.5">
            <b className="text-[15px] text-stone-50">{s.title}</b>
            <span className="text-[13.5px] leading-[1.55] text-stone-400">{s.text}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Row({ k, children, tone = 'gold' }: { k: string; children: ReactNode; tone?: 'gold' | 'green' | 'red' }) {
  const color = tone === 'green' ? 'text-emerald-300' : tone === 'red' ? 'text-rose-300' : 'text-amber-300';
  return (
    <div className="grid grid-cols-[96px_1fr] gap-3 border-t border-white/[.07] pt-2.5 first:border-t-0 first:pt-0">
      <b className={`text-[13px] font-extrabold uppercase tracking-wide ${color}`}>{k}</b>
      <span className="text-[13.5px] leading-[1.55] text-stone-300">{children}</span>
    </div>
  );
}

function Chips({ items, active }: { items: string[]; active?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Orden de mayor a menor">
      {items.map((t, i) => (
        <span key={t} className="flex items-center gap-1.5">
          <span className={`rounded-lg border px-2.5 py-1 text-[12.5px] font-bold ${i === active ? 'border-amber-300 bg-amber-300 text-amber-950' : 'border-white/15 bg-white/5 text-stone-200'}`}>{t}</span>
          {i < items.length - 1 && <span className="text-[11px] text-stone-600" aria-hidden="true">›</span>}
        </span>
      ))}
    </div>
  );
}

type Spec = [Card['rank'], Card['suit']];
function Example({ cards, caption }: { cards: Spec[]; caption: string }) {
  return (
    <figure className="grid gap-1.5 rounded-xl border border-white/10 bg-black/25 p-2.5">
      <div className="flex justify-center gap-1.5">
        {cards.map(([rank, suit]) => (
          <div key={`${rank}${suit}`} className="aspect-[12/19] w-[min(15vw,56px)] overflow-hidden rounded-[5px] shadow-[0_3px_8px_rgba(0,0,0,.5)]">
            <CardFace card={{ id: `${rank}${suit}`, rank, suit }} eightKings={false} />
          </div>
        ))}
      </div>
      <figcaption className="text-center text-[12px] font-semibold text-stone-400">{caption}</figcaption>
    </figure>
  );
}

// ───────────────────────── Contenido de cada pestaña ─────────────────────────

function Basico({ eightKings }: { eightKings: boolean }) {
  return (<>
    <Block title="El Mus en 30 segundos">
      <P>El Mus es el gran juego de cartas de mesa y sobremesa en España. Se juega entre <b className="text-stone-50">cuatro personas, en dos parejas</b>: tu compañero se sienta enfrente de ti y jugáis por turnos en sentido contrario a las agujas del reloj.</P>
      <P>Cada jugador recibe cuatro cartas. En cada ronda se compite en varios <b className="text-stone-50">lances</b> (cartas altas, bajas, parejas, suma) y se puede apostar piedras. La pareja que llega primero al tope de piedras gana el juego.</P>
    </Block>
    <Block title="La baraja">
      <P>Baraja española de 40 cartas: oros, copas, espadas y bastos, del 1 al 7 más sota (10), caballo (11) y rey (12).</P>
      <Row k="Figuras">Sota, caballo y rey valen <b className="text-stone-50">10</b> puntos.</Row>
      <Row k="As">Vale <b className="text-stone-50">1</b> punto.</Row>
      <Row k="Del 4 al 7">Valen su número.</Row>
      <Row k={eightKings ? '8 reyes ✓' : '8 reyes'}>El <b className="text-stone-50">3 cuenta como rey</b> (10) y el <b className="text-stone-50">2 como as</b> (1, «cerdo»). Es la forma más habitual de jugar y la que trae esta app por defecto.</Row>
      <Row k={eightKings ? '4 reyes' : '4 reyes ✓'}>Solo los reyes son reyes: el 2 y el 3 valen lo que marcan.</Row>
    </Block>
    <Block title="Orden de las cartas">
      <P>De mayor a menor, para la Grande (en la Chica manda la carta más baja):</P>
      {eightKings
        ? <Chips items={['Rey · 3', 'Caballo', 'Sota', '7', '6', '5', '4', 'As · 2']} />
        : <Chips items={['Rey', 'Caballo', 'Sota', '7', '6', '5', '4', '3', '2', 'As']} />}
    </Block>
    <Block title="Cómo se gana">
      <Steps items={[
        { title: 'Piedras', text: 'Se ganan en cada lance. Cinco piedras forman un amarraco.' },
        { title: 'Juego', text: 'Se gana al llegar a 40 piedras (o 30, según los ajustes de la partida).' },
        { title: 'Vaca', text: 'Se consigue ganando el número de juegos acordado (1, 2 o 3).' },
        { title: 'Partida', text: 'La gana la pareja que consigue las vacas necesarias.' },
      ]} />
    </Block>
    <Callout label="La mano">Cada ronda la abre el jugador «mano», que cambia al siguiente en cada reparto. La mano es también quien gana los empates: si dos manos son iguales, gana la que esté más cerca de ella.</Callout>
  </>);
}

function Mano() {
  return (<>
    <Block title="Una ronda, paso a paso">
      <Steps items={[
        { title: 'Reparto', text: 'Cada jugador recibe cuatro cartas boca abajo. Solo tú ves las tuyas.' },
        { title: 'Mus o «No hay mus»', text: 'Por orden desde la mano, cada jugador dice «Mus» si quiere cambiar cartas o «No hay mus» si se queda con las que tiene.' },
        { title: 'Descarte', text: 'Si los cuatro dicen «Mus», cada uno descarta de 1 a 4 cartas y recibe otras nuevas. Después se vuelve a preguntar por el mus.' },
        { title: 'Los lances', text: 'En cuanto alguien dice «No hay mus» empiezan los lances: Grande, Chica, Pares y Juego (o Punto). En cada uno se puede apostar.' },
        { title: 'Recuento', text: 'Se enseñan las cartas de todos, se reparten las piedras y se pasa a la siguiente mano.' },
      ]} />
    </Block>
    <Callout label="Consejo">Si ya tienes una buena mano, corta el mus. Cambiar cartas puede estropearla, y además cada «Mus» da información a los rivales.</Callout>
  </>);
}

function Lances() {
  return (<>
    <Block title="Grande">
      <P>Gana la pareja con la <b className="text-stone-50">carta más alta</b> (rey, caballo, sota…). Si dos jugadores empatan, decide la segunda carta más alta, y así sucesivamente. Se juega siempre.</P>
    </Block>
    <Block title="Chica">
      <P>Lo contrario: gana la <b className="text-stone-50">carta más baja</b>, con el as como mejor carta. Los empates se resuelven con la segunda más baja. Se juega siempre.</P>
    </Block>
    <Block title="Pares">
      <P>Solo juegan quienes tienen <b className="text-stone-50">cartas repetidas</b>. De menor a mayor valor:</P>
      <div className="grid gap-2">
        <Example cards={[[12, 'copas'], [12, 'oros'], [5, 'bastos'], [1, 'espadas']]} caption="Pares · dos cartas iguales" />
        <Example cards={[[11, 'copas'], [11, 'oros'], [11, 'bastos'], [4, 'espadas']]} caption="Medias · tres cartas iguales" />
        <Example cards={[[7, 'copas'], [7, 'oros'], [6, 'bastos'], [6, 'espadas']]} caption="Duples · dos parejas (o cuatro iguales)" />
      </div>
      <P>Duples gana a medias y medias a pares. Si solo una pareja tiene pares, no hay apuesta: se lleva sus puntos directamente. La aplicación anuncia sola quién tiene pares.</P>
    </Block>
    <Block title="Juego">
      <P>Se suman los valores de tus cuatro cartas. Con <b className="text-stone-50">31 o más</b> tienes juego. El orden, de mejor a peor:</P>
      <Chips items={['31', '32', '40', '37', '36', '35', '34', '33']} active={0} />
      <Example cards={[[7, 'copas'], [7, 'oros'], [7, 'bastos'], [12, 'espadas']]} caption="7 + 7 + 7 + 10 = 31, el mejor juego" />
    </Block>
    <Block title="Punto">
      <P>Si <b className="text-stone-50">nadie</b> tiene juego, en lugar del Juego se juega al Punto: gana la suma más alta, es decir, la más cercana a 30.</P>
    </Block>
  </>);
}

function Apuestas() {
  return (<>
    <Block title="Qué puedes decir">
      <Row k="Paso">No apuestas y das la palabra al siguiente.</Row>
      <Row k="Envido">Apuestas piedras (mínimo 2). Responde la pareja contraria.</Row>
      <Row k="Quiero" tone="green">Aceptas la apuesta. Se enseñan las cartas y la pareja con mejor mano en ese lance se lleva lo apostado.</Row>
      <Row k="No quiero" tone="red">Rechazas. La pareja que apostó gana lo que ya estaba aceptado (1 piedra si era el primer envite) sin enseñar cartas.</Row>
      <Row k="Subir">Respondes con una apuesta mayor (mínimo 2 más).</Row>
      <Row k="Órdago" tone="red">Lo apuestas todo. Si te lo ven, quien gane ese lance gana el juego entero.</Row>
    </Block>
    <Block title="Cómo se responde">
      <P>Una apuesta la contesta la <b className="text-stone-50">pareja contraria</b>. Si el primero en responder dice «No quiero», su compañero todavía puede decir «Quiero».</P>
      <P>Las piedras aceptadas se reparten al enseñar las cartas, en este orden: Grande, Chica, Pares y Juego. La primera pareja que llega al tope gana el juego, aunque queden lances por contar.</P>
    </Block>
    <Callout label="Órdago">En la app se lanza <b>manteniendo pulsado</b> el botón durante un instante, para que nadie lo cante sin querer.</Callout>
  </>);
}

function Puntos() {
  return (<>
    <Block title="Cuánto vale cada lance">
      <Row k="Grande">1 piedra si todos pasan. Si hay envite aceptado, la pareja ganadora se lleva lo apostado.</Row>
      <Row k="Chica">Igual que la Grande: 1 piedra o lo apostado.</Row>
      <Row k="Pares">Pares 1 · Medias 2 · Duples 3, por cada jugador de la pareja ganadora que tenga pares (se suman los de los dos compañeros), más lo apostado.</Row>
      <Row k="Juego">El 31 vale 3 piedras y el resto de juegos 2, por jugador que tenga juego en la pareja ganadora, más lo apostado.</Row>
      <Row k="Punto">1 piedra, más lo apostado.</Row>
    </Block>
    <Block title="El marcador">
      <Row k="Amarraco">Cinco piedras. El marcador las agrupa para contar de un vistazo.</Row>
      <Row k="Dentro">Cuando a una pareja le faltan cinco piedras o menos para ganar el juego.</Row>
      <Row k="Juego">Se gana al llegar a 40 piedras (o 30).</Row>
      <Row k="Vaca">Se consigue ganando los juegos acordados. Gana la partida quien reúne las vacas necesarias.</Row>
    </Block>
    <Callout label="Ejemplo">Envidáis 2 a la Grande y os lo ven: si tenéis la mejor Grande, ganáis 2 piedras. En Pares, tu compañero tiene medias (2) y tú nada, y nadie más tiene pares: sumáis 2 piedras sin apostar.</Callout>
  </>);
}

function Senas() {
  const groups: { id: 'cartas' | 'jugada' | 'mus'; title: string }[] = [
    { id: 'cartas', title: 'Cartas' },
    { id: 'jugada', title: 'Jugada' },
    { id: 'mus', title: 'Mus' },
  ];
  return (<>
    <Block title="Qué son las señas">
      <P>Son gestos secretos con los que le dices a tu compañero qué llevas, sin que se enteren los rivales. En la mesa real se hacen con la cara; aquí se envían con un menú que <b className="text-stone-50">solo ve tu pareja</b>.</P>
      <Steps items={[
        { title: 'Enviar', text: 'Mantén pulsado tu avatar para abrir el menú circular, elige la seña y confírmala.' },
        { title: 'Pillar', text: 'Si sospechas que un rival ha hecho una seña, toca el ojo mientras late. Tienes unos segundos.' },
        { title: 'Consecuencias', text: 'Si aciertas, la seña queda expuesta a toda la mesa. Si fallas, el ojo se bloquea 10 segundos. Ninguna de las dos cosas cambia las piedras.' },
      ]} />
    </Block>
    {groups.map((g) => (
      <Block key={g.id} title={g.title}>
        {SIGNS.filter((s) => s.group === g.id).map((s) => (<Row key={s.id} k={s.label}>{s.gesture}</Row>))}
      </Block>
    ))}
    <Callout label="Señas veraces">Con esta opción activada solo puedes enviar señas que coinciden con tu mano. Es lo más fiel al Mus real, donde no se miente con las señas.</Callout>
  </>);
}

function App() {
  return (<>
    <Block title="Modos de juego">
      <Row k="Online">Crea una sala, comparte el código con tus amigos y sentaos. Los huecos libres los puede ocupar un bot y el anfitrión empieza la partida cuando todos estáis listos.</Row>
      <Row k="Contra bots">Tú, un compañero y dos rivales controlados por la app. Funciona sin conexión y es ideal para aprender a tu ritmo.</Row>
    </Block>
    <Block title="Controles">
      <Row k="Descartar">Desliza hacia arriba las cartas que quieres cambiar (o tócalas) y pulsa «Descartar».</Row>
      <Row k="Órdago">Mantén pulsado el botón un instante.</Row>
      <Row k="Señas">Mantén pulsado tu avatar para abrir el menú circular.</Row>
      <Row k="Pillar">Toca el ojo cuando lata en rojo.</Row>
      <Row k="Teclado"><b className="text-stone-50">M</b> mus · <b className="text-stone-50">N</b> no hay mus · <b className="text-stone-50">P</b> paso · <b className="text-stone-50">Q</b> quiero · <b className="text-stone-50">X</b> no quiero · <b className="text-stone-50">1–4</b> marcar carta · <b className="text-stone-50">Enter</b> descartar · <b className="text-stone-50">S</b> señas</Row>
    </Block>
    <Block title="Ajustes de partida">
      <Row k="Piedras">30 o 40 piedras por juego.</Row>
      <Row k="Juegos y vacas">Cuántos juegos hacen una vaca y cuántas vacas una partida.</Row>
      <Row k="8 reyes">Los treses son reyes y los doses son ases.</Row>
      <Row k="Tiempo">Segundos por turno, o sin límite.</Row>
    </Block>
    <Callout label="Primera vez">Empieza contra bots: la mesa te dice a quién le toca y qué puedes hacer en cada momento. Cuando le cojas el truco, invita a tu pareja.</Callout>
  </>);
}

// ───────────────────────── Modal ─────────────────────────

/**
 * Manual del Mus a pantalla completa en el móvil (y tarjeta centrada en pantallas grandes).
 * Siete pestañas con avance «Anterior / Siguiente» para quien nunca ha jugado.
 */
export function Manual({ open, onClose, initialTab = 'basico', eightKings = true }: {
  open: boolean; onClose: () => void; initialTab?: ManualTab; eightKings?: boolean;
}) {
  const [tab, setTab] = useState<ManualTab>(initialTab);
  const scroller = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const index = TABS.findIndex((t) => t.id === tab);
  const last = index === TABS.length - 1;

  useEffect(() => { if (open) setTab(initialTab); }, [open, initialTab]);
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }); }, [tab]);
  useEffect(() => {
    tabsRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [tab, open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const go = (i: number) => setTab(TABS[Math.max(0, Math.min(TABS.length - 1, i))].id);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 sm:items-center sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Manual del Mus"
            className="flex h-[100dvh] w-full max-w-[680px] flex-col overflow-hidden border-amber-300/15 bg-[#0a120f] text-stone-100 shadow-[0_30px_90px_rgba(0,0,0,.6)] sm:h-[min(88dvh,780px)] sm:rounded-[28px] sm:border"
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="relative flex items-start justify-between gap-3 bg-[radial-gradient(ellipse_at_top_left,rgba(240,195,95,.14),transparent_60%)] px-5 pb-3 pt-[max(env(safe-area-inset-top),18px)]">
              <div className="grid gap-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-[.28em] text-amber-300/80">Guía completa</span>
                <h2 className="font-[var(--font-display)] text-[28px] font-bold leading-tight text-amber-50">Manual del Mus</h2>
                <p className="text-[13px] text-stone-400">Todo para sentarte a la mesa, aunque sea tu primera vez.</p>
              </div>
              <button type="button" aria-label="Cerrar manual" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-stone-200 transition active:scale-95">
                <IconClose />
              </button>
            </header>

            <div ref={tabsRef} role="tablist" aria-label="Secciones del manual" className="flex shrink-0 gap-1.5 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {TABS.map((t) => {
                const on = t.id === tab;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setTab(t.id)}
                    className={`relative shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition-colors ${on ? 'border-amber-200 bg-amber-300 text-amber-950' : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10'}`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  role="tabpanel"
                  className="grid gap-3.5"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={{ duration: 0.22 }}
                >
                  {tab === 'basico' && <Basico eightKings={eightKings} />}
                  {tab === 'mano' && <Mano />}
                  {tab === 'lances' && <Lances />}
                  {tab === 'apuestas' && <Apuestas />}
                  {tab === 'puntos' && <Puntos />}
                  {tab === 'senas' && <Senas />}
                  {tab === 'app' && <App />}
                </motion.div>
              </AnimatePresence>
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-black/30 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => go(index - 1)}
                className="inline-flex h-11 items-center gap-1 rounded-full border border-white/15 bg-white/5 pl-3 pr-4 text-[14px] font-bold text-stone-200 transition enabled:active:scale-95 disabled:opacity-30"
              >
                <IconChevronLeft /> Anterior
              </button>
              <span className="text-[12px] font-bold tabular-nums text-stone-500" aria-live="polite">{index + 1} / {TABS.length}</span>
              <button
                type="button"
                onClick={() => (last ? onClose() : go(index + 1))}
                className="inline-flex h-11 items-center gap-1 rounded-full border border-amber-200 bg-gradient-to-br from-amber-300 to-amber-500 pl-4 pr-3 text-[14px] font-bold text-amber-950 transition active:scale-95"
              >
                {last ? '¡A jugar!' : <>Siguiente <IconChevronRight /></>}
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
