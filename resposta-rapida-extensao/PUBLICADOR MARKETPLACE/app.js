import { ITEM_CATEGORIES, CONDITIONS, AVAILABILITIES, DELIVERY_METHODS } from "../config/categories.js";
import { createId, formatBRL, normalizeMarketplacePrice, parseTags, moveItem, queueStats } from "../shared/utils.js";
import { DEFAULT_SETTINGS, KEYS, getAds, getSettings, initializeStorage, newAd, saveAds, setLocal } from "../storage/storage.js";
import { deleteImages, getImage, putImage } from "../storage/images.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const PRIVACY_CONSENT_KEY = "privacyConsentVersion";
const PRIVACY_CONSENT_VERSION = 1;
const state = { ads: [], settings: { ...DEFAULT_SETTINGS }, queue: {}, logs: [], editingId: null, draftImages: [], originalImageIds: [], addedImageIds: [], objectUrls: [] };

async function ensurePrivacyConsent() {
  const stored = await chrome.storage.local.get(PRIVACY_CONSENT_KEY);
  if ((stored[PRIVACY_CONSENT_KEY] || 0) >= PRIVACY_CONSENT_VERSION) return;
  const dialog = $("#privacy-consent");
  dialog.addEventListener("cancel", (event) => event.preventDefault());
  dialog.showModal();
  await new Promise((resolve) => $("#accept-privacy").addEventListener("click", async () => {
    await chrome.storage.local.set({ [PRIVACY_CONSENT_KEY]: PRIVACY_CONSENT_VERSION });
    dialog.close();
    resolve();
  }, { once: true }));
}

const stageLabels = {
  IDLE: "Parado", OPENING_MARKETPLACE: "Abrindo Marketplace", SELECTING_LISTING_TYPE: "Selecionando tipo",
  UPLOADING_IMAGES: "Adicionando imagens", FILLING_FORM: "Preenchendo formulário", SELECTING_CATEGORY: "Selecionando categoria",
  SELECTING_CONDITION: "Selecionando condição", FILLING_DESCRIPTION: "Preenchendo descrição", FILLING_OPTIONAL_TEXT: "Preenchendo campos opcionais", SELECTING_AVAILABILITY: "Selecionando disponibilidade", FILLING_TAGS: "Preenchendo etiquetas",
  SELECTING_LOCATION: "Selecionando localização", SELECTING_DELIVERY: "Selecionando recebimento", NEXT_STEP: "Avançando",
  SELECTING_GROUPS: "Selecionando grupos", PREPARING_PUBLISH: "Preparando publicação", PUBLISHING: "Publicando", VERIFYING: "Verificando publicação", DONE: "Finalizado"
};
const stageOrder = ["OPENING_MARKETPLACE", "SELECTING_LISTING_TYPE", "UPLOADING_IMAGES", "FILLING_FORM", "SELECTING_CATEGORY", "SELECTING_CONDITION", "FILLING_DESCRIPTION", "FILLING_OPTIONAL_TEXT", "SELECTING_AVAILABILITY", "FILLING_TAGS", "SELECTING_LOCATION", "SELECTING_DELIVERY", "NEXT_STEP", "SELECTING_GROUPS", "PREPARING_PUBLISH", "PUBLISHING", "VERIFYING", "DONE"];

function send(message) {
  return new Promise((resolve, reject) => chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
    else if (!response?.ok) reject(new Error(response?.error || "Falha na extensão"));
    else resolve(response);
  }));
}

function toast(message, error = false) {
  const node = $("#toast");
  node.textContent = message;
  node.className = `toast${error ? " error" : ""}`;
  setTimeout(() => node.classList.add("hidden"), 3200);
}

function optionHtml(items, selected) {
  return items.map((item) => `<option value="${escapeHtml(item)}"${item === selected ? " selected" : ""}>${escapeHtml(item)}</option>`).join("");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function populateStaticFields() {
  $("#settings-category").innerHTML = optionHtml(ITEM_CATEGORIES);
  $("#ad-category").innerHTML = optionHtml(ITEM_CATEGORIES);
  $("#settings-condition").innerHTML = optionHtml(CONDITIONS);
  $("#ad-condition").innerHTML = optionHtml(CONDITIONS);
  $("#settings-availability").innerHTML = optionHtml(AVAILABILITIES);
  $("#ad-availability").innerHTML = optionHtml(AVAILABILITIES);
  for (const target of [$("#settings-delivery"), $("#ad-delivery")]) {
    target.innerHTML = DELIVERY_METHODS.map((method) => `<label><input type="checkbox" value="${escapeHtml(method)}"> ${escapeHtml(method)}</label>`).join("");
  }
}

async function refresh() {
  const data = await send({ type: "GET_SNAPSHOT" });
  Object.assign(state, { ads: data.ads, settings: { ...DEFAULT_SETTINGS, ...data.settings }, queue: data.queue, logs: data.logs });
  render();
}

function render() {
  renderAds();
  renderQueue();
  renderLogs();
  renderConfirmation();
}

function renderAds() {
  $("#ad-count").textContent = `${state.ads.length} anúncio${state.ads.length === 1 ? "" : "s"} cadastrado${state.ads.length === 1 ? "" : "s"}`;
  const list = $("#ads-list");
  if (!state.ads.length) {
    list.innerHTML = '<p class="empty">Nenhum anúncio ainda. Adicione o primeiro para montar a fila.</p>';
    return;
  }
  list.innerHTML = state.ads.map((ad, index) => `
    <article class="ad-row" data-id="${ad.id}">
      <input type="checkbox" data-action="select" aria-label="Selecionar ${escapeHtml(ad.title)}" ${ad.selected ? "checked" : ""}>
      <div class="ad-main"><strong>${String(index + 1).padStart(2, "0")} — ${escapeHtml(ad.title || "Sem título")}</strong><span>${formatBRL(ad.price)} · ${escapeHtml(ad.category || ad.listingType)}${ad.lastError ? ` · ${escapeHtml(ad.lastError)}` : ""}</span></div>
      <span class="status ${ad.status.toLowerCase()}">${escapeHtml(ad.status)}</span>
      <div class="row-actions">
        <button class="icon-button" data-action="up" title="Mover para cima" ${index === 0 ? "disabled" : ""}>↑</button>
        <button class="icon-button" data-action="down" title="Mover para baixo" ${index === state.ads.length - 1 ? "disabled" : ""}>↓</button>
        <button class="icon-button" data-action="edit" title="Editar">✎</button>
        <button class="icon-button" data-action="duplicate" title="Duplicar">⧉</button>
        <button class="icon-button danger" data-action="delete" title="Excluir">×</button>
      </div>
    </article>`).join("");
}

function renderQueue() {
  const stats = queueStats(state.ads);
  $("#published-stat").textContent = stats.published;
  $("#pending-stat").textContent = stats.pending;
  $("#error-stat").textContent = stats.errors;
  $("#step-stat").textContent = stageLabels[state.queue.currentState] || state.queue.currentState || "IDLE";
  const active = state.ads.find((ad) => ad.id === state.queue.currentAdId);
  const total = state.queue.adIds?.length || 0;
  const position = Math.min((state.queue.currentIndex ?? -1) + 1, total);
  const stageIndex = Math.max(0, stageOrder.indexOf(state.queue.currentState));
  const stageFraction = stageIndex / Math.max(1, stageOrder.length - 1);
  const percent = total ? Math.round(((Math.max(0, state.queue.currentIndex) + stageFraction) / total) * 100) : 0;
  $("#progress-bar").style.width = `${state.queue.status === "completed" ? 100 : percent}%`;
  $(".queue-panel").classList.toggle("running", state.queue.status === "running");
  const titles = { idle: "Fila parada", running: "Publicação em andamento", paused: "Fila pausada", stopped: "Fila interrompida", interrupted: "Fila interrompida pelo navegador", completed: "Fila finalizada" };
  $("#queue-title").textContent = active ? `${position}/${total} — ${active.title}` : (titles[state.queue.status] || "Fila parada");
  $("#queue-subtitle").textContent = active ? `${titles[state.queue.status] || state.queue.status} · ${stageLabels[state.queue.currentState] || state.queue.currentState}` : (state.queue.status === "completed" ? `✓ ${total} anúncio(s) processado(s)` : "Selecione os anúncios e clique em Iniciar.");
  $("#start").disabled = ["running", "paused", "interrupted"].includes(state.queue.status) || Boolean(state.queue.requiresConfirmation);
  $("#pause").disabled = state.queue.status !== "running";
  $("#resume").disabled = !["paused", "interrupted"].includes(state.queue.status) || Boolean(state.queue.requiresConfirmation);
  $("#stop").disabled = !["running", "paused", "interrupted"].includes(state.queue.status);
}

function renderLogs() {
  const node = $("#logs");
  if (!state.logs.length) { node.innerHTML = '<p class="empty">Nenhuma atividade nesta fila.</p>'; return; }
  node.innerHTML = state.logs.slice().reverse().map((entry) => `<div class="log ${entry.level}"><time>${new Date(entry.at).toLocaleTimeString("pt-BR")}</time>${escapeHtml(entry.message)}</div>`).join("");
}

function confirmationActions(kind) {
  if (kind === "ambiguous-publish") return [["published", "Já foi publicado"], ["retry", "Não foi publicado — tentar novamente"]];
  if (kind === "interrupted") return [["continue", "Continuar fila"], ["stop", "Manter parada"]];
  if (kind === "assisted") return [["published", "Confirmei a publicação"], ["skip", "Pular anúncio"]];
  if (kind === "manual") return [["continue", "Resolvi — continuar"], ["skip", "Pular anúncio"]];
  if (kind === "error") return [["retry-current", "Tentar novamente"], ["skip", "Pular anúncio"]];
  return [];
}

function renderConfirmation() {
  const box = $("#confirmation");
  const confirmation = state.queue.requiresConfirmation;
  if (!confirmation) { box.classList.add("hidden"); box.innerHTML = ""; return; }
  box.classList.remove("hidden");
  box.innerHTML = `<p><strong>Ação necessária.</strong> ${escapeHtml(confirmation.message)}</p><div class="actions">${confirmationActions(confirmation.kind).map(([action, label]) => `<button class="secondary" data-confirm="${action}">${escapeHtml(label)}</button>`).join("")}</div>`;
}

function fillSettingsForm() {
  const form = $("#settings-form");
  for (const [key, value] of Object.entries(state.settings)) {
    const field = form.elements.namedItem(key);
    if (!field || key === "deliveryMethods") continue;
    if (field instanceof RadioNodeList) [...field].forEach((input) => input.checked = input.value === value);
    else if (field.type === "checkbox") field.checked = Boolean(value);
    else field.value = key === "preferredGroups" ? value.join("\n") : value;
  }
  $$("input[type='checkbox']", $("#settings-delivery")).forEach((input) => input.checked = state.settings.deliveryMethods.includes(input.value));
}

function updateTypeVisibility() {
  const item = $("#listing-type").value === "item";
  $$(".item-only").forEach((node) => node.classList.toggle("hidden", !item));
  $("#type-help").textContent = item ? "Fluxo principal totalmente configurado." : "O adaptador preenche campos comuns e campos específicos importados quando os respectivos labels forem detectados. Revise no modo Assistido.";
}

async function openAdDialog(ad = null) {
  state.editingId = ad?.id || null;
  state.originalImageIds = (ad?.images || []).map((image) => image.id);
  state.addedImageIds = [];
  state.draftImages = (ad?.images || []).map((image) => ({ ...image }));
  const draft = ad ? { ...ad } : newAd(state.settings);
  const form = $("#ad-form");
  form.reset();
  $("#form-title").textContent = ad ? "Editar anúncio" : "Adicionar anúncio";
  const simpleFields = ["listingType", "title", "price", "category", "condition", "availability", "brand", "description", "sku", "location"];
  simpleFields.forEach((key) => { if (form.elements[key]) form.elements[key].value = draft[key] ?? ""; });
  form.elements.price.value = normalizeMarketplacePrice(draft.price);
  form.elements.publishToGroups.checked = draft.publishToGroups;
  form.elements.selectAllGroups.checked = draft.selectAllGroups;
  form.elements.preferredGroups.value = (draft.preferredGroups || []).join("\n");
  $$("input[type='checkbox']", $("#ad-delivery")).forEach((input) => input.checked = draft.deliveryMethods?.includes(input.value));
  $("#tags-input").value = (draft.tags || []).join(", ");
  updateTagPreview(); updateTypeVisibility(); await renderDraftImages();
  $("#ad-dialog").showModal();
}

function revokeObjectUrls() { state.objectUrls.forEach(URL.revokeObjectURL); state.objectUrls = []; }

async function renderDraftImages() {
  revokeObjectUrls();
  const tiles = [];
  for (let index = 0; index < state.draftImages.length; index += 1) {
    const ref = state.draftImages[index];
    const record = await getImage(ref.id);
    if (!record) continue;
    const url = URL.createObjectURL(record.blob); state.objectUrls.push(url);
    tiles.push(`<div class="image-tile" data-image-index="${index}"><img src="${url}" alt="${escapeHtml(ref.name)}"><div><button type="button" class="icon-button" data-image="left">←</button><button type="button" class="icon-button" data-image="view">◉</button><button type="button" class="icon-button" data-image="right">→</button><button type="button" class="icon-button danger" data-image="remove">×</button></div></div>`);
  }
  $("#image-list").innerHTML = tiles.join("") || '<p class="empty">Nenhuma imagem selecionada.</p>';
}

function updateTagPreview() {
  $("#tag-preview").innerHTML = parseTags($("#tags-input").value).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
}

async function closeDialog(save = false) {
  if (!save) {
    await deleteImages(state.addedImageIds);
  }
  revokeObjectUrls(); $("#ad-dialog").close();
}

async function saveAdFromForm(event) {
  event.preventDefault();
  if (!state.draftImages.length) return toast("Adicione ao menos uma imagem.", true);
  const form = event.currentTarget;
  const price = normalizeMarketplacePrice(form.elements.price.value);
  if (!price) return toast("Informe um preço válido.", true);
  const existing = state.ads.find((ad) => ad.id === state.editingId);
  const ad = {
    ...(existing || newAd(state.settings)), id: existing?.id || createId("ad"), status: "Pendente", lastError: null,
    listingType: form.elements.listingType.value, images: state.draftImages.map((image) => ({ ...image })), title: form.elements.title.value.trim(), price,
    category: form.elements.category.value, condition: form.elements.condition.value, availability: form.elements.availability.value,
    brand: form.elements.brand.value.trim(), description: form.elements.description.value, tags: parseTags($("#tags-input").value), sku: form.elements.sku.value.trim(),
    location: form.elements.location.value.trim(), deliveryMethods: $$("input:checked", $("#ad-delivery")).map((input) => input.value),
    publishToGroups: form.elements.publishToGroups.checked, selectAllGroups: form.elements.selectAllGroups.checked,
    preferredGroups: form.elements.preferredGroups.value.split(/\r?\n/).map((name) => name.trim()).filter(Boolean), updatedAt: Date.now()
  };
  if (!ad.title || !ad.description || !ad.location) return toast("Preencha todos os campos obrigatórios.", true);
  if (!ad.deliveryMethods.length && ad.listingType === "item") return toast("Selecione ao menos uma opção de recebimento.", true);
  const oldRemoved = state.originalImageIds.filter((id) => !state.draftImages.some((image) => image.id === id));
  const addedThenRemoved = state.addedImageIds.filter((id) => !state.draftImages.some((image) => image.id === id));
  const ads = existing ? state.ads.map((item) => item.id === ad.id ? ad : item) : [...state.ads, ad];
  await saveAds(ads); await deleteImages([...oldRemoved, ...addedThenRemoved]); await closeDialog(true); await refresh(); toast("Anúncio salvo.");
}

async function duplicateAd(ad) {
  const copies = [];
  for (const ref of ad.images || []) {
    const record = await getImage(ref.id);
    if (!record) continue;
    const id = createId("img");
    await putImage({ ...record, id, createdAt: Date.now() });
    copies.push({ ...ref, id });
  }
  const duplicate = { ...ad, id: createId("ad"), title: `${ad.title} — cópia`, images: copies, selected: true, status: "Pendente", lastError: null, createdAt: Date.now(), updatedAt: Date.now() };
  await saveAds([...state.ads, duplicate]); await refresh(); toast("Anúncio duplicado.");
}

async function removeAd(ad) {
  if (!confirm(`Excluir “${ad.title}”?`)) return;
  await deleteImages((ad.images || []).map((image) => image.id));
  await saveAds(state.ads.filter((item) => item.id !== ad.id)); await refresh();
}

async function handleAdList(event) {
  const row = event.target.closest(".ad-row"); const action = event.target.dataset.action;
  if (!row || !action) return;
  const ad = state.ads.find((item) => item.id === row.dataset.id); const index = state.ads.indexOf(ad);
  if (action === "select") { ad.selected = event.target.checked; await saveAds(state.ads); return; }
  if (action === "edit") return openAdDialog(ad);
  if (action === "duplicate") return duplicateAd(ad);
  if (action === "delete") return removeAd(ad);
  if (action === "up" || action === "down") { await saveAds(moveItem(state.ads, index, index + (action === "up" ? -1 : 1))); await refresh(); }
}

async function exportAds() {
  const portable = state.ads.map((ad) => ({ ...ad, status: "Pendente", lastError: null, images: (ad.images || []).map(({ name, type, size }) => ({ name, type, size, external: true })) }));
  const blob = new Blob([JSON.stringify({ format: "marketplace-publisher", version: 1, exportedAt: new Date().toISOString(), note: "Imagens não são incluídas; selecione-as novamente após importar.", ads: portable }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `anuncios-marketplace-${new Date().toISOString().slice(0, 10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importAds(file) {
  const parsed = JSON.parse(await file.text());
  if (parsed.format !== "marketplace-publisher" || !Array.isArray(parsed.ads)) throw new Error("Arquivo JSON não pertence ao Publicador Marketplace");
  const imported = parsed.ads.map((ad) => ({ ...newAd(state.settings), ...ad, id: createId("ad"), images: [], selected: true, status: "Pendente", lastError: null, createdAt: Date.now(), updatedAt: Date.now() }));
  await saveAds([...state.ads, ...imported]); await refresh(); toast(`${imported.length} anúncio(s) importado(s). Adicione as imagens novamente.`);
}

async function clearCompleted() {
  const completed = state.ads.filter((ad) => ad.status === "Publicado");
  if (!completed.length || !confirm(`Remover ${completed.length} anúncio(s) publicado(s)?`)) return;
  await deleteImages(completed.flatMap((ad) => ad.images?.map((image) => image.id) || []));
  await saveAds(state.ads.filter((ad) => ad.status !== "Publicado")); await refresh();
}

async function runAction(action) {
  try {
    if (action === "start") await send({ type: "START_QUEUE", adIds: state.ads.filter((ad) => ad.selected && ad.status !== "Publicado").map((ad) => ad.id) });
    else if (action === "pause") await send({ type: "PAUSE_QUEUE" });
    else if (action === "resume") await send({ type: "RESUME_QUEUE" });
    else if (action === "stop") await send({ type: "STOP_QUEUE" });
    await refresh();
  } catch (error) { toast(error.message, true); }
}

async function handleConfirmation(event) {
  const action = event.target.dataset.confirm; if (!action) return;
  try {
    if (["published", "retry", "continue"].includes(action)) await send({ type: "RESOLVE_CONFIRMATION", outcome: action });
    else if (action === "retry-current") await send({ type: "RETRY_CURRENT" });
    else if (action === "skip") await send({ type: "SKIP_CURRENT" });
    else if (action === "stop") await send({ type: "STOP_QUEUE" });
    await refresh();
  } catch (error) { toast(error.message, true); }
}

async function saveSettings(event) {
  event.preventDefault(); const form = event.currentTarget;
  const settings = {
    listingType: form.elements.listingType.value, category: form.elements.category.value, condition: form.elements.condition.value,
    availability: form.elements.availability.value, location: form.elements.location.value.trim(),
    deliveryMethods: $$("input:checked", $("#settings-delivery")).map((input) => input.value),
    publishToGroups: form.elements.publishToGroups.checked, selectAllGroups: form.elements.selectAllGroups.checked,
    preferredGroups: form.elements.preferredGroups.value.split(/\r?\n/).map((name) => name.trim()).filter(Boolean), mode: form.elements.mode.value
  };
  await setLocal({ [KEYS.SETTINGS]: settings }); state.settings = settings; toast("Configurações salvas.");
}

async function handleImages(event) {
  const files = [...event.target.files];
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    if (file.size > 20 * 1024 * 1024) { toast(`${file.name} excede 20 MB e foi ignorada.`, true); continue; }
    const id = createId("img"); await putImage({ id, blob: file, name: file.name, type: file.type, size: file.size, createdAt: Date.now() });
    state.addedImageIds.push(id);
    state.draftImages.push({ id, name: file.name, type: file.type, size: file.size });
  }
  event.target.value = ""; await renderDraftImages();
}

async function handleImageAction(event) {
  const action = event.target.dataset.image; if (!action) return;
  const tile = event.target.closest(".image-tile"); const index = Number(tile.dataset.imageIndex); const ref = state.draftImages[index];
  if (action === "left") state.draftImages = moveItem(state.draftImages, index, index - 1);
  else if (action === "right") state.draftImages = moveItem(state.draftImages, index, index + 1);
  else if (action === "remove") state.draftImages.splice(index, 1);
  else if (action === "view") { const image = await getImage(ref.id); if (image) { const url = URL.createObjectURL(image.blob); window.open(url, "_blank"); setTimeout(() => URL.revokeObjectURL(url), 60000); } }
  await renderDraftImages();
}

function bindEvents() {
  $$(".tab").forEach((button) => button.addEventListener("click", () => {
    $$(".tab").forEach((tab) => tab.classList.toggle("active", tab === button));
    $$(".view").forEach((view) => view.classList.toggle("active", view.id === `${button.dataset.tab}-view`));
    if (button.dataset.tab === "settings") fillSettingsForm();
  }));
  $("#add-ad").addEventListener("click", () => openAdDialog());
  $("#ads-list").addEventListener("click", (event) => handleAdList(event).catch((error) => toast(error.message, true)));
  $("#start").addEventListener("click", () => runAction("start")); $("#pause").addEventListener("click", () => runAction("pause"));
  $("#resume").addEventListener("click", () => runAction("resume")); $("#stop").addEventListener("click", () => runAction("stop"));
  $("#confirmation").addEventListener("click", handleConfirmation);
  $("#clear-completed").addEventListener("click", clearCompleted);
  $("#clear-log").addEventListener("click", async () => { await setLocal({ [KEYS.LOGS]: [] }); await refresh(); });
  $("#export-button").addEventListener("click", exportAds); $("#import-button").addEventListener("click", () => $("#import-file").click());
  $("#import-file").addEventListener("change", (event) => { const file = event.target.files[0]; if (file) importAds(file).catch((error) => toast(error.message, true)); event.target.value = ""; });
  $("#settings-form").addEventListener("submit", saveSettings);
  $("#ad-form").addEventListener("submit", saveAdFromForm); $("#close-dialog").addEventListener("click", () => closeDialog()); $("#cancel-dialog").addEventListener("click", () => closeDialog());
  $("#listing-type").addEventListener("change", updateTypeVisibility); $("#tags-input").addEventListener("input", updateTagPreview);
  $("#image-input").addEventListener("change", (event) => handleImages(event).catch((error) => toast(error.message, true)));
  $("#image-list").addEventListener("click", (event) => handleImageAction(event).catch((error) => toast(error.message, true)));
  chrome.storage.onChanged.addListener((_changes, area) => { if (area === "local" && !$("#ad-dialog").open) refresh().catch(console.error); });
}

populateStaticFields(); bindEvents(); await ensurePrivacyConsent(); await initializeStorage(); await refresh(); fillSettingsForm();
