import { db } from './firebase-config.js';
import { protegerPagina, sair, validarSenhaAtual, validarSenhaTitular } from './auth.js';
import { inicializarCatalogoAdmin, sincronizarCatalogoPublico } from './catalogo-admin.js';
import { inicializarOperadores } from './operator-admin.js';
import { deleteDoc, doc, getDoc, onSnapshot, runTransaction, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

let uid, writing = false, writingLocalStorage = false, lastCloudState = null, lastSubmittedState = null;
let cloudQueue = Promise.resolve();
let financeQueue = Promise.resolve();
// Captura a configuração padrão antes que qualquer armazenamento local de outra conta seja usado.
const pixPadrao = { ...(window.CONFIG_PIX || {}) };

function state() {
  const { senha, ...configSemSenha } = window.configSistema || {};
  return {
    ownerUid: uid,
    produtos: window.produtos || [], vendas: window.vendas || [], movimentos: window.movimentos || [], caixas: window.caixas || [],
    clientesFiado: window.clientesFiado || [], pagamentosFiado: window.pagamentosFiado || [],
    orcamentos: window.orcamentos || [],
    categorias: window.categorias || [], categoriasOcultas: window.categoriasOcultas || [],
    configSistema: configSemSenha, configPix: window.CONFIG_PIX || {}
  };
}

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// O estado exibido na tela precisa ser independente da cópia usada como base da
// sincronização. Sem essa cópia, uma venda também alterava a própria referência
// de comparação e a nuvem entendia que estoque, venda e movimento não mudaram.
function cloneState(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function mergeRecords(field, baseState, localState, remoteState) {
  const base = new Map((baseState?.[field] || []).map(item => [item.id, item]));
  const local = new Map((localState?.[field] || []).map(item => [item.id, item]));
  const remote = new Map((remoteState?.[field] || []).map(item => [item.id, item]));

  base.forEach((_, id) => { if (!local.has(id)) remote.delete(id); });
  local.forEach((item, id) => {
    const before = base.get(id);
    if (!before) {
      if (!remote.has(id)) remote.set(id, item);
      return;
    }
    if (same(item, before)) return;
    if (field === 'produtos') {
      const current = remote.get(id) || before;
      const merged = { ...current, ...item };
      if (Number.isFinite(Number(item.estoque)) && Number.isFinite(Number(before.estoque))) {
        merged.estoque = Number(current.estoque || 0) + (Number(item.estoque) - Number(before.estoque));
      }
      remote.set(id, merged);
      return;
    }
    remote.set(id, item);
  });
  return [...remote.values()];
}

function mergeState(baseState, localState, remoteState) {
  const merged = { ...remoteState, ownerUid: uid };
  ['produtos', 'vendas', 'movimentos', 'caixas', 'clientesFiado', 'pagamentosFiado', 'orcamentos']
    .forEach(field => { merged[field] = mergeRecords(field, baseState, localState, remoteState); });
  ['categorias', 'categoriasOcultas', 'configSistema', 'configPix'].forEach(field => {
    merged[field] = same(localState[field], baseState?.[field]) ? (remoteState?.[field] ?? localState[field]) : localState[field];
  });
  return merged;
}

async function salvarNuvem() {
  if (!uid || writing) return false;
  const localState = cloneState(state());
  const baseState = cloneState(lastSubmittedState || lastCloudState || {});
  lastSubmittedState = cloneState(localState);
  cloudQueue = cloudQueue.then(async () => {
    try {
      const ref = doc(db, 'users', uid, 'app', 'state');
      const merged = await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(ref);
        const remoteState = snapshot.exists() ? snapshot.data() : {};
        const result = mergeState(baseState, localState, remoteState);
        transaction.set(ref, { ...result, updatedAt: serverTimestamp() });
        return result;
      });
      lastCloudState = cloneState(merged);
      await sincronizarCatalogoPublico(uid);
      return true;
    } catch (e) {
      console.error('Erro de sincronização:', e);
      lastSubmittedState = lastCloudState;
      window.mostrarMensagem?.('Não foi possível sincronizar os dados na nuvem.', 'erro');
      return false;
    }
  });
  return cloudQueue;
}

async function salvarFinanceiroNuvem() {
  if (!uid || window.usuarioPdv?.role === 'operator') return false;
  const lancamentos = cloneState(window.lancamentosFinanceiros || []);
  financeQueue = financeQueue.then(async () => {
    try {
      await setDoc(doc(db, 'users', uid, 'app', 'financeiro'), {
        ownerUid: uid,
        lancamentosFinanceiros: lancamentos,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (e) {
      console.error('Erro de sincronização financeira:', e);
      window.mostrarMensagem?.('Não foi possível sincronizar os lançamentos financeiros.', 'erro');
      return false;
    }
  });
  return financeQueue;
}

function iniciarContaVazia() {
  // Nunca reutiliza produtos, vendas, PIX ou empresa que estavam no navegador de outra conta.
  writing = true;
  window.produtos = []; window.vendas = []; window.movimentos = []; window.caixas = [];
  window.clientesFiado = []; window.pagamentosFiado = [];
  window.orcamentos = [];
  window.categorias = []; window.categoriasOcultas = [];
  window.configSistema = { nomeEmpresa: 'PDV - Pro', cnpj: '' };
  Object.assign(window.CONFIG_PIX, pixPadrao);
  window.atualizarInterface?.(); window.atualizarInfoPix?.();
  writing = false;
  salvarNuvem();
}

protegerPagina(async (user, perfil) => {
  uid = perfil.role === 'operator' ? perfil.ownerUid : user.uid;
  if (!uid) { sair(); return; }
  let emailTitular = user.email || perfil.email || '';
  if (perfil.role === 'operator') {
    try {
      const titular = await getDoc(doc(db, 'users', uid));
      emailTitular = titular.exists() ? titular.data().email || '' : '';
    } catch (erro) {
      console.error('Não foi possível carregar a identificação do titular.', erro);
      emailTitular = '';
    }
  }
  window.usuarioPdv = {
    uid: user.uid,
    ownerUid: uid,
    nome: perfil.name || user.displayName || user.email?.split('@')[0] || 'Usuário',
    email: user.email || perfil.email || '',
    role: perfil.role || 'client'
  };
  if (perfil.role === 'operator') {
    window.lancamentosFinanceiros = [];
    localStorage.removeItem('pdv_lancamentos_financeiros');
  }
  window.ehOperadorPdv = () => window.usuarioPdv?.role === 'operator';
  inicializarCatalogoAdmin(uid);
  inicializarOperadores(perfil);
  window.validarSenhaAdm = perfil.role === 'operator'
    ? senha => validarSenhaTitular(emailTitular, uid, senha)
    : validarSenhaAtual;
  localStorage.removeItem('pdv_senha_adm_local');
  // Remove o hash legado: a senha administrativa agora é sempre validada pelo Firebase Authentication.
  if (perfil.role !== 'operator') deleteDoc(doc(db, 'users', uid, 'app', 'security')).catch(() => {});
  document.body.style.visibility = 'visible';
  window.aplicarPermissoesUsuario?.();
  setTimeout(() => window.focarBuscaProduto?.(), 0);
  document.title = perfil.role === 'operator' ? `PDV - Pro · ${window.usuarioPdv.nome}` : 'PDV - Pro';
  const header = document.querySelector('#menu-pdv');
  if (header && !document.querySelector('#btn-sair')) header.insertAdjacentHTML('beforeend', '<button id="btn-sair" class="bg-black px-3 py-2 rounded text-sm">Sair</button>');
  document.querySelector('#btn-sair')?.addEventListener('click', sair);

  onSnapshot(doc(db, 'users', uid, 'app', 'state'), snap => {
    if (!snap.exists()) { iniciarContaVazia(); return; }
    const recebido = snap.data();
    lastCloudState = cloneState(recebido);
    lastSubmittedState = cloneState(recebido);
    const d = cloneState(recebido);
    writing = true;
    window.produtos = d.produtos || []; window.vendas = d.vendas || []; window.movimentos = d.movimentos || []; window.caixas = d.caixas || [];
    window.clientesFiado = d.clientesFiado || []; window.pagamentosFiado = d.pagamentosFiado || [];
    window.orcamentos = d.orcamentos || [];
    window.categorias = d.categorias || []; window.categoriasOcultas = d.categoriasOcultas || [];
    window.configSistema = d.configSistema || { nomeEmpresa: 'PDV - Pro', cnpj: '' };
    window.normalizarEstoquesVinculados?.();
    window.aplicarTema?.();
    if (d.configPix) Object.assign(window.CONFIG_PIX, d.configPix);
    window.atualizarInterface?.(); window.atualizarInfoPix?.(); writing = false;
    window.aplicarPermissoesUsuario?.();
    sincronizarCatalogoPublico(uid).catch(erro => console.error('Erro ao atualizar catálogo público:', erro));
  });

  if (perfil.role !== 'operator') {
    onSnapshot(doc(db, 'users', uid, 'app', 'financeiro'), snap => {
      if (!snap.exists()) {
        window.lancamentosFinanceiros = window.lancamentosFinanceiros || [];
        window.atualizarFinanceiro?.();
        return;
      }
      window.lancamentosFinanceiros = cloneState(snap.data().lancamentosFinanceiros || []);
      writingLocalStorage = true;
      try { localStorage.setItem('pdv_lancamentos_financeiros', JSON.stringify(window.lancamentosFinanceiros)); }
      finally { writingLocalStorage = false; }
      window.atualizarFinanceiro?.();
    });
  }

  const original = window.salvarDados;
  window.salvarDados = () => {
    writingLocalStorage = true;
    try { original?.(); } finally { writingLocalStorage = false; }
    return salvarNuvem();
  };
  window.salvarFinanceiro = salvarFinanceiroNuvem;
  window.sincronizarCatalogoAgora = () => sincronizarCatalogoPublico(uid);
  const storageSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function(k, v) {
    storageSet.call(this, k, v);
    if (!writingLocalStorage && k.startsWith('pdv_')) salvarNuvem();
  };
});
