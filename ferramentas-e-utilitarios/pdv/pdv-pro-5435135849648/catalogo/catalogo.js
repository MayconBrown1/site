import { db } from '../firebase-config.js';
import { collection, doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

// Altere somente este valor para mudar quando o aviso de estoque baixo aparece.
const LIMITE_ESTOQUE_BAIXO = 5;
const TEMA_CATALOGO_PADRAO = Object.freeze({
  fundo: '#f3f6fa', texto: '#152033', cartao: '#ffffff', botao: '#0f4c81', textoBotao: '#ffffff',
  barra: '#082f52', textoBarra: '#ffffff', fonte: 'sistema', bordas: 'arredondado',
  imagem: '', ajusteImagem: 'cover', sobreposicao: 20
});
const FONTES_CATALOGO = Object.freeze({
  sistema: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  arial: 'Arial, sans-serif', verdana: 'Verdana, sans-serif', georgia: 'Georgia, serif'
});
const RAIOS_CATALOGO = Object.freeze({ discreto: '10px', arredondado: '18px', amplo: '26px' });

function corTemaCatalogo(valor, padrao) {
  return /^#[0-9a-f]{6}$/i.test(String(valor || '')) ? String(valor).toLowerCase() : padrao;
}

function caminhoImagemTemaCatalogo(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return '';
  if (/^\.\/assets\/temas\/[a-z0-9-]+\.webp$/i.test(texto)) return `../${texto.slice(2)}`;
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
    '--tema-imagem-tamanho': tamanho, '--tema-imagem-repeticao': repeticao
  };
  Object.entries(valores).forEach(([nome, valor]) => document.documentElement.style.setProperty(nome, valor));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', seguro.barra);
}

const elementos = {
  nome: document.getElementById('nome-loja'),
  descricao: document.getElementById('descricao-loja'),
  logoWrap: document.getElementById('logo-wrap'),
  logo: document.getElementById('logo-loja'),
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
  document.title = `Catálogo · ${loja.nomeLoja}`;
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
