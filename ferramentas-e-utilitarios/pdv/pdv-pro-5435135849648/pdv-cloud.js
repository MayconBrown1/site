import { app, db } from './firebase-config.js';
import { protegerPagina, sair, validarSenhaAtual } from './auth.js';
import { deleteDoc, doc, onSnapshot, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-functions.js';

let uid, writing = false;
const functions = getFunctions(app, 'southamerica-east1');
const callSavePixProvider = httpsCallable(functions, 'savePixProviderCredentials');
const callTestPixProvider = httpsCallable(functions, 'testPixProviderConnection');
const callRemovePixProvider = httpsCallable(functions, 'removePixProviderCredentials');
const callCreatePixCharge = httpsCallable(functions, 'createPixCharge');
const callRefreshPixCharge = httpsCallable(functions, 'refreshPixCharge');
window.pixIntegration = { provider: 'manual', status: 'inactive', accountLabel: '' };
// Captura a configuração padrão antes que qualquer armazenamento local de outra conta seja usado.
const pixPadrao = { ...(window.CONFIG_PIX || {}) };

function state() {
  const { senha, ...configSemSenha } = window.configSistema || {};
  return {
    ownerUid: uid,
    produtos: window.produtos || [], vendas: window.vendas || [], movimentos: window.movimentos || [], caixas: window.caixas || [],
    clientesFiado: window.clientesFiado || [], pagamentosFiado: window.pagamentosFiado || [],
    categorias: window.categorias || [], categoriasOcultas: window.categoriasOcultas || [],
    configSistema: configSemSenha, configPix: window.CONFIG_PIX || {}, updatedAt: serverTimestamp()
  };
}

async function salvarNuvem() {
  if (!uid || writing) return;
  try { await setDoc(doc(db, 'users', uid, 'app', 'state'), state(), { merge: true }); }
  catch (e) { console.error('Erro de sincronização:', e); window.mostrarMensagem?.('Não foi possível sincronizar os dados na nuvem.', 'erro'); }
}

function iniciarContaVazia() {
  // Nunca reutiliza produtos, vendas, PIX ou empresa que estavam no navegador de outra conta.
  writing = true;
  window.produtos = []; window.vendas = []; window.movimentos = []; window.caixas = [];
  window.clientesFiado = []; window.pagamentosFiado = [];
  window.categorias = []; window.categoriasOcultas = [];
  window.configSistema = { nomeEmpresa: 'PDV - Pro', cnpj: '' };
  Object.assign(window.CONFIG_PIX, pixPadrao);
  window.atualizarInterface?.(); window.atualizarInfoPix?.();
  writing = false;
  salvarNuvem();
}

protegerPagina((user) => {
  uid = user.uid;
  window.validarSenhaAdm = validarSenhaAtual;
  localStorage.removeItem('pdv_senha_adm_local');
  // Remove o hash legado: a senha administrativa agora é sempre validada pelo Firebase Authentication.
  deleteDoc(doc(db, 'users', uid, 'app', 'security')).catch(() => {});
  document.body.style.visibility = 'visible';
  setTimeout(() => window.focarBuscaProduto?.(), 0);
  document.title = 'PDV - Pro';
  const header = document.querySelector('#menu-pdv');
  if (header && !document.querySelector('#btn-sair')) header.insertAdjacentHTML('beforeend', '<button id="btn-sair" class="bg-black px-3 py-2 rounded text-sm">Sair</button>');
  document.querySelector('#btn-sair')?.addEventListener('click', sair);

  onSnapshot(doc(db, 'users', uid, 'app', 'state'), snap => {
    if (!snap.exists()) { iniciarContaVazia(); return; }
    const d = snap.data(); writing = true;
    window.produtos = d.produtos || []; window.vendas = d.vendas || []; window.movimentos = d.movimentos || []; window.caixas = d.caixas || [];
    window.clientesFiado = d.clientesFiado || []; window.pagamentosFiado = d.pagamentosFiado || [];
    window.categorias = d.categorias || []; window.categoriasOcultas = d.categoriasOcultas || [];
    window.configSistema = d.configSistema || { nomeEmpresa: 'PDV - Pro', cnpj: '' };
    window.aplicarTema?.();
    if (d.configPix) Object.assign(window.CONFIG_PIX, d.configPix);
    window.atualizarInterface?.(); window.atualizarInfoPix?.(); writing = false;
  });

  onSnapshot(doc(db, 'users', uid, 'app', 'pixIntegration'), snap => {
    window.pixIntegration = snap.exists()
      ? { provider: 'manual', status: 'inactive', accountLabel: '', ...snap.data() }
      : { provider: 'manual', status: 'inactive', accountLabel: '' };
    window.atualizarStatusIntegracaoPix?.();
    window.retomarMonitoramentoPix?.();
  });

  window.salvarIntegracaoPixAutomatica = async ({ provider, accessToken }) => {
    const result = await callSavePixProvider({ provider, accessToken });
    return result.data;
  };
  window.testarIntegracaoPixAutomatica = async () => (await callTestPixProvider()).data;
  window.removerIntegracaoPixAutomatica = async () => (await callRemovePixProvider()).data;
  window.criarCobrancaPix = async dados => (await callCreatePixCharge(dados)).data;
  window.atualizarCobrancaPix = async chargeId => (await callRefreshPixCharge({ chargeId })).data;
  window.observarCobrancaPix = (chargeId, callback, onError) => onSnapshot(
    doc(db, 'users', uid, 'pixPayments', chargeId),
    snap => { if (snap.exists()) callback({ id: snap.id, ...snap.data() }); },
    onError
  );

  const original = window.salvarDados;
  window.salvarDados = () => { original?.(); salvarNuvem(); };
  const storageSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function(k, v) { storageSet.call(this, k, v); if (k.startsWith('pdv_')) salvarNuvem(); };
});
