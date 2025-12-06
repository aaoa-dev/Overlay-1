import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: '/Overlay-1/', // GitHub Pages base path
  
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        chat: resolve(__dirname, 'Chat/chat.html'),
        verticalChat: resolve(__dirname, 'Chat/vertical-chat.html'),
        alerts: resolve(__dirname, 'alerts.html'),
        alertsRefactored: resolve(__dirname, 'alerts-refactored.html'),
        followers: resolve(__dirname, 'followers.html'),
        subscribers: resolve(__dirname, 'subscribers.html'),
        notifications: resolve(__dirname, 'Notification/notifications.html'),
        twitchNotifications: resolve(__dirname, 'Notification/twitch-notifications.html'),
        voice: resolve(__dirname, 'Voice/index.html'),
        oauth: resolve(__dirname, 'auth/oauth.html'),
        callback: resolve(__dirname, 'auth/callback.html'),
        simpleAuth: resolve(__dirname, 'auth/simple-auth.html'),
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },

  server: {
    port: 3000,
    open: false,
    cors: true,
  },

  // Environment variables
  define: {
    'import.meta.env.VITE_TWITCH_CLIENT_ID': JSON.stringify(process.env.VITE_TWITCH_CLIENT_ID || ''),
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['tmi.js'],
  },
});

