import { existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const sourceRoot = join(root, 'academy');
const packageRoot = join(root, 'dist', 'legacy');

function listFiles(directory, base = directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(path, base));
    else files.push(relative(base, path).replaceAll('\\', '/'));
  }
  return files.sort();
}

const sourceFiles = listFiles(sourceRoot);
const packaged = listFiles(packageRoot);
if (packaged.length) {
  throw new Error(`Production Legacy package must be empty. Unexpected files:\n${packaged.map(file => `- ${file}`).join('\n')}`);
}

console.log(`Zero-Legacy production package verified: 0/${sourceFiles.length} academy files published (100.0% removed from runtime payload).`);
