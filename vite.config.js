import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  // For Cloudflare Pages, we typically use root base path '/'
  // If you are deploying to a subfolder like /Overlay-1/, change this to '/Overlay-1/'
  base: '/', 
  publicDir: 'public',
  
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        chat: resolve(__dirname, 'Chat/chat.html'),
        verticalChat: resolve(__dirname, 'Chat/vertical-chat.html'),
        alerts: resolve(__dirname, 'alerts.html'),
        followers: resolve(__dirname, 'followers.html'),
        subscribers: resolve(__dirname, 'subscribers.html'),
        oauth: resolve(__dirname, 'auth/oauth.html'),
        callback: resolve(__dirname, 'auth/callback.html'),
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },

  server: {
    port: 3000,
    open: true,
    cors: true,
  },

  // Ensure imports work correctly
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
