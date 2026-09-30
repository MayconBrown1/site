import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { formatPrice, getCatalogConfig, getCategoryFromPage, getFirebaseApp, productUrl, setupMenu, siteFooter, siteHeader } from "./firebase.js";

const category = getCategoryFromPage();
const catalog = getCatalogConfig();
const noItem = catalog.itemLabel === "matriz" ? "Nenhuma matriz" : "Nenhum produto";
const itemTitle = catalog.itemLabel === "matriz" ? "Matriz" : "Produto";
const itemPlural = catalog.itemLabel === "matriz" ? "matrizes" : "produtos";

if (!category) {
  document.title = "Categoria não encontrada | Maycon Brown";
  document.body.innerHTML = `${siteHeader()}<main id="conteudo" class="container content"><div class="state"><h1>Categoria não encontrada</h1><p>Volte ao catálogo para escolher uma categoria válida.</p><a class="button button-primary" href="${catalog.publicIndex}">Ver catálogo</a></div></main>${siteFooter()}`;
  setupMenu();
} else {
  const meta = catalog.categories[category];
  document.title = `${meta.label} | ${catalog.label} Maycon Brown`;
  document.body.innerHTML = `
    ${siteHeader()}
    <main id="conteudo">
      <section class="hero">
        <div class="container hero-inner">
          <span class="eyebrow">Catálogo atualizado em tempo real</span>
          <h1>${meta.label}</h1>
          <p>${meta.description} Escolha uma opção para conferir todos os detalhes antes da compra.</p>
        </div>
      </section>
      <section class="container content" aria-labelledby="titulo-produtos">
        <div class="toolbar">
          <div class="search-wrap">
            <span class="search-icon" aria-hidden="true">⌕</span>
            <label class="visually-hidden" for="busca">Buscar ${itemPlural}</label>
            <input class="search" id="busca" type="search" placeholder="Buscar por nome ou descrição…" autocomplete="off">
          </div>
          <span class="count" id="contador" aria-live="polite">Carregando…</span>
        </div>
        <h2 id="titulo-produtos" class="visually-hidden">${catalog.label}</h2>
        <div class="product-grid" id="lista-produtos" aria-live="polite">
          <div class="state"><div class="spinner" aria-hidden="true"></div>Carregando ${itemPlural}…</div>
        </div>
      </section>
    </main>
    ${siteFooter()}`;

  setupMenu();
  const list = document.querySelector("#lista-produtos");
  const search = document.querySelector("#busca");
  const count = document.querySelector("#contador");
  let products = [];

  function createCard(product) {
    const article = document.createElement("article");
    article.className = "product-card";

    const media = document.createElement("a");
    media.className = "product-media";
    media.href = productUrl(category, product.id);
    media.setAttribute("aria-label", `Ver detalhes de ${product.nome || catalog.itemLabel}`);

    const image = document.createElement("img");
    image.src = product.imagem || "/img/icone.png";
    image.alt = product.nome || itemTitle;
    image.loading = "lazy";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    media.append(image);

    if (product.promocao) {
      const badge = document.createElement("span");
      badge.className = "promo";
      badge.textContent = "Promoção";
      media.append(badge);
    }

    const body = document.createElement("div");
    body.className = "product-body";
    const title = document.createElement("h3");
    title.textContent = product.nome || `${itemTitle} sem nome`;
    const description = document.createElement("p");
    description.className = "description";
    description.textContent = product.descricao || `Confira os detalhes ${catalog.itemLabel === "matriz" ? "desta matriz" : "deste produto"}.`;
    const price = document.createElement("p");
    price.className = "price";
    price.textContent = formatPrice(product.valor);
    const actions = document.createElement("div");
    actions.className = "actions";
    const details = document.createElement("a");
    details.className = "button button-primary";
    details.href = productUrl(category, product.id);
    details.textContent = "Ver detalhes";
    actions.append(details);
    if (product.link) {
      const buy = document.createElement("a");
      buy.className = "button button-secondary";
      buy.href = product.link;
      buy.target = "_blank";
      buy.rel = "noopener noreferrer";
      buy.textContent = "Comprar";
      buy.setAttribute("aria-label", `Comprar ${product.nome || catalog.itemLabel}`);
      actions.append(buy);
    }
    body.append(title, description, price, actions);
    article.append(media, body);
    return article;
  }

  function render(query = "") {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    const filtered = normalized
      ? products.filter((product) => `${product.nome || ""} ${product.descricao || ""}`.toLocaleLowerCase("pt-BR").includes(normalized))
      : products;
    list.replaceChildren();
    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "state";
      empty.textContent = normalized ? `${noItem} corresponde à busca.` : `${noItem} disponível nesta categoria.`;
      list.append(empty);
    } else {
      list.append(...filtered.map(createCard));
    }
    count.textContent = `${filtered.length} ${filtered.length === 1 ? catalog.itemLabel : catalog.itemLabel === "matriz" ? "matrizes" : "produtos"}`;
  }

  search.addEventListener("input", (event) => render(event.target.value));

  try {
    const snapshot = await getDocs(collection(getFirestore(getFirebaseApp()), category));
    products = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => (Number(a.ordem) || 9999) - (Number(b.ordem) || 9999) || String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
    render();
  } catch (error) {
    console.error("Falha ao carregar catálogo", error);
    list.innerHTML = `<div class="state"><strong>Não foi possível carregar ${catalog.itemLabel === "matriz" ? "as matrizes" : "os produtos"}.</strong><br>Verifique sua conexão e tente novamente.</div>`;
    count.textContent = "Indisponível";
  }
}
