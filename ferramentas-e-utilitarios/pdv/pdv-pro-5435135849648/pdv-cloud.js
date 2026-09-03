import { db } from './firebase-config.js';
import { protegerPagina, sair } from './auth.js';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

let uid, writing = false;
function state() {
  const { senha, ...configSemSenha } = window.configSistema || {};
  return { produtos: window.produtos || [], vendas: window.vendas || [], movimentos: window.movimentos || [], categorias: window.categorias || [], categoriasOcultas: window.categoriasOcultas || [], configSistema: configSemSenha, configPix: window.CONFIG_PIX || {}, updatedAt: serverTimestamp() };
}
async function salvarNuvem() { if (!uid || writing) return; try { await setDoc(doc(db, 'users', uid, 'app', 'state'), state(), { merge: true }); } catch (e) { console.error('Erro de sincronização:', e); window.mostrarMensagem?.('Não foi possível sincronizar os dados na nuvem.', 'erro'); } }

protegerPagina((user, perfil) => {
  uid = user.uid;
  document.body.style.visibility = 'visible';
  document.title = 'PDV - Pro';
  const header = document.querySelector('header div');
  if (header && !document.querySelector('#btn-sair')) header.insertAdjacentHTML('beforeend', '<button id="btn-sair" class="bg-black px-3 py-2 rounded text-sm">Sair</button>');
  document.querySelector('#btn-sair')?.addEventListener('click', sair);
  onSnapshot(doc(db, 'users', uid, 'app', 'state'), snap => {
    if (!snap.exists()) { window.carregarDados?.(); salvarNuvem(); return; }
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
