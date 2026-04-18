import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'contact.boom.app',
  appName: 'boom.contact',
  webDir: 'dist/client',
  server: {
    // En prod, l'app charge le site web directement (pas de bundle local)
    // Ça garantit que l'app est toujours à jour sans re-soumettre sur les stores
    url: 'https://www.boom.contact',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0a0a14',
    preferredContentMode: 'mobile',
    scheme: 'boom.contact',
  },
  android: {
    backgroundColor: '#0a0a14',
    allowMixedContent: false,
    captureInput: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0a14',
      showSpinner: false,
      launchAutoHide: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a14',
    },
  },
};

export default config;
