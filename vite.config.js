import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const appRoot = fileURLToPath(new URL('./app', import.meta.url));
const generatedExamSource = fileURLToPath(new URL('./generated/exams', import.meta.url));
const generatedCodingSource = fileURLToPath(new URL('./generated/coding', import.meta.url));
const generatedStepSource = fileURLToPath(new URL('./generated/step', import.meta.url));
const outputDirectory = fileURLToPath(new URL('./dist', import.meta.url));

function copyStaticData() {
  return {
    name: 'copy-neon-static-data',
    closeBundle() {
      mkdirSync(outputDirectory, { recursive: true });
      if (existsSync(generatedExamSource)) {
        mkdirSync(`${outputDirectory}/data`, { recursive: true });
        cpSync(generatedExamSource, `${outputDirectory}/data/exams`, { recursive: true });
      }
      if (existsSync(generatedCodingSource)) {
        mkdirSync(`${outputDirectory}/data`, { recursive: true });
        cpSync(generatedCodingSource, `${outputDirectory}/data/coding`, { recursive: true });
      }
      if (existsSync(generatedStepSource)) {
        mkdirSync(`${outputDirectory}/data`, { recursive: true });
        cpSync(generatedStepSource, `${outputDirectory}/data/step`, { recursive: true });
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
        auth: fileURLToPath(new URL('./app/auth.html', import.meta.url)),
        step: fileURLToPath(new URL('./app/step.html', import.meta.url)),
        exams: fileURLToPath(new URL('./app/exams.html', import.meta.url)),
        games: fileURLToPath(new URL('./app/games.html', import.meta.url)),
        kidsGames: fileURLToPath(new URL('./app/kids-games.html', import.meta.url)),
        atari2600: fileURLToPath(new URL('./app/atari-2600.html', import.meta.url)),
        learning: fileURLToPath(new URL('./app/learning.html', import.meta.url)),
        coding: fileURLToPath(new URL('./app/coding.html', import.meta.url)),
        trust: fileURLToPath(new URL('./app/trust.html', import.meta.url)),
        admin: fileURLToPath(new URL('./app/admin.html', import.meta.url))
      }
    }
  },
  server: { fs: { allow: [projectRoot] } }
});
