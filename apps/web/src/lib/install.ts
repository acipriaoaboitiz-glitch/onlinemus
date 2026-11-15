import { useEffect, useState } from 'react';
import { isNative, isStandalone } from './native.ts';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Instalar la PWA: botón nativo en Chrome/Edge/Android y instrucciones en Safari de iPhone/iPad. */
export function useInstall(): { canInstall: boolean; iosHint: boolean; install: () => Promise<void> } {
  const [evt, setEvt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as InstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setEvt(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const ios = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  return {
    canInstall: evt !== null && !installed && !isNative(),
    iosHint: ios && !installed && !isNative(),
    install: async () => {
      if (!evt) return;
      await evt.prompt();
      await evt.userChoice.catch(() => undefined);
      setEvt(null);
    },
  };
}
