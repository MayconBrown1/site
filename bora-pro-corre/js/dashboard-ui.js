import { sair } from "./permissions.js";
import { formatarMoeda, tempoRelativo } from "./utils.js";
import { nomeStatus } from "./pedidos.js";

export function iniciarShell() {
  document.getElementById("btn-sair")?.addEventListener("click", sair);
  document.getElementById("btn-menu")?.addEventListener("click", () => document.getElementById("sidebar")?.classList.toggle("open"));
  document.querySelectorAll("[data-close-modal]").forEach(btn => btn.addEventListener("click", () => btn.closest(".modal")?.classList.remove("open")));
  document.querySelectorAll(".modal").forEach(modal => modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("open"); }));
}

export function abrirModal(id) { document.getElementById(id)?.classList.add("open"); }
export function fecharModal(id) { document.getElementById(id)?.classList.remove("open"); }
export function escapar(valor = "") {
  const el = document.createElement("div"); el.textContent = valor; return el.innerHTML;
}
export function dataCurta(timestamp) {
  if (!timestamp) return "—";
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"numeric" });
}
export function pillStatus(status) {
  const cls = status === "entregue" ? "status-ok" : status === "cancelado" ? "status-bad" : status === "disponivel" ? "status-info" : "status-warn";
  return `<span class="status-pill ${cls}">${escapar(nomeStatus(status))}</span>`;
}
export function cardEntrega(item, acoes = "") {
  return `<article class="delivery-card" data-id="${item.id}">
    <div class="delivery-head"><div><div class="eyebrow">${escapar(item.categoriaProduto || "Entrega")}</div><h3>${escapar(item.descricaoProduto || "Produto não informado")}</h3><p class="muted">${escapar(item.storeNome || "Estabelecimento")} · ${tempoRelativo(item.criadoEm)}</p></div><div class="delivery-value">${formatarMoeda(item.valor)}</div></div>
    <div class="route"><div class="route-rail"><span class="route-dot"></span><span class="route-line"></span><span class="route-dot end"></span></div><div class="route-copy"><div><small>Retirada</small>${escapar(item.retirada)}</div><div><small>Destino · ${escapar(item.destinatario || "Destinatário")}</small>${escapar(item.destino)}</div></div></div>
    <p class="muted" style="margin-top:.8rem">Reputação do estabelecimento: <strong style="color:#fff">${item.storeAvaliacao?.total ? `${Number(item.storeAvaliacao.media).toFixed(1)} ★ (${item.storeAvaliacao.total})` : "novo na plataforma"}</strong></p>
    ${item.courierNome ? `<p class="muted" style="margin-top:.35rem">Entregador: <strong style="color:#fff">${escapar(item.courierNome)}</strong> · ${item.courierAvaliacao?.total ? `${Number(item.courierAvaliacao.media).toFixed(1)} ★ (${item.courierAvaliacao.total})` : "novo na plataforma"}</p>` : ""}
    ${item.observacoes ? `<p class="muted" style="margin-top:.65rem">Observação: ${escapar(item.observacoes)}</p>` : ""}
    <div style="display:flex;justify-content:space-between;gap:.7rem;align-items:center;margin-top:1rem">${pillStatus(item.status)}<span class="muted" style="font-size:.75rem">#${item.id.slice(0,8).toUpperCase()}</span></div>
    ${acoes ? `<div class="card-actions">${acoes}</div>` : ""}
  </article>`;
}

export function estadoVazio(titulo, texto) { return `<div class="empty-state"><strong style="display:block;color:#fff;margin-bottom:.35rem">${escapar(titulo)}</strong>${escapar(texto)}</div>`; }
