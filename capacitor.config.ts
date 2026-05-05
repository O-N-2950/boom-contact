import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'contact.boom.app',
  appName: 'boom.contact',
  webDir: 'dist/client',
  server: {
    // Bundle local (obligatoire App Store — sinon rejet 4.2 "web clip")
    // L'app embarque le build Vite et fonctionne offline
    // Les mises à jour passent par les stores (ou Live Update Capacitor si besoin)
    androidScheme: 'https',
    iosScheme: 'https',
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
