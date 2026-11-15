import type { CapacitorConfig } from '@capacitor/cli';

// Envoltorio nativo: `npm run cap:android` / `npm run cap:ios` (ver README). La app es la misma build web.
const config: CapacitorConfig = {
  appId: 'com.mus.online',
  appName: 'Mus',
  webDir: 'dist',
  backgroundColor: '#0A0E13',
  ios: { contentInset: 'never' }, // la web ocupa toda la pantalla y respeta las zonas seguras con env(safe-area-inset-*)
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: { launchShowDuration: 0, backgroundColor: '#0A0E13' },
    StatusBar: { style: 'DARK', backgroundColor: '#0A0E13' },
  },
};

export default config;
