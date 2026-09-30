<<<<<<< HEAD
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-storage.js";
import { categoryUrl, formatPrice, getCatalogConfig, getCategoryFromPage, getFirebaseApp, getPrimaryAdminApp, productUrl, setupMenu, siteHeader } from "./firebase.js";
=======
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-storage.js";
import { categoryUrl, formatPrice, getCatalogConfig, getCategoryFromPage, getFirebaseApp, productUrl, setupMenu, siteHeader } from "./firebase.js";
>>>>>>> e9834ea03941b1cb5c980eab37cbd31d24c7e9ee

const category = getCategoryFromPage();
const catalog = getCatalogConfig();
const noItem = catalog.itemLabel === "matriz" ? "Nenhuma matriz" : "Nenhum produto";
const itemTitle = catalog.itemLabel === "matriz" ? "Matriz" : "Produto";
const itemPlural = catalog.itemLabel === "matriz" ? "Matrizes" : "Produtos";
const addItem = catalog.itemLabel === "matriz" ? "Adicionar matriz" : "Adicionar produto";

if (!category) {
  document.body.innerHTML = `${siteHeader({ admin: true })}<main id="conteudo" class="container content"><div class="state"><h1>Categoria inválida</h1><a class="button button-primary" href="${catalog.adminIndex}">Voltar</a></div></main>`;
  setupMenu();
} else {
  const app = getFirebaseApp();
  const auth = getAuth(app);
<<<<<<< HEAD
  const primaryAuth = getAuth(getPrimaryAdminApp());
=======
>>>>>>> e9834ea03941b1cb5c980eab37cbd31d24c7e9ee
  const db = getFirestore(app);
  const storage = getStorage(app);
  const meta = catalog.categories[category];
  let editingId = null;
  let products = [];

  document.title = `Gerenciar ${meta.label} | Maycon Brown`;
  document.body.innerHTML = `
    ${siteHeader({ admin: true })}
    <main id="conteudo" class="container admin-shell">
<<<<<<< HEAD
      <section id="session-view" class="panel login-card">
        <div class="state"><div class="spinner"></div>Validando o acesso administrativo…</div>
=======
      <section id="login-view" class="panel login-card" hidden>
        <span class="eyebrow">Acesso protegido</span>
        <h1 style="font-size:2rem">Entrar no catálogo</h1>
        <p style="color:var(--muted);line-height:1.6">Use o usuário administrador do projeto Firebase <strong>${catalog.firebaseConfig.projectId}</strong>.</p>
        <form id="login-form" class="form-grid">
          <div class="field field-full"><label for="login-email">E-mail</label><input id="login-email" name="email" type="email" autocomplete="username" required></div>
          <div class="field field-full"><label for="login-password">Senha</label><input id="login-password" name="password" type="password" autocomplete="current-password" required></div>
          <div class="field-full"><button class="button button-primary" type="submit" style="width:100%">Entrar</button></div>
        </form>
        <p id="login-status" class="status-message" aria-live="polite"></p>
>>>>>>> e9834ea03941b1cb5c980eab37cbd31d24c7e9ee
      </section>

      <div id="admin-view" hidden>
        <div class="admin-top">
          <div><span class="eyebrow">Catálogo em tempo real</span><h1>Gerenciar ${meta.label}</h1></div>
          <div class="form-actions">
            <a class="button button-secondary" href="${categoryUrl(category)}" target="_blank" rel="noopener">Abrir página pública</a>
            <button class="button button-danger" id="logout" type="button">Sair</button>
          </div>
        </div>

        <section class="panel" aria-labelledby="form-title">
          <h2 id="form-title" style="margin-top:0">${addItem}</h2>
          <form id="product-form">
            <div class="form-grid">
              <div class="field"><label for="nome">Nome ${catalog.itemLabel === "matriz" ? "da matriz" : "do produto"}</label><input id="nome" name="nome" required maxlength="120"></div>
              <div class="field"><label for="valor">Preço</label><input id="valor" name="valor" required placeholder="89,99" maxlength="40"></div>
              <div class="field field-full"><label for="descricao">Descrição</label><textarea id="descricao" name="descricao" required maxlength="2500"></textarea></div>
              <div class="field field-full"><label for="link">Link de compra</label><input id="link" name="link" type="url" required placeholder="https://..."></div>
              <div class="field"><label for="imagem">URL da imagem</label><input id="imagem" name="imagem" type="url" placeholder="https://..."></div>
              <div class="field"><label for="imagem-arquivo">Ou enviar nova imagem</label><input id="imagem-arquivo" name="imagemArquivo" type="file" accept="image/jpeg,image/png,image/webp,image/avif"></div>
              <div class="field"><label for="ordem">Ordem de exibição</label><input id="ordem" name="ordem" type="number" min="0" step="1" placeholder="10"></div>
              <label class="check-row"><input id="promocao" name="promocao" type="checkbox"> Destacar como promoção</label>
            </div>
            <div class="form-actions">
              <button class="button button-primary" id="save-button" type="submit">${addItem}</button>
              <button class="button button-secondary" id="cancel-button" type="button" hidden>Cancelar edição</button>
            </div>
            <p id="form-status" class="status-message" aria-live="polite"></p>
          </form>
        </section>

        <section class="admin-grid" aria-labelledby="products-title">
          <div class="toolbar">
            <h2 id="products-title">${itemPlural} cadastrad${catalog.itemLabel === "matriz" ? "as" : "os"}</h2>
            <span class="count" id="contador">Carregando…</span>
          </div>
          <div class="product-grid" id="lista-produtos"><div class="state"><div class="spinner"></div>Carregando ${itemPlural.toLowerCase()}…</div></div>
        </section>
      </div>
    </main>`;

  setupMenu();
<<<<<<< HEAD
  const sessionView = document.querySelector("#session-view");
  const adminView = document.querySelector("#admin-view");
=======
  const loginView = document.querySelector("#login-view");
  const adminView = document.querySelector("#admin-view");
  const loginForm = document.querySelector("#login-form");
  const loginStatus = document.querySelector("#login-status");
>>>>>>> e9834ea03941b1cb5c980eab37cbd31d24c7e9ee
  const productForm = document.querySelector("#product-form");
  const formTitle = document.querySelector("#form-title");
  const formStatus = document.querySelector("#form-status");
  const saveButton = document.querySelector("#save-button");
  const cancelButton = document.querySelector("#cancel-button");
  const list = document.querySelector("#lista-produtos");
  const counter = document.querySelector("#contador");

  function setStatus(element, message, type = "") {
    element.textContent = message;
    element.className = `status-message ${type}`.trim();
  }

  function resetForm() {
    editingId = null;
    productForm.reset();
    formTitle.textContent = addItem;
    saveButton.textContent = addItem;
    cancelButton.hidden = true;
    setStatus(formStatus, "");
  }

  function createAdminCard(product) {
    const article = document.createElement("article");
    article.className = "product-card";
    const media = document.createElement("div");
    media.className = "product-media";
    const image = document.createElement("img");
    image.src = product.imagem || "/img/icone.png";
    image.alt = product.nome || itemTitle;
    image.loading = "lazy";
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
    description.textContent = product.descricao || "Sem descrição";
    const price = document.createElement("p");
    price.className = "price";
    price.textContent = formatPrice(product.valor);
    const actions = document.createElement("div");
    actions.className = "admin-card-actions";
    const edit = document.createElement("button");
    edit.className = "button button-primary";
    edit.type = "button";
    edit.textContent = "Editar";
    edit.addEventListener("click", () => editProduct(product.id));
    const preview = document.createElement("a");
    preview.className = "button button-secondary";
    preview.href = productUrl(category, product.id);
    preview.target = "_blank";
    preview.rel = "noopener";
    preview.textContent = "Visualizar";
    const remove = document.createElement("button");
    remove.className = "button button-danger";
    remove.type = "button";
    remove.textContent = "Excluir";
    remove.addEventListener("click", () => deleteProduct(product.id, product.nome));
    actions.append(edit, preview, remove);
    body.append(title, description, price, actions);
    article.append(media, body);
    return article;
  }

  function render() {
    list.replaceChildren();
    if (!products.length) {
      const empty = document.createElement("div");
      empty.className = "state";
      empty.textContent = catalog.itemLabel === "matriz" ? "Nenhuma matriz cadastrada nesta categoria." : "Nenhum produto cadastrado nesta categoria.";
      list.append(empty);
    } else {
      list.append(...products.map(createAdminCard));
    }
    counter.textContent = `${products.length} ${products.length === 1 ? catalog.itemLabel : catalog.itemLabel === "matriz" ? "matrizes" : "produtos"}`;
  }

  async function loadProducts() {
    list.innerHTML = `<div class="state"><div class="spinner"></div>Atualizando ${itemPlural.toLowerCase()}…</div>`;
    const snapshot = await getDocs(collection(db, category));
    products = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => (Number(a.ordem) || 9999) - (Number(b.ordem) || 9999) || String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
    render();
  }

  async function editProduct(id) {
    setStatus(formStatus, `Carregando ${catalog.itemLabel}…`);
    const snapshot = await getDoc(doc(db, category, id));
    if (!snapshot.exists()) return setStatus(formStatus, `${itemTitle} não encontrad${catalog.itemLabel === "matriz" ? "a" : "o"}.`, "error");
    const product = snapshot.data();
    editingId = id;
    productForm.nome.value = product.nome || "";
    productForm.valor.value = product.valor || "";
    productForm.descricao.value = product.descricao || "";
    productForm.link.value = product.link || "";
    productForm.imagem.value = product.imagem || "";
    productForm.ordem.value = product.ordem ?? "";
    productForm.promocao.checked = Boolean(product.promocao);
    formTitle.textContent = `Editar: ${product.nome || catalog.itemLabel}`;
    saveButton.textContent = "Salvar alterações";
    cancelButton.hidden = false;
    setStatus(formStatus, `As alterações serão refletidas imediatamente na lista e na página ${catalog.itemLabel === "matriz" ? "da matriz" : "do produto"}.`, "success");
    document.querySelector(".panel").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function deleteProduct(id, name) {
    if (!confirm(`Excluir “${name || (catalog.itemLabel === "matriz" ? "esta matriz" : "este produto") }”? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteDoc(doc(db, category, id));
      if (editingId === id) resetForm();
      await loadProducts();
    } catch (error) {
      console.error(error);
      alert("Não foi possível excluir. Verifique sua permissão e tente novamente.");
    }
  }

<<<<<<< HEAD
=======
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = loginForm.querySelector("button");
    button.disabled = true;
    setStatus(loginStatus, "Entrando…");
    try {
      await signInWithEmailAndPassword(auth, loginForm.email.value.trim(), loginForm.password.value);
      loginForm.reset();
    } catch (error) {
      console.error(error);
      setStatus(loginStatus, "E-mail ou senha inválidos para este projeto Firebase.", "error");
    } finally {
      button.disabled = false;
    }
  });

>>>>>>> e9834ea03941b1cb5c980eab37cbd31d24c7e9ee
  productForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    saveButton.disabled = true;
    setStatus(formStatus, "Salvando…");
    try {
      let imageUrl = productForm.imagem.value.trim();
      const file = productForm.imagemArquivo.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 5 MB.");
        const safeName = file.name.replace(/[^a-z0-9._-]+/gi, "-").toLowerCase();
        const imageRef = ref(storage, `produtos/${category}/${Date.now()}-${safeName}`);
        const upload = await uploadBytes(imageRef, file, { contentType: file.type });
        imageUrl = await getDownloadURL(upload.ref);
      }
      if (!imageUrl) throw new Error("Informe uma URL ou selecione uma imagem.");
      const data = {
        nome: productForm.nome.value.trim(),
        descricao: productForm.descricao.value.trim(),
        valor: productForm.valor.value.trim(),
        link: productForm.link.value.trim(),
        imagem: imageUrl,
        promocao: productForm.promocao.checked,
        ordem: Number(productForm.ordem.value) || 0,
        atualizadoEm: serverTimestamp()
      };
      if (editingId) {
        await updateDoc(doc(db, category, editingId), data);
      } else {
        await addDoc(collection(db, category), { ...data, criadoEm: serverTimestamp() });
      }
      resetForm();
      setStatus(formStatus, `${itemTitle} salv${catalog.itemLabel === "matriz" ? "a" : "o"}. A página pública já está atualizada.`, "success");
      await loadProducts();
    } catch (error) {
      console.error(error);
      setStatus(formStatus, error.message || `Não foi possível salvar ${catalog.itemLabel === "matriz" ? "a matriz" : "o produto"}.`, "error");
    } finally {
      saveButton.disabled = false;
    }
  });

  cancelButton.addEventListener("click", resetForm);
<<<<<<< HEAD
  document.querySelector("#logout").addEventListener("click", async () => {
    await Promise.all([signOut(auth), signOut(primaryAuth)]);
    window.location.replace("/admin/login.html");
  });

  function returnToGeneralLogin() {
    const next = `${location.pathname}${location.search}`;
    window.location.replace(`/admin/login.html?next=${encodeURIComponent(next)}`);
  }

  let stopCatalogObserver;
  onAuthStateChanged(primaryAuth, (primaryUser) => {
    if (!primaryUser) {
      returnToGeneralLogin();
      return;
    }

    if (stopCatalogObserver) stopCatalogObserver();
    stopCatalogObserver = onAuthStateChanged(auth, async (catalogUser) => {
      const sameUser = catalogUser
        && catalogUser.email
        && primaryUser.email
        && catalogUser.email.toLowerCase() === primaryUser.email.toLowerCase();

      if (!sameUser) {
        await signOut(auth).catch(() => {});
        returnToGeneralLogin();
        return;
      }

      sessionView.hidden = true;
      adminView.hidden = false;
=======
  document.querySelector("#logout").addEventListener("click", () => signOut(auth));

  onAuthStateChanged(auth, async (user) => {
    loginView.hidden = Boolean(user);
    adminView.hidden = !user;
    if (user) {
>>>>>>> e9834ea03941b1cb5c980eab37cbd31d24c7e9ee
      try {
        await loadProducts();
      } catch (error) {
        console.error(error);
        list.innerHTML = `<div class="state">Não foi possível carregar ${catalog.itemLabel === "matriz" ? "as matrizes" : "os produtos"}. Confirme as regras do Firestore.</div>`;
      }
<<<<<<< HEAD
    });
=======
    } else {
      products = [];
      render();
    }
>>>>>>> e9834ea03941b1cb5c980eab37cbd31d24c7e9ee
  });
}
