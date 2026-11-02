import { copyFile, mkdir } from 'node:fs/promises';
await mkdir('public/python', { recursive: true });
for (const file of [
  'pyodide.js',
  'pyodide.asm.js',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
]) {
  await copyFile(`node_modules/pyodide/${file}`, `public/python/${file}`);
}
console.log('Prepared pinned, self-hosted Python browser runtime.');
