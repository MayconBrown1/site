import { db } from './firebase-config.js';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const SLUGS_RESERVADOS = new Set(['admin', 'cadastro', 'catalogo', 'login', 'pdv', 'suporte']);
const TAMANHO_LOTE = 400;
let usuarioUid = '';
let sincronizacaoAtual = null;
let repetirSincronizacao = false;

export function normalizarSlugCatalogo(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

function normalizarWhatsapp(valor) {
  const original = String(valor || '').trim();
  let digitos = original.replace(/\D/g, '');
  if (!original.startsWith('+') && digitos.length >= 10 && digitos.length <= 11) digitos = `55${digitos}`;
  return digitos;
}

function urlHttpsOuVazia(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return '';
  try {
    const url = new URL(texto);
    return url.protocol === 'https:' ? url.href : '';
  } catch (_) {
    return '';
  }
}

function linkDoCatalogo(slug) {
  const url = new URL('./catalogo/', window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('loja', slug);
  return url.href;
}

function definirStatus(texto, tipo = 'neutro') {
  const status = document.getElementById('catalogo-status');
  if (!status) return;
  status.textContent = texto;
  status.className = `mt-3 text-sm ${tipo === 'erro' ? 'text-red-600' : tipo === 'sucesso' ? 'text-green-700' : 'text-slate-600'}`;
}

function atualizarLinkExibido() {
  const slug = normalizarSlugCatalogo(window.configSistema?.catalogo?.slug);
  const campo = document.getElementById('catalogo-link');
  const botoes = document.querySelectorAll('[data-acao-link-catalogo]');
  if (campo) campo.value = slug ? linkDoCatalogo(slug) : '';
  botoes.forEach(botao => { botao.disabled = !slug; });
}

export function carregarMeuCatalogo() {
  const configuracao = window.configSistema?.catalogo || {};
  const nomePadrao = window.configSistema?.nomeEmpresa && window.configSistema.nomeEmpresa !== 'PDV - Pro'
    ? window.configSistema.nomeEmpresa
    : '';
  const telefonePadrao = window.configSistema?.telefone || '';
  const nome = document.getElementById('catalogo-nome-loja');
  if (!nome) return;
  nome.value = configuracao.nomeLoja || nomePadrao;
  document.getElementById('catalogo-logo').value = configuracao.logo || '';
  document.getElementById('catalogo-whatsapp').value = configuracao.whatsappExibicao || configuracao.whatsapp || telefonePadrao;
  document.getElementById('catalogo-descricao').value = configuracao.descricaoCurta || '';
  document.getElementById('catalogo-slug').value = configuracao.slug || normalizarSlugCatalogo(configuracao.nomeLoja || nomePadrao);
  atualizarLinkExibido();
}

async function executarOperacoesEmLotes(operacoes) {
  for (let inicio = 0; inicio < operacoes.length; inicio += TAMANHO_LOTE) {
    const lote = writeBatch(db);
    operacoes.slice(inicio, inicio + TAMANHO_LOTE).forEach(operacao => operacao(lote));
    await lote.commit();
  }
}

async function reservarSlug(uid, slug) {
  await setDoc(doc(db, 'catalogOwners', slug), {
    uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

function idPublicoProduto(produto, indice) {
  const base = String(produto.id || `produto-${indice}`);
  return encodeURIComponent(base).slice(0, 1400) || `produto-${indice}`;
}

async function removerCatalogoAnterior(uid, slug) {
  if (!slug) return;
  const produtosRef = collection(db, 'publicCatalogs', slug, 'products');
  const produtosAntigos = await getDocs(produtosRef);
  const operacoes = produtosAntigos.docs.map(item => lote => lote.delete(item.ref));
  await executarOperacoesEmLotes(operacoes);
  await deleteDoc(doc(db, 'publicCatalogs', slug));
  await deleteDoc(doc(db, 'catalogOwners', slug));
}

async function executarSincronizacao(uid) {
  const configuracao = window.configSistema?.catalogo;
  if (!uid || !configuracao?.slug || configuracao.ativo === false) return;

  const slug = normalizarSlugCatalogo(configuracao.slug);
  await reservarSlug(uid, slug);

  await setDoc(doc(db, 'publicCatalogs', slug), {
    nomeLoja: String(configuracao.nomeLoja || '').trim(),
    logo: urlHttpsOuVazia(configuracao.logo),
    whatsapp: normalizarWhatsapp(configuracao.whatsapp),
    descricaoCurta: String(configuracao.descricaoCurta || '').trim().slice(0, 500),
    ativo: true,
    updatedAt: serverTimestamp()
  });

  const produtosPublicos = (window.produtos || [])
    .filter(produto => produto?.visivelCatalogo === true && (produto.tipo === 'servico' || Number(produto.estoque) > 0))
    .map((produto, indice) => ({
      ref: doc(db, 'publicCatalogs', slug, 'products', idPublicoProduto(produto, indice)),
      dados: {
        nome: String(produto.nome || '').trim().slice(0, 120),
        descricao: String(produto.descricao || '').trim().slice(0, 1000),
        preco: Number(produto.preco || 0),
        categoria: String(produto.categoria || '').trim().slice(0, 80),
        estoque: produto.tipo === 'servico' ? null : Number(produto.estoque || 0),
        imagem: urlHttpsOuVazia(produto.imagem),
        unidade: String(produto.unidade || 'un').slice(0, 20),
        tipo: produto.tipo === 'servico' ? 'servico' : 'produto',
        updatedAt: serverTimestamp()
      }
    }))
    .filter(produto => produto.dados.nome && produto.dados.preco >= 0);

  const produtosRef = collection(db, 'publicCatalogs', slug, 'products');
  const existentes = await getDocs(produtosRef);
  const idsAtuais = new Set(produtosPublicos.map(produto => produto.ref.id));
  const operacoes = produtosPublicos.map(produto => lote => lote.set(produto.ref, produto.dados));
  existentes.docs.filter(item => !idsAtuais.has(item.id)).forEach(item => operacoes.push(lote => lote.delete(item.ref)));
  await executarOperacoesEmLotes(operacoes);

  const slugAnterior = normalizarSlugCatalogo(configuracao.slugAnterior);
  if (slugAnterior && slugAnterior !== slug) {
    await removerCatalogoAnterior(uid, slugAnterior);
    delete configuracao.slugAnterior;
    await setDoc(doc(db, 'users', uid, 'app', 'state'), { configSistema: window.configSistema }, { merge: true });
  }

  atualizarLinkExibido();
}

export function sincronizarCatalogoPublico(uid = usuarioUid) {
  if (sincronizacaoAtual) {
    repetirSincronizacao = true;
    return sincronizacaoAtual;
  }
  sincronizacaoAtual = (async () => {
    do {
      repetirSincronizacao = false;
      await executarSincronizacao(uid);
    } while (repetirSincronizacao);
  })().finally(() => { sincronizacaoAtual = null; });
  return sincronizacaoAtual;
}

async function salvarMeuCatalogo() {
  if (!usuarioUid) return definirStatus('Aguarde a conta terminar de carregar.', 'erro');
  const nomeLoja = document.getElementById('catalogo-nome-loja').value.trim();
  const logoInformada = document.getElementById('catalogo-logo').value.trim();
  const whatsappInformado = document.getElementById('catalogo-whatsapp').value.trim();
  const whatsapp = normalizarWhatsapp(whatsappInformado);
  const descricaoCurta = document.getElementById('catalogo-descricao').value.trim();
  const slug = normalizarSlugCatalogo(document.getElementById('catalogo-slug').value);
  const botao = document.getElementById('btn-salvar-catalogo');

  if (!nomeLoja) return definirStatus('Informe o nome da loja.', 'erro');
  if (slug.length < 3 || SLUGS_RESERVADOS.has(slug)) return definirStatus('Escolha um identificador com 3 a 50 caracteres que não seja reservado.', 'erro');
  if (whatsapp.length < 12 || whatsapp.length > 15) return definirStatus('Informe o WhatsApp com DDD. O código do Brasil (+55) é acrescentado automaticamente.', 'erro');
  if (logoInformada && !urlHttpsOuVazia(logoInformada)) return definirStatus('A logo precisa usar um endereço HTTPS válido.', 'erro');

  botao.disabled = true;
  definirStatus('Verificando o identificador e publicando o catálogo...');
  const anterior = window.configSistema?.catalogo || {};
  try {
    await reservarSlug(usuarioUid, slug);
    window.configSistema.catalogo = {
      ...anterior,
      nomeLoja: nomeLoja.slice(0, 120),
      logo: urlHttpsOuVazia(logoInformada),
      whatsapp,
      whatsappExibicao: whatsappInformado,
      descricaoCurta: descricaoCurta.slice(0, 500),
      slug,
      ativo: true,
      ...(anterior.slug && anterior.slug !== slug ? { slugAnterior: anterior.slug } : {})
    };
    const salvamento = window.salvarDados?.();
    if (salvamento?.then) await salvamento;
    await sincronizarCatalogoPublico(usuarioUid);
    carregarMeuCatalogo();
    definirStatus('Catálogo salvo e sincronizado com o estoque atual.', 'sucesso');
  } catch (erro) {
    console.error('Erro ao salvar catálogo:', erro);
    definirStatus(
      erro.code === 'permission-denied'
        ? 'Este identificador já está em uso ou as novas regras do Firestore ainda não foram publicadas.'
        : 'Não foi possível salvar o catálogo. Verifique a conexão e tente novamente.',
      'erro'
    );
  } finally {
    botao.disabled = false;
  }
}

async function copiarLinkCatalogo() {
  const link = document.getElementById('catalogo-link')?.value;
  if (!link) return;
  try {
    await navigator.clipboard.writeText(link);
    definirStatus('Link copiado.', 'sucesso');
  } catch (_) {
    const campo = document.getElementById('catalogo-link');
    campo.select();
    document.execCommand('copy');
    definirStatus('Link copiado.', 'sucesso');
  }
}

async function compartilharCatalogo() {
  const link = document.getElementById('catalogo-link')?.value;
  if (!link) return;
  if (navigator.share) {
    try {
      await navigator.share({ title: window.configSistema?.catalogo?.nomeLoja || 'Meu catálogo', url: link });
    } catch (erro) {
      if (erro.name !== 'AbortError') definirStatus('Não foi possível abrir o compartilhamento.', 'erro');
    }
    return;
  }
  await copiarLinkCatalogo();
}

function ajustarSlugCatalogo(campo) {
  campo.value = normalizarSlugCatalogo(campo.value);
  const configuracao = window.configSistema?.catalogo || {};
  const temporaria = { ...configuracao, slug: campo.value };
  const atual = window.configSistema.catalogo;
  window.configSistema.catalogo = temporaria;
  atualizarLinkExibido();
  window.configSistema.catalogo = atual;
}

export function inicializarCatalogoAdmin(uid) {
  usuarioUid = uid;
  window.salvarMeuCatalogo = salvarMeuCatalogo;
  window.copiarLinkCatalogo = copiarLinkCatalogo;
  window.compartilharCatalogo = compartilharCatalogo;
  window.carregarMeuCatalogo = carregarMeuCatalogo;
  window.ajustarSlugCatalogo = ajustarSlugCatalogo;
  window.normalizarSlugCatalogo = normalizarSlugCatalogo;
  carregarMeuCatalogo();
}
