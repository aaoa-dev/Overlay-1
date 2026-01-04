import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'fs';

// Plugin to copy preview images to dist
function copyPreviewsPlugin() {
  return {
    name: 'copy-previews',
    closeBundle() {
      const previewsDir = resolve(__dirname, 'previews');
      const distPreviewsDir = resolve(__dirname, 'dist/previews');
      
      // Create dist/previews directory if it doesn't exist
      if (!existsSync(distPreviewsDir)) {
        mkdirSync(distPreviewsDir, { recursive: true });
      }
      
      // Copy all files from previews to dist/previews
      if (existsSync(previewsDir)) {
        const files = readdirSync(previewsDir);
        files.forEach(file => {
          if (file !== '.gitkeep') {
            const src = resolve(previewsDir, file);
            const dest = resolve(distPreviewsDir, file);
            copyFileSync(src, dest);
            console.log(`Copied preview: ${file}`);
          }
        });
      }
    }
  };
}

export default defineConfig({
  root: '.',
  // GitHub Pages usually deploys to /repo-name/
  // But for custom domains, we use '/'
  base: '/', 
  publicDir: 'public',
  
  plugins: [copyPreviewsPlugin()],
  
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
        timer: resolve(__dirname, 'widgets/timer.html'),
        chatters: resolve(__dirname, 'widgets/chatters.html'),
        voiceMonitor: resolve(__dirname, 'widgets/voice-monitor.html'),
        soundBoard: resolve(__dirname, 'widgets/sound-board.html'),
        bgGenerator: resolve(__dirname, 'backgrounds/generator.html'),
        bgBackground: resolve(__dirname, 'backgrounds/background.html'),
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
