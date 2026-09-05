import { db } from "./firebase-config.js";
import { exigirPerfil } from "./permissions.js";
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, Timestamp, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { formatarMoeda, mostrarToast, monitorarConexao } from "./utils.js";
import { dataCurta, escapar, iniciarShell } from "./dashboard-ui.js";

let perfis = [], entregas = [], filtro = "todos";

function todosPerfis() { return perfis.slice().sort((a,b) => (a.nome || "").localeCompare(b.nome || "")); }
function statusAssinatura(p) {
  const assinatura = p.assinatura || {};
  const vencimento = assinatura.proximaCobranca?.toDate ? assinatura.proximaCobranca.toDate() : assinatura.proximaCobranca ? new Date(assinatura.proximaCobranca) : null;
  if (["ativo","trial"].includes(assinatura.status) && vencimento && vencimento.getTime() <= Date.now()) return "vencido";
  return assinatura.status || "pendente";
}
function statusClasse(status) { return ["ativo","trial","aprovado","entregue"].includes(status) ? "status-ok" : ["pendente","em_analise","disponivel","aceito","retirado"].includes(status) ? "status-warn" : "status-bad"; }

function renderPerfis() {
  const termo = document.getElementById("busca").value.toLowerCase();
  const lista = todosPerfis().filter(p => {
    const texto = `${p.nome} ${p.email} ${p.documento}`.toLowerCase();
    if (!texto.includes(termo)) return false;
    if (filtro === "pendentes") return p.status === "pendente";
    if (filtro === "bloqueados") return p.status === "bloqueado";
    if (filtro === "inadimplentes") return ["pendente","vencido","suspenso"].includes(statusAssinatura(p));
    return true;
  });
  document.getElementById("tabela-perfis").innerHTML = lista.length ? lista.map(p => `<tr data-id="${p.id}" data-role="${p.role}">
    <td><strong>${escapar(p.nome)}</strong><br><span class="muted">${escapar(p.email)}</span></td>
    <td>${p.role === "loja" ? "Estabelecimento" : "Entregador"}</td>
    <td><span class="status-pill ${statusClasse(p.status)}">${escapar(p.status)}</span></td>
    <td><span class="status-pill ${statusClasse(statusAssinatura(p))}">${escapar(statusAssinatura(p))}</span><br><span class="muted">${p.assinatura?.proximaCobranca ? `até ${dataCurta(p.assinatura.proximaCobranca)}` : "sem vencimento"}</span></td>
    <td>${p.avaliacao?.total ? `${Number(p.avaliacao.media).toFixed(1)} ★ (${p.avaliacao.total})` : "Sem avaliações"}</td>
    <td><div class="card-actions" style="border:0;padding:0;margin:0;flex-wrap:nowrap">
      ${p.status === "pendente" ? `<button class="btn" data-action="aprovar">Aprovar</button>` : ""}
      <button class="btn" data-action="pagou">Marcar pago</button>
      <button class="btn ${p.status === "bloqueado" ? "" : "btn-danger"}" data-action="bloquear">${p.status === "bloqueado" ? "Desbloquear" : "Bloquear"}</button>
    </div></td></tr>`).join("") : `<tr><td colspan="6" class="muted" style="text-align:center;padding:2rem">Nenhum cadastro encontrado.</td></tr>`;
}

function renderStats() {
  document.getElementById("stat-cadastros").textContent = perfis.length;
  document.getElementById("stat-pendentes").textContent = perfis.filter(p => p.status === "pendente").length;
  document.getElementById("stat-inadimplentes").textContent = perfis.filter(p => ["pendente","vencido","suspenso"].includes(statusAssinatura(p))).length;
  document.getElementById("stat-corridas").textContent = entregas.filter(e => ["disponivel","aceito","retirado"].includes(e.status)).length;
}

async function alterarPerfil(id, role, action) {
  const p = perfis.find(x => x.id === id && x.role === role); if (!p) return;
  const perfilRef = doc(db, role === "loja" ? "stores" : "couriers", id), userRef = doc(db, "users", id); const batch = writeBatch(db);
  if (action === "aprovar") {
    batch.update(perfilRef, { status:"aprovado", "verificacao.contatoWhatsappFeito":true, "verificacao.documentosRecebidos":true });
    batch.update(userRef, { aprovado:true, bloqueado:false });
  }
  if (action === "pagou") {
    const prox = new Date(); prox.setDate(prox.getDate() + 30); const assinatura = { ...(p.assinatura || {}), status:"ativo", ultimoPagamento:Timestamp.now(), proximaCobranca:Timestamp.fromDate(prox), valor:29.99 };
    // Confirmar o pagamento também deixa as duas fontes de autorização
    // consistentes. Assim não existe perfil pago com /users ainda bloqueado.
    batch.update(perfilRef, { assinatura, status:"aprovado" });
    batch.update(userRef, { aprovado:true, bloqueado:false });
    batch.set(doc(db,"subscriptions",id), { uid:id, role, status:"ativo", valor:29.99, ultimoPagamento:Timestamp.now(), proximaCobranca:Timestamp.fromDate(prox), atualizadoEm:serverTimestamp() }, { merge:true });
    const pagamentoRef = doc(collection(db,"payments")); batch.set(pagamentoRef, { uid:id, role, nome:p.nome, valor:29.99, status:"confirmado", origem:"manual_admin", pagoEm:serverTimestamp() });
  }
  if (action === "bloquear") {
    const bloquear = p.status !== "bloqueado"; batch.update(perfilRef, { status: bloquear ? "bloqueado" : "aprovado" }); batch.update(userRef, { bloqueado:bloquear, aprovado:!bloquear });
  }
  await batch.commit();
  mostrarToast(action === "pagou" ? "Pagamento de R$ 29,99 confirmado por 30 dias." : "Cadastro atualizado.", "sucesso");
}

async function init() {
  iniciarShell(); monitorarConexao(); const sessao = await exigirPerfil(["admin"]); if (!sessao) return;
  document.getElementById("nome-perfil").textContent = sessao.isSuperAdmin ? "Superadministrador" : "Administrador";
  onSnapshot(query(collection(db,"stores"), orderBy("criadoEm","desc")), snap => { const lojas = snap.docs.map(d => ({ id:d.id, role:"loja", nome:d.data().nomeComercial, documento:d.data().cnpjCpf, ...d.data() })); perfis = [...perfis.filter(p => p.role !== "loja"), ...lojas]; renderStats(); renderPerfis(); });
  onSnapshot(query(collection(db,"couriers"), orderBy("criadoEm","desc")), snap => { const entregadores = snap.docs.map(d => ({ id:d.id, role:"entregador", nome:d.data().nomeCompleto, documento:d.data().cpf, ...d.data() })); perfis = [...perfis.filter(p => p.role !== "entregador"), ...entregadores]; renderStats(); renderPerfis(); });
  onSnapshot(collection(db,"deliveries"), snap => { entregas = snap.docs.map(d => ({id:d.id,...d.data()})); renderStats(); });
  document.getElementById("busca").addEventListener("input", renderPerfis);
  document.getElementById("filtro-status").addEventListener("change", e => { filtro = e.target.value; renderPerfis(); });
  document.getElementById("tabela-perfis").addEventListener("click", async e => { const btn = e.target.closest("[data-action]"); if (!btn) return; const tr = btn.closest("tr"); btn.disabled = true; try { await alterarPerfil(tr.dataset.id, tr.dataset.role, btn.dataset.action); } catch { mostrarToast("Não foi possível atualizar o cadastro.", "erro"); } finally { btn.disabled = false; } });
}
init();
