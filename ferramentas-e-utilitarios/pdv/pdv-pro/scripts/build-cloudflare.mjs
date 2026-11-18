import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destino = path.join(raiz, 'dist');
const arquivosPublicos = [
  'admin.html',
  'auth.js',
  'cadastro.html',
  'catalogo-admin.js',
  'clientes-financeiro.js',
  'COMO-ABRIR-O-PDV.html',
  'favicon.svg',
  'firebase-config.js',
  'guia-pix.html',
  'index.html',
  'login.html',
  'manifest.json',
  'operator-admin.js',
  'pdv-cloud.js',
  'pwa-install.js',
  'sw.js',
  'vendas.html'
];
const diretoriosPublicos = ['assets', 'catalogo'];

await fs.rm(destino, { recursive: true, force: true });
await fs.mkdir(destino, { recursive: true });

for (const arquivo of arquivosPublicos) {
  await fs.copyFile(path.join(raiz, arquivo), path.join(destino, arquivo));
}
for (const diretorio of diretoriosPublicos) {
  await fs.cp(path.join(raiz, diretorio), path.join(destino, diretorio), { recursive: true });
}

console.log(`Build Cloudflare concluída: ${arquivosPublicos.length} arquivos e ${diretoriosPublicos.length} diretórios públicos.`);
