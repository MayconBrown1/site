import { db } from "./firebase-config.js";
import { exigirPerfil } from "./permissions.js";
import { doc, getDoc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { aceitarEntrega, confirmarEtapa, motivoBloqueio, observarEntregasDisponiveis, observarEntregasDoEntregador } from "./pedidos.js";
import { avaliar } from "./avaliacoes.js";
import { mostrarToast, monitorarConexao } from "./utils.js";
import { abrirModal, cardEntrega, estadoVazio, fecharModal, iniciarShell } from "./dashboard-ui.js";

let sessao, perfil, disponiveis = [], minhas = [], filtro = "disponiveis", entregaAvaliacao = null, nota = 0;

function acoes(item, disponivel = false) {
  if (disponivel) return `<button class="btn btn-primary" data-action="aceitar">Aceitar por R$ ${Number(item.valor).toFixed(2).replace(".",",")}</button>`;
  if (item.status === "aceito" && !item.confirmacoes?.retiradaEntregador) return `<button class="btn btn-primary" data-action="retirada">Confirmar retirada</button>`;
  if (item.status === "retirado" && !item.confirmacoes?.entregaEntregador && item.confirmacoes?.entregaLoja) return `<button class="btn btn-primary" data-action="entrega">Confirmar entrega</button>`;
  if (item.status === "retirado" && !item.confirmacoes?.entregaLoja) return `<button class="btn" disabled>Aguardando confirmação do estabelecimento</button>`;
  if (item.status === "entregue") return `<button class="btn" data-action="avaliar">Avaliar estabelecimento</button>`;
  return "";
}

function render() {
  let itens = [], vazio = ["Tudo certo por aqui", "Nenhuma corrida nesta lista."];
  if (filtro === "disponiveis") { itens = perfil?.online && !motivoBloqueio(perfil) ? disponiveis : []; vazio = [perfil?.online ? "Aguardando novas corridas" : "Você está offline", perfil?.online ? "Quando um estabelecimento publicar, a corrida aparecerá aqui em tempo real." : "Fique online para visualizar e aceitar corridas."]; }
  if (filtro === "andamento") { itens = minhas.filter(e => ["aceito","retirado"].includes(e.status)); vazio = ["Nenhuma entrega ativa", "Aceite uma corrida disponível para começar."]; }
  if (filtro === "historico") { itens = minhas.filter(e => ["entregue","cancelado"].includes(e.status)); vazio = ["Histórico vazio", "Suas entregas concluídas aparecerão aqui."]; }
  const disponivel = filtro === "disponiveis";
  document.getElementById("lista-entregas").innerHTML = itens.length ? itens.map(e => cardEntrega(e, acoes(e, disponivel))).join("") : estadoVazio(...vazio);
  document.getElementById("stat-ofertas").textContent = disponiveis.length;
  document.getElementById("stat-ativas").textContent = perfil?.entregasAtivas || 0;
  document.getElementById("stat-concluidas").textContent = perfil?.estatisticas?.entregasRealizadas || 0;
  document.getElementById("stat-avaliacao").textContent = perfil?.avaliacao?.total ? `${Number(perfil.avaliacao.media).toFixed(1)} ★` : "Nova";
}

async function agir(e) {
  const btn = e.target.closest("[data-action]"); if (!btn) return;
  const id = btn.closest("[data-id]").dataset.id;
  const item = [...disponiveis, ...minhas].find(x => x.id === id); if (!item) return;
  btn.disabled = true;
  try {
    if (btn.dataset.action === "aceitar") { await aceitarEntrega(id, sessao.user.uid); filtro = "andamento"; ativarAba(); mostrarToast("Corrida aceita. Bora pro corre!", "sucesso"); }
    else if (btn.dataset.action === "retirada") { await confirmarEtapa(id, "entregador", "retirada", sessao.user.uid); mostrarToast("Retirada confirmada.", "sucesso"); }
    else if (btn.dataset.action === "entrega") { await confirmarEtapa(id, "entregador", "entrega", sessao.user.uid); mostrarToast("Entrega confirmada. Aguarde a confirmação do estabelecimento.", "sucesso"); }
    else if (btn.dataset.action === "avaliar") { entregaAvaliacao = item; nota = 0; document.querySelectorAll(".star").forEach(s => s.classList.remove("selected")); abrirModal("modal-avaliacao"); }
  } catch (err) {
    const msg = ({ CORRIDA_INDISPONIVEL:"Outro entregador pegou esta corrida primeiro.", LIMITE_ATINGIDO:"Você já está com o limite de 2 entregas ativas.", PERFIL_INATIVO:motivoBloqueio(perfil) })[err.message] || "Não foi possível concluir esta ação.";
    mostrarToast(msg, "erro");
  } finally { btn.disabled = false; }
}

function ativarAba() { document.querySelectorAll("[data-filtro]").forEach(b => b.classList.toggle("btn-primary", b.dataset.filtro === filtro)); render(); }

async function init() {
  iniciarShell(); monitorarConexao(); sessao = await exigirPerfil(["entregador"]); if (!sessao) return;
  const ref = doc(db, "couriers", sessao.user.uid); const snap = await getDoc(ref); if (!snap.exists()) return; perfil = snap.data();
  document.getElementById("nome-perfil").textContent = perfil.nomeCompleto; document.getElementById("saudacao").textContent = `Bora, ${perfil.nomeCompleto.split(" ")[0]}?`;
  const atualizarAcesso = () => { const motivo = motivoBloqueio(perfil); document.getElementById("gate").classList.toggle("show", !!motivo); document.getElementById("gate-texto").textContent = motivo; };
  atualizarAcesso();
  onSnapshot(ref, s => { if (s.exists()) { perfil = s.data(); document.getElementById("switch-online").classList.toggle("on", !!perfil.online); document.getElementById("texto-online").textContent = perfil.online ? "Online" : "Offline"; atualizarAcesso(); render(); } });
  observarEntregasDisponiveis(d => { disponiveis = d; render(); }, () => mostrarToast("Não foi possível carregar as corridas.", "erro"));
  observarEntregasDoEntregador(sessao.user.uid, d => { minhas = d; render(); }, () => {});
  document.getElementById("switch-online").addEventListener("click", async () => { if (motivoBloqueio(perfil)) return mostrarToast(motivoBloqueio(perfil), "aviso"); await updateDoc(ref, { online: !perfil.online }); });
  document.getElementById("lista-entregas").addEventListener("click", agir);
  document.querySelectorAll("[data-filtro]").forEach(btn => btn.addEventListener("click", () => { filtro = btn.dataset.filtro; ativarAba(); }));
  document.querySelectorAll(".star").forEach(star => star.addEventListener("click", () => { nota = Number(star.dataset.nota); document.querySelectorAll(".star").forEach(s => s.classList.toggle("selected", Number(s.dataset.nota) <= nota)); }));
  document.getElementById("form-avaliacao").addEventListener("submit", async e => { e.preventDefault(); if (!nota) return mostrarToast("Escolha de 1 a 5 estrelas.", "aviso"); try { await avaliar({ deliveryId:entregaAvaliacao.id, autorId:sessao.user.uid, autorNome:perfil.nomeCompleto, autorPapel:"entregador", alvoId:entregaAvaliacao.storeId, alvoNome:entregaAvaliacao.storeNome, alvoPapel:"loja", nota, comentario:new FormData(e.target).get("comentario") }); fecharModal("modal-avaliacao"); mostrarToast("Avaliação publicada.", "sucesso"); } catch(err) { mostrarToast(err.message === "JA_AVALIADO" ? "Você já avaliou esta entrega." : "Não foi possível publicar a avaliação.", "erro"); } });
}
init();
