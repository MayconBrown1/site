import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc,
  updateDoc, deleteDoc, query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyBzpY1K_J1ejCPzNKHOTMlcepxP7bi96ys",
  authDomain: "controle-dividas-2a6be.firebaseapp.com",
  projectId: "controle-dividas-2a6be",
  storageBucket: "controle-dividas-2a6be.firebasestorage.app",
  messagingSenderId: "200003512144",
  appId: "1:200003512144:web:76f37d5598007e21846e55"
};

const ADMIN_EMAIL = "mayconbrown083@gmail.com";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, "southamerica-east1");

const els = Object.fromEntries([
  "auth-view","pending-view","blocked-view","app-view","auth-form","auth-name","auth-email",
  "auth-password","auth-submit","auth-message","name-field","forgot-password","toggle-password",
  "pending-email","refresh-status","sidebar","scrim","menu-button","close-sidebar","profile-name",
  "profile-email","profile-avatar","admin-nav","pending-count","content","month-label","prev-month",
  "next-month","more-button","more-menu","privacy-button","privacy-toggle","fab","quick-menu",
  "app-dialog","dialog-title","dialog-kicker","dialog-body","dialog-close","install-app"
].map(id => [id.replaceAll("-","_"), document.getElementById(id)]));

const state = {
  user: null,
  profile: null,
  accounts: [],
  transactions: [],
  budgets: [],
  goals: [],
  customCategories: [],
  users: [],
  view: "dashboard",
  month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  privateMode: localStorage.getItem("financas-private") === "true",
  authMode: "login",
  deferredInstall: null
};

const CATEGORIES = {
  income: ["Salário","Freelance","Vendas","Rendimentos","Presente","Outros"],
  expense: ["Moradia","Alimentação","Transporte","Saúde","Educação","Lazer","Assinaturas","Compras","Outros"]
};
const ACCOUNT_COLORS = ["#82b4ff","#65dfb5","#ffc75f","#ae94ff","#ff7d86"];

const money = value => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
const monthTitle = date => new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
const shortDate = value => value ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T12:00:00`)) : "—";
const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const monthKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
const endOfMonthISO = date => {
  const d = new Date(date.getFullYear(), date.getMonth()+1, 0);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const escapeHTML = value => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const byDateDesc = (a,b) => (b.date || "").localeCompare(a.date || "") || String(b.createdAt?.seconds || 0).localeCompare(String(a.createdAt?.seconds || 0));
const isAdmin = () => state.user?.email?.toLowerCase() === ADMIN_EMAIL;
const currentMonthTransactions = () => state.transactions.filter(t => (t.date || "").startsWith(monthKey(state.month)));
const effectiveAmount = t => Number(t.amount) || 0;

function showOnly(id) {
  [els.auth_view, els.pending_view, els.blocked_view, els.app_view].forEach(el => el.classList.add("hidden"));
  id.classList.remove("hidden");
}

function toast(message, type = "success") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  document.getElementById("toast-region").append(el);
  setTimeout(() => el.remove(), 4200);
}

function friendlyError(error) {
  const code = error?.code || "";
  const messages = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/email-already-in-use": "Já existe uma conta com este e-mail.",
    "auth/weak-password": "Use uma senha com pelo menos 6 caracteres.",
    "auth/invalid-email": "Informe um e-mail válido.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente novamente.",
    "permission-denied": "Acesso negado. Publique as regras do Firestore incluídas no projeto."
  };
  return messages[code] || error?.message || "Não foi possível concluir. Tente novamente.";
}

async function ensureProfile(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const admin = user.email?.toLowerCase() === ADMIN_EMAIL;
  if (!snap.exists()) {
    const profile = {
      uid: user.uid,
      name: user.displayName || user.email?.split("@")[0] || "Usuário",
      email: user.email || "",
      status: admin ? "approved" : "pending",
      role: admin ? "admin" : "user",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(ref, profile);
    return profile;
  }
  const profile = snap.data();
  if (admin && (profile.status !== "approved" || profile.role !== "admin")) {
    await updateDoc(ref, { status: "approved", role: "admin", updatedAt: serverTimestamp() });
    return { ...profile, status: "approved", role: "admin" };
  }
  return profile;
}

async function loadCollection(name) {
  const snap = await getDocs(query(collection(db, name), where("userId", "==", state.user.uid)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function loadData() {
  [state.accounts, state.transactions, state.budgets, state.goals, state.customCategories] = await Promise.all([
    loadCollection("accounts"), loadCollection("transactions"), loadCollection("budgets"),
    loadCollection("goals"), loadCollection("categories")
  ]);
  if (!state.accounts.length) {
    const ref = await addDoc(collection(db, "accounts"), {
      userId: state.user.uid, name: "Carteira principal", type: "Carteira",
      initialBalance: 0, color: ACCOUNT_COLORS[0], createdAt: serverTimestamp()
    });
    state.accounts = [{ id: ref.id, userId: state.user.uid, name: "Carteira principal", type: "Carteira", initialBalance: 0, color: ACCOUNT_COLORS[0] }];
  }
  state.transactions.sort(byDateDesc);
}

async function enterApp() {
  showOnly(els.app_view);
  els.profile_name.textContent = state.profile.name || "Minha conta";
  els.profile_email.textContent = state.user.email || "";
  els.profile_avatar.alt = `Perfil de ${state.profile.name || "usuário"}`;
  els.admin_nav.classList.toggle("hidden", !isAdmin());
  els.privacy_toggle.checked = state.privateMode;
  document.body.classList.toggle("private", state.privateMode);
  await loadData();
  if (isAdmin()) await loadAdminUsers();
  render();
  if (location.hash === "#nova-receita") { history.replaceState(null,"",location.pathname); openTransactionForm("income"); }
  if (location.hash === "#nova-despesa") { history.replaceState(null,"",location.pathname); openTransactionForm("expense"); }
}

onAuthStateChanged(auth, async user => {
  state.user = user;
  if (!user) {
    state.profile = null;
    showOnly(els.auth_view);
    return;
  }
  try {
    state.profile = await ensureProfile(user);
    if (state.profile.status === "pending") {
      els.pending_email.textContent = user.email || "";
      showOnly(els.pending_view);
    } else if (["blocked","deleted"].includes(state.profile.status)) {
      showOnly(els.blocked_view);
    } else {
      await enterApp();
    }
  } catch (error) {
    showOnly(els.auth_view);
    els.auth_message.textContent = friendlyError(error);
    els.auth_message.classList.remove("hidden");
  }
});

function setAuthMode(mode) {
  state.authMode = mode;
  document.querySelectorAll(".auth-tab").forEach(btn => btn.classList.toggle("active", btn.dataset.authMode === mode));
  els.name_field.classList.toggle("hidden", mode !== "register");
  els.auth_name.required = mode === "register";
  els.auth_password.autocomplete = mode === "register" ? "new-password" : "current-password";
  els.auth_submit.textContent = mode === "register" ? "Criar minha conta" : "Entrar na minha conta";
  els.forgot_password.classList.toggle("hidden", mode === "register");
  els.auth_message.classList.add("hidden");
}

document.querySelectorAll(".auth-tab").forEach(btn => btn.addEventListener("click", () => setAuthMode(btn.dataset.authMode)));
els.auth_form.addEventListener("submit", async event => {
  event.preventDefault();
  els.auth_submit.disabled = true;
  els.auth_message.classList.add("hidden");
  try {
    if (state.authMode === "register") {
      const cred = await createUserWithEmailAndPassword(auth, els.auth_email.value.trim(), els.auth_password.value);
      const admin = cred.user.email?.toLowerCase() === ADMIN_EMAIL;
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid, name: els.auth_name.value.trim(), email: cred.user.email,
        status: admin ? "approved" : "pending", role: admin ? "admin" : "user",
        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      toast(admin ? "Conta administrativa criada." : "Cadastro enviado para aprovação.");
    } else {
      await signInWithEmailAndPassword(auth, els.auth_email.value.trim(), els.auth_password.value);
    }
  } catch (error) {
    els.auth_message.textContent = friendlyError(error);
    els.auth_message.classList.remove("hidden");
  } finally {
    els.auth_submit.disabled = false;
  }
});

els.forgot_password.addEventListener("click", async () => {
  const email = els.auth_email.value.trim();
  if (!email) return toast("Digite seu e-mail primeiro.", "error");
  try { await sendPasswordResetEmail(auth, email); toast("Link de redefinição enviado para seu e-mail."); }
  catch (error) { toast(friendlyError(error), "error"); }
});

els.toggle_password.addEventListener("click", () => {
  const hidden = els.auth_password.type === "password";
  els.auth_password.type = hidden ? "text" : "password";
  els.toggle_password.innerHTML = `<svg><use href="#${hidden ? "i-eye-off" : "i-eye"}"></use></svg>`;
});

document.querySelectorAll(".logout-action").forEach(btn => btn.addEventListener("click", () => signOut(auth)));
els.refresh_status.addEventListener("click", async () => {
  try {
    state.profile = (await getDoc(doc(db,"users",state.user.uid))).data();
    if (state.profile?.status === "approved") await enterApp();
    else if (["blocked","deleted"].includes(state.profile?.status)) showOnly(els.blocked_view);
    else toast("Sua conta ainda aguarda aprovação.", "error");
  } catch (error) { toast(friendlyError(error), "error"); }
});

function accountBalance(account, until = "9999-12-31") {
  let total = Number(account.initialBalance) || 0;
  state.transactions.filter(t => (t.date || "") <= until).forEach(t => {
    const value = effectiveAmount(t);
    if (t.type === "income" && t.accountId === account.id) total += value;
    if (t.type === "expense" && t.accountId === account.id) total -= value;
    if (t.type === "transfer" && t.fromAccountId === account.id) total -= value;
    if (t.type === "transfer" && t.toAccountId === account.id) total += value;
  });
  return total;
}

function summary() {
  const monthTx = currentMonthTransactions().filter(t => t.considered !== false);
  const income = monthTx.filter(t => t.type === "income").reduce((s,t) => s + effectiveAmount(t),0);
  const expense = monthTx.filter(t => t.type === "expense").reduce((s,t) => s + effectiveAmount(t),0);
  const initial = state.accounts.reduce((s,a) => s + (Number(a.initialBalance)||0),0);
  const cutoff = endOfMonthISO(state.month);
  const expected = state.accounts.reduce((s,a) => s + accountBalance(a, cutoff),0);
  const actualCutoff = cutoff < isoToday() ? cutoff : isoToday();
  const current = state.accounts.reduce((s,a) => s + accountBalance(a, actualCutoff),0);
  const savings = income - expense;
  const rate = income ? Math.round((savings / income) * 100) : 0;
  return { income, expense, initial, current, expected, savings, rate };
}

function transactionRow(t) {
  const kind = t.type === "income" ? "income" : t.type === "expense" ? "expense" : "transfer";
  const sign = kind === "income" ? "+" : kind === "expense" ? "−" : "";
  const account = state.accounts.find(a => a.id === (t.accountId || t.fromAccountId));
  return `<li class="transaction-item" data-transaction-id="${t.id}">
    <span class="transaction-avatar ${kind}">${kind === "income" ? "+" : kind === "expense" ? "−" : "↔"}</span>
    <span class="transaction-info"><strong>${escapeHTML(t.description || (kind === "transfer" ? "Transferência" : "Movimentação"))}</strong><span>${escapeHTML(t.category || account?.name || "Sem categoria")}${t.considered === false ? " · Não considerada" : ""}</span></span>
    <span class="transaction-value"><strong class="${kind}">${sign}${money(t.amount)}</strong><time>${shortDate(t.date)}</time></span>
  </li>`;
}

function pageHeading(title, description, actions = "") {
  return `<div class="page-heading"><div><h1>${title}</h1><p>${description}</p></div>${actions ? `<div class="page-actions">${actions}</div>` : ""}</div>`;
}

function renderDashboard() {
  const s = summary();
  const gauge = Math.max(0, Math.min(100, s.rate));
  const recent = currentMonthTransactions().sort(byDateDesc).slice(0,7);
  return `${pageHeading("Visão geral", "Acompanhe o que entrou, saiu e ainda está previsto.")}
    <section class="balance-card">
      <div class="balance-top"><span>Saldo consolidado</span><small>Atualizado agora</small></div>
      <div class="balance-current"><button data-open-history="all"><small>Saldo atual</small><strong class="private-value">${money(s.current)}</strong></button></div>
      <div class="balance-flow">
        <div class="flow-item"><span>Saldo inicial</span><button data-action-balance="initial"><strong class="private-value">${money(s.initial)}</strong></button></div>
        <div class="flow-item"><span>Resultado do mês</span><button data-open-history="all"><strong class="private-value">${money(s.savings)}</strong></button></div>
        <div class="flow-item expected"><span>Saldo previsto</span><button data-open-history="all"><strong class="private-value">${money(s.expected)}</strong></button></div>
      </div>
    </section>
    <div class="dashboard-grid">
      <section class="card economy-card">
        <div class="card-head"><h2>Economia mensal</h2><button data-more-summary aria-label="Opções"><svg><use href="#i-more"></use></svg></button></div>
        <div class="economy-content">
          <div class="savings-gauge" style="--gauge:${gauge * 3.6}deg"><div class="gauge-copy"><strong>${s.rate}%</strong><span>de economia</span></div></div>
          <div class="economy-details">
            <button class="metric-button" data-open-history="income"><span class="metric-icon income"><svg><use href="#i-arrow-down"></use></svg></span><span class="metric-copy"><span>Receitas consideradas</span><strong class="private-value">${money(s.income)}</strong></span><svg><use href="#i-chevron"></use></svg></button>
            <button class="metric-button" data-open-history="expense"><span class="metric-icon expense"><svg><use href="#i-arrow-up"></use></svg></span><span class="metric-copy"><span>Despesas consideradas</span><strong class="private-value">${money(s.expense)}</strong></span><svg><use href="#i-chevron"></use></svg></button>
          </div>
        </div>
        <div class="economy-note ${s.savings >= 0 ? "positive" : ""}">${s.savings >= 0 ? `Você economizou ${money(s.savings)} neste mês. Continue assim.` : `Suas despesas superam as receitas em ${money(Math.abs(s.savings))}. Revise os maiores gastos.`}</div>
      </section>
      <section class="card transactions-card">
        <div class="card-head"><h2>Últimas movimentações</h2><button data-view-all="transactions">Ver todas</button></div>
        ${recent.length ? `<ul class="transaction-list">${recent.map(transactionRow).join("")}</ul>` : `<div class="empty-state"><div><strong>Nenhuma movimentação neste mês</strong><p>Use o botão + para registrar sua primeira receita, despesa ou transferência.</p></div></div>`}
      </section>
      <section class="card insight-card"><span>PREVISÃO</span><strong>${s.expected >= 0 ? "Seu mês fecha no azul" : "Atenção ao saldo previsto"}</strong><p>${s.expected >= 0 ? `Mantendo os lançamentos atuais, o saldo previsto é ${money(s.expected)}.` : `Faltam ${money(Math.abs(s.expected))} para equilibrar a previsão do mês.`}</p></section>
    </div>`;
}

function renderAccounts() {
  const cards = state.accounts.map((a,i) => `<article class="card account-card" style="--account-color:${escapeHTML(a.color || ACCOUNT_COLORS[i % ACCOUNT_COLORS.length])}" data-account-id="${a.id}">
    <div class="account-top"><span class="account-icon"><svg><use href="#i-wallet"></use></svg></span><button class="icon-btn" data-edit-account="${a.id}" aria-label="Editar ${escapeHTML(a.name)}"><svg><use href="#i-more"></use></svg></button></div>
    <div><small>${escapeHTML(a.type || "Conta")}</small><strong class="private-value">${money(accountBalance(a))}</strong><span>${escapeHTML(a.name)}</span></div>
  </article>`).join("");
  const total = state.accounts.reduce((s,a) => s + accountBalance(a),0);
  return `${pageHeading("Contas", "Saldos consolidados de todas as suas contas.", `<button class="small-btn accent" data-add-account>+ Nova conta</button>`)}
    <div class="stats-grid" style="margin-bottom:16px"><article class="card stat-card"><span>Patrimônio disponível</span><strong class="private-value">${money(total)}</strong></article><article class="card stat-card"><span>Contas cadastradas</span><strong>${state.accounts.length}</strong></article><article class="card stat-card"><span>Última atualização</span><strong style="font-size:1.1rem">Hoje</strong></article></div>
    <div class="account-grid">${cards}</div>`;
}

function renderTransactions() {
  const rows = currentMonthTransactions().sort(byDateDesc);
  return `${pageHeading("Transações", "Seu histórico financeiro do mês selecionado.", `<button class="small-btn accent" data-new-transaction="expense">+ Nova movimentação</button>`)}
    <div class="data-toolbar"><label class="search-box"><svg><use href="#i-search"></use></svg><input id="transaction-search" placeholder="Buscar por descrição ou categoria"></label><select id="transaction-filter" class="small-btn"><option value="all">Todos os tipos</option><option value="income">Receitas</option><option value="expense">Despesas</option><option value="transfer">Transferências</option></select></div>
    <section class="card table-card"><ul id="full-transaction-list" class="transaction-list">${rows.length ? rows.map(transactionRow).join("") : `<div class="empty-state"><div><strong>Sem transações</strong><p>Não há movimentações no mês selecionado.</p></div></div>`}</ul></section>`;
}

function renderBudgets() {
  const expenses = currentMonthTransactions().filter(t => t.type === "expense" && t.considered !== false);
  const cards = state.budgets.map(b => {
    const spent = expenses.filter(t => t.category === b.category).reduce((s,t) => s + effectiveAmount(t),0);
    const limit = Number(b.limit) || 0;
    const pct = limit ? Math.min(100,Math.round(spent/limit*100)) : 0;
    return `<article class="card goal-card"><header><strong>${escapeHTML(b.category)}</strong><button class="icon-btn" data-delete-budget="${b.id}" aria-label="Excluir orçamento"><svg><use href="#i-trash"></use></svg></button></header><div class="progress-track"><i style="width:${pct}%;background:${pct>=100?'var(--red)':''}"></i></div><div class="goal-values"><span>Usado: ${money(spent)}</span><span>Limite: ${money(limit)}</span></div></article>`;
  }).join("");
  return `${pageHeading("Orçamentos", "Defina limites mensais e acompanhe o consumo por categoria.", `<button class="small-btn accent" data-add-budget>+ Novo orçamento</button>`)}<div class="goal-grid">${cards || `<section class="card empty-state"><div><strong>Nenhum orçamento criado</strong><p>Crie limites para identificar rapidamente onde ajustar seus gastos.</p></div></section>`}</div>`;
}

function renderGoals() {
  const cards = state.goals.map(g => {
    const current = Number(g.current) || 0, target = Number(g.target) || 0;
    const pct = target ? Math.min(100,Math.round(current/target*100)) : 0;
    return `<article class="card goal-card"><header><div><strong>${escapeHTML(g.name)}</strong><span>${escapeHTML(g.deadline ? `Até ${shortDate(g.deadline)}` : "Sem prazo")}</span></div><button class="icon-btn" data-edit-goal="${g.id}" aria-label="Atualizar objetivo"><svg><use href="#i-edit"></use></svg></button></header><div class="progress-track"><i style="width:${pct}%"></i></div><div class="goal-values"><span>${money(current)} guardados</span><span>${pct}% de ${money(target)}</span></div></article>`;
  }).join("");
  return `${pageHeading("Objetivos", "Transforme planos em metas financeiras acompanháveis.", `<button class="small-btn accent" data-add-goal>+ Novo objetivo</button>`)}<div class="goal-grid">${cards || `<section class="card empty-state"><div><strong>Crie seu primeiro objetivo</strong><p>Defina um valor-alvo e acompanhe o quanto já conseguiu guardar.</p></div></section>`}</div>`;
}

function lastMonths(count = 6) {
  const items = [];
  for (let i=count-1;i>=0;i--) {
    const d = new Date(state.month.getFullYear(),state.month.getMonth()-i,1);
    const key = monthKey(d);
    const tx = state.transactions.filter(t => (t.date||"").startsWith(key) && t.considered !== false);
    items.push({ label: new Intl.DateTimeFormat("pt-BR",{month:"short"}).format(d).replace(".",""), income: tx.filter(t=>t.type==="income").reduce((s,t)=>s+effectiveAmount(t),0), expense: tx.filter(t=>t.type==="expense").reduce((s,t)=>s+effectiveAmount(t),0) });
  }
  return items;
}

function renderReports() {
  const data = lastMonths();
  const max = Math.max(1,...data.flatMap(x => [x.income,x.expense]));
  const totalIncome = data.reduce((s,x)=>s+x.income,0), totalExpense = data.reduce((s,x)=>s+x.expense,0);
  return `${pageHeading("Relatórios e gráficos", "Compare a evolução das receitas e despesas nos últimos seis meses.")}
    <div class="stats-grid" style="margin-bottom:16px"><article class="card stat-card"><span>Receitas no período</span><strong class="private-value" style="color:var(--mint)">${money(totalIncome)}</strong></article><article class="card stat-card"><span>Despesas no período</span><strong class="private-value" style="color:var(--red)">${money(totalExpense)}</strong></article><article class="card stat-card"><span>Resultado acumulado</span><strong class="private-value">${money(totalIncome-totalExpense)}</strong></article></div>
    <section class="card chart-wrap"><div class="chart">${data.map(x => `<div class="chart-column"><i class="chart-bar income" style="height:${x.income/max*100}%" title="Receitas ${money(x.income)}"></i><i class="chart-bar expense" style="height:${x.expense/max*100}%" title="Despesas ${money(x.expense)}"></i><span class="chart-label">${escapeHTML(x.label)}</span></div>`).join("")}</div><div class="chart-legend"><span><i style="background:var(--mint)"></i>Receitas</span><span><i style="background:var(--red)"></i>Despesas</span></div></section>`;
}

function allCategories() {
  return [...new Set([...CATEGORIES.income,...CATEGORIES.expense,...state.customCategories.map(c=>c.name)])].sort((a,b)=>a.localeCompare(b,"pt-BR"));
}

function renderCategories() {
  const cards = allCategories().map(name => {
    const tx = state.transactions.filter(t => t.category === name);
    const total = tx.reduce((s,t)=>s+effectiveAmount(t),0);
    const custom = state.customCategories.find(c=>c.name===name);
    return `<article class="card account-card" style="min-height:140px;--account-color:${name.length%2?'var(--blue)':'var(--mint)'}"><div class="account-top"><span class="account-icon"><svg><use href="#i-tag"></use></svg></span>${custom?`<button class="icon-btn" data-delete-category="${custom.id}" aria-label="Excluir categoria"><svg><use href="#i-trash"></use></svg></button>`:""}</div><div><small>${tx.length} movimentaç${tx.length===1?'ão':'ões'}</small><strong class="private-value">${money(total)}</strong><span>${escapeHTML(name)}</span></div></article>`;
  }).join("");
  return `${pageHeading("Categorias", "Organize e entenda para onde seu dinheiro está indo.", `<button class="small-btn accent" data-add-category>+ Nova categoria</button>`)}<div class="account-grid">${cards}</div>`;
}

function renderCalendar() {
  const rows = currentMonthTransactions().sort(byDateDesc);
  const groups = Object.groupBy ? Object.groupBy(rows,t=>t.date) : rows.reduce((acc,t)=>((acc[t.date]??=[]).push(t),acc),{});
  return `${pageHeading("Calendário", "Movimentações organizadas por data no mês selecionado.")}<div class="dialog-section">${Object.entries(groups).length ? Object.entries(groups).map(([date,items])=>`<section class="card"><div class="card-head"><h2>${shortDate(date)}</h2><span>${items.length} item(ns)</span></div><ul class="transaction-list">${items.map(transactionRow).join("")}</ul></section>`).join("") : `<section class="card empty-state"><div><strong>Calendário vazio</strong><p>Os lançamentos aparecem aqui agrupados por data.</p></div></section>`}</div>`;
}

async function loadAdminUsers() {
  if (!isAdmin()) return;
  const snap = await getDocs(collection(db,"users"));
  state.users = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  const pending = state.users.filter(u=>u.status==="pending").length;
  els.pending_count.textContent = pending;
  els.pending_count.classList.toggle("hidden", !pending);
}

function renderAdmin() {
  if (!isAdmin()) return renderDashboard();
  const counts = status => state.users.filter(u=>u.status===status).length;
  const rows = state.users.map(u => `<tr><td><strong>${escapeHTML(u.name || "Sem nome")}</strong><br><small>${escapeHTML(u.email)}</small></td><td><span class="status-chip ${escapeHTML(u.status)}">${({approved:"Aprovada",pending:"Pendente",blocked:"Bloqueada",deleted:"Excluída"})[u.status]||u.status}</span></td><td>${u.role==="admin"?"Administrador":"Usuário"}</td><td>${u.createdAt?.seconds ? new Date(u.createdAt.seconds*1000).toLocaleDateString("pt-BR") : "—"}</td><td><div class="row-actions">${u.email?.toLowerCase()===ADMIN_EMAIL?`<span>Conta principal</span>`:`${u.status!=="approved"?`<button data-user-action="approve" data-user-id="${u.id}">Aprovar</button>`:""}${u.status!=="blocked"?`<button data-user-action="block" data-user-id="${u.id}">Bloquear</button>`:`<button data-user-action="approve" data-user-id="${u.id}">Desbloquear</button>`}<button class="danger" data-user-action="delete" data-user-id="${u.id}">Excluir</button>`}</div></td></tr>`).join("");
  return `${pageHeading("Gerenciar contas", "Aprove, bloqueie ou exclua o acesso dos usuários cadastrados.", `<button class="small-btn" data-refresh-admin>Atualizar</button>`)}
    <div class="stats-grid" style="margin-bottom:16px"><article class="card stat-card"><span>Aguardando aprovação</span><strong style="color:var(--amber)">${counts("pending")}</strong></article><article class="card stat-card"><span>Contas ativas</span><strong style="color:var(--mint)">${counts("approved")}</strong></article><article class="card stat-card"><span>Contas bloqueadas</span><strong style="color:var(--red)">${counts("blocked")}</strong></article></div>
    <section class="card table-card"><table class="data-table"><thead><tr><th>Conta</th><th>Status</th><th>Perfil</th><th>Cadastro</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

function render() {
  els.month_label.textContent = monthTitle(state.month);
  const views = { dashboard:renderDashboard, accounts:renderAccounts, transactions:renderTransactions, budgets:renderBudgets, goals:renderGoals, reports:renderReports, categories:renderCategories, calendar:renderCalendar, admin:renderAdmin };
  els.content.innerHTML = (views[state.view] || renderDashboard)();
  document.querySelectorAll(".nav-item[data-view]").forEach(btn=>btn.classList.toggle("active",btn.dataset.view===state.view));
  wireViewEvents();
}

function navigate(view) {
  if (view === "admin" && !isAdmin()) return;
  state.view = view;
  closeSidebar();
  render();
  els.content.focus({preventScroll:true});
  window.scrollTo({top:0,behavior:"smooth"});
}

document.querySelectorAll(".nav-item[data-view]").forEach(btn=>btn.addEventListener("click",()=>navigate(btn.dataset.view)));
function openSidebar(){ els.sidebar.classList.add("open"); els.scrim.classList.add("show"); }
function closeSidebar(){ els.sidebar.classList.remove("open"); els.scrim.classList.remove("show"); }
els.menu_button.addEventListener("click",openSidebar);
els.close_sidebar.addEventListener("click",closeSidebar);
els.scrim.addEventListener("click",closeSidebar);
els.prev_month.addEventListener("click",()=>{ state.month = new Date(state.month.getFullYear(),state.month.getMonth()-1,1); render(); });
els.next_month.addEventListener("click",()=>{ state.month = new Date(state.month.getFullYear(),state.month.getMonth()+1,1); render(); });

function openDialog(title, kicker, html) {
  els.dialog_title.textContent = title;
  els.dialog_kicker.textContent = kicker || "";
  els.dialog_body.innerHTML = html;
  if (!els.app_dialog.open) els.app_dialog.showModal();
}
function closeDialog(){ if (els.app_dialog.open) els.app_dialog.close(); }
els.dialog_close.addEventListener("click",closeDialog);
els.app_dialog.addEventListener("click",event=>{ if (event.target===els.app_dialog) closeDialog(); });

function accountOptions(selected="") {
  return state.accounts.map(a=>`<option value="${a.id}" ${a.id===selected?"selected":""}>${escapeHTML(a.name)}</option>`).join("");
}
function categoryOptions(type, selected="") {
  const names = [...new Set([...(CATEGORIES[type]||[]),...state.customCategories.map(c=>c.name)])];
  return names.map(c=>`<option ${c===selected?"selected":""}>${escapeHTML(c)}</option>`).join("");
}

function openTransactionForm(type="expense", existing=null) {
  const isTransfer = type === "transfer";
  if (isTransfer && state.accounts.length < 2) {
    toast("Cadastre uma segunda conta antes de fazer uma transferência.", "error");
    openAccountForm();
    return;
  }
  const title = existing ? "Editar movimentação" : ({income:"Nova receita",expense:"Nova despesa",transfer:"Nova transferência"})[type];
  openDialog(title, "MOVIMENTAÇÃO", `<form id="transaction-form" class="form-grid">
    <label class="field full"><span>Valor</span><input class="money-input" name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" value="${existing?.amount||""}" placeholder="R$ 0,00" required></label>
    <label class="field full"><span>Descrição</span><input name="description" value="${escapeHTML(existing?.description||"")}" placeholder="Ex.: Supermercado" required></label>
    <label class="field"><span>Data</span><input name="date" type="date" value="${existing?.date||isoToday()}" required></label>
    ${isTransfer ? `<label class="field"><span>Conta de origem</span><select name="fromAccountId" required>${accountOptions(existing?.fromAccountId)}</select></label><label class="field"><span>Conta de destino</span><select name="toAccountId" required>${accountOptions(existing?.toAccountId||state.accounts[1]?.id)}</select></label>` : `<label class="field"><span>Conta</span><select name="accountId" required>${accountOptions(existing?.accountId)}</select></label><label class="field"><span>Categoria</span><select name="category" required>${categoryOptions(type,existing?.category)}</select></label>`}
    <label class="field full"><span>Observação (opcional)</span><textarea name="note" placeholder="Inclua detalhes úteis">${escapeHTML(existing?.note||"")}</textarea></label>
    ${!isTransfer ? `<label class="menu-toggle full" style="padding:0 0 18px"><span>Considerar no resumo mensal</span><input name="considered" type="checkbox" ${existing?.considered===false?"":"checked"}><i></i></label>`:""}
    <div class="form-actions full">${existing?`<button type="button" class="secondary-btn" id="delete-transaction">Excluir</button>`:""}<button class="primary-btn" type="submit">${existing?"Salvar alterações":"Adicionar"}</button></div>
  </form>`);
  const form = document.getElementById("transaction-form");
  form.addEventListener("submit",async event=>{
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    data.amount = Number(data.amount);
    data.userId = state.user.uid;
    data.type = type;
    data.considered = isTransfer ? true : form.elements.considered.checked;
    data.updatedAt = serverTimestamp();
    if (isTransfer && data.fromAccountId === data.toAccountId) return toast("Escolha contas diferentes para transferir.","error");
    try {
      if (existing) await updateDoc(doc(db,"transactions",existing.id),data);
      else { data.createdAt = serverTimestamp(); await addDoc(collection(db,"transactions"),data); }
      closeDialog(); await loadData(); render(); toast(existing?"Movimentação atualizada.":"Movimentação adicionada.");
    } catch(error){ toast(friendlyError(error),"error"); }
  });
  document.getElementById("delete-transaction")?.addEventListener("click",async()=>{
    if (!confirm("Excluir esta movimentação?")) return;
    try { await deleteDoc(doc(db,"transactions",existing.id)); closeDialog(); await loadData(); render(); toast("Movimentação excluída."); }
    catch(error){ toast(friendlyError(error),"error"); }
  });
}

function openTransactionDetails(id) {
  const t = state.transactions.find(x=>x.id===id);
  if (!t) return;
  const account = state.accounts.find(a=>a.id===(t.accountId||t.fromAccountId));
  openDialog(t.description || "Movimentação","DETALHES",`<div class="dialog-section">
    <div class="stats-grid" style="grid-template-columns:1fr 1fr"><article class="card stat-card"><span>Valor</span><strong class="private-value">${money(t.amount)}</strong></article><article class="card stat-card"><span>Data</span><strong style="font-size:1.1rem">${shortDate(t.date)}</strong></article></div>
    <div class="history-row"><div><strong>Tipo</strong><span>${({income:"Receita",expense:"Despesa",transfer:"Transferência"})[t.type]}</span></div></div>
    <div class="history-row"><div><strong>Conta</strong><span>${escapeHTML(account?.name||"—")}</span></div></div>
    ${t.category?`<div class="history-row"><div><strong>Categoria</strong><span>${escapeHTML(t.category)}</span></div></div>`:""}
    ${t.note?`<div class="history-row"><div><strong>Observação</strong><span>${escapeHTML(t.note)}</span></div></div>`:""}
    <button class="primary-btn" id="edit-transaction">Editar movimentação</button>
  </div>`);
  document.getElementById("edit-transaction").addEventListener("click",()=>openTransactionForm(t.type,t));
}

function openHistory(filter="all") {
  const labels = {all:"Histórico do saldo",income:"Histórico de receitas",expense:"Histórico de despesas"};
  const rows = currentMonthTransactions().filter(t=>filter==="all"||t.type===filter).sort(byDateDesc);
  openDialog(labels[filter],monthTitle(state.month).toUpperCase(),`<div class="dialog-section">${rows.length?rows.map(t=>`<button class="history-row" data-history-id="${t.id}" style="width:100%;border-width:0 0 1px;background:transparent;color:inherit;text-align:left;cursor:pointer"><div><strong>${escapeHTML(t.description)}</strong><span>${escapeHTML(t.category||"Transferência")} · ${shortDate(t.date)}</span></div><b class="private-value" style="color:${t.type==='income'?'var(--mint)':t.type==='expense'?'var(--red)':'var(--text)'}">${t.type==='income'?'+':t.type==='expense'?'−':''}${money(t.amount)}</b></button>`).join(""):`<div class="empty-state"><div><strong>Sem lançamentos</strong><p>Nenhuma movimentação para exibir neste período.</p></div></div>`}</div>`);
  document.querySelectorAll("[data-history-id]").forEach(btn=>btn.addEventListener("click",()=>openTransactionDetails(btn.dataset.historyId)));
}

function openAccountForm(existing=null) {
  openDialog(existing?"Editar conta":"Nova conta","CONTAS",`<form id="account-form">
    <label class="field"><span>Nome da conta</span><input name="name" value="${escapeHTML(existing?.name||"")}" placeholder="Ex.: Banco principal" required></label>
    <div class="form-grid"><label class="field"><span>Tipo</span><select name="type">${["Conta corrente","Carteira","Conta digital","Poupança","Investimentos"].map(type=>`<option ${existing?.type===type?"selected":""}>${type}</option>`).join("")}</select></label><label class="field"><span>Saldo inicial</span><input name="initialBalance" type="number" step="0.01" value="${existing?.initialBalance||0}" required></label></div>
    <label class="field"><span>Cor</span><select name="color">${ACCOUNT_COLORS.map(c=>`<option value="${c}" ${existing?.color===c?"selected":""}>${c}</option>`).join("")}</select></label>
    <div class="form-actions">${existing&&state.accounts.length>1?`<button type="button" class="secondary-btn" id="delete-account">Excluir</button>`:""}<button class="primary-btn" type="submit">Salvar conta</button></div>
  </form>`);
  const form=document.getElementById("account-form");
  form.addEventListener("submit",async e=>{ e.preventDefault(); const data=Object.fromEntries(new FormData(form)); data.initialBalance=Number(data.initialBalance); data.userId=state.user.uid; data.updatedAt=serverTimestamp(); try{ if(existing) await updateDoc(doc(db,"accounts",existing.id),data); else {data.createdAt=serverTimestamp();await addDoc(collection(db,"accounts"),data);} closeDialog();await loadData();render();toast("Conta salva.");}catch(error){toast(friendlyError(error),"error");} });
  document.getElementById("delete-account")?.addEventListener("click",async()=>{ if(state.transactions.some(t=>[t.accountId,t.fromAccountId,t.toAccountId].includes(existing.id))) return toast("Exclua ou mova as transações desta conta primeiro.","error"); if(confirm("Excluir esta conta?")){await deleteDoc(doc(db,"accounts",existing.id));closeDialog();await loadData();render();toast("Conta excluída.");} });
}

function openBudgetForm() {
  openDialog("Novo orçamento","PLANEJAMENTO",`<form id="budget-form"><label class="field"><span>Categoria</span><select name="category">${categoryOptions("expense")}</select></label><label class="field"><span>Limite mensal</span><input name="limit" class="money-input" type="number" min="1" step="0.01" required></label><button class="primary-btn">Criar orçamento</button></form>`);
  document.getElementById("budget-form").addEventListener("submit",async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));await addDoc(collection(db,"budgets"),{...data,limit:Number(data.limit),userId:state.user.uid,createdAt:serverTimestamp()});closeDialog();await loadData();render();toast("Orçamento criado.");});
}

function openGoalForm(existing=null) {
  openDialog(existing?"Atualizar objetivo":"Novo objetivo","OBJETIVOS",`<form id="goal-form"><label class="field"><span>Nome do objetivo</span><input name="name" value="${escapeHTML(existing?.name||"")}" placeholder="Ex.: Reserva de emergência" required></label><div class="form-grid"><label class="field"><span>Valor-alvo</span><input name="target" type="number" min="1" step="0.01" value="${existing?.target||""}" required></label><label class="field"><span>Valor guardado</span><input name="current" type="number" min="0" step="0.01" value="${existing?.current||0}" required></label></div><label class="field"><span>Prazo</span><input name="deadline" type="date" value="${existing?.deadline||""}"></label><div class="form-actions">${existing?`<button type="button" id="delete-goal" class="secondary-btn">Excluir</button>`:""}<button class="primary-btn">Salvar objetivo</button></div></form>`);
  const form=document.getElementById("goal-form");
  form.addEventListener("submit",async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form));Object.assign(data,{target:Number(data.target),current:Number(data.current),userId:state.user.uid,updatedAt:serverTimestamp()});if(existing)await updateDoc(doc(db,"goals",existing.id),data);else{data.createdAt=serverTimestamp();await addDoc(collection(db,"goals"),data);}closeDialog();await loadData();render();toast("Objetivo salvo.");});
  document.getElementById("delete-goal")?.addEventListener("click",async()=>{if(confirm("Excluir este objetivo?")){await deleteDoc(doc(db,"goals",existing.id));closeDialog();await loadData();render();toast("Objetivo excluído.");}});
}

function openCategoryForm() {
  openDialog("Nova categoria","ORGANIZAÇÃO",`<form id="category-form"><label class="field"><span>Nome da categoria</span><input name="name" maxlength="40" required placeholder="Ex.: Pets"></label><button class="primary-btn">Adicionar categoria</button></form>`);
  document.getElementById("category-form").addEventListener("submit",async e=>{e.preventDefault();const name=new FormData(e.currentTarget).get("name").trim();if(allCategories().some(c=>c.toLowerCase()===name.toLowerCase()))return toast("Essa categoria já existe.","error");await addDoc(collection(db,"categories"),{name,userId:state.user.uid,createdAt:serverTimestamp()});closeDialog();await loadData();render();toast("Categoria adicionada.");});
}

function openSetBalance() {
  const account = state.accounts[0];
  openDialog("Configurar saldo inicial","SALDO",`<form id="balance-form"><label class="field"><span>Conta</span><select name="accountId">${accountOptions(account.id)}</select></label><label class="field"><span>Saldo inicial</span><input name="initialBalance" class="money-input" type="number" step="0.01" value="${account.initialBalance||0}" required></label><p style="color:var(--muted);line-height:1.5">O saldo inicial é o ponto de partida da conta. As movimentações registradas são somadas a ele.</p><button class="primary-btn">Atualizar saldo</button></form>`);
  const form=document.getElementById("balance-form");
  form.addEventListener("change",e=>{if(e.target.name==="accountId"){const a=state.accounts.find(x=>x.id===e.target.value);form.elements.initialBalance.value=a?.initialBalance||0;}});
  form.addEventListener("submit",async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form));await updateDoc(doc(db,"accounts",data.accountId),{initialBalance:Number(data.initialBalance),updatedAt:serverTimestamp()});closeDialog();await loadData();render();toast("Saldo inicial atualizado.");});
}

function openSummarySettings() {
  openDialog("Configurar resumo","PREFERÊNCIAS",`<div class="dialog-section"><p style="color:var(--muted);margin-top:0;line-height:1.55">Defina em cada receita ou despesa se ela deve entrar no cálculo da economia mensal. Movimentações marcadas como “não considerada” continuam no histórico e no saldo.</p><button class="primary-btn" id="go-transactions">Revisar transações</button></div>`);
  document.getElementById("go-transactions").addEventListener("click",()=>{closeDialog();navigate("transactions");});
}

function openCalculator() {
  openDialog("Calculadora","FERRAMENTA",`<div id="calc-display" class="calc-display">0</div><div class="calc-grid">${["C","⌫","%","÷","7","8","9","×","4","5","6","−","1","2","3","+","0",",","=","="].map(x=>`<button class="${"÷×−+%".includes(x)?"operator":""}" data-calc="${x}">${x}</button>`).join("")}</div>`);
  let expr=""; const display=document.getElementById("calc-display");
  document.querySelectorAll("[data-calc]").forEach(btn=>btn.addEventListener("click",()=>{const key=btn.dataset.calc;if(key==="C")expr="";else if(key==="⌫")expr=expr.slice(0,-1);else if(key==="="){try{const safe=expr.replaceAll("×","*").replaceAll("÷","/").replaceAll("−","-").replaceAll(",",".");if(!/^[0-9+\-*/.%() ]+$/.test(safe))throw 0;expr=String(Function(`"use strict";return (${safe})`)()).replace(".",",");}catch{expr="Erro";}}else{if(expr==="Erro")expr="";expr+=key;}display.textContent=expr||"0";}));
}

function openHelp() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  openDialog("Ajuda e instalação","FINANÇAS PRO",`<div class="dialog-section"><strong>Instale como aplicativo</strong>${ios?`<ol class="install-steps"><li>Abra esta página no Safari.</li><li>Toque no botão Compartilhar.</li><li>Escolha “Adicionar à Tela de Início”.</li><li>Confirme em “Adicionar”.</li></ol>`:`<p style="color:var(--muted);line-height:1.55">No Android ou computador, use a opção “Instalar aplicativo” no menu. Se ela não aparecer, abra o menu do navegador e escolha “Instalar app”.</p>`}</div><div class="dialog-section"><strong>Sobre seus dados</strong><p style="color:var(--muted);line-height:1.55;margin:0">As informações são vinculadas ao seu login e armazenadas no Firebase. Cada usuário acessa apenas os próprios registros.</p></div>`);
}

async function adminUserAction(uid, action) {
  const target = state.users.find(u=>u.id===uid);
  if (!target || target.email?.toLowerCase()===ADMIN_EMAIL) return;
  const status = action === "approve" ? "approved" : action === "block" ? "blocked" : "deleted";
  if (action === "delete" && !confirm(`Excluir o acesso de ${target.email}?`)) return;
  try {
    if (action === "delete") {
      try { await httpsCallable(functions,"adminDeleteUser")({uid}); }
      catch { await updateDoc(doc(db,"users",uid),{status:"deleted",deletedAt:serverTimestamp(),updatedAt:serverTimestamp()}); }
    } else {
      try { await httpsCallable(functions,"adminSetUserStatus")({uid,status}); }
      catch { await updateDoc(doc(db,"users",uid),{status,updatedAt:serverTimestamp()}); }
    }
    await loadAdminUsers(); render(); toast(action==="approve"?"Acesso aprovado.":action==="block"?"Conta bloqueada.":"Conta excluída e acesso revogado.");
  } catch(error){ toast(friendlyError(error),"error"); }
}

function wireViewEvents() {
  els.content.querySelectorAll("[data-open-history]").forEach(btn=>btn.addEventListener("click",()=>openHistory(btn.dataset.openHistory)));
  els.content.querySelector("[data-action-balance='initial']")?.addEventListener("click",openSetBalance);
  els.content.querySelector("[data-more-summary]")?.addEventListener("click",openSummarySettings);
  els.content.querySelectorAll("[data-transaction-id]").forEach(btn=>btn.addEventListener("click",()=>openTransactionDetails(btn.dataset.transactionId)));
  els.content.querySelector("[data-view-all]")?.addEventListener("click",e=>navigate(e.currentTarget.dataset.viewAll));
  els.content.querySelector("[data-new-transaction]")?.addEventListener("click",e=>openTransactionForm(e.currentTarget.dataset.newTransaction));
  els.content.querySelector("[data-add-account]")?.addEventListener("click",()=>openAccountForm());
  els.content.querySelectorAll("[data-edit-account]").forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();openAccountForm(state.accounts.find(a=>a.id===btn.dataset.editAccount));}));
  els.content.querySelector("[data-add-budget]")?.addEventListener("click",openBudgetForm);
  els.content.querySelectorAll("[data-delete-budget]").forEach(btn=>btn.addEventListener("click",async()=>{if(confirm("Excluir este orçamento?")){await deleteDoc(doc(db,"budgets",btn.dataset.deleteBudget));await loadData();render();toast("Orçamento excluído.");}}));
  els.content.querySelector("[data-add-goal]")?.addEventListener("click",()=>openGoalForm());
  els.content.querySelectorAll("[data-edit-goal]").forEach(btn=>btn.addEventListener("click",()=>openGoalForm(state.goals.find(g=>g.id===btn.dataset.editGoal))));
  els.content.querySelector("[data-add-category]")?.addEventListener("click",openCategoryForm);
  els.content.querySelectorAll("[data-delete-category]").forEach(btn=>btn.addEventListener("click",async()=>{if(confirm("Excluir esta categoria personalizada?")){await deleteDoc(doc(db,"categories",btn.dataset.deleteCategory));await loadData();render();toast("Categoria excluída.");}}));
  els.content.querySelector("[data-refresh-admin]")?.addEventListener("click",async()=>{await loadAdminUsers();render();toast("Lista atualizada.");});
  els.content.querySelectorAll("[data-user-action]").forEach(btn=>btn.addEventListener("click",()=>adminUserAction(btn.dataset.userId,btn.dataset.userAction)));
  const search=els.content.querySelector("#transaction-search"), filter=els.content.querySelector("#transaction-filter");
  const applyFilter=()=>{const term=(search?.value||"").toLowerCase(),type=filter?.value||"all";const rows=currentMonthTransactions().filter(t=>(type==="all"||t.type===type)&&`${t.description} ${t.category}`.toLowerCase().includes(term));const list=els.content.querySelector("#full-transaction-list");if(list){list.innerHTML=rows.length?rows.map(transactionRow).join(""):`<div class="empty-state"><div><strong>Nenhum resultado</strong><p>Tente outro termo ou filtro.</p></div></div>`;list.querySelectorAll("[data-transaction-id]").forEach(btn=>btn.addEventListener("click",()=>openTransactionDetails(btn.dataset.transactionId)));}};
  search?.addEventListener("input",applyFilter); filter?.addEventListener("change",applyFilter);
}

els.fab.addEventListener("click",()=>{const open=els.quick_menu.classList.toggle("hidden")===false;els.fab.setAttribute("aria-expanded",String(open));});
document.querySelectorAll("[data-transaction]").forEach(btn=>btn.addEventListener("click",()=>{els.quick_menu.classList.add("hidden");els.fab.setAttribute("aria-expanded","false");openTransactionForm(btn.dataset.transaction);}));
els.more_button.addEventListener("click",()=>{const open=els.more_menu.classList.toggle("hidden")===false;els.more_button.setAttribute("aria-expanded",String(open));});
els.privacy_button.addEventListener("click",()=>{state.privateMode=!state.privateMode;els.privacy_toggle.checked=state.privateMode;document.body.classList.toggle("private",state.privateMode);localStorage.setItem("financas-private",String(state.privateMode));});
els.privacy_toggle.addEventListener("change",()=>{state.privateMode=els.privacy_toggle.checked;document.body.classList.toggle("private",state.privateMode);localStorage.setItem("financas-private",String(state.privateMode));});
els.more_menu.querySelectorAll("[data-action]").forEach(btn=>btn.addEventListener("click",()=>{els.more_menu.classList.add("hidden");const actions={"balance-details":()=>openHistory("all"),"set-balance":openSetBalance,"summary-settings":openSummarySettings,"calculator":openCalculator,"help":openHelp};actions[btn.dataset.action]?.();}));
document.addEventListener("click",event=>{if(!els.more_menu.contains(event.target)&&!els.more_button.contains(event.target))els.more_menu.classList.add("hidden");if(!els.quick_menu.contains(event.target)&&!els.fab.contains(event.target)){els.quick_menu.classList.add("hidden");els.fab.setAttribute("aria-expanded","false");}});

window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();state.deferredInstall=event;els.install_app.classList.remove("hidden");});
els.install_app.addEventListener("click",async()=>{if(state.deferredInstall){state.deferredInstall.prompt();await state.deferredInstall.userChoice;state.deferredInstall=null;els.install_app.classList.add("hidden");}else openHelp();});
window.addEventListener("appinstalled",()=>toast("Finanças Pro instalado com sucesso."));

if ("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));

function registerWebMCP() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  const register = tool => Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});
  register({
    name: "get_month_financial_summary",
    title: "Consultar resumo financeiro do mês",
    description: "Retorna receitas, despesas, economia e saldos do mês atualmente selecionado no Finanças Pro.",
    inputSchema: { type:"object", properties:{}, additionalProperties:false },
    annotations: { readOnlyHint:true, untrustedContentHint:false },
    execute() {
      if (!state.user || state.profile?.status !== "approved") throw new Error("É necessário estar em uma conta aprovada.");
      const s=summary();
      return { month:monthKey(state.month), income:s.income, expense:s.expense, savings:s.savings, currentBalance:s.current, expectedBalance:s.expected, currency:"BRL" };
    }
  });
  register({
    name: "create_financial_entry",
    title: "Criar receita ou despesa",
    description: "Registra uma receita ou despesa na conta aprovada e atualiza o resumo visível.",
    inputSchema: {
      type:"object",
      properties:{
        type:{type:"string",enum:["income","expense"]},
        amount:{type:"number",exclusiveMinimum:0},
        description:{type:"string",minLength:1,maxLength:100},
        date:{type:"string",pattern:"^\\d{4}-\\d{2}-\\d{2}$"},
        category:{type:"string",maxLength:50}
      },
      required:["type","amount","description"], additionalProperties:false
    },
    annotations: { readOnlyHint:false, untrustedContentHint:false },
    async execute(input) {
      if (!state.user || state.profile?.status !== "approved") throw new Error("É necessário estar em uma conta aprovada.");
      if (!["income","expense"].includes(input?.type) || !(Number(input?.amount)>0) || !String(input?.description||"").trim()) throw new Error("Tipo, valor e descrição válidos são obrigatórios.");
      const entry={ userId:state.user.uid, type:input.type, amount:Number(input.amount), description:String(input.description).trim().slice(0,100), date:input.date||isoToday(), category:String(input.category||"Outros").slice(0,50), accountId:state.accounts[0]?.id, considered:true, createdAt:serverTimestamp(), updatedAt:serverTimestamp() };
      const ref=await addDoc(collection(db,"transactions"),entry);
      await loadData(); render();
      return { id:ref.id, status:"created", type:entry.type, amount:entry.amount, currency:"BRL" };
    }
  });
}
registerWebMCP();
