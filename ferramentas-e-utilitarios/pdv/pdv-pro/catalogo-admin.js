import { db } from '/firebase-config.js';
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
const DIAS_HORARIO_CATALOGO = Object.freeze([
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'
]);
const TEMA_PUBLICO_PADRAO = Object.freeze({
  fundo: '#f1f5f9', texto: '#172033', cartao: '#ffffff', botao: '#2563eb', textoBotao: '#ffffff',
  barra: '#050505', textoBarra: '#ffffff', fonte: 'sistema', bordas: 'arredondado', formatoBotao: 'arredondado',
  imagem: '', ajusteImagem: 'cover', sobreposicao: 20
});
let usuarioUid = '';
let sincronizacaoAtual = null;
let repetirSincronizacao = false;

function fusoHorarioDaLoja() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  } catch (_) {
    return 'America/Sao_Paulo';
  }
}

function horarioTextoValido(valor) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(valor || ''));
}

function horariosFuncionamentoPadrao() {
  return {
    exibir: false,
    fusoHorario: fusoHorarioDaLoja(),
    dias: DIAS_HORARIO_CATALOGO.map((_, dia) => ({
      aberto: dia >= 1 && dia <= 5,
      inicio1: '08:00',
      fim1: '12:00',
      intervalo: dia >= 1 && dia <= 5,
      inicio2: '14:00',
      fim2: '18:00'
    }))
  };
}

export function normalizarHorariosFuncionamento(horarios = {}) {
  const padrao = horariosFuncionamentoPadrao();
  const diasInformados = Array.isArray(horarios.dias) ? horarios.dias : [];
  return {
    exibir: horarios.exibir === true,
    fusoHorario: String(horarios.fusoHorario || padrao.fusoHorario).slice(0, 80),
    dias: padrao.dias.map((diaPadrao, indice) => {
      const informado = diasInformados[indice] || {};
      return {
        aberto: informado.aberto === true,
        inicio1: horarioTextoValido(informado.inicio1) ? informado.inicio1 : diaPadrao.inicio1,
        fim1: horarioTextoValido(informado.fim1) ? informado.fim1 : diaPadrao.fim1,
        intervalo: informado.intervalo === true,
        inicio2: horarioTextoValido(informado.inicio2) ? informado.inicio2 : diaPadrao.inicio2,
        fim2: horarioTextoValido(informado.fim2) ? informado.fim2 : diaPadrao.fim2
      };
    })
  };
}

function criarLinhaHorarioCatalogo(nome, indice) {
  const linha = document.createElement('div');
  linha.className = 'catalogo-horario-dia rounded-xl border border-emerald-100 bg-white p-3';
  linha.dataset.dia = String(indice);
  linha.innerHTML = `
    <div class="flex flex-col gap-3 xl:flex-row xl:items-center">
      <label class="flex min-w-44 cursor-pointer items-center gap-3 font-semibold text-slate-800">
        <input type="checkbox" data-horario-campo="aberto" class="h-5 w-5 rounded border-gray-300 text-emerald-600">
        ${nome}
      </label>
      <div data-horario-periodos class="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-[auto_minmax(110px,1fr)_auto_minmax(110px,1fr)] sm:items-center">
        <label class="text-xs font-semibold text-slate-500" for="catalogo-horario-${indice}-inicio1">Abre</label>
        <input id="catalogo-horario-${indice}-inicio1" type="time" data-horario-campo="inicio1" class="min-h-11 rounded-lg border p-2 text-sm">
        <label class="text-xs font-semibold text-slate-500" for="catalogo-horario-${indice}-fim1">Fecha</label>
        <input id="catalogo-horario-${indice}-fim1" type="time" data-horario-campo="fim1" class="min-h-11 rounded-lg border p-2 text-sm">
      </div>
    </div>
    <div class="mt-3 border-t border-slate-100 pt-3" data-horario-intervalo-area>
      <label class="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" data-horario-campo="intervalo" class="h-4 w-4 rounded border-gray-300 text-emerald-600">
        Fecha para almoço e abre novamente
      </label>
      <div data-horario-segundo-periodo class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-[auto_minmax(110px,1fr)_auto_minmax(110px,1fr)] sm:items-center">
        <label class="text-xs font-semibold text-slate-500" for="catalogo-horario-${indice}-inicio2">Reabre</label>
        <input id="catalogo-horario-${indice}-inicio2" type="time" data-horario-campo="inicio2" class="min-h-11 rounded-lg border p-2 text-sm">
        <label class="text-xs font-semibold text-slate-500" for="catalogo-horario-${indice}-fim2">Fecha</label>
        <input id="catalogo-horario-${indice}-fim2" type="time" data-horario-campo="fim2" class="min-h-11 rounded-lg border p-2 text-sm">
      </div>
    </div>`;
  return linha;
}

function atualizarEstadoEditorHorarios() {
  const exibir = document.getElementById('catalogo-exibir-horarios')?.checked === true;
  document.querySelectorAll('.catalogo-horario-dia').forEach(linha => {
    const aberto = linha.querySelector('[data-horario-campo="aberto"]');
    const intervalo = linha.querySelector('[data-horario-campo="intervalo"]');
    const diaAtivo = exibir && aberto.checked;
    aberto.disabled = !exibir;
    intervalo.disabled = !diaAtivo;
    linha.querySelectorAll('input[type="time"]').forEach(campo => {
      const segundoPeriodo = ['inicio2', 'fim2'].includes(campo.dataset.horarioCampo);
      campo.disabled = !diaAtivo || (segundoPeriodo && !intervalo.checked);
    });
    linha.classList.toggle('opacity-60', !diaAtivo);
    linha.querySelector('[data-horario-intervalo-area]').classList.toggle('hidden', !diaAtivo);
    linha.querySelector('[data-horario-segundo-periodo]').classList.toggle('hidden', !intervalo.checked);
  });
}

function garantirEditorHorarios() {
  const lista = document.getElementById('catalogo-horarios-lista');
  if (!lista || lista.childElementCount) return;
  lista.append(...DIAS_HORARIO_CATALOGO.map(criarLinhaHorarioCatalogo));
  lista.addEventListener('change', atualizarEstadoEditorHorarios);
  document.getElementById('catalogo-exibir-horarios')?.addEventListener('change', atualizarEstadoEditorHorarios);
}

function preencherEditorHorarios(horarios) {
  garantirEditorHorarios();
  const seguro = normalizarHorariosFuncionamento(horarios);
  const exibir = document.getElementById('catalogo-exibir-horarios');
  if (!exibir) return;
  exibir.checked = seguro.exibir;
  seguro.dias.forEach((dia, indice) => {
    const linha = document.querySelector(`.catalogo-horario-dia[data-dia="${indice}"]`);
    if (!linha) return;
    Object.entries(dia).forEach(([campo, valor]) => {
      const elemento = linha.querySelector(`[data-horario-campo="${campo}"]`);
      if (!elemento) return;
      if (elemento.type === 'checkbox') elemento.checked = valor === true;
      else elemento.value = valor;
    });
  });
  atualizarEstadoEditorHorarios();
}

function lerHorariosFuncionamento() {
  const atual = normalizarHorariosFuncionamento(window.configSistema?.catalogo?.horariosFuncionamento);
  const exibir = document.getElementById('catalogo-exibir-horarios')?.checked === true;
  const dias = DIAS_HORARIO_CATALOGO.map((nome, indice) => {
    const linha = document.querySelector(`.catalogo-horario-dia[data-dia="${indice}"]`);
    const valor = campo => linha.querySelector(`[data-horario-campo="${campo}"]`);
    return {
      nome,
      aberto: valor('aberto').checked,
      inicio1: valor('inicio1').value,
      fim1: valor('fim1').value,
      intervalo: valor('intervalo').checked,
      inicio2: valor('inicio2').value,
      fim2: valor('fim2').value
    };
  });

  if (exibir && !dias.some(dia => dia.aberto)) {
    return { erro: 'Selecione pelo menos um dia de funcionamento.' };
  }
  if (exibir) {
    for (const dia of dias.filter(item => item.aberto)) {
      if (!horarioTextoValido(dia.inicio1) || !horarioTextoValido(dia.fim1) || dia.inicio1 >= dia.fim1) {
        return { erro: `Confira o horário de abertura e fechamento de ${dia.nome}.` };
      }
      if (dia.intervalo && (!horarioTextoValido(dia.inicio2) || !horarioTextoValido(dia.fim2) || dia.inicio2 >= dia.fim2 || dia.fim1 >= dia.inicio2)) {
        return { erro: `Confira o intervalo de almoço de ${dia.nome}. O segundo período deve começar depois do primeiro.` };
      }
    }
  }

  return {
    horarios: {
      exibir,
      fusoHorario: atual.fusoHorario || fusoHorarioDaLoja(),
      dias: dias.map(({ nome, ...dia }) => dia)
    }
  };
}

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

function corTemaPublico(valor, padrao) {
  return /^#[0-9a-f]{6}$/i.test(String(valor || '')) ? String(valor).toLowerCase() : padrao;
}

function imagemTemaPublico(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return '';
  if (/^(?:\.\/|\/)assets\/temas\/[a-z0-9-]+\.webp$/i.test(texto)) return texto.replace(/^\.\//, '/');
  try {
    const url = new URL(texto);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch (_) {
    return '';
  }
}

function normalizarTemaPublico(tema = {}) {
  return {
    fundo: corTemaPublico(tema.fundo, TEMA_PUBLICO_PADRAO.fundo),
    texto: corTemaPublico(tema.texto, TEMA_PUBLICO_PADRAO.texto),
    cartao: corTemaPublico(tema.cartao, TEMA_PUBLICO_PADRAO.cartao),
    botao: corTemaPublico(tema.botao, TEMA_PUBLICO_PADRAO.botao),
    textoBotao: corTemaPublico(tema.textoBotao, TEMA_PUBLICO_PADRAO.textoBotao),
    barra: corTemaPublico(tema.barra, TEMA_PUBLICO_PADRAO.barra),
    textoBarra: corTemaPublico(tema.textoBarra, TEMA_PUBLICO_PADRAO.textoBarra),
    fonte: ['sistema', 'arial', 'verdana', 'georgia'].includes(tema.fonte) ? tema.fonte : TEMA_PUBLICO_PADRAO.fonte,
    bordas: ['discreto', 'arredondado', 'amplo'].includes(tema.bordas) ? tema.bordas : TEMA_PUBLICO_PADRAO.bordas,
    formatoBotao: ['reto', 'discreto', 'arredondado', 'capsula', 'chanfrado'].includes(tema.formatoBotao) ? tema.formatoBotao : TEMA_PUBLICO_PADRAO.formatoBotao,
    imagem: imagemTemaPublico(tema.imagem),
    ajusteImagem: ['cover', 'contain', 'repeat'].includes(tema.ajusteImagem) ? tema.ajusteImagem : TEMA_PUBLICO_PADRAO.ajusteImagem,
    sobreposicao: Math.min(80, Math.max(0, Number(tema.sobreposicao ?? TEMA_PUBLICO_PADRAO.sobreposicao)))
  };
}

function temaPublicoAtual() {
  if (window.configSistema?.temaPersonalizado) return normalizarTemaPublico(window.configSistema.temaPersonalizado);
  if (window.configSistema?.tema === 'escuro') {
    return normalizarTemaPublico({
      fundo: '#090909', texto: '#f5f5f5', cartao: '#171717', botao: '#d4af37',
      textoBotao: '#111111', barra: '#050505', textoBarra: '#ffffff'
    });
  }
  return normalizarTemaPublico(TEMA_PUBLICO_PADRAO);
}

function linkDoCatalogo(slug) {
  const url = new URL('/catalogo/', window.location.href);
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
  preencherEditorHorarios(configuracao.horariosFuncionamento);
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
    horariosFuncionamento: normalizarHorariosFuncionamento(configuracao.horariosFuncionamento),
    tema: temaPublicoAtual(),
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
  const leituraHorarios = lerHorariosFuncionamento();

  if (!nomeLoja) return definirStatus('Informe o nome da loja.', 'erro');
  if (slug.length < 3 || SLUGS_RESERVADOS.has(slug)) return definirStatus('Escolha um identificador com 3 a 50 caracteres que não seja reservado.', 'erro');
  if (whatsapp.length < 12 || whatsapp.length > 15) return definirStatus('Informe o WhatsApp com DDD. O código do Brasil (+55) é acrescentado automaticamente.', 'erro');
  if (logoInformada && !urlHttpsOuVazia(logoInformada)) return definirStatus('A logo precisa usar um endereço HTTPS válido.', 'erro');
  if (leituraHorarios.erro) return definirStatus(leituraHorarios.erro, 'erro');

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
      horariosFuncionamento: leituraHorarios.horarios,
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

function criarCanvasQrCatalogo(payload, tamanho = 1200) {
  if (typeof window.qrcode !== 'function') throw new Error('qr-indisponivel');
  const qr = window.qrcode(0, 'H');
  qr.addData(payload);
  qr.make();
  const modulos = qr.getModuleCount();
  const margem = 4;
  const celula = Math.max(1, Math.floor(tamanho / (modulos + margem * 2)));
  const lado = (modulos + margem * 2) * celula;
  const canvas = document.createElement('canvas');
  const contexto = canvas.getContext('2d');
  canvas.width = canvas.height = lado;
  contexto.fillStyle = '#ffffff';
  contexto.fillRect(0, 0, lado, lado);
  contexto.fillStyle = '#000000';
  for (let linha = 0; linha < modulos; linha++) {
    for (let coluna = 0; coluna < modulos; coluna++) {
      if (qr.isDark(linha, coluna)) {
        contexto.fillRect((coluna + margem) * celula, (linha + margem) * celula, celula, celula);
      }
    }
  }
  return canvas;
}

function textoPdfCatalogo(valor) {
  return String(valor || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function baixarCartazCatalogo() {
  const link = textoPdfCatalogo(document.getElementById('catalogo-link')?.value);
  const nomeLoja = textoPdfCatalogo(document.getElementById('catalogo-nome-loja')?.value)
    || textoPdfCatalogo(window.configSistema?.catalogo?.nomeLoja)
    || 'Minha loja';
  const slug = normalizarSlugCatalogo(document.getElementById('catalogo-slug')?.value) || 'catalogo';
  const slugPublicado = normalizarSlugCatalogo(window.configSistema?.catalogo?.slug);
  if (!link || !slugPublicado || slug !== slugPublicado || window.configSistema?.catalogo?.ativo === false) {
    return definirStatus('Salve e publique o catálogo antes de baixar o cartaz com QR Code.', 'erro');
  }
  if (!window.jspdf?.jsPDF || typeof window.qrcode !== 'function') {
    return definirStatus('O gerador do PDF ainda não foi carregado. Verifique a conexão e tente novamente.', 'erro');
  }

  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const largura = pdf.internal.pageSize.getWidth();
    const altura = pdf.internal.pageSize.getHeight();
    const centro = largura / 2;
    const qr = criarCanvasQrCatalogo(link);

    pdf.setProperties({
      title: `Catálogo online - ${nomeLoja}`,
      subject: 'Cartaz com QR Code para acesso ao catálogo online'
    });
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, 0, largura, altura, 'F');
    pdf.setFillColor(15, 118, 110);
    pdf.rect(0, 0, largura, 68, 'F');
    pdf.setFillColor(13, 148, 136);
    pdf.rect(0, 64, largura, 4, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(25);
    const linhasNome = pdf.splitTextToSize(nomeLoja, 174).slice(0, 2);
    const inicioNome = linhasNome.length > 1 ? 23 : 29;
    pdf.text(linhasNome, centro, inicioNome, { align: 'center' });
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('CATÁLOGO ONLINE', centro, linhasNome.length > 1 ? 53 : 47, { align: 'center', charSpace: 1.2 });

    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.6);
    pdf.roundedRect(26, 80, 158, 151, 6, 6, 'FD');
    pdf.addImage(qr.toDataURL('image/png'), 'PNG', 56, 91, 98, 98);

    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(17);
    pdf.text('CONSULTE PRODUTOS E PREÇOS', centro, 204, { align: 'center' });
    pdf.setTextColor(71, 85, 105);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11.5);
    pdf.text('Aponte a câmera do celular para o QR Code', centro, 216, { align: 'center' });
    pdf.text('e acesse nosso catálogo atualizado.', centro, 223, { align: 'center' });

    pdf.setFillColor(236, 253, 245);
    pdf.setDrawColor(110, 231, 183);
    pdf.roundedRect(26, 242, 158, 26, 4, 4, 'FD');
    pdf.setTextColor(6, 95, 70);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('OU ACESSE PELO ENDEREÇO:', centro, 251, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.text(pdf.splitTextToSize(link, 142).slice(0, 2), centro, 258, { align: 'center' });

    pdf.setTextColor(100, 116, 139);
    pdf.setFontSize(8);
    pdf.text('Catálogo online • informações e preços atualizados pela loja', centro, 285, { align: 'center' });
    pdf.save(`cartaz-catalogo-${slug}.pdf`);
    definirStatus('Cartaz A4 com QR Code baixado. Ele já está pronto para imprimir.', 'sucesso');
  } catch (erro) {
    console.error('Erro ao gerar cartaz do catálogo:', erro);
    definirStatus('Não foi possível gerar o cartaz. Atualize a página e tente novamente.', 'erro');
  }
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
  garantirEditorHorarios();
  window.salvarMeuCatalogo = salvarMeuCatalogo;
  window.copiarLinkCatalogo = copiarLinkCatalogo;
  window.compartilharCatalogo = compartilharCatalogo;
  window.baixarCartazCatalogo = baixarCartazCatalogo;
  window.carregarMeuCatalogo = carregarMeuCatalogo;
  window.ajustarSlugCatalogo = ajustarSlugCatalogo;
  window.normalizarSlugCatalogo = normalizarSlugCatalogo;
  carregarMeuCatalogo();
}
