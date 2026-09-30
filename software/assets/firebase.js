import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";

<<<<<<< HEAD
const primaryAdminFirebaseConfig = Object.freeze({
  apiKey: "AIzaSyDrt1bbLUjT8uzILn_cLgeRSDdMAM2ZHmI",
  authDomain: "mayconbrown-bda8c.firebaseapp.com",
  projectId: "mayconbrown-bda8c",
  storageBucket: "mayconbrown-bda8c.firebasestorage.app",
  messagingSenderId: "226624962636",
  appId: "1:226624962636:web:410ad40aa6099ca57474e9",
  measurementId: "G-Y1BTTK576V"
});

=======
>>>>>>> e9834ea03941b1cb5c980eab37cbd31d24c7e9ee
const softwareCategories = Object.freeze({
  coreldraw: { label: "CorelDRAW", description: "Criação gráfica, vetorização e produção profissional." },
  adobe: { label: "Adobe", description: "Ferramentas criativas para imagem, vídeo, áudio e documentos." },
  autodesk: { label: "Autodesk", description: "Projetos técnicos, arquitetura, engenharia e modelagem 3D." },
  microsoft: { label: "Microsoft", description: "Produtividade, escritório e recursos essenciais para Windows." },
  wondershare: { label: "Wondershare", description: "Edição, recuperação e utilitários para o dia a dia." },
  lightburn: { label: "LightBurn", description: "Controle e criação para gravação e corte a laser." },
  wilcom: { label: "Wilcom", description: "Digitalização e produção profissional de bordados." },
  rhinoceros: { label: "Rhinoceros", description: "Modelagem 3D precisa para design, indústria e arquitetura." },
  sketchup: { label: "SketchUp", description: "Modelagem 3D intuitiva para ambientes e projetos." }
});

const matrixCategories = Object.freeze({
  animais: { label: "Animais", description: "Matrizes de animais para bordados criativos e personalizados." },
  culinaria: { label: "Culinária", description: "Matrizes para cozinhas, alimentos, restaurantes e profissionais da área." },
  "datas-especiais": { label: "Datas especiais", description: "Matrizes para celebrar momentos e datas importantes do ano." },
  diversos: { label: "Diversos", description: "Temas variados para ampliar suas opções de bordado." },
  esportes: { label: "Esportes", description: "Matrizes inspiradas em modalidades, clubes e atividades esportivas." },
  frases: { label: "Frases", description: "Mensagens e composições tipográficas prontas para bordar." },
  infantil: { label: "Infantil", description: "Personagens e temas delicados para projetos infantis." },
  marcas: { label: "Marcas", description: "Símbolos e identidades para projetos personalizados." },
  moda: { label: "Moda", description: "Matrizes pensadas para roupas, acessórios e tendências." },
  natureza: { label: "Natureza", description: "Flores, paisagens e elementos naturais para bordado." },
  profissoes: { label: "Profissões", description: "Matrizes para uniformes, presentes e homenagens profissionais." },
  religiosos: { label: "Religiosos", description: "Matrizes religiosas para trabalhos de fé e celebração." }
});

const catalogs = Object.freeze({
  software: {
    appName: "catalogo-software",
    basePath: "/software",
    publicIndex: "/software/",
    adminIndex: "/softwares-admin.html",
    label: "Softwares",
    itemLabel: "produto",
    firebaseConfig: {
      apiKey: "AIzaSyCfhOEOqQVbXgNYwORLwSyNH7w6cKlaVg0",
      authDomain: "ferramentas-e-utilitarios.firebaseapp.com",
      projectId: "ferramentas-e-utilitarios",
      storageBucket: "ferramentas-e-utilitarios.firebasestorage.app",
      messagingSenderId: "528869929361",
      appId: "1:528869929361:web:b30fd114667a606c65aa30"
    },
    categories: softwareCategories
  },
  matriz: {
    appName: "catalogo-matrizes",
    basePath: "/matriz",
    publicIndex: "/matrizes.html",
    adminIndex: "/matrizes-admin.html",
    label: "Matrizes",
    itemLabel: "matriz",
    firebaseConfig: {
      apiKey: "AIzaSyBtUQnBTwm8nscOodZE0PVYkDRydr8RYlI",
      authDomain: "matriz-esportes.firebaseapp.com",
      projectId: "matriz-esportes",
      storageBucket: "matriz-esportes.firebasestorage.app",
      messagingSenderId: "657094279299",
      appId: "1:657094279299:web:9ebfb4c0e1224df111dbb6"
    },
    categories: matrixCategories
  }
});

export function getCatalogType() {
  return document.body?.dataset?.catalog === "matriz" ? "matriz" : "software";
}

export function getCatalogConfig() {
  return catalogs[getCatalogType()];
}

export function getFirebaseApp() {
  const catalog = getCatalogConfig();
  return getApps().find((app) => app.name === catalog.appName) || initializeApp(catalog.firebaseConfig, catalog.appName);
}

<<<<<<< HEAD
export function getPrimaryAdminApp() {
  return getApps().find((app) => app.name === "[DEFAULT]") || initializeApp(primaryAdminFirebaseConfig);
}

export function getCatalogFirebaseApps() {
  return Object.values(catalogs).map((catalog) => (
    getApps().find((app) => app.name === catalog.appName)
      || initializeApp(catalog.firebaseConfig, catalog.appName)
  ));
}

=======
>>>>>>> e9834ea03941b1cb5c980eab37cbd31d24c7e9ee
export function getCategoryFromPage() {
  const fromData = document.body?.dataset?.category;
  const fromQuery = new URLSearchParams(location.search).get("categoria");
  const category = String(fromData || fromQuery || "").toLowerCase();
  return Object.hasOwn(getCatalogConfig().categories, category) ? category : null;
}

export function formatPrice(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Consulte o valor";
  if (/^r\$/i.test(raw)) return raw;
  return `R$ ${raw}`;
}

export function productUrl(category, id) {
  const params = new URLSearchParams({ categoria: category, id });
  return `${getCatalogConfig().basePath}/produto/?${params.toString()}`;
}

export function categoryUrl(category) {
  const catalog = getCatalogConfig();
  return getCatalogType() === "matriz" ? `${catalog.basePath}/${category}.html` : `${catalog.basePath}/${category}/`;
}

export function setupMenu() {
  const button = document.querySelector("[data-menu-button]");
  const links = document.querySelector("[data-nav-links]");
  if (!button || !links) return;
  button.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    button.setAttribute("aria-expanded", String(open));
  });
}

export function siteHeader({ admin = false } = {}) {
  const home = admin ? "/admin/" : "/";
  const catalog = getCatalogConfig();
  const softwareCurrent = catalog.label === "Softwares" ? ' aria-current="page"' : "";
  const matrixCurrent = catalog.label === "Matrizes" ? ' aria-current="page"' : "";
  return `
    <a class="skip-link" href="#conteudo">Ir para o conteúdo</a>
    <header class="site-header">
      <div class="container nav-row">
        <a class="brand" href="${home}" aria-label="Maycon Brown - início">
          <img src="/img/logo-brown-preto.png" alt="Maycon Brown" width="180" height="48">
        </a>
        <button class="menu-button" type="button" data-menu-button aria-expanded="false" aria-label="Abrir menu">☰</button>
        <nav class="nav-links" data-nav-links aria-label="Navegação principal">
          <a href="${home}">${admin ? "Painel" : "Início"}</a>
          <a href="${admin ? "/softwares-admin.html" : "/software/"}"${softwareCurrent}>Softwares</a>
          <a href="${admin ? "/matrizes-admin.html" : "/matrizes.html"}"${matrixCurrent}>Matrizes</a>
          ${admin ? '<a href="/painel-mensagens.html">Mensagens</a>' : '<a href="/formatacao.html">Formatação</a><a class="nav-cta" href="/contato/">Contato</a>'}
        </nav>
      </div>
    </header>`;
}

export function siteFooter() {
  return `
    <footer class="site-footer">
      <div class="container footer-row">
        <img src="/img/logo-brown-preto.png" alt="Maycon Brown" width="150" height="40">
        <span>Compra segura · Entrega automática · Suporte especializado</span>
        <span>© ${new Date().getFullYear()} Maycon Brown</span>
      </div>
    </footer>`;
}
