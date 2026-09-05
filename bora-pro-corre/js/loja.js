import { db } from "./firebase-config.js";
import { exigirPerfil } from "./permissions.js";
import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { assinaturaValida, criarEntrega, observarEntregasDaLoja, atualizarValor, cancelarEntrega, confirmarEtapa, motivoBloqueio } from "./pedidos.js";
import { avaliar } from "./avaliacoes.js";
import { mostrarToast, mensagemErroAmigavel, monitorarConexao } from "./utils.js";
import { abrirModal, cardEntrega, estadoVazio, fecharModal, iniciarShell } from "./dashboard-ui.js";

let sessao, loja, entregas = [], filtro = "ativas", entregaAvaliacao = null, nota = 0;

function acoes(item) {
  if (item.status === "disponivel") return `<button class="btn" data-action="valor">Alterar valor</button><button class="btn btn-danger" data-action="cancelar">Cancelar</button>`;
  if (item.status === "aceito" && !item.confirmacoes?.retiradaLoja) return `<button class="btn btn-primary" data-action="retirada">Confirmar retirada</button>`;
  if (item.status === "retirado" && !item.confirmacoes?.entregaLoja) return `<button class="btn btn-primary" data-action="entrega">Confirmar entrega</button>`;
  if (item.status === "entregue" && item.courierId) return `<button class="btn" data-action="avaliar">Avaliar entregador</button>`;
  return "";
}

function render() {
  const visiveis = entregas.filter(e => filtro === "ativas" ? !["entregue","cancelado"].includes(e.status) : ["entregue","cancelado"].includes(e.status));
  document.getElementById("lista-entregas").innerHTML = visiveis.length ? visiveis.map(e => cardEntrega(e, acoes(e))).join("") : estadoVazio(filtro === "ativas" ? "Nenhuma entrega em andamento" : "Histórico vazio", filtro === "ativas" ? "Publique uma corrida para ela aparecer aos entregadores aprovados." : "As entregas finalizadas aparecerão aqui.");
  document.getElementById("stat-disponiveis").textContent = entregas.filter(e => e.status === "disponivel").length;
  document.getElementById("stat-andamento").textContent = entregas.filter(e => ["aceito","retirado"].includes(e.status)).length;
  document.getElementById("stat-concluidas").textContent = entregas.filter(e => e.status === "entregue").length;
  document.getElementById("stat-avaliacao").textContent = loja?.avaliacao?.total ? `${Number(loja.avaliacao.media).toFixed(1)} ★` : "Nova";
}

async function agir(e) {
  const btn = e.target.closest("[data-action]"); if (!btn) return;
  const id = btn.closest("[data-id]").dataset.id;
  const item = entregas.find(x => x.id === id); if (!item) return;
  btn.disabled = true;
  try {
    if (btn.dataset.action === "valor") {
      const valor = window.prompt("Novo valor da entrega (R$):", item.valor); if (valor === null) return;
      await atualizarValor(id, sessao.user.uid, String(valor).replace(",", ".")); mostrarToast("Valor atualizado. A corrida já aparece com a nova oferta.", "sucesso");
    } else if (btn.dataset.action === "cancelar") {
      if (window.confirm("Cancelar esta corrida disponível?")) { await cancelarEntrega(id, sessao.user.uid); mostrarToast("Corrida cancelada.", "sucesso"); }
    } else if (btn.dataset.action === "retirada") {
      await confirmarEtapa(id, "loja", "retirada", sessao.user.uid); mostrarToast("Retirada confirmada. A etapa avança quando o entregador também confirmar.", "sucesso");
    } else if (btn.dataset.action === "entrega") {
      await confirmarEtapa(id, "loja", "entrega", sessao.user.uid); mostrarToast("Entrega confirmada. A etapa termina quando o entregador também confirmar.", "sucesso");
    } else if (btn.dataset.action === "avaliar") {
      entregaAvaliacao = item; nota = 0; document.querySelectorAll(".star").forEach(s => s.classList.remove("selected")); abrirModal("modal-avaliacao");
    }
  } catch (err) { mostrarToast(mensagemErroAmigavel(err), "erro"); } finally { btn.disabled = false; }
}

async function init() {
  iniciarShell(); monitorarConexao(); sessao = await exigirPerfil(["loja"]); if (!sessao) return;
  const ref = doc(db, "stores", sessao.user.uid); const snap = await getDoc(ref); if (!snap.exists()) return;
  const atualizarPerfil = (dados) => {
    loja = dados;
    document.getElementById("nome-perfil").textContent = loja.nomeComercial;
    document.getElementById("saudacao").textContent = `Olá, ${loja.nomeComercial}`;
    const motivo = motivoBloqueio(loja);
    const vencida = motivo.startsWith("Mensalidade vencida");
    document.getElementById("plano-status").textContent = assinaturaValida(loja) ? (loja.assinatura?.status === "trial" ? "Período de teste" : "Mensalidade em dia") : vencida ? "Mensalidade vencida" : "Mensalidade pendente";
    document.getElementById("gate").classList.toggle("show", !!motivo);
    document.getElementById("gate-texto").textContent = motivo;
    document.getElementById("btn-nova").disabled = !!motivo;
    document.getElementById("nav-nova").disabled = !!motivo;
    render();
  };
  atualizarPerfil(snap.data());
  onSnapshot(ref, s => { if (s.exists()) atualizarPerfil(s.data()); }, () => mostrarToast("Não foi possível atualizar o status do cadastro.", "erro"));
  observarEntregasDaLoja(sessao.user.uid, dados => { entregas = dados; render(); }, err => mostrarToast(mensagemErroAmigavel(err), "erro"));
  document.getElementById("btn-nova").addEventListener("click", () => abrirModal("modal-nova"));
  document.getElementById("lista-entregas").addEventListener("click", agir);
  document.querySelectorAll("[data-filtro]").forEach(btn => btn.addEventListener("click", () => { filtro = btn.dataset.filtro; document.querySelectorAll("[data-filtro]").forEach(b => b.classList.toggle("btn-primary", b === btn)); render(); }));
  document.getElementById("form-nova").addEventListener("submit", async e => {
    e.preventDefault(); const btn = e.submitter; btn.disabled = true;
    const fd = new FormData(e.target); try { await criarEntrega(sessao.user.uid, Object.fromEntries(fd)); e.target.reset(); fecharModal("modal-nova"); mostrarToast("Corrida publicada para os entregadores.", "sucesso"); } catch (err) { mostrarToast(err.message === "PERFIL_INATIVO" ? motivoBloqueio(loja) : mensagemErroAmigavel(err), "erro"); } finally { btn.disabled = false; }
  });
  document.querySelectorAll(".star").forEach(star => star.addEventListener("click", () => { nota = Number(star.dataset.nota); document.querySelectorAll(".star").forEach(s => s.classList.toggle("selected", Number(s.dataset.nota) <= nota)); }));
  document.getElementById("form-avaliacao").addEventListener("submit", async e => {
    e.preventDefault(); if (!nota) return mostrarToast("Escolha de 1 a 5 estrelas.", "aviso");
    try { await avaliar({ deliveryId: entregaAvaliacao.id, autorId: sessao.user.uid, autorNome: loja.nomeComercial, autorPapel:"loja", alvoId: entregaAvaliacao.courierId, alvoNome: entregaAvaliacao.courierNome, alvoPapel:"entregador", nota, comentario: new FormData(e.target).get("comentario") }); fecharModal("modal-avaliacao"); mostrarToast("Avaliação publicada.", "sucesso"); } catch (err) { mostrarToast(err.message === "JA_AVALIADO" ? "Você já avaliou esta entrega." : "Não foi possível publicar a avaliação.", "erro"); }
  });
}
init();
