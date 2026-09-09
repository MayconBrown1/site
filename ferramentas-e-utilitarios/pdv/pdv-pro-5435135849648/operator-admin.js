import { app } from './firebase-config.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-functions.js';

const functions = getFunctions(app, 'southamerica-east1');
const callCreate = httpsCallable(functions, 'createOperator');
const callList = httpsCallable(functions, 'listOperators');
const callStatus = httpsCallable(functions, 'setOperatorStatus');
const callPassword = httpsCallable(functions, 'updateOperatorPassword');

let canManage = false;

function friendlyError(error) {
  const code = String(error?.code || '');
  if (code.includes('already-exists')) return 'Este e-mail já está cadastrado no sistema.';
  if (code.includes('unauthenticated')) return 'Sua sessão expirou. Entre novamente.';
  if (code.includes('permission-denied')) return 'Somente o titular da empresa pode gerenciar operadores.';
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
  password.textContent = 'Trocar senha';
  password.addEventListener('click', () => changePassword(operator));
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
  if (!canManage) return;
  const list = document.getElementById('lista-operadores');
  if (!list) return;
  list.innerHTML = '<p class="text-sm text-slate-500">Carregando operadores...</p>';
  try {
    const result = await callList();
    const operators = result.data?.operators || [];
    list.replaceChildren(...operators.map(operatorCard));
    if (!operators.length) list.innerHTML = '<p class="rounded-lg border border-dashed p-4 text-sm text-slate-500">Nenhum operador cadastrado ainda.</p>';
    setStatus('');
  } catch (error) {
    console.error(error);
    list.innerHTML = '';
    setStatus(friendlyError(error), 'error');
  }
}

async function createOperator() {
  if (!canManage) return;
  const name = document.getElementById('operador-nome')?.value.trim();
  const email = document.getElementById('operador-email')?.value.trim();
  const password = document.getElementById('operador-senha')?.value || '';
  if (!name || !email || password.length < 6) return setStatus('Informe nome, e-mail e uma senha com pelo menos 6 caracteres.', 'error');
  const button = document.getElementById('btn-salvar-operador');
  button.disabled = true;
  setStatus('Criando acesso do operador...');
  try {
    await callCreate({ name, email, password });
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
    await callStatus({ operatorUid: operator.uid, status: next });
    await loadOperators();
    setStatus(next === 'ativo' ? 'Acesso reativado.' : 'Acesso pausado.', 'success');
  } catch (error) {
    console.error(error);
    setStatus(friendlyError(error), 'error');
  }
}

async function changePassword(operator) {
  const password = prompt(`Nova senha para ${operator.name} (mínimo de 6 caracteres):`);
  if (password === null) return;
  if (password.length < 6) return setStatus('A nova senha precisa ter pelo menos 6 caracteres.', 'error');
  setStatus('Atualizando senha...');
  try {
    await callPassword({ operatorUid: operator.uid, password });
    setStatus('Senha do operador atualizada.', 'success');
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
