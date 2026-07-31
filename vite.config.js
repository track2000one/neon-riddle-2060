import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const appRoot = fileURLToPath(new URL('./app', import.meta.url));
const legacySource = fileURLToPath(new URL('./academy', import.meta.url));
const generatedExamSource = fileURLToPath(new URL('./generated/exams', import.meta.url));
const outputDirectory = fileURLToPath(new URL('./dist', import.meta.url));

function copyStaticData() {
  return {
    name: 'copy-neon-static-data',
    closeBundle() {
      mkdirSync(outputDirectory, { recursive: true });
      if (existsSync(legacySource)) cpSync(legacySource, `${outputDirectory}/legacy`, { recursive: true });
      if (existsSync(generatedExamSource)) {
        mkdirSync(`${outputDirectory}/data`, { recursive: true });
        cpSync(generatedExamSource, `${outputDirectory}/data/exams`, { recursive: true });
      }
    }
  };
}

export default defineConfig({
  root: appRoot,
  publicDir: false,
  base: '/',
  plugins: [copyStaticData()],
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        home: fileURLToPath(new URL('./app/index.html', import.meta.url)),
        step: fileURLToPath(new URL('./app/step.html', import.meta.url)),
        exams: fileURLToPath(new URL('./app/exams.html', import.meta.url)),
        games: fileURLToPath(new URL('./app/games.html', import.meta.url)),
        learning: fileURLToPath(new URL('./app/learning.html', import.meta.url))
      }
    }
  },
  server: { fs: { allow: [projectRoot] } }
});
