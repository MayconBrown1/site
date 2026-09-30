import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { categoryUrl, formatPrice, getCatalogConfig, getCategoryFromPage, getFirebaseApp, setupMenu, siteFooter, siteHeader } from "./firebase.js";

const params = new URLSearchParams(location.search);
const category = getCategoryFromPage();
const id = params.get("id");
const catalog = getCatalogConfig();
const itemTitle = catalog.itemLabel === "matriz" ? "Matriz" : "Produto";

document.body.innerHTML = `
  ${siteHeader()}
  <main id="conteudo" class="container content" style="padding-top:56px">
    <div id="produto"><div class="state"><div class="spinner" aria-hidden="true"></div>Carregando ${catalog.itemLabel}…</div></div>
  </main>
  ${siteFooter()}`;
setupMenu();

const target = document.querySelector("#produto");

function showError(title, message) {
  document.title = `${title} | Maycon Brown`;
  target.innerHTML = `<div class="state"><h1>${title}</h1><p>${message}</p><a class="button button-primary" href="${catalog.publicIndex}">Voltar ao catálogo</a></div>`;
}

if (!category || !id) {
  showError(`${itemTitle} não encontrad${catalog.itemLabel === "matriz" ? "a" : "o"}`, `O endereço está incompleto ou não corresponde a ${catalog.itemLabel === "matriz" ? "uma matriz válida" : "um produto válido"}.`);
} else {
  try {
    const snapshot = await getDoc(doc(getFirestore(getFirebaseApp()), category, id));
    if (!snapshot.exists()) {
      showError(`${itemTitle} não encontrad${catalog.itemLabel === "matriz" ? "a" : "o"}`, `${catalog.itemLabel === "matriz" ? "Esta matriz" : "Este produto"} pode ter sido removid${catalog.itemLabel === "matriz" ? "a" : "o"} ou o endereço está incorreto.`);
    } else {
      const product = snapshot.data();
      const label = catalog.categories[category].label;
      const name = product.nome || itemTitle;
      document.title = `${name} | Maycon Brown`;
      document.querySelector('meta[name="description"]')?.setAttribute("content", String(product.descricao || `${name} disponível na Maycon Brown`).slice(0, 155));

      const layout = document.createElement("div");
      layout.className = "detail-layout";
      const media = document.createElement("div");
      media.className = "detail-media";
      const image = document.createElement("img");
      image.src = product.imagem || "/img/icone.png";
      image.alt = name;
      image.decoding = "async";
      media.append(image);
      if (product.promocao) {
        const badge = document.createElement("span");
        badge.className = "promo";
        badge.textContent = "Promoção";
        media.append(badge);
      }

      const panel = document.createElement("section");
      panel.className = "detail-panel";
      panel.innerHTML = `
        <nav class="breadcrumb" aria-label="Navegação estrutural">
          <a href="/">Início</a><span>›</span><a href="${catalog.publicIndex}">${catalog.label}</a><span>›</span><a href="${categoryUrl(category)}">${label}</a>
        </nav>
        <span class="eyebrow">Entrega automática</span>`;
      const title = document.createElement("h1");
      title.textContent = name;
      const description = document.createElement("p");
      description.className = "detail-description";
      description.textContent = product.descricao || "Confira todos os detalhes antes de concluir sua compra.";
      const price = document.createElement("p");
      price.className = "price-large";
      price.textContent = formatPrice(product.valor);
      panel.append(title, description, price);
      if (product.link) {
        const buy = document.createElement("a");
        buy.className = "button button-primary";
        buy.href = product.link;
        buy.target = "_blank";
        buy.rel = "noopener noreferrer";
        buy.textContent = "Comprar agora";
        buy.style.width = "min(100%, 420px)";
        panel.append(buy);
      }
      const trust = document.createElement("div");
      trust.className = "trust-list";
      ["Pagamento seguro", "Acesso liberado após a confirmação", "Suporte especializado quando precisar"].forEach((text) => {
        const item = document.createElement("span");
        item.textContent = text;
        trust.append(item);
      });
      panel.append(trust);
      layout.append(media, panel);
      target.replaceChildren(layout);
    }
  } catch (error) {
    console.error("Falha ao carregar produto", error);
    showError("Não foi possível carregar", "Verifique sua conexão e tente novamente em alguns instantes.");
  }
}
