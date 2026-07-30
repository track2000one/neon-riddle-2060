import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const appRoot = fileURLToPath(new URL('./app', import.meta.url));
const legacySource = fileURLToPath(new URL('./academy', import.meta.url));
const outputDirectory = fileURLToPath(new URL('./dist', import.meta.url));

function copyLegacyAcademy() {
  return {
    name: 'copy-legacy-academy',
    closeBundle() {
      if (!existsSync(legacySource)) return;
      mkdirSync(outputDirectory, { recursive: true });
      cpSync(legacySource, `${outputDirectory}/legacy`, { recursive: true });
    }
  };
}

export default defineConfig({
  root: appRoot,
  publicDir: false,
  base: '/',
  plugins: [copyLegacyAcademy()],
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        home: fileURLToPath(new URL('./app/index.html', import.meta.url)),
        step: fileURLToPath(new URL('./app/step.html', import.meta.url))
      },
      output: {
        manualChunks: {
          'firebase-auth': ['https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js']
        }
      }
    }
  },
  server: {
    fs: { allow: [projectRoot] }
  }
});
