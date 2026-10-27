import { db } from '/firebase-config.js';
import { collection, doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

// Altere somente este valor para mudar quando o aviso de estoque baixo aparece.
const LIMITE_ESTOQUE_BAIXO = 5;
const TEMA_CATALOGO_PADRAO = Object.freeze({
  fundo: '#f3f6fa', texto: '#152033', cartao: '#ffffff', botao: '#0f4c81', textoBotao: '#ffffff',
  barra: '#082f52', textoBarra: '#ffffff', fonte: 'sistema', bordas: 'arredondado', formatoBotao: 'arredondado',
  imagem: '', ajusteImagem: 'cover', sobreposicao: 20
});
const FONTES_CATALOGO = Object.freeze({
  sistema: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  arial: 'Arial, sans-serif', verdana: 'Verdana, sans-serif', georgia: 'Georgia, serif'
});
const RAIOS_CATALOGO = Object.freeze({ discreto: '10px', arredondado: '18px', amplo: '26px' });
const FORMATOS_BOTAO_CATALOGO = Object.freeze({
  reto: { raio: '0', recorte: 'none' }, discreto: { raio: '6px', recorte: 'none' },
  arredondado: { raio: '14px', recorte: 'none' }, capsula: { raio: '999px', recorte: 'none' },
  chanfrado: { raio: '0', recorte: 'polygon(9px 0, 100% 0, 100% calc(100% - 9px), calc(100% - 9px) 100%, 0 100%, 0 9px)' }
});
const CACHE_ICONES_CATALOGO = 'pdv-catalog-icons-v1';
const NOMES_DIAS_CATALOGO = Object.freeze([
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'
]);

function corTemaCatalogo(valor, padrao) {
  return /^#[0-9a-f]{6}$/i.test(String(valor || '')) ? String(valor).toLowerCase() : padrao;
}

function caminhoImagemTemaCatalogo(valor) {
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

function misturarCores(corA, corB, proporcao = 0.5) {
  const canais = cor => [1, 3, 5].map(inicio => parseInt(cor.slice(inicio, inicio + 2), 16));
  const a = canais(corA);
  const b = canais(corB);
  return `#${a.map((canal, indice) => Math.round(canal * proporcao + b[indice] * (1 - proporcao)).toString(16).padStart(2, '0')).join('')}`;
}

function normalizarTemaCatalogo(tema = {}) {
  const seguro = {
    fundo: corTemaCatalogo(tema.fundo, TEMA_CATALOGO_PADRAO.fundo),
    texto: corTemaCatalogo(tema.texto, TEMA_CATALOGO_PADRAO.texto),
    cartao: corTemaCatalogo(tema.cartao, TEMA_CATALOGO_PADRAO.cartao),
    botao: corTemaCatalogo(tema.botao, TEMA_CATALOGO_PADRAO.botao),
    textoBotao: corTemaCatalogo(tema.textoBotao, TEMA_CATALOGO_PADRAO.textoBotao),
    barra: corTemaCatalogo(tema.barra, TEMA_CATALOGO_PADRAO.barra),
    textoBarra: corTemaCatalogo(tema.textoBarra, TEMA_CATALOGO_PADRAO.textoBarra),
    fonte: FONTES_CATALOGO[tema.fonte] ? tema.fonte : TEMA_CATALOGO_PADRAO.fonte,
    bordas: RAIOS_CATALOGO[tema.bordas] ? tema.bordas : TEMA_CATALOGO_PADRAO.bordas,
    formatoBotao: FORMATOS_BOTAO_CATALOGO[tema.formatoBotao] ? tema.formatoBotao : TEMA_CATALOGO_PADRAO.formatoBotao,
    imagem: caminhoImagemTemaCatalogo(tema.imagem),
    ajusteImagem: ['cover', 'contain', 'repeat'].includes(tema.ajusteImagem) ? tema.ajusteImagem : TEMA_CATALOGO_PADRAO.ajusteImagem,
    sobreposicao: Math.min(80, Math.max(0, Number(tema.sobreposicao ?? TEMA_CATALOGO_PADRAO.sobreposicao)))
  };
  seguro.textoSuave = misturarCores(seguro.texto, seguro.cartao, 0.68);
  seguro.borda = misturarCores(seguro.texto, seguro.cartao, 0.18);
  seguro.realceSuave = misturarCores(seguro.botao, seguro.cartao, 0.14);
  return seguro;
}

function aplicarTemaCatalogo(tema) {
  const seguro = normalizarTemaCatalogo(tema || TEMA_CATALOGO_PADRAO);
  const repeticao = seguro.ajusteImagem === 'repeat' ? 'repeat' : 'no-repeat';
  const tamanho = seguro.ajusteImagem === 'repeat' ? 'auto' : seguro.ajusteImagem;
  const opacidade = seguro.sobreposicao / 100;
  const imagem = seguro.imagem
    ? `linear-gradient(rgba(0,0,0,${opacidade}), rgba(0,0,0,${opacidade})), url(${JSON.stringify(seguro.imagem)})`
    : 'none';
  const valores = {
    '--fundo': seguro.fundo, '--texto': seguro.texto, '--texto-suave': seguro.textoSuave,
    '--cartao': seguro.cartao, '--azul': seguro.botao, '--azul-escuro': seguro.barra,
    '--dourado': seguro.botao, '--acao-texto': seguro.textoBotao, '--barra-texto': seguro.textoBarra,
    '--borda': seguro.borda, '--realce-suave': seguro.realceSuave,
    '--fundo-translucido': `${seguro.fundo}f2`, '--fonte-catalogo': FONTES_CATALOGO[seguro.fonte],
    '--raio-cartao': RAIOS_CATALOGO[seguro.bordas], '--tema-imagem': imagem,
    '--raio-botao': FORMATOS_BOTAO_CATALOGO[seguro.formatoBotao].raio,
    '--recorte-botao': FORMATOS_BOTAO_CATALOGO[seguro.formatoBotao].recorte,
    '--tema-imagem-tamanho': tamanho, '--tema-imagem-repeticao': repeticao
  };
  Object.entries(valores).forEach(([nome, valor]) => document.documentElement.style.setProperty(nome, valor));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', seguro.barra);
}

function minutosDoHorario(valor) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(valor || ''))) return null;
  const [hora, minuto] = valor.split(':').map(Number);
  return hora * 60 + minuto;
}

function normalizarHorariosCatalogo(horarios = {}) {
  if (horarios.exibir !== true || !Array.isArray(horarios.dias) || horarios.dias.length !== 7) return null;
  const dias = horarios.dias.map(dia => {
    if (!dia || dia.aberto !== true) return { aberto: false, periodos: [] };
    const inicio1 = minutosDoHorario(dia.inicio1);
    const fim1 = minutosDoHorario(dia.fim1);
    if (inicio1 === null || fim1 === null || inicio1 >= fim1) return { aberto: false, periodos: [] };
    const periodos = [{ inicio: inicio1, fim: fim1, inicioTexto: dia.inicio1, fimTexto: dia.fim1 }];
    if (dia.intervalo === true) {
      const inicio2 = minutosDoHorario(dia.inicio2);
      const fim2 = minutosDoHorario(dia.fim2);
      if (inicio2 !== null && fim2 !== null && fim1 < inicio2 && inicio2 < fim2) {
        periodos.push({ inicio: inicio2, fim: fim2, inicioTexto: dia.inicio2, fimTexto: dia.fim2 });
      }
    }
    return { aberto: true, periodos };
  });
  if (!dias.some(dia => dia.aberto && dia.periodos.length)) return null;
  return { fusoHorario: String(horarios.fusoHorario || 'America/Sao_Paulo'), dias };
}

function dataNoFuso(data, fusoHorario) {
  try {
    const partes = new Intl.DateTimeFormat('en-US', {
      timeZone: fusoHorario,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(data);
    const valor = tipo => partes.find(parte => parte.type === tipo)?.value;
    const indiceDia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(valor('weekday'));
    return { dia: indiceDia, minutos: Number(valor('hour')) * 60 + Number(valor('minute')) };
  } catch (_) {
    return { dia: data.getDay(), minutos: data.getHours() * 60 + data.getMinutes() };
  }
}

function calcularStatusFuncionamento(horarios, agora = new Date()) {
  const seguro = normalizarHorariosCatalogo(horarios);
  if (!seguro) return null;
  const atual = dataNoFuso(agora, seguro.fusoHorario);
  const periodosHoje = seguro.dias[atual.dia]?.periodos || [];
  const periodoAberto = periodosHoje.find(periodo => atual.minutos >= periodo.inicio && atual.minutos < periodo.fim);
  if (periodoAberto) {
    const indice = periodosHoje.indexOf(periodoAberto);
    const proximo = periodosHoje[indice + 1];
    return {
      aberto: true,
      titulo: 'Aberto agora',
      detalhe: proximo
        ? `Até ${periodoAberto.fimTexto} · volta às ${proximo.inicioTexto}`
        : `Aberto até ${periodoAberto.fimTexto}`
    };
  }

  for (let acrescimo = 0; acrescimo <= 7; acrescimo += 1) {
    const indiceDia = (atual.dia + acrescimo) % 7;
    const periodos = seguro.dias[indiceDia]?.periodos || [];
    const proximo = periodos.find(periodo => acrescimo > 0 || periodo.inicio > atual.minutos);
    if (!proximo) continue;
    let quando = `${NOMES_DIAS_CATALOGO[indiceDia].toLocaleLowerCase('pt-BR')} às ${proximo.inicioTexto}`;
    if (acrescimo === 0) quando = `${periodosHoje.some(periodo => periodo.fim <= atual.minutos) ? 'novamente' : 'hoje'} às ${proximo.inicioTexto}`;
    if (acrescimo === 1) quando = `amanhã às ${proximo.inicioTexto}`;
    return { aberto: false, titulo: 'Fechado agora', detalhe: `Abre ${quando}` };
  }
  return { aberto: false, titulo: 'Fechado agora', detalhe: 'Consulte a loja para saber quando abre' };
}

function textoPeriodosDoDia(dia) {
  if (!dia?.aberto || !dia.periodos.length) return 'Fechado';
  return dia.periodos.map(periodo => `${periodo.inicioTexto}–${periodo.fimTexto}`).join(' · ');
}

const elementos = {
  nome: document.getElementById('nome-loja'),
  descricao: document.getElementById('descricao-loja'),
  logoWrap: document.getElementById('logo-wrap'),
  logo: document.getElementById('logo-loja'),
  horario: document.getElementById('horario-loja'),
  horarioStatus: document.getElementById('horario-status'),
  horarioProximaAlteracao: document.getElementById('horario-proxima-alteracao'),
  horariosSemana: document.getElementById('horarios-semana'),
  instalarCatalogo: document.getElementById('instalar-catalogo'),
  status: document.getElementById('status'),
  categorias: document.getElementById('categorias'),
  tituloCategoria: document.getElementById('titulo-categoria'),
  produtos: document.getElementById('produtos'),
  modal: document.getElementById('modal-produto'),
  modalConteudo: document.getElementById('modal-produto-conteudo'),
  fecharModal: document.getElementById('fechar-modal')
};

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
let dadosLoja = null;
let produtos = [];
let pararProdutos = null;
let categoriaSelecionada = 'todos';
let focoAntesDoModal = null;
let produtoAbertoId = '';
let atualizadorHorario = null;
let eventoInstalacaoCatalogo = null;
let instalacaoCatalogoPronta = false;
let assinaturaInstalacaoCatalogo = '';

function executandoComoAplicativo() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function atualizarBotaoInstalacaoCatalogo() {
  elementos.instalarCatalogo.hidden = !instalacaoCatalogoPronta || executandoComoAplicativo();
}

window.addEventListener('beforeinstallprompt', evento => {
  evento.preventDefault();
  eventoInstalacaoCatalogo = evento;
  atualizarBotaoInstalacaoCatalogo();
});

window.addEventListener('appinstalled', () => {
  eventoInstalacaoCatalogo = null;
  elementos.instalarCatalogo.hidden = true;
});

elementos.instalarCatalogo.addEventListener('click', async () => {
  if (eventoInstalacaoCatalogo) {
    const evento = eventoInstalacaoCatalogo;
    eventoInstalacaoCatalogo = null;
    await evento.prompt();
    const escolha = await evento.userChoice;
    if (escolha.outcome === 'accepted') elementos.instalarCatalogo.hidden = true;
    return;
  }

  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (ios) {
    window.alert('Para instalar este catálogo no iPhone: toque em Compartilhar e depois em “Adicionar à Tela de Início”.');
    return;
  }
  window.alert('Abra o menu do navegador e escolha “Instalar aplicativo” ou “Adicionar à tela inicial”.');
});

function iniciaisDoCatalogo(nome) {
  const palavras = String(nome || 'Catálogo').trim().split(/\s+/).filter(Boolean);
  return palavras.slice(0, 2).map(palavra => palavra.charAt(0)).join('').toLocaleUpperCase('pt-BR') || 'C';
}

function desenharRetanguloArredondado(contexto, x, y, largura, altura, raio) {
  const limite = Math.min(raio, largura / 2, altura / 2);
  contexto.beginPath();
  contexto.moveTo(x + limite, y);
  contexto.arcTo(x + largura, y, x + largura, y + altura, limite);
  contexto.arcTo(x + largura, y + altura, x, y + altura, limite);
  contexto.arcTo(x, y + altura, x, y, limite);
  contexto.arcTo(x, y, x + largura, y, limite);
  contexto.closePath();
}

async function carregarLogoParaIcone(endereco) {
  if (!endereco) return null;
  const resposta = await fetch(endereco, { mode: 'cors', cache: 'force-cache' });
  if (!resposta.ok) throw new Error('Logo indisponível para o ícone.');
  const blob = await resposta.blob();
  if ('createImageBitmap' in window) {
    const imagem = await createImageBitmap(blob);
    return { imagem, liberar: () => imagem.close?.() };
  }
  const url = URL.createObjectURL(blob);
  const imagem = await new Promise((resolve, reject) => {
    const elemento = new Image();
    elemento.onload = () => resolve(elemento);
    elemento.onerror = reject;
    elemento.src = url;
  });
  return { imagem, liberar: () => URL.revokeObjectURL(url) };
}

function criarIconeCatalogo(tamanho, loja, logoCarregada) {
  const canvas = document.createElement('canvas');
  canvas.width = tamanho;
  canvas.height = tamanho;
  const contexto = canvas.getContext('2d');
  const tema = normalizarTemaCatalogo(loja.tema);
  contexto.fillStyle = tema.barra;
  contexto.fillRect(0, 0, tamanho, tamanho);

  const margem = Math.round(tamanho * 0.12);
  desenharRetanguloArredondado(contexto, margem, margem, tamanho - margem * 2, tamanho - margem * 2, tamanho * 0.16);
  contexto.fillStyle = '#ffffff';
  contexto.fill();

  if (logoCarregada?.imagem) {
    const imagem = logoCarregada.imagem;
    const larguraOriginal = imagem.naturalWidth || imagem.width;
    const alturaOriginal = imagem.naturalHeight || imagem.height;
    const limite = tamanho * 0.66;
    const escala = Math.min(limite / larguraOriginal, limite / alturaOriginal);
    const largura = larguraOriginal * escala;
    const altura = alturaOriginal * escala;
    contexto.drawImage(imagem, (tamanho - largura) / 2, (tamanho - altura) / 2, largura, altura);
  } else {
    contexto.fillStyle = tema.barra;
    contexto.font = `800 ${Math.round(tamanho * 0.3)}px ${FONTES_CATALOGO.sistema}`;
    contexto.textAlign = 'center';
    contexto.textBaseline = 'middle';
    contexto.fillText(iniciaisDoCatalogo(loja.nomeLoja), tamanho / 2, tamanho / 2 + tamanho * 0.02);
  }
  return canvas;
}

function canvasParaBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error('Não foi possível gerar o ícone do catálogo.')),
    'image/png'
  ));
}

async function salvarIconesCatalogo(loja, slugCatalogo) {
  let logoCarregada = null;
  try {
    logoCarregada = await carregarLogoParaIcone(loja.logo);
  } catch (erro) {
    console.info('A logo não pôde ser usada no ícone; serão usadas as iniciais da loja.', erro);
  }
  try {
    const cache = await caches.open(CACHE_ICONES_CATALOGO);
    await Promise.all([192, 512].map(async tamanho => {
      const blob = await canvasParaBlob(criarIconeCatalogo(tamanho, loja, logoCarregada));
      const endereco = `/catalogo/icones/${slugCatalogo}-${tamanho}.png`;
      await cache.put(endereco, new Response(blob, {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000' }
      }));
    }));
  } finally {
    logoCarregada?.liberar?.();
  }
}

function assinaturaTexto(valor) {
  let hash = 2166136261;
  for (const caractere of String(valor)) {
    hash ^= caractere.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

async function aguardarControleServiceWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) throw new Error('Instalação indisponível neste navegador.');
  const registro = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
  await registro.update().catch(() => {});
  await navigator.serviceWorker.ready;
  if (navigator.serviceWorker.controller) return registro;
  await new Promise(resolve => {
    const limite = window.setTimeout(resolve, 8000);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.clearTimeout(limite);
      resolve();
    }, { once: true });
  });
  if (!navigator.serviceWorker.controller) throw new Error('O catálogo ainda não está controlado pelo aplicativo.');
  return registro;
}

async function confirmarManifestoCatalogoAtivo(endereco) {
  for (let tentativa = 0; tentativa < 24; tentativa += 1) {
    try {
      const separador = endereco.includes('?') ? '&' : '?';
      const resposta = await fetch(`${endereco}${separador}verificacao=${Date.now()}-${tentativa}`, { cache: 'no-store' });
      if (resposta.ok && resposta.headers.get('content-type')?.includes('application/manifest+json')) return;
    } catch (_) {
      // A ativação do novo service worker pode levar alguns instantes.
    }
    await new Promise(resolve => window.setTimeout(resolve, 250));
  }
  throw new Error('O manifesto do catálogo ainda não ficou disponível.');
}

async function configurarInstalacaoCatalogo(loja) {
  const slugCatalogo = slugDaPagina();
  if (!slugValido(slugCatalogo)) return;
  const tema = normalizarTemaCatalogo(loja.tema);
  const nome = String(loja.nomeLoja || 'Catálogo').trim().slice(0, 120) || 'Catálogo';
  const assinatura = assinaturaTexto(`${slugCatalogo}|${nome}|${loja.logo || ''}|${tema.barra}|${tema.fundo}`);
  if (assinaturaInstalacaoCatalogo === assinatura) return;
  assinaturaInstalacaoCatalogo = assinatura;
  const parametros = new URLSearchParams({
    loja: slugCatalogo,
    nome,
    cor: tema.barra,
    fundo: tema.fundo,
    v: assinatura
  });
  const enderecoManifesto = `/catalogo/manifest.webmanifest?${parametros}`;

  try {
    await aguardarControleServiceWorker();
    await salvarIconesCatalogo({ ...loja, nomeLoja: nome }, slugCatalogo);
    await confirmarManifestoCatalogoAtivo(enderecoManifesto);
    let manifesto = document.querySelector('link[rel="manifest"]');
    if (!manifesto) {
      manifesto = document.createElement('link');
      manifesto.rel = 'manifest';
      document.head.append(manifesto);
    }
    manifesto.href = enderecoManifesto;

    let iconeApple = document.querySelector('link[rel="apple-touch-icon"]');
    if (!iconeApple) {
      iconeApple = document.createElement('link');
      iconeApple.rel = 'apple-touch-icon';
      document.head.append(iconeApple);
    }
    iconeApple.href = `/catalogo/icones/${slugCatalogo}-512.png`;
    document.querySelector('meta[name="application-name"]')?.setAttribute('content', nome);
    document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', nome);
    instalacaoCatalogoPronta = true;
    atualizarBotaoInstalacaoCatalogo();
  } catch (erro) {
    console.warn('Não foi possível preparar a instalação deste catálogo:', erro);
    assinaturaInstalacaoCatalogo = '';
    instalacaoCatalogoPronta = false;
    atualizarBotaoInstalacaoCatalogo();
  }
}

function renderizarHorarioFuncionamento(horarios) {
  clearInterval(atualizadorHorario);
  atualizadorHorario = null;
  const seguro = normalizarHorariosCatalogo(horarios);
  if (!seguro) {
    elementos.horario.hidden = true;
    elementos.horario.open = false;
    return;
  }

  elementos.horariosSemana.replaceChildren(...seguro.dias.map((dia, indice) => {
    const item = document.createElement('li');
    const nome = document.createElement('span');
    nome.textContent = NOMES_DIAS_CATALOGO[indice];
    const periodos = document.createElement('span');
    periodos.textContent = textoPeriodosDoDia(dia);
    item.append(nome, periodos);
    return item;
  }));

  const atualizar = () => {
    const status = calcularStatusFuncionamento(horarios);
    if (!status) return;
    elementos.horario.classList.toggle('aberto', status.aberto);
    elementos.horarioStatus.textContent = status.titulo;
    elementos.horarioProximaAlteracao.textContent = status.detalhe;
    elementos.horario.setAttribute('aria-label', `${status.titulo}. ${status.detalhe}. Clique para ver todos os horários.`);
  };
  atualizar();
  elementos.horario.hidden = false;
  atualizadorHorario = setInterval(atualizar, 60_000);
}

function slugDaPagina() {
  const parametro = new URLSearchParams(location.search).get('loja');
  if (parametro) return parametro;
  const partes = location.pathname.split('/').filter(Boolean);
  const ultimo = partes.at(-1);
  return ultimo && ultimo !== 'catalogo' && !ultimo.includes('.') ? ultimo : '';
}

function slugValido(valor) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(valor) && valor.length >= 3 && valor.length <= 50;
}

function mostrarEstado(mensagem, erro = false) {
  elementos.status.innerHTML = '';
  elementos.status.textContent = mensagem;
  elementos.status.className = `status${erro ? ' erro' : ''}`;
  elementos.status.hidden = false;
  elementos.categorias.hidden = true;
  elementos.tituloCategoria.hidden = true;
  elementos.produtos.hidden = true;
}

function textoEstoque(estoque) {
  const quantidade = Number(estoque);
  if (!(quantidade > 0) || quantidade > LIMITE_ESTOQUE_BAIXO) return '';
  if (quantidade === 1) return 'Última unidade';
  return `Últimas ${quantidade.toLocaleString('pt-BR')} unidades`;
}

function criarImagem(produto, classe = 'produto-imagem') {
  const area = document.createElement('div');
  area.className = classe;
  const inicial = document.createElement('span');
  inicial.className = 'produto-inicial';
  inicial.textContent = String(produto.nome || '?').trim().charAt(0).toUpperCase() || '?';
  area.append(inicial);
  if (!produto.imagem) return area;

  const imagem = document.createElement('img');
  imagem.src = produto.imagem;
  imagem.alt = produto.nome ? `Imagem de ${produto.nome}` : 'Imagem do produto';
  imagem.loading = 'lazy';
  imagem.addEventListener('load', () => inicial.remove());
  imagem.addEventListener('error', () => imagem.remove());
  area.append(imagem);
  return area;
}

function linkWhatsapp(produto) {
  const tipoItem = produto.tipo === 'servico' ? 'serviço' : 'produto';
  const mensagem = `Olá! Tenho interesse no ${tipoItem} ${produto.nome}, no valor de ${moeda.format(Number(produto.preco || 0))}.`;
  return `https://wa.me/${dadosLoja.whatsapp}?text=${encodeURIComponent(mensagem)}`;
}

function criarCard(produto) {
  const artigo = document.createElement('article');
  artigo.className = 'produto';

  const abrir = document.createElement('button');
  abrir.type = 'button';
  abrir.className = 'produto-imagem';
  abrir.setAttribute('aria-label', `Ver detalhes de ${produto.nome}`);
  const imagem = criarImagem(produto, '');
  imagem.className = '';
  while (imagem.firstChild) abrir.append(imagem.firstChild);
  const aviso = textoEstoque(produto.estoque);
  if (aviso) {
    const selo = document.createElement('span');
    selo.className = 'estoque-selo';
    selo.textContent = aviso;
    abrir.append(selo);
  }
  abrir.addEventListener('click', () => abrirDetalhes(produto, abrir));
  artigo.append(abrir);

  const resumo = document.createElement('div');
  resumo.className = 'produto-resumo';
  const nome = document.createElement('h2');
  nome.className = 'produto-nome';
  nome.textContent = produto.nome;
  resumo.append(nome);
  const preco = document.createElement('p');
  preco.className = 'produto-preco';
  preco.textContent = moeda.format(Number(produto.preco || 0));
  resumo.append(preco);
  const acoes = document.createElement('div');
  acoes.className = 'produto-acoes';
  const botao = document.createElement('a');
  botao.className = 'whatsapp';
  botao.href = linkWhatsapp(produto);
  botao.target = '_blank';
  botao.rel = 'noopener noreferrer';
  botao.textContent = 'Pedir pelo WhatsApp';
  botao.setAttribute('aria-label', `Pedir ${produto.nome} pelo WhatsApp`);
  acoes.append(botao);
  resumo.append(acoes);
  artigo.append(resumo);
  return artigo;
}

function nomeCategoria(produto) {
  return String(produto.categoria || '').trim() || 'Outros';
}

function chaveCategoria(nome) {
  return nome.toLocaleLowerCase('pt-BR');
}

function renderizarCategorias(disponiveis) {
  const mapa = new Map();
  disponiveis.forEach(produto => {
    const nome = nomeCategoria(produto);
    if (!mapa.has(chaveCategoria(nome))) mapa.set(chaveCategoria(nome), nome);
  });
  const categorias = [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  if (categoriaSelecionada !== 'todos' && !mapa.has(categoriaSelecionada)) categoriaSelecionada = 'todos';

  const opcoes = [['todos', 'Todos'], ...categorias];
  elementos.categorias.replaceChildren(...opcoes.map(([chave, rotulo]) => {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = `categoria-botao${categoriaSelecionada === chave ? ' ativa' : ''}`;
    botao.textContent = rotulo;
    botao.setAttribute('aria-pressed', String(categoriaSelecionada === chave));
    botao.addEventListener('click', () => {
      categoriaSelecionada = chave;
      renderizarProdutos();
      elementos.tituloCategoria.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return botao;
  }));
  elementos.categorias.hidden = false;
}

function preencherModal(produto) {
  const grade = document.createElement('div');
  grade.className = 'modal-grid';
  grade.append(criarImagem(produto, 'modal-imagem'));

  const detalhes = document.createElement('div');
  detalhes.className = 'modal-detalhes';
  const categoria = document.createElement('p');
  categoria.className = 'modal-categoria';
  categoria.textContent = nomeCategoria(produto);
  const nome = document.createElement('h2');
  nome.id = 'modal-produto-nome';
  nome.textContent = produto.nome;
  const descricao = document.createElement('p');
  descricao.className = `modal-descricao${produto.descricao ? '' : ' modal-sem-descricao'}`;
  descricao.textContent = produto.descricao || `A loja ainda não informou uma descrição para este ${produto.tipo === 'servico' ? 'serviço' : 'produto'}.`;

  const rodape = document.createElement('div');
  rodape.className = 'modal-rodape';
  const preco = document.createElement('p');
  preco.className = 'modal-preco';
  preco.textContent = moeda.format(Number(produto.preco || 0));
  const estoque = document.createElement('p');
  estoque.className = 'modal-estoque';
  estoque.textContent = textoEstoque(produto.estoque);
  const whatsapp = document.createElement('a');
  whatsapp.className = 'whatsapp';
  whatsapp.href = linkWhatsapp(produto);
  whatsapp.target = '_blank';
  whatsapp.rel = 'noopener noreferrer';
  whatsapp.textContent = 'Pedir pelo WhatsApp';
  whatsapp.setAttribute('aria-label', `Pedir ${produto.nome} pelo WhatsApp`);
  rodape.append(preco, estoque, whatsapp);
  detalhes.append(categoria, nome, descricao, rodape);
  grade.append(detalhes);
  elementos.modalConteudo.replaceChildren(grade);
}

function abrirDetalhes(produto, origem) {
  produtoAbertoId = produto.id;
  focoAntesDoModal = origem || document.activeElement;
  preencherModal(produto);
  elementos.modal.hidden = false;
  document.body.classList.add('modal-aberto');
  elementos.fecharModal.focus();
}

function fecharDetalhes() {
  if (elementos.modal.hidden) return;
  elementos.modal.hidden = true;
  elementos.modalConteudo.replaceChildren();
  document.body.classList.remove('modal-aberto');
  produtoAbertoId = '';
  focoAntesDoModal?.focus?.();
  focoAntesDoModal = null;
}

function renderizarProdutos() {
  if (!dadosLoja) return;
  const disponiveis = produtos
    .filter(produto => produto.tipo === 'servico' || Number(produto.estoque) > 0)
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  if (!disponiveis.length) {
    fecharDetalhes();
    mostrarEstado('Nenhum produto ou serviço disponível no momento. Volte em breve.');
    return;
  }

  renderizarCategorias(disponiveis);
  const filtrados = categoriaSelecionada === 'todos'
    ? disponiveis
    : disponiveis.filter(produto => chaveCategoria(nomeCategoria(produto)) === categoriaSelecionada);
  const titulo = categoriaSelecionada === 'todos'
    ? 'Todos os itens'
    : nomeCategoria(filtrados[0] || { categoria: 'Produtos' });
  elementos.tituloCategoria.textContent = titulo;
  elementos.tituloCategoria.hidden = false;
  elementos.produtos.replaceChildren(...filtrados.map(criarCard));
  elementos.status.hidden = true;
  elementos.produtos.hidden = false;

  if (produtoAbertoId) {
    const atualizado = disponiveis.find(produto => produto.id === produtoAbertoId);
    if (atualizado) preencherModal(atualizado);
    else fecharDetalhes();
  }
}

elementos.fecharModal.addEventListener('click', fecharDetalhes);
elementos.modal.addEventListener('click', evento => {
  if (evento.target === elementos.modal) fecharDetalhes();
});
document.addEventListener('keydown', evento => {
  if (elementos.modal.hidden) return;
  if (evento.key === 'Escape') {
    fecharDetalhes();
    return;
  }
  if (evento.key === 'Tab') {
    const focaveis = [...elementos.modal.querySelectorAll('button:not([disabled]), a[href]')];
    if (!focaveis.length) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis.at(-1);
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  }
});

function aplicarLoja(loja) {
  dadosLoja = loja;
  aplicarTemaCatalogo(loja.tema);
  elementos.nome.textContent = loja.nomeLoja;
  elementos.descricao.textContent = loja.descricaoCurta || '';
  renderizarHorarioFuncionamento(loja.horariosFuncionamento);
  document.title = `Catálogo · ${loja.nomeLoja}`;
  configurarInstalacaoCatalogo(loja);
  if (loja.logo) {
    elementos.logo.src = loja.logo;
    elementos.logo.alt = `Logo de ${loja.nomeLoja}`;
    elementos.logoWrap.hidden = false;
    elementos.logo.onerror = () => { elementos.logoWrap.hidden = true; };
  } else {
    elementos.logoWrap.hidden = true;
  }
}

const slug = slugDaPagina();
if (!slugValido(slug)) {
  elementos.nome.textContent = 'Catálogo não encontrado';
  mostrarEstado('Confira se o link compartilhado pela loja está completo.', true);
} else {
  onSnapshot(doc(db, 'publicCatalogs', slug), snapshot => {
    if (!snapshot.exists() || snapshot.data().ativo !== true) {
      pararProdutos?.();
      pararProdutos = null;
      elementos.nome.textContent = 'Catálogo indisponível';
      elementos.descricao.textContent = '';
      mostrarEstado('Este catálogo não está disponível.', true);
      return;
    }
    aplicarLoja(snapshot.data());
    if (!pararProdutos) {
      pararProdutos = onSnapshot(collection(db, 'publicCatalogs', slug, 'products'), resultado => {
        produtos = resultado.docs.map(item => ({ id: item.id, ...item.data() }));
        renderizarProdutos();
      }, erro => {
        console.error('Erro ao carregar produtos públicos:', erro);
        mostrarEstado('Não foi possível carregar os produtos agora. Tente novamente em instantes.', true);
      });
    } else {
      renderizarProdutos();
    }
  }, erro => {
    console.error('Erro ao carregar catálogo:', erro);
    elementos.nome.textContent = 'Catálogo indisponível';
    mostrarEstado('Não foi possível abrir este catálogo. Confira o link ou tente novamente em instantes.', true);
  });
}
