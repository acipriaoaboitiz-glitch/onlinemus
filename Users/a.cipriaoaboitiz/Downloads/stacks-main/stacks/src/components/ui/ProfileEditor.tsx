import { useRef, useState } from 'react';
import { Camera, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { photoToDataUrl, TITLES, titleLevel, type Profile } from '../../store/profile.ts';
import { useWallet } from '../../store/wallet.ts';
import { AVATARS, PlayerAvatar, rankFor } from './Hud.tsx';

/** Formulario de perfil: apodo, título, avatar predefinido o foto propia. Lo usan la bienvenida y el modal de edición. */
export function ProfileEditor({ initial, submitLabel, onSubmit }: { initial: Profile; submitLabel: string; onSubmit: (p: Profile) => void }) {
  const [p, setP] = useState<Profile>(initial);
  const [err, setErr] = useState('');
  const level = rankFor(useWallet().chips).level;
  const file = useRef<HTMLInputElement>(null);
  const upload = async (f?: File) => {
    if (!f) return;
    try { setP((c) => ({ ...c, photo: null })); const url = await photoToDataUrl(f); setP((c) => ({ ...c, photo: url })); setErr(''); } catch { setErr('No se pudo leer esa imagen'); }
  };
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); if (p.name.trim()) onSubmit(p); }}>
      <div className="flex items-center gap-4">
        <PlayerAvatar name={p.name || '?'} chips={0} size={84} avatar={p.avatar} photo={p.photo} />
        <div className="grid gap-2">
          <button type="button" onClick={() => file.current?.click()} className="flex items-center gap-2 rounded-xl border border-amber-300/40 bg-white/10 px-3 py-2 text-[13px] font-bold"><Camera size={15} /> Subir foto</button>
          {p.photo && <button type="button" onClick={() => setP({ ...p, photo: null })} className="text-left text-[12px] text-stone-400 underline">Quitar foto</button>}
          <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
        </div>
      </div>
      {err && <p role="alert" className="text-[12px] text-red-300">{err}</p>}
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Avatar">
        {AVATARS.map((a, i) => (
          <motion.button key={i} type="button" role="radio" aria-checked={!p.photo && p.avatar === i} whileTap={{ scale: 0.9 }} onClick={() => setP({ ...p, avatar: i, photo: null })}
            className={`grid h-12 place-items-center rounded-2xl border-2 ${!p.photo && p.avatar === i ? 'border-amber-300' : 'border-white/10'}`} style={{ background: a.bg }}>
            {a.icon ? <a.icon size={22} className="text-amber-100" /> : <b className="text-lg text-amber-200">{(p.name || '?').slice(0, 1).toUpperCase()}</b>}
          </motion.button>
        ))}
      </div>
      <label className="grid gap-1 text-[11px] font-extrabold uppercase tracking-[.14em] text-amber-300/90">Nombre / apodo
        <input value={p.name} maxLength={16} required onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="Tu apodo"
          className="rounded-xl border border-amber-300/40 bg-black/40 px-3 py-2.5 text-base font-bold normal-case tracking-normal text-stone-100" />
      </label>
      <div>
        <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[.14em] text-amber-300/90">Título</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Título">
          {TITLES.map((t) => {
            const need = titleLevel(t);
            const locked = need > level;
            return (
              <button key={t} type="button" role="radio" aria-checked={p.title === t} disabled={locked} onClick={() => setP({ ...p, title: t })}
                title={locked ? `Se desbloquea en el nivel ${need}` : undefined}
                className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] font-bold ${locked ? 'border-white/10 bg-white/5 text-stone-500' : p.title === t ? 'border-amber-200 bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950' : 'border-white/15 bg-white/5 text-stone-200'}`}>
                {locked && <Lock size={11} aria-hidden />}{t}{locked && <span className="text-[10px] font-extrabold">· Nv. {need}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <motion.button type="submit" whileTap={{ scale: 0.96 }} disabled={!p.name.trim()} className="gold-foil min-h-12 rounded-2xl text-[15px] font-extrabold disabled:opacity-40">{submitLabel}</motion.button>
    </form>
  );
}
