import { app, auth, db } from './firebase-config.js';
import { deleteApp, initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  sendPasswordResetEmail,
  signOut,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

let canManage = false;

function friendlyError(error) {
  const code = String(error?.code || '');
  if (code.includes('email-already-in-use')) return 'Este e-mail já está cadastrado no sistema.';
  if (code.includes('invalid-email')) return 'Informe um e-mail válido.';
  if (code.includes('weak-password')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (code.includes('operation-not-allowed')) return 'Ative o provedor E-mail/senha no Firebase Authentication.';
  if (code.includes('unauthenticated')) return 'Sua sessão expirou. Entre novamente.';
  if (code.includes('permission-denied')) return 'As permissões de operadores ainda não foram publicadas no Firebase.';
  if (code.includes('network-request-failed')) return 'Sem conexão com o Firebase. Verifique a internet e tente novamente.';
  return error?.message?.replace(/^FirebaseError:\s*/i, '') || 'Não foi possível concluir a operação.';
}

function setStatus(text, type = 'neutral') {
  const element = document.getElementById('operadores-status');
  if (!element) return;
  element.textContent = text;
  element.className = `mt-3 text-sm ${type === 'error' ? 'text-red-600' : type === 'success' ? 'text-green-700' : 'text-slate-600'}`;
}

function operatorCard(operator) {
  const card = document.createElement('article');
  card.className = 'flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between';
  const info = document.createElement('div');
  const name = document.createElement('strong');
  name.className = 'block text-slate-900';
  name.textContent = operator.name;
  const email = document.createElement('span');
  email.className = 'block break-all text-sm text-slate-500';
  email.textContent = operator.email;
  const badge = document.createElement('span');
  badge.className = `mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${operator.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-700'}`;
  badge.textContent = operator.status === 'ativo' ? 'Acesso ativo' : 'Acesso pausado';
  info.append(name, email, badge);

  const actions = document.createElement('div');
  actions.className = 'flex flex-wrap gap-2';
  const password = document.createElement('button');
  password.type = 'button';
  password.className = 'rounded-lg bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-800';
  password.textContent = 'Enviar troca de senha';
  password.addEventListener('click', () => requestPasswordChange(operator));
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = operator.status === 'ativo'
    ? 'rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-800'
    : 'rounded-lg bg-green-100 px-3 py-2 text-sm font-semibold text-green-800';
  toggle.textContent = operator.status === 'ativo' ? 'Pausar acesso' : 'Reativar acesso';
  toggle.addEventListener('click', () => changeStatus(operator));
  actions.append(password, toggle);
  card.append(info, actions);
  return card;
}

async function loadOperators() {
  if (!canManage || !auth.currentUser) return;
  const list = document.getElementById('lista-operadores');
  if (!list) return;
  list.innerHTML = '<p class="text-sm text-slate-500">Carregando operadores...</p>';
  try {
    const snapshot = await getDocs(query(
      collection(db, 'users'),
      where('ownerUid', '==', auth.currentUser.uid),
      where('role', '==', 'operator')
    ));
    const operators = snapshot.docs
      .map(item => ({ uid: item.id, ...item.data() }))
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
    list.replaceChildren(...operators.map(operatorCard));
    if (!operators.length) list.innerHTML = '<p class="rounded-lg border border-dashed p-4 text-sm text-slate-500">Nenhum operador cadastrado ainda.</p>';
    setStatus('');
  } catch (error) {
    console.error(error);
    list.innerHTML = '';
    setStatus(friendlyError(error), 'error');
  }
}

async function createOperatorAccount({ name, email, password }) {
  const owner = auth.currentUser;
  if (!owner) throw Object.assign(new Error('Sua sessão expirou.'), { code: 'auth/unauthenticated' });

  const secondaryApp = initializeApp(app.options, `operator-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const secondaryAuth = getAuth(secondaryApp);
  let operatorUser = null;
  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    operatorUser = credential.user;
    await updateProfile(operatorUser, { displayName: name });
    await setDoc(doc(db, 'users', operatorUser.uid), {
      name,
      email: operatorUser.email.toLowerCase(),
      role: 'operator',
      status: 'ativo',
      ownerUid: owner.uid,
      createdBy: owner.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return operatorUser.uid;
  } catch (error) {
    if (operatorUser) await deleteUser(operatorUser).catch(cleanupError => console.warn('Não foi possível desfazer a conta incompleta.', cleanupError));
    throw error;
  } finally {
    await signOut(secondaryAuth).catch(() => {});
    await deleteApp(secondaryApp).catch(() => {});
  }
}

async function createOperator() {
  if (!canManage) return;
  const name = document.getElementById('operador-nome')?.value.trim();
  const email = document.getElementById('operador-email')?.value.trim().toLowerCase();
  const password = document.getElementById('operador-senha')?.value || '';
  if (!name || !email || password.length < 6) return setStatus('Informe nome, e-mail e uma senha com pelo menos 6 caracteres.', 'error');
  const button = document.getElementById('btn-salvar-operador');
  button.disabled = true;
  setStatus('Criando acesso do operador...');
  try {
    await createOperatorAccount({ name, email, password });
    document.getElementById('operador-nome').value = '';
    document.getElementById('operador-email').value = '';
    document.getElementById('operador-senha').value = '';
    await loadOperators();
    setStatus('Operador cadastrado. Ele já pode entrar pela tela normal de login.', 'success');
  } catch (error) {
    console.error(error);
    setStatus(friendlyError(error), 'error');
  } finally {
    button.disabled = false;
  }
}

async function changeStatus(operator) {
  const next = operator.status === 'ativo' ? 'inativo' : 'ativo';
  if (next === 'inativo' && !confirm(`Pausar o acesso de ${operator.name}?`)) return;
  setStatus(next === 'ativo' ? 'Reativando acesso...' : 'Pausando acesso...');
  try {
    await updateDoc(doc(db, 'users', operator.uid), { status: next, updatedAt: serverTimestamp() });
    await loadOperators();
    setStatus(next === 'ativo' ? 'Acesso reativado.' : 'Acesso pausado.', 'success');
  } catch (error) {
    console.error(error);
    setStatus(friendlyError(error), 'error');
  }
}

async function requestPasswordChange(operator) {
  if (!confirm(`Enviar um e-mail de troca de senha para ${operator.email}?`)) return;
  setStatus('Enviando e-mail de troca de senha...');
  try {
    await sendPasswordResetEmail(auth, operator.email);
    setStatus('E-mail de troca de senha enviado ao operador.', 'success');
  } catch (error) {
    console.error(error);
    setStatus(friendlyError(error), 'error');
  }
}

export function inicializarOperadores(profile) {
  canManage = profile?.role !== 'operator';
  window.carregarOperadores = loadOperators;
  window.salvarOperador = createOperator;
}
