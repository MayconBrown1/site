import { db } from './firebase-config.js';
import { protegerPagina, sair } from './auth.js';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

let uid, writing = false, credencialAdm = null, segurancaPronta = null;
const ITERACOES_SENHA = 210000;
const ALGORITMO_SENHA = 'PBKDF2-SHA-256';
// Captura a configuração padrão antes que qualquer armazenamento local de outra conta seja usado.
const pixPadrao = { ...(window.CONFIG_PIX || {}) };

function bytesParaBase64(bytes) {
  let texto = '';
  bytes.forEach(byte => { texto += String.fromCharCode(byte); });
  return btoa(texto);
}

function base64ParaBytes(valor) {
  const texto = atob(valor);
  return Uint8Array.from(texto, caractere => caractere.charCodeAt(0));
}

async function derivarSenha(senha, salt, iteracoes = ITERACOES_SENHA) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: iteracoes, hash: 'SHA-256' }, material, 256);
  return new Uint8Array(bits);
}

async function criarCredencialAdm(senha) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivarSenha(senha, salt);
  return { ownerUid: uid, algorithm: ALGORITMO_SENHA, iterations: ITERACOES_SENHA, salt: bytesParaBase64(salt), hash: bytesParaBase64(hash) };
}

async function salvarCredencialAdm(senha) {
  if (!uid) throw new Error('Usuário ainda não carregado.');
  if (typeof senha !== 'string' || senha.length < 4) throw new Error('A senha deve ter pelo menos 4 caracteres.');
  const novaCredencial = await criarCredencialAdm(senha);
  await setDoc(doc(db, 'users', uid, 'app', 'security'), { ...novaCredencial, updatedAt: serverTimestamp() });
  credencialAdm = novaCredencial;
}

async function carregarCredencialAdm() {
  const referencia = doc(db, 'users', uid, 'app', 'security');
  const snapshot = await getDoc(referencia);
  if (snapshot.exists()) {
    credencialAdm = snapshot.data();
    localStorage.removeItem('pdv_senha_adm_local');
    return;
  }
  // Migra uma eventual senha da versão anterior uma única vez; somente o hash segue para o Firestore.
  const senhaAnterior = localStorage.getItem('pdv_senha_adm_local') || '1234';
  await salvarCredencialAdm(senhaAnterior);
  localStorage.removeItem('pdv_senha_adm_local');
}

async function validarCredencialAdm(senha) {
  await segurancaPronta;
  if (!credencialAdm || credencialAdm.algorithm !== ALGORITMO_SENHA) return false;
  const esperado = base64ParaBytes(credencialAdm.hash);
  const calculado = await derivarSenha(String(senha || ''), base64ParaBytes(credencialAdm.salt), credencialAdm.iterations);
  if (esperado.length !== calculado.length) return false;
  let diferenca = 0;
  for (let i = 0; i < esperado.length; i += 1) diferenca |= esperado[i] ^ calculado[i];
  return diferenca === 0;
}

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
  segurancaPronta = carregarCredencialAdm().catch(erro => {
    console.error('Erro ao carregar senha administrativa:', erro);
    throw erro;
  });
  window.validarSenhaAdm = validarCredencialAdm;
  window.configurarSenhaAdm = async senha => {
    await segurancaPronta;
    await salvarCredencialAdm(senha);
  };
  segurancaPronta.then(() => {
    onSnapshot(doc(db, 'users', uid, 'app', 'security'), snapshot => {
      if (snapshot.exists()) credencialAdm = snapshot.data();
    }, erro => console.error('Erro ao sincronizar senha administrativa:', erro));
  }).catch(() => {});
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

  const original = window.salvarDados;
  window.salvarDados = () => { original?.(); salvarNuvem(); };
  const storageSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function(k, v) { storageSet.call(this, k, v); if (k.startsWith('pdv_')) salvarNuvem(); };
});
