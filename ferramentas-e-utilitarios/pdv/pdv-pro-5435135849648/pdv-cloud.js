import { db } from './firebase-config.js';
import { protegerPagina, sair, validarSenhaAtual, validarSenhaTitular } from './auth.js';
import { inicializarCatalogoAdmin, sincronizarCatalogoPublico } from './catalogo-admin.js';
import { inicializarOperadores } from './operator-admin.js';
import { deleteDoc, doc, getDoc, onSnapshot, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

let uid;
let writing = false;
let writingLocalStorage = false;
let lastCloudState = null;
let lastCloudFinance = null;
let originalSalvarDados = null;
let cloudQueue = Promise.resolve();
let financeQueue = Promise.resolve();
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

function financeState() {
  return {
    ownerUid: uid,
    lancamentosFinanceiros: window.lancamentosFinanceiros || [],
    saldosIniciaisFinanceiros: window.saldosIniciaisFinanceiros || {}
  };
}

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// O estado exibido na tela precisa ser independente da cópia usada como base da
// sincronização. Assim cada baixa de estoque é aplicada uma única vez.
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
    const current = remote.get(id) || before;
    const merged = { ...current };
    new Set([...Object.keys(before), ...Object.keys(item)]).forEach(chave => {
      if (!(chave in item)) delete merged[chave];
      else if (!same(item[chave], before[chave])) merged[chave] = item[chave];
    });
    if (field === 'produtos' && Number.isFinite(Number(item.estoque)) && Number.isFinite(Number(before.estoque))) {
      merged.estoque = Number(current.estoque || 0) + (Number(item.estoque) - Number(before.estoque));
    }
    remote.set(id, merged);
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

function mergeFinanceState(baseState, localState, remoteState) {
  const merged = { ...remoteState, ownerUid: uid };
  merged.lancamentosFinanceiros = mergeRecords('lancamentosFinanceiros', baseState, localState, remoteState);
  const base = baseState?.saldosIniciaisFinanceiros || {};
  const local = localState?.saldosIniciaisFinanceiros || {};
  const remote = remoteState?.saldosIniciaisFinanceiros || {};
  merged.saldosIniciaisFinanceiros = { ...remote };
  new Set([...Object.keys(base), ...Object.keys(local)]).forEach(chave => {
    if (!(chave in local)) delete merged.saldosIniciaisFinanceiros[chave];
    else if (!same(local[chave], base[chave])) merged.saldosIniciaisFinanceiros[chave] = local[chave];
  });
  return merged;
}

function chaveLocal(tipo) { return `pdv_offline_${tipo}_${uid}`; }
function lerJson(chave) {
  try { return JSON.parse(localStorage.getItem(chave) || 'null'); }
  catch (_) { return null; }
}
function gravarJson(chave, valor) { localStorage.setItem(chave, JSON.stringify(valor)); }
function novaRevisao() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`; }
function pendenciaPrincipal() { return uid ? lerJson(chaveLocal('pending')) : null; }
function pendenciaFinanceira() { return uid ? lerJson(chaveLocal('finance_pending')) : null; }

function emitirStatus(message = '') {
  const pending = Boolean(pendenciaPrincipal() || pendenciaFinanceira());
  window.dispatchEvent(new CustomEvent('pdv-sync-status', { detail: { pending, message } }));
}

function guardarCopiaPrincipal(valor) {
  if (uid) gravarJson(chaveLocal('state'), { data: cloneState(valor), savedAt: new Date().toISOString() });
}

function guardarBasePrincipal(valor) {
  if (uid) gravarJson(chaveLocal('base'), cloneState(valor));
}

function guardarCopiaFinanceira(valor) {
  if (uid) gravarJson(chaveLocal('finance'), { data: cloneState(valor), savedAt: new Date().toISOString() });
}

function aplicarEstado(valor) {
  const d = cloneState(valor || {});
  writing = true;
  window.produtos = d.produtos || []; window.vendas = d.vendas || []; window.movimentos = d.movimentos || []; window.caixas = d.caixas || [];
  window.clientesFiado = d.clientesFiado || []; window.pagamentosFiado = d.pagamentosFiado || [];
  window.orcamentos = d.orcamentos || [];
  window.categorias = d.categorias || []; window.categoriasOcultas = d.categoriasOcultas || [];
  window.configSistema = d.configSistema || { nomeEmpresa: 'PDV - Pro', cnpj: '' };
  Object.assign(window.CONFIG_PIX, pixPadrao, d.configPix || {});
  window.normalizarEstoquesVinculados?.();
  window.aplicarTema?.();
  writingLocalStorage = true;
  try { originalSalvarDados?.(); } finally { writingLocalStorage = false; }
  window.atualizarInterface?.(); window.atualizarInfoPix?.();
  writing = false;
  window.aplicarPermissoesUsuario?.();
  guardarCopiaPrincipal(state());
}

function aplicarFinanceiro(valor) {
  const d = cloneState(valor || {});
  window.lancamentosFinanceiros = d.lancamentosFinanceiros || [];
  window.saldosIniciaisFinanceiros = d.saldosIniciaisFinanceiros || {};
  writingLocalStorage = true;
  try {
    localStorage.setItem('pdv_lancamentos_financeiros', JSON.stringify(window.lancamentosFinanceiros));
    localStorage.setItem('pdv_saldos_iniciais_financeiros', JSON.stringify(window.saldosIniciaisFinanceiros));
  } finally { writingLocalStorage = false; }
  window.atualizarFinanceiro?.();
  guardarCopiaFinanceira(financeState());
}

function registrarPendenciaPrincipal(localState) {
  const anterior = pendenciaPrincipal();
  const base = anterior?.base || lastCloudState || lerJson(chaveLocal('base')) || localState;
  const pending = { base: cloneState(base), local: cloneState(localState), revision: novaRevisao(), savedAt: new Date().toISOString() };
  gravarJson(chaveLocal('pending'), pending);
  guardarCopiaPrincipal(localState);
  emitirStatus(navigator.onLine ? '↻ Online · sincronizando dados…' : '● Sem internet · alterações protegidas neste aparelho');
  return pending;
}

function registrarPendenciaFinanceira(localState) {
  const anterior = pendenciaFinanceira();
  const base = anterior?.base || lastCloudFinance || lerJson(chaveLocal('finance_base')) || localState;
  const pending = { base: cloneState(base), local: cloneState(localState), revision: novaRevisao(), savedAt: new Date().toISOString() };
  gravarJson(chaveLocal('finance_pending'), pending);
  guardarCopiaFinanceira(localState);
  emitirStatus(navigator.onLine ? '↻ Online · sincronizando dados…' : '● Sem internet · alterações protegidas neste aparelho');
  return pending;
}

async function sincronizarPrincipal() {
  const pending = pendenciaPrincipal();
  if (!uid || !pending) { emitirStatus(); return true; }
  if (!navigator.onLine) { emitirStatus(); return false; }
  try {
    const ref = doc(db, 'users', uid, 'app', 'state');
    const merged = await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(ref);
      const remoteState = snapshot.exists() ? snapshot.data() : {};
      const result = mergeState(pending.base || {}, pending.local || {}, remoteState);
      transaction.set(ref, { ...result, updatedAt: serverTimestamp() });
      return result;
    });
    lastCloudState = cloneState(merged);
    guardarBasePrincipal(merged);
    const atual = pendenciaPrincipal();
    if (atual?.revision === pending.revision) {
      localStorage.removeItem(chaveLocal('pending'));
      guardarCopiaPrincipal(merged);
    } else if (atual) {
      atual.base = cloneState(pending.local);
      gravarJson(chaveLocal('pending'), atual);
    }
    sincronizarCatalogoPublico(uid).catch(erro => console.error('Erro ao atualizar catálogo público:', erro));
    emitirStatus(pendenciaPrincipal() ? '↻ Enviando alterações mais recentes…' : '✓ Dados sincronizados com o Firebase');
    return true;
  } catch (erro) {
    console.error('Erro de sincronização; a alteração continuará na fila local:', erro);
    emitirStatus('● Sincronização pendente · nova tentativa automática');
    return false;
  }
}

async function salvarNuvem() {
  if (!uid || writing) return false;
  registrarPendenciaPrincipal(cloneState(state()));
  cloudQueue = cloudQueue.then(sincronizarPrincipal, sincronizarPrincipal);
  return cloudQueue;
}

async function sincronizarFinanceiro() {
  const pending = pendenciaFinanceira();
  if (!uid || !pending || window.usuarioPdv?.role === 'operator') { emitirStatus(); return true; }
  if (!navigator.onLine) { emitirStatus(); return false; }
  try {
    const ref = doc(db, 'users', uid, 'app', 'financeiro');
    const merged = await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(ref);
      const remoteState = snapshot.exists() ? snapshot.data() : {};
      const result = mergeFinanceState(pending.base || {}, pending.local || {}, remoteState);
      transaction.set(ref, { ...result, updatedAt: serverTimestamp() });
      return result;
    });
    lastCloudFinance = cloneState(merged);
    gravarJson(chaveLocal('finance_base'), merged);
    const atual = pendenciaFinanceira();
    if (atual?.revision === pending.revision) {
      localStorage.removeItem(chaveLocal('finance_pending'));
      guardarCopiaFinanceira(merged);
    } else if (atual) {
      atual.base = cloneState(pending.local);
      gravarJson(chaveLocal('finance_pending'), atual);
    }
    emitirStatus(pendenciaFinanceira() ? '↻ Enviando alterações financeiras…' : '✓ Dados sincronizados com o Firebase');
    return true;
  } catch (erro) {
    console.error('Erro de sincronização financeira; a alteração continuará na fila local:', erro);
    emitirStatus('● Sincronização pendente · nova tentativa automática');
    return false;
  }
}

async function salvarFinanceiroNuvem() {
  if (!uid || window.usuarioPdv?.role === 'operator') return false;
  registrarPendenciaFinanceira(cloneState(financeState()));
  financeQueue = financeQueue.then(sincronizarFinanceiro, sincronizarFinanceiro);
  return financeQueue;
}

function iniciarContaVazia() {
  aplicarEstado({
    ownerUid: uid, produtos: [], vendas: [], movimentos: [], caixas: [], clientesFiado: [], pagamentosFiado: [],
    orcamentos: [], categorias: [], categoriasOcultas: [], configSistema: { nomeEmpresa: 'PDV - Pro', cnpj: '' }, configPix: pixPadrao
  });
  salvarNuvem();
}

protegerPagina(async (user, perfil) => {
  uid = perfil.role === 'operator' ? perfil.ownerUid : user.uid;
  if (!uid) { sair(); return; }
  originalSalvarDados = window.salvarDados;
  let emailTitular = user.email || perfil.email || '';
  if (perfil.role === 'operator') {
    try {
      const titular = await getDoc(doc(db, 'users', uid));
      emailTitular = titular.exists() ? titular.data().email || '' : '';
    } catch (erro) {
      console.error('Não foi possível carregar a identificação do titular.', erro);
      emailTitular = perfil.ownerEmail || '';
    }
  }
  window.usuarioPdv = {
    uid: user.uid, ownerUid: uid,
    nome: perfil.name || user.displayName || user.email?.split('@')[0] || 'Usuário',
    email: user.email || perfil.email || '', role: perfil.role || 'client'
  };
  if (perfil.role === 'operator') {
    window.lancamentosFinanceiros = [];
    window.saldosIniciaisFinanceiros = {};
    localStorage.removeItem('pdv_lancamentos_financeiros');
    localStorage.removeItem('pdv_saldos_iniciais_financeiros');
  }
  window.ehOperadorPdv = () => window.usuarioPdv?.role === 'operator';
  inicializarCatalogoAdmin(uid);
  inicializarOperadores(perfil);
  window.validarSenhaAdm = perfil.role === 'operator'
    ? senha => validarSenhaTitular(emailTitular, uid, senha)
    : validarSenhaAtual;
  localStorage.removeItem('pdv_senha_adm_local');
  if (perfil.role !== 'operator') deleteDoc(doc(db, 'users', uid, 'app', 'security')).catch(() => {});

  const copiaLocal = lerJson(chaveLocal('state'))?.data;
  if (copiaLocal) aplicarEstado(copiaLocal);
  else aplicarEstado({ ownerUid: uid, configSistema: { nomeEmpresa: 'PDV - Pro', cnpj: '' }, configPix: pixPadrao });
  if (perfil.role !== 'operator') {
    const copiaFinanceira = lerJson(chaveLocal('finance'))?.data;
    if (copiaFinanceira) aplicarFinanceiro(copiaFinanceira);
  }

  document.body.style.visibility = 'visible';
  window.aplicarPermissoesUsuario?.();
  setTimeout(() => window.focarBuscaProduto?.(), 0);
  document.title = perfil.role === 'operator' ? `PDV - Pro · ${window.usuarioPdv.nome}` : 'PDV - Pro';
  const header = document.querySelector('#menu-pdv');
  if (header && !document.querySelector('#btn-sair')) header.insertAdjacentHTML('beforeend', '<button id="btn-sair" class="bg-black px-3 py-2 rounded text-sm">Sair</button>');
  document.querySelector('#btn-sair')?.addEventListener('click', sair);

  onSnapshot(doc(db, 'users', uid, 'app', 'state'), snap => {
    if (!snap.exists()) { if (!pendenciaPrincipal()) iniciarContaVazia(); return; }
    const recebido = cloneState(snap.data());
    const pending = pendenciaPrincipal();
    let exibir = recebido;
    if (pending && snap.metadata.fromCache) {
      // A cópia do IndexedDB pode ser anterior à base da fila local. Aguarde a
      // confirmação do servidor antes de recalcular baixas de estoque.
      exibir = pending.local;
    } else if (pending) {
      exibir = mergeState(pending.base || {}, pending.local || {}, recebido);
      pending.base = cloneState(recebido);
      pending.local = cloneState(exibir);
      gravarJson(chaveLocal('pending'), pending);
    }
    if (!snap.metadata.fromCache) {
      lastCloudState = cloneState(recebido);
      guardarBasePrincipal(recebido);
    }
    aplicarEstado(exibir);
    sincronizarCatalogoPublico(uid).catch(erro => console.error('Erro ao atualizar catálogo público:', erro));
    emitirStatus();
  }, erro => {
    console.error('Não foi possível acompanhar os dados na nuvem.', erro);
    emitirStatus('● Trabalhando com a cópia salva neste aparelho');
  });

  if (perfil.role !== 'operator') {
    onSnapshot(doc(db, 'users', uid, 'app', 'financeiro'), snap => {
      if (!snap.exists()) { window.atualizarFinanceiro?.(); return; }
      const recebido = cloneState(snap.data());
      const pending = pendenciaFinanceira();
      let exibir = recebido;
      if (pending && snap.metadata.fromCache) {
        exibir = pending.local;
      } else if (pending) {
        exibir = mergeFinanceState(pending.base || {}, pending.local || {}, recebido);
        pending.base = cloneState(recebido);
        pending.local = cloneState(exibir);
        gravarJson(chaveLocal('finance_pending'), pending);
      }
      if (!snap.metadata.fromCache) {
        lastCloudFinance = cloneState(recebido);
        gravarJson(chaveLocal('finance_base'), recebido);
      }
      aplicarFinanceiro(exibir);
      emitirStatus();
    }, erro => {
      console.error('Não foi possível acompanhar o Financeiro na nuvem.', erro);
      emitirStatus('● Financeiro usando a cópia salva neste aparelho');
    });
  }

  window.salvarDados = () => {
    writingLocalStorage = true;
    try { originalSalvarDados?.(); } finally { writingLocalStorage = false; }
    return salvarNuvem();
  };
  window.salvarFinanceiro = salvarFinanceiroNuvem;
  window.sincronizarCatalogoAgora = () => sincronizarCatalogoPublico(uid);

  const chavesQueAlteramEstado = new Set([
    'pdv_produtos', 'pdv_vendas', 'pdv_movimentos', 'pdv_caixas', 'pdv_categorias', 'pdv_categorias_ocultas',
    'pdv_config_sistema', 'pdv_clientes_fiado', 'pdv_pagamentos_fiado', 'pdv_orcamentos', 'pdv_config_pix'
  ]);
  const storageSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function(k, v) {
    storageSet.call(this, k, v);
    if (!writingLocalStorage && chavesQueAlteramEstado.has(k)) salvarNuvem();
  };

  window.addEventListener('online', () => {
    emitirStatus('↻ Internet voltou · sincronizando dados…');
    cloudQueue = cloudQueue.then(sincronizarPrincipal, sincronizarPrincipal);
    financeQueue = financeQueue.then(sincronizarFinanceiro, sincronizarFinanceiro);
  });
  window.addEventListener('offline', () => emitirStatus());
  emitirStatus();
  if (navigator.onLine) {
    cloudQueue = cloudQueue.then(sincronizarPrincipal, sincronizarPrincipal);
    financeQueue = financeQueue.then(sincronizarFinanceiro, sincronizarFinanceiro);
  }
});
