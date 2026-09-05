import { cp, mkdir, rm } from "node:fs/promises";
import { resolve, relative } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
if (relative(root, dist) !== "dist") throw new Error("Diretório de saída inválido");
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const entries = [
  "index.html", "login.html", "cadastro-loja.html", "cadastro-entregador.html",
  "termos.html", "privacidade.html", "suporte.html", "manifest.json", "service-worker.js",
  "css", "js", "icons", "loja", "entregador", "admin"
];
for (const entry of entries) await cp(resolve(root, entry), resolve(dist, entry), { recursive: true });
console.log(`Build concluído: ${entries.length} entradas publicadas em dist/`);
