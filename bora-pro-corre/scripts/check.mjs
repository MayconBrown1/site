import { readFile, readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
async function walk(dir) { const out=[]; for (const name of await readdir(dir)) { if (["dist",".git"].includes(name)) continue; const p=join(dir,name); (await stat(p)).isDirectory() ? out.push(...await walk(p)) : out.push(p); } return out; }
const files = await walk(fileURLToPath(root));
let failures = 0;
for (const file of files.filter(f => [".html",".js",".json"].includes(extname(f)))) {
  const text = await readFile(file, "utf8");
  if (text.includes("/bora-pro-corre/")) { console.error(`Caminho antigo em ${file}`); failures++; }
  if (text.includes("R$ 20")) { console.error(`Preço antigo em ${file}`); failures++; }
  if (extname(file) === ".json") { try { JSON.parse(text); } catch (e) { console.error(`JSON inválido em ${file}: ${e.message}`); failures++; } }
}
if (failures) process.exit(1);
console.log(`Verificação concluída em ${files.length} arquivos.`);
