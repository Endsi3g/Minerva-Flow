import type { CapacitorConfig } from '@capacitor/cli';

// Minerva Flow is a full dynamic Next.js app (Supabase auth, server actions,
// SSR dashboards) — Capacitor can't statically export that, so the native
// shell just points its WebView at the real deployed app instead of trying
// to bundle it. `CAPACITOR_SERVER_URL` lets a dev point the shell at a local
// LAN dev server (a physical device can't reach `localhost` on the host
// machine) instead of production without editing this file.
const serverUrl = process.env.CAPACITOR_SERVER_URL || 'https://minervaflow.app';

const config: CapacitorConfig = {
  appId: 'com.minervaflow.app',
  appName: 'Minerva Flow',
  webDir: 'capacitor/www',
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
  },
  ios: {
    contentInset: 'always',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#f5f1e6',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#f5f1e6',
    },
  },
};

export default config;
