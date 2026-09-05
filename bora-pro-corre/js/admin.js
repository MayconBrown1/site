import { db } from "./firebase-config.js";
import { exigirPerfil } from "./permissions.js";
import { collection, doc, getDocs, increment, limit, onSnapshot, orderBy, query, serverTimestamp, Timestamp, where, writeBatch } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { mostrarToast, monitorarConexao } from "./utils.js";
import { abrirModal, dataCurta, escapar, iniciarShell } from "./dashboard-ui.js";

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
    <td><button class="btn" data-action="avaliacoes">${p.avaliacao?.total ? `${Number(p.avaliacao.media).toFixed(1)} ★ (${p.avaliacao.total})` : "Ver avaliações"}</button></td>
    <td><div class="card-actions" style="border:0;padding:0;margin:0">
      ${p.status === "pendente" ? `<button class="btn" data-action="aprovar">Aprovar</button>` : ""}
      <button class="btn" data-action="pagou">Marcar pago</button>
      <button class="btn ${p.status === "bloqueado" ? "" : "btn-danger"}" data-action="bloquear">${p.status === "bloqueado" ? "Desbloquear" : "Bloquear"}</button>
      <button class="btn btn-danger" data-action="excluir">Excluir</button>
    </div></td></tr>`).join("") : `<tr><td colspan="6" class="muted" style="text-align:center;padding:2rem">Nenhum cadastro encontrado.</td></tr>`;
}

function millis(valor) {
  if (valor?.toMillis) return valor.toMillis();
  if (typeof valor?.seconds === "number") return valor.seconds * 1000;
  const data = valor ? new Date(valor) : null;
  return data && Number.isFinite(data.getTime()) ? data.getTime() : 0;
}

async function mostrarAvaliacoes(perfil) {
  document.getElementById("avaliacoes-titulo").textContent = `Avaliações de ${perfil.nome}`;
  document.getElementById("avaliacoes-conteudo").innerHTML = `<div class="skeleton"></div>`;
  abrirModal("modal-avaliacoes");
  try {
    const snap = await getDocs(query(collection(db, "ratings"), where("alvoId", "==", perfil.id), limit(100)));
    const avaliacoes = snap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b) => millis(b.criadoEm) - millis(a.criadoEm));
    document.getElementById("avaliacoes-conteudo").innerHTML = avaliacoes.length ? avaliacoes.map(a => `<article class="delivery-card" style="margin-bottom:.75rem">
      <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start"><div><strong>${escapar(a.autorNome || "Usuário")}</strong><p class="muted" style="font-size:.8rem">${a.autorPapel === "loja" ? "Estabelecimento" : "Entregador"} · ${dataCurta(a.criadoEm)}</p></div><strong style="color:var(--cor-aviso);font-size:1.05rem">${"★".repeat(Number(a.nota) || 0)}${"☆".repeat(5 - (Number(a.nota) || 0))}</strong></div>
      <p style="margin-top:.75rem">${escapar(a.comentario || "Sem comentário.")}</p><p class="muted" style="margin-top:.55rem;font-size:.75rem">Corrida #${escapar(String(a.deliveryId || "").slice(0,8).toUpperCase())}</p>
    </article>`).join("") : `<div class="empty-state"><strong style="display:block;color:#fff;margin-bottom:.35rem">Nenhuma avaliação</strong>Este perfil ainda não recebeu avaliações.</div>`;
  } catch (err) {
    document.getElementById("avaliacoes-conteudo").innerHTML = `<div class="empty-state">Não foi possível carregar as avaliações.</div>`;
  }
}

async function executarEmLotes(operacoes) {
  for (let i = 0; i < operacoes.length; i += 400) {
    const batch = writeBatch(db);
    operacoes.slice(i, i + 400).forEach(op => op(batch));
    await batch.commit();
  }
}

async function excluirPerfil(perfil) {
  if (!window.confirm(`Excluir definitivamente ${perfil.nome}? O acesso será encerrado e as corridas em andamento serão canceladas.`)) return;
  const perfilRef = doc(db, perfil.role === "loja" ? "stores" : "couriers", perfil.id);
  const userRef = doc(db, "users", perfil.id);

  // Primeiro corta a autorização para impedir novas ações durante a limpeza.
  const bloqueio = writeBatch(db);
  bloqueio.update(perfilRef, { status:"bloqueado" });
  bloqueio.set(userRef, { aprovado:false, bloqueado:true }, { merge:true });
  await bloqueio.commit();

  const consultas = [
    query(collection(db,"deliveries"), where("storeId","==",perfil.id)),
    query(collection(db,"deliveries"), where("courierId","==",perfil.id)),
    query(collection(db,"ratings"), where("alvoId","==",perfil.id)),
    query(collection(db,"ratings"), where("autorId","==",perfil.id))
  ];
  const [comoLoja, comoEntregador, recebidas, enviadas] = await Promise.all(consultas.map(q => getDocs(q)));
  const operacoes = [];
  const corridas = new Map([...comoLoja.docs, ...comoEntregador.docs].map(d => [d.ref.path, d]));
  const corridasAtivasPorEntregador = new Map();
  corridas.forEach(d => {
    if (!["entregue","devolvido","cancelado"].includes(d.data().status)) {
      operacoes.push(batch => batch.update(d.ref, { status:"cancelado", motivoCancelamento:"Perfil excluído pela administração", canceladoPorAdmin:true, canceladoEm:serverTimestamp(), atualizadoEm:serverTimestamp() }));
      const courierId = d.data().courierId;
      if (perfil.role === "loja" && courierId) corridasAtivasPorEntregador.set(courierId, (corridasAtivasPorEntregador.get(courierId) || 0) + 1);
    }
  });
  corridasAtivasPorEntregador.forEach((quantidade, courierId) => operacoes.push(batch => batch.update(doc(db,"couriers",courierId), { entregasAtivas:increment(-quantidade) })));
  const ratings = new Map([...recebidas.docs, ...enviadas.docs].map(d => [d.ref.path, d.ref]));
  ratings.forEach(ref => operacoes.push(batch => batch.delete(ref)));
  operacoes.push(batch => batch.delete(doc(db,"subscriptions",perfil.id)));
  operacoes.push(batch => batch.delete(perfilRef));
  operacoes.push(batch => batch.delete(userRef));
  await executarEmLotes(operacoes);
  mostrarToast("Perfil excluído e acesso encerrado.", "sucesso");
}

function renderStats() {
  document.getElementById("stat-cadastros").textContent = perfis.length;
  document.getElementById("stat-pendentes").textContent = perfis.filter(p => p.status === "pendente").length;
  document.getElementById("stat-inadimplentes").textContent = perfis.filter(p => ["pendente","vencido","suspenso"].includes(statusAssinatura(p))).length;
  document.getElementById("stat-corridas").textContent = entregas.filter(e => ["disponivel","aceito","retirado","devolucao"].includes(e.status)).length;
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
  document.getElementById("tabela-perfis").addEventListener("click", async e => { const btn = e.target.closest("[data-action]"); if (!btn) return; const tr = btn.closest("tr"); const perfil = perfis.find(p => p.id === tr.dataset.id && p.role === tr.dataset.role); if (!perfil) return; btn.disabled = true; try { if (btn.dataset.action === "avaliacoes") await mostrarAvaliacoes(perfil); else if (btn.dataset.action === "excluir") await excluirPerfil(perfil); else await alterarPerfil(tr.dataset.id, tr.dataset.role, btn.dataset.action); } catch { mostrarToast("Não foi possível concluir esta ação.", "erro"); } finally { btn.disabled = false; } });
}
init();
