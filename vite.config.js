import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: '/Overlay-1/', // GitHub Pages base path
  publicDir: 'public', // Static assets that won't be processed
  
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        chat: resolve(__dirname, 'Chat/chat.html'),
        verticalChat: resolve(__dirname, 'Chat/vertical-chat.html'),
        alertsRefactored: resolve(__dirname, 'alerts-refactored.html'),
        followers: resolve(__dirname, 'followers.html'),
        subscribers: resolve(__dirname, 'subscribers.html'),
        simpleAuth: resolve(__dirname, 'auth/simple-auth.html'),
      },
      external: ['/tmi.js', '/config.js'], // Don't bundle these
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

