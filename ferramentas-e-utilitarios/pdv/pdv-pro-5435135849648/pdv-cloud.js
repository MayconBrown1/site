import { db } from './firebase-config.js';
import { protegerPagina, sair } from './auth.js';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

let uid, writing = false;
// Captura a configuração padrão antes que qualquer armazenamento local de outra conta seja usado.
const pixPadrao = { ...(window.CONFIG_PIX || {}) };

function state() {
  const { senha, ...configSemSenha } = window.configSistema || {};
  return {
    ownerUid: uid,
    produtos: window.produtos || [], vendas: window.vendas || [], movimentos: window.movimentos || [],
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
  window.produtos = []; window.vendas = []; window.movimentos = [];
  window.categorias = []; window.categoriasOcultas = [];
  window.configSistema = { nomeEmpresa: 'PDV - Pro', cnpj: '' };
  Object.assign(window.CONFIG_PIX, pixPadrao);
  window.atualizarInterface?.(); window.atualizarInfoPix?.();
  writing = false;
  salvarNuvem();
}

protegerPagina((user) => {
  uid = user.uid;
  document.body.style.visibility = 'visible';
  document.title = 'PDV - Pro';
  const header = document.querySelector('#menu-pdv');
  if (header && !document.querySelector('#btn-sair')) header.insertAdjacentHTML('beforeend', '<button id="btn-sair" class="bg-black px-3 py-2 rounded text-sm">Sair</button>');
  document.querySelector('#btn-sair')?.addEventListener('click', sair);

  onSnapshot(doc(db, 'users', uid, 'app', 'state'), snap => {
    if (!snap.exists()) { iniciarContaVazia(); return; }
    const d = snap.data(); writing = true;
    window.produtos = d.produtos || []; window.vendas = d.vendas || []; window.movimentos = d.movimentos || [];
    window.categorias = d.categorias || []; window.categoriasOcultas = d.categoriasOcultas || [];
    window.configSistema = d.configSistema || { nomeEmpresa: 'PDV - Pro', cnpj: '' };
    if (d.configPix) Object.assign(window.CONFIG_PIX, d.configPix);
    window.atualizarInterface?.(); window.atualizarInfoPix?.(); writing = false;
  });

  const original = window.salvarDados;
  window.salvarDados = () => { original?.(); salvarNuvem(); };
  const storageSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function(k, v) { storageSet.call(this, k, v); if (k.startsWith('pdv_')) salvarNuvem(); };
});
