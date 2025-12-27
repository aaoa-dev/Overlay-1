import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  // GitHub Pages usually deploys to /repo-name/
  // But for custom domains, we use '/'
  base: '/', 
  publicDir: 'public',
  
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        chat: resolve(__dirname, 'chats/chat.html'),
        verticalChat: resolve(__dirname, 'chats/vertical-chat.html'),
        alerts: resolve(__dirname, 'alerts/alerts.html'),
        cursorWelcome: resolve(__dirname, 'alerts/cursor-welcome.html'),
        signatureAlerts: resolve(__dirname, 'alerts/signature-alerts.html'),
        counter: resolve(__dirname, 'widgets/counter.html'),
        chatters: resolve(__dirname, 'widgets/chatters.html'),
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
