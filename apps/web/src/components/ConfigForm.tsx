import type { RoomConfig } from '@mus/engine';

function Seg<T extends number>({ label, value, options, onChange }: {
  label: string; value: T; options: [T, string][]; onChange: (v: T) => void;
}) {
  return (
    <div className="cfg__row">
      <span className="cfg__label">{label}</span>
      <div className="seg" role="radiogroup" aria-label={label}>
        {options.map(([v, text]) => (
          <button key={v} type="button" role="radio" aria-checked={v === value} className={`seg__opt${v === value ? ' on' : ''}`} onClick={() => onChange(v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={value} className="cfg__toggle" onClick={() => onChange(!value)}>
      <span>
        <b>{label}</b>
        <small>{hint}</small>
      </span>
      <i className={`switch${value ? ' on' : ''}`} />
    </button>
  );
}

/** Ajustes de partida: los mismos para crear una sala, jugar contra bots o editar el lobby. */
export function ConfigForm({ value, onChange }: { value: RoomConfig; onChange: (c: RoomConfig) => void }) {
  const set = (patch: Partial<RoomConfig>) => onChange({ ...value, ...patch });
  return (
    <div className="cfg">
      <Seg label="Piedras por juego" value={value.targetPoints} options={[[30, '30'], [40, '40']]} onChange={(v) => set({ targetPoints: v })} />
      <Seg label="Juegos por vaca" value={value.juegosParaVaca} options={[[1, '1'], [2, '2'], [3, '3']]} onChange={(v) => set({ juegosParaVaca: v })} />
      <Seg label="Vacas por partida" value={value.vacasParaPartida} options={[[1, '1'], [2, '2'], [3, '3']]} onChange={(v) => set({ vacasParaPartida: v })} />
      <Seg label="Tiempo por turno" value={value.turnSeconds} options={[[0, 'Libre'], [20, '20 s'], [30, '30 s'], [60, '60 s']]} onChange={(v) => set({ turnSeconds: v })} />
      <Toggle label="Baraja de 8 reyes" hint="El 3 es rey y el 2 es as (cerdo)" value={value.eightKings} onChange={(v) => set({ eightKings: v })} />
      <Toggle label="Señas veraces" hint="Solo puedes hacer señas que son ciertas" value={value.truthfulSigns} onChange={(v) => set({ truthfulSigns: v })} />
    </div>
  );
}

export function configSummary(c: RoomConfig): string {
  const timer = c.turnSeconds > 0 ? `${c.turnSeconds} s/turno` : 'sin límite';
  return `${c.targetPoints} piedras · ${c.juegosParaVaca} ${c.juegosParaVaca === 1 ? 'juego' : 'juegos'}/vaca · ${c.vacasParaPartida} ${c.vacasParaPartida === 1 ? 'vaca' : 'vacas'} · ${c.eightKings ? '8 reyes' : '4 reyes'} · ${timer}`;
}
