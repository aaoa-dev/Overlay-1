import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: '/Overlay-1/', // GitHub Pages base path
  publicDir: 'public', // Static assets that won't be processed
  
  build: {
    rollupOptions: {
      input: {
        verticalChat: resolve(__dirname, 'Chat/vertical-chat.html'),
        followers: resolve(__dirname, 'followers.html'),
        subscribers: resolve(__dirname, 'subscribers.html'),
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

