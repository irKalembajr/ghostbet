import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'cd.ghostbet.football',
  appName: 'GHOSTBET',
  webDir: 'mobile-dist',
  // Ship local assets. Never point the production app at a development server.
  server: { androidScheme: 'https' },
};
export default config;
