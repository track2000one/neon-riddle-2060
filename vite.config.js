import { copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { LEGACY_RUNTIME_ALLOWLIST } from './scripts/legacy-runtime-allowlist.mjs';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const appRoot = fileURLToPath(new URL('./app', import.meta.url));
const legacySource = fileURLToPath(new URL('./academy', import.meta.url));
const generatedExamSource = fileURLToPath(new URL('./generated/exams', import.meta.url));
const generatedCodingSource = fileURLToPath(new URL('./generated/coding', import.meta.url));
const outputDirectory = fileURLToPath(new URL('./dist', import.meta.url));

function copyAllowlistedLegacyRuntime() {
  const destinationRoot = join(outputDirectory, 'legacy');
  mkdirSync(destinationRoot, { recursive: true });

  for (const relativePath of LEGACY_RUNTIME_ALLOWLIST) {
    const sourcePath = join(legacySource, relativePath);
    if (!existsSync(sourcePath)) throw new Error(`Missing allowlisted Legacy runtime source: ${relativePath}`);
    const destinationPath = join(destinationRoot, relativePath);
    mkdirSync(dirname(destinationPath), { recursive: true });
    copyFileSync(sourcePath, destinationPath);
  }
}

function copyStaticData() {
  return {
    name: 'copy-neon-static-data',
    closeBundle() {
      mkdirSync(outputDirectory, { recursive: true });
      copyAllowlistedLegacyRuntime();
      if (existsSync(generatedExamSource)) {
        mkdirSync(`${outputDirectory}/data`, { recursive: true });
        cpSync(generatedExamSource, `${outputDirectory}/data/exams`, { recursive: true });
      }
      if (existsSync(generatedCodingSource)) {
        mkdirSync(`${outputDirectory}/data`, { recursive: true });
        cpSync(generatedCodingSource, `${outputDirectory}/data/coding`, { recursive: true });
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
        learning: fileURLToPath(new URL('./app/learning.html', import.meta.url)),
        coding: fileURLToPath(new URL('./app/coding.html', import.meta.url)),
        trust: fileURLToPath(new URL('./app/trust.html', import.meta.url)),
        admin: fileURLToPath(new URL('./app/admin.html', import.meta.url))
      }
    }
  },
  server: { fs: { allow: [projectRoot] } }
});
