import { defineConfig } from 'vite';
import { resolve, relative, extname } from 'path';
import { copyFileSync, mkdirSync, readdirSync, existsSync, statSync } from 'fs';

// Helper to find all HTML files in the project
function getHtmlInputs(dir, inputMap = {}) {
  const items = readdirSync(dir);

  items.forEach(item => {
    const fullPath = resolve(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules, dist, and public
      if (!['node_modules', 'dist', 'public', '.git'].includes(item)) {
        getHtmlInputs(fullPath, inputMap);
      }
    } else if (item.endsWith('.html')) {
      // Create a unique key for each HTML file
      const relativePath = relative(__dirname, fullPath);
      const name = relativePath.replace(/\.html$/, '').replace(/\//g, '_');
      inputMap[name] = fullPath;
    }
  });

  return inputMap;
}

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

const htmlInputs = getHtmlInputs(__dirname);

export default defineConfig({
  root: '.',
  // GitHub Pages usually deploys to /repo-name/
  // But for custom domains, we use '/'
  base: '/', 
  publicDir: 'public',
  
  plugins: [copyPreviewsPlugin()],
  
  build: {
    rollupOptions: {
      input: htmlInputs,
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
