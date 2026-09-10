import { readFile, access, stat } from "node:fs/promises";
import { join, dirname } from "node:path";

const root = join(import.meta.dirname, "..");
const jsonFiles = [".openai/hosting.json", "dist/manifest.webmanifest", "firebase.json", ".firebaserc", "functions/package.json"];
for (const file of jsonFiles) JSON.parse(await readFile(join(root, file), "utf8"));

const htmlPath = join(root, "dist/index.html");
const html = await readFile(htmlPath, "utf8");
const refs = [...html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)].map(match => match[1]);
for (const ref of refs) await access(join(dirname(htmlPath), ref));

const manifest = JSON.parse(await readFile(join(root, "dist/manifest.webmanifest"), "utf8"));
for (const icon of manifest.icons) {
  const iconPath = join(root, "dist", icon.src.replace(/^\.\//, ""));
  if ((await stat(iconPath)).size < 1000) throw new Error(`Ícone inválido: ${icon.src}`);
}

const appJS = await readFile(join(root, "dist/assets/app.js"), "utf8");
const required = ["createUserWithEmailAndPassword", "adminSetUserStatus", "openTransactionForm", "serviceWorker", "document.modelContext"];
for (const token of required) if (!appJS.includes(token)) throw new Error(`Recurso ausente: ${token}`);

console.log(JSON.stringify({ json: "ok", localReferences: refs.length, pwaIcons: manifest.icons.length, htmlBytes: html.length, appBytes: appJS.length }));
