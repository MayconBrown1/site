import { db } from '../firebase-config.js';
import { collection, doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

// Altere somente este valor para mudar quando o aviso de estoque baixo aparece.
const LIMITE_ESTOQUE_BAIXO = 5;

const elementos = {
  nome: document.getElementById('nome-loja'),
  descricao: document.getElementById('descricao-loja'),
  logoWrap: document.getElementById('logo-wrap'),
  logo: document.getElementById('logo-loja'),
  status: document.getElementById('status'),
  produtos: document.getElementById('produtos')
};

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
let dadosLoja = null;
let produtos = [];
let pararProdutos = null;

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
  elementos.produtos.hidden = true;
}

function textoEstoque(estoque) {
  const quantidade = Number(estoque);
  if (!(quantidade > 0) || quantidade > LIMITE_ESTOQUE_BAIXO) return '';
  if (quantidade === 1) return 'Última unidade';
  return `Últimas ${quantidade.toLocaleString('pt-BR')} unidades`;
}

function criarImagem(produto) {
  const area = document.createElement('div');
  area.className = 'produto-imagem';
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
  const mensagem = `Olá! Tenho interesse no produto ${produto.nome}, no valor de ${moeda.format(Number(produto.preco || 0))}.`;
  return `https://wa.me/${dadosLoja.whatsapp}?text=${encodeURIComponent(mensagem)}`;
}

function criarCard(produto) {
  const artigo = document.createElement('article');
  artigo.className = 'produto';
  artigo.append(criarImagem(produto));

  const corpo = document.createElement('div');
  corpo.className = 'produto-corpo';
  if (produto.categoria) {
    const categoria = document.createElement('p');
    categoria.className = 'categoria';
    categoria.textContent = produto.categoria;
    corpo.append(categoria);
  }
  const nome = document.createElement('h2');
  nome.textContent = produto.nome;
  corpo.append(nome);
  if (produto.descricao) {
    const descricao = document.createElement('p');
    descricao.className = 'produto-descricao';
    descricao.textContent = produto.descricao;
    corpo.append(descricao);
  }

  const rodape = document.createElement('div');
  rodape.className = 'produto-rodape';
  const preco = document.createElement('p');
  preco.className = 'preco';
  preco.textContent = moeda.format(Number(produto.preco || 0));
  const estoque = document.createElement('p');
  estoque.className = 'estoque-baixo';
  estoque.textContent = textoEstoque(produto.estoque);
  const botao = document.createElement('a');
  botao.className = 'whatsapp';
  botao.href = linkWhatsapp(produto);
  botao.target = '_blank';
  botao.rel = 'noopener noreferrer';
  botao.textContent = 'Pedir pelo WhatsApp';
  botao.setAttribute('aria-label', `Pedir ${produto.nome} pelo WhatsApp`);
  rodape.append(preco, estoque, botao);
  corpo.append(rodape);
  artigo.append(corpo);
  return artigo;
}

function renderizarProdutos() {
  if (!dadosLoja) return;
  const disponiveis = produtos
    .filter(produto => Number(produto.estoque) > 0)
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  elementos.produtos.replaceChildren(...disponiveis.map(criarCard));
  if (!disponiveis.length) {
    mostrarEstado('Nenhum produto disponível no momento. Volte em breve.');
    return;
  }
  elementos.status.hidden = true;
  elementos.produtos.hidden = false;
}

function aplicarLoja(loja) {
  dadosLoja = loja;
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
