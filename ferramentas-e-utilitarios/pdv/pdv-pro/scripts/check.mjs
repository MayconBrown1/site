import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const operatorAdmin = fs.readFileSync(new URL('../operator-admin.js', import.meta.url), 'utf8');
const firestoreRules = fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const authSource = fs.readFileSync(new URL('../auth.js', import.meta.url), 'utf8');
const customerFinanceSource = fs.readFileSync(new URL('../clientes-financeiro.js', import.meta.url), 'utf8');
const serviceWorkerSource = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const firebaseConfigSource = fs.readFileSync(new URL('../firebase-config.js', import.meta.url), 'utf8');
const pwaInstallSource = fs.readFileSync(new URL('../pwa-install.js', import.meta.url), 'utf8');
const catalogAdminSource = fs.readFileSync(new URL('../catalogo-admin.js', import.meta.url), 'utf8');
const publicCatalogSource = fs.readFileSync(new URL('../catalogo/catalogo.js', import.meta.url), 'utf8');
const publicCatalogCss = fs.readFileSync(new URL('../catalogo/catalogo.css', import.meta.url), 'utf8');
const loginSource = fs.readFileSync(new URL('../login.html', import.meta.url), 'utf8');
const cadastroSource = fs.readFileSync(new URL('../cadastro.html', import.meta.url), 'utf8');
const adminSource = fs.readFileSync(new URL('../admin.html', import.meta.url), 'utf8');
const manifestSource = fs.readFileSync(new URL('../manifest.json', import.meta.url), 'utf8');
const publicCatalogHtml = fs.readFileSync(new URL('../catalogo/index.html', import.meta.url), 'utf8');
const inlineScripts = html
  .split('<script')
  .slice(1)
  .map(part => part.slice(part.indexOf('>') + 1, part.indexOf('</script>')))
  .filter(Boolean);

inlineScripts.forEach(script => new Function(script));
new Function(customerFinanceSource);

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicateIds.length) throw new Error(`IDs HTML duplicados: ${duplicateIds.join(', ')}`);

const cloudinaryButtons = html.match(/href="https:\/\/console\.cloudinary\.com\/app\/"/g) || [];
if (cloudinaryButtons.length !== 2) throw new Error('Os campos de imagem e logo precisam oferecer acesso ao Cloudinary.');

for (const marker of [
  'produto-estoque-vinculo',
  'produto-estoque-minimo',
  'btn-alertas-estoque',
  'btn-menu-pdv',
  'function definirMenuPdvAberto',
  'function fecharMenuPdv',
  'function abrirAlertasEstoque',
  'function atualizarNotificacaoEstoque',
  'function produtoRaizEstoque',
  'function restaurarEstoqueDosItens',
  'vendedor: vendedorAtual()',
  'function aplicarPermissoesUsuario',
  'filtro-vendedor-relatorio',
  'filtro-data-relatorio',
  'function vendasDaDataRelatorio',
  'Escolha qualquer dia para consultar as vendas e os comprovantes.',
  'function caixaVisivelNoHistorico',
  'somente o fechamento do dia anterior',
  'btn-pagamento-dividido',
  'function montarPagamentoVenda',
  'function aprovarOrcamento',
  'function confirmarAprovacaoOrcamento',
  'sugestoes-clientes-orcamento',
  'function buscarClientesOrcamento',
  'function selecionarClienteOrcamento',
  'function vincularClienteAoOrcamento',
  "origemCadastro: 'orcamento'",
  'PDF 2 vias',
  "orcamento.status = 'aprovado'",
  'btn-suspender-venda',
  'modal-vendas-suspensas',
  'function suspenderVenda',
  'function retomarVendaSuspensa',
  'modal-comissao',
  'function calcularComissaoOperador',
  'modal-informacoes',
  'function configurarAtalhos',
  'function gerarPDFProdutos',
  'busca-produtos-cadastro',
  'function validarDuplicidadeProduto',
  'function ordenarProdutosPorMaisVendidos',
  'operador-funcao',
  'function autorizacaoNecessariaDesconto'
]) {
  if (!html.includes(marker)) throw new Error(`Recurso ausente em index.html: ${marker}`);
}

for (const marker of [
  'Cadastro de clientes',
  'cliente-venda',
  'financeiro-section',
  'financeiro-saldo',
  'movimento-finalidade',
  'financeiro-transferencias',
  "mostrarFormFinanceiro('transferencia')"
]) {
  if (!html.includes(marker)) throw new Error(`Novo recurso ausente em index.html: ${marker}`);
}
if (html.includes('financeiro-saldo-inicial-input')) throw new Error('O saldo inicial não pode mais ser editado manualmente por mês.');
if (html.includes('Saldo previsto') || html.includes('financeiro-saldo-previsto')) throw new Error('O saldo principal não pode continuar identificado como previsto.');
for (const marker of ['Última atualização', 'Login e cadastro com caminhos seguros', 'Pesquisa na tela de Produtos', 'Nome e código sem repetição', 'Mais vendidos aparecem primeiro', 'Controle financeiro somente no lugar correto', 'Novo acesso de gerente', 'Limites seguros de desconto', 'Comissão mensal por funcionário', 'Suspenda e retome uma venda', 'Atalhos e tela de Informações', 'Relatório completo de produtos em PDF', 'Busque ou cadastre o cliente no orçamento', 'Duas formas de pagamento na mesma venda', 'Desconto em porcentagem ou reais', 'Aprove o orçamento e conclua a venda', 'Saldo do cliente nas compras', 'Adicionar saldo', 'Usar saldo', 'Pago nesta venda', 'Menu compacto também no computador', 'Mais espaço e organização em qualquer tela', 'Alertas personalizados de estoque mínimo', 'Saiba a hora certa de repor cada produto', 'Temas para mais tipos de comércio', 'Mais contraste e formatos de botão', 'PDV funcionando offline com sincronização automática', 'Continue vendendo mesmo sem internet', 'Sincronização automática', 'Instale para usar com mais segurança', 'Gráfica, Informática, Futurista e Neon', 'Uma identidade visual em todo lugar', 'Cinco temas comerciais com imagem', 'O tema padrão continua disponível', 'Exclusão de operadores no ADM', 'Cadastro completo de clientes', 'Financeiro exclusivo do titular', 'Relatórios de dias anteriores']) {
  if (!html.includes(marker)) throw new Error(`Novidades recentes ausentes: ${marker}`);
}
const cacheAtual = serviceWorkerSource.match(/const CACHE_NAME = '([^']+)'/)?.[1];
const cacheDasNovidades = html.match(/data-novidades-cache="([^"]+)"/)?.[1];
if (!cacheAtual || !cacheDasNovidades || cacheAtual !== cacheDasNovidades) {
  throw new Error(`ATUALIZE A ÁREA NOVIDADES: o cache do aplicativo (${cacheAtual || 'não encontrado'}) precisa ser igual ao registro mais recente (${cacheDasNovidades || 'não encontrado'}).`);
}

for (const [nome, fonte, marcadores] of [
  ['PDV principal', html, ['src="/pdv-cloud.js"', 'href="/login.html"', 'src="/clientes-financeiro.js"']],
  ['login', loginSource, ['href="/cadastro.html"', "from'/auth.js'", 'src="/pwa-install.js"']],
  ['cadastro', cadastroSource, ['href="/login.html"', "from'/firebase-config.js'", 'src="/pwa-install.js"']],
  ['administração', adminSource, ["from'/firebase-config.js'", "from'/auth.js'", "location.replace('/login.html')"]],
  ['autenticação', authSource, ["from '/firebase-config.js'", "location.replace('/index.html')", "location.replace('/login.html')"]],
  ['catálogo público', publicCatalogHtml, ['href="/catalogo/catalogo.css"', 'src="/catalogo/catalogo.js"']],
  ['publicação do catálogo', catalogAdminSource, ["from '/firebase-config.js'", "new URL('/catalogo/'"]],
  ['instalação PWA', pwaInstallSource, ["register('/sw.js')"]],
  ['service worker', serviceWorkerSource, ["'/login.html'", "'/cadastro.html'", "caches.match('/index.html')"]]
]) {
  for (const marcador of marcadores) {
    if (!fonte.includes(marcador)) throw new Error(`Caminho absoluto do Cloudflare ausente em ${nome}: ${marcador}`);
  }
}
const manifest = JSON.parse(manifestSource);
if (manifest.start_url !== '/' || manifest.scope !== '/' || manifest.icons?.[0]?.src !== '/favicon.svg') {
  throw new Error('O manifesto não está apontando para a raiz da hospedagem Cloudflare.');
}
for (const [nome, fonte] of [['login', loginSource], ['cadastro', cadastroSource], ['administração', adminSource]]) {
  const modulo = fonte.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
  if (!modulo) throw new Error(`Script de ${nome} não encontrado.`);
  new Function(modulo.replace(/import[^;]+from['"][^'"]+['"];/g, ''));
}

const duplicidadeStart = html.indexOf('function normalizarNomeProduto');
const duplicidadeEnd = html.indexOf('function definirErroDuplicidadeProduto', duplicidadeStart);
if (duplicidadeStart < 0 || duplicidadeEnd < 0) throw new Error('Não foi possível localizar a validação de produtos repetidos.');
const criarValidadorDuplicidade = new Function('produtos', `${html.slice(duplicidadeStart, duplicidadeEnd)}; return encontrarDuplicidadesProduto;`);
const validarDuplicidade = criarValidadorDuplicidade([
  { id: 'p-1', nome: 'Café Especial', codigo: '789 123' },
  { id: 'p-2', nome: 'Bolo', codigo: '456' }
]);
if (validarDuplicidade('  CAFE   especial ', '', 'produto', '').nome?.id !== 'p-1') throw new Error('A validação permitiu repetir o nome de um produto.');
if (validarDuplicidade('Outro', '789123', 'produto', '').codigo?.id !== 'p-1') throw new Error('A validação permitiu repetir um código de barras.');
if (validarDuplicidade('Café Especial', '789123', 'produto', 'p-1').nome || validarDuplicidade('Café Especial', '789123', 'produto', 'p-1').codigo) throw new Error('A edição do próprio produto foi marcada como duplicada.');

const rankingStart = html.indexOf('function totaisVendidosPorProduto');
const rankingEnd = html.indexOf('function atualizarListaProdutos', rankingStart);
if (rankingStart < 0 || rankingEnd < 0) throw new Error('Não foi possível localizar o ranking de produtos vendidos.');
const criarRankingProdutos = new Function('vendas', 'produtos', `${html.slice(rankingStart, rankingEnd)}; return ordenarProdutosPorMaisVendidos;`);
const produtosRanking = [{ id: 'p-1', nome: 'Primeiro' }, { id: 'p-2', nome: 'Segundo' }, { id: 'p-3', nome: 'Terceiro' }];
const ordenarRanking = criarRankingProdutos([
  { itens: [{ produtoId: 'p-2', quantidade: 2 }, { produtoId: 'p-1', quantidade: 1 }] },
  { itens: [{ produtoId: 'p-2', quantidade: 3 }, { produtoId: 'p-3', quantidade: 2 }] }
], produtosRanking);
if (ordenarRanking().map(produto => produto.id).join(',') !== 'p-2,p-3,p-1') throw new Error('Os produtos não foram ordenados pela quantidade vendida.');
for (const marker of ['persistentLocalCache', 'persistentMultipleTabManager']) {
  if (!firebaseConfigSource.includes(marker)) throw new Error(`Persistência offline do Firebase ausente: ${marker}`);
}
for (const marker of ['PROFILE_CACHE_PREFIX', 'getDocFromServer', "window.addEventListener('online'"]) {
  if (!authSource.includes(marker)) throw new Error(`Acesso offline/revalidação incompleto: ${marker}`);
}
for (const marker of ['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js', 'TRUSTED_REMOTE_ORIGINS']) {
  if (!serviceWorkerSource.includes(marker)) throw new Error(`Recurso essencial fora do cache offline: ${marker}`);
}
for (const marker of ['pdv-conexao-status', 'Sem internet · dados salvos neste aparelho', 'pdv-sync-status']) {
  if (!pwaInstallSource.includes(marker)) throw new Error(`Indicador de funcionamento offline incompleto: ${marker}`);
}
for (const marker of ['function abrirHistoricoCliente', 'function atualizarFinanceiro', 'function saldoCreditoCliente', 'function registrarSaldoCliente', 'function devolverSaldoCliente', 'function formatarDocumentoCliente', 'function validarDocumentoCliente', 'finalidade === \'despesa\'']) {
  if (!customerFinanceSource.includes(marker)) throw new Error(`Clientes/financeiro incompleto: ${marker}`);
}
if (!firestoreRules.includes('match /app/financeiro')) throw new Error('As regras privadas do Financeiro não foram encontradas.');
if (!firestoreRules.includes("data.role != 'manager'")) throw new Error('O Financeiro precisa permanecer bloqueado para gerentes nas regras do Firebase.');
if (!html.includes("document.querySelectorAll('[data-owner-only]:not(.section)')")) throw new Error('As permissões não podem exibir seções exclusivas fora da navegação.');
if (html.includes("document.querySelectorAll('[data-owner-only]').forEach")) throw new Error('O Financeiro pode reaparecer dentro de Vendas durante o carregamento.');

for (const marker of ['modal-tema', 'tema-cor-fundo', 'tema-cor-texto', 'tema-cor-botao', 'tema-formato-botao', 'tema-imagem-url', 'function abrirPainelTema', 'function salvarTema', 'function restaurarTemaPadrao', 'function garantirContrasteTema', 'body.tema-personalizado', '#historico-movimentos > div']) {
  if (!html.includes(marker)) throw new Error(`Painel de Tema incompleto: ${marker}`);
}
for (const marker of ['data-tema-preset="petshop"', 'data-tema-preset="adega"', 'data-tema-preset="conveniencia"', 'data-tema-preset="doceria"', 'data-tema-preset="hortifruti"', 'data-tema-preset="grafica"', 'data-tema-preset="informatica"', 'data-tema-preset="futurista"', 'data-tema-preset="neon-laranja"', 'data-tema-preset="neon-verde"', 'data-tema-preset="borracharia"', 'data-tema-preset="oficina-motos"', 'data-tema-preset="oficina-carros"', 'data-tema-preset="autopecas"', 'data-tema-preset="mercado"', 'data-tema-preset="moda"', 'data-tema-preset="beleza"', 'data-tema-preset="construcao"', 'data-tema-preset="papelaria"', 'data-tema-preset="farmacia"']) {
  if (!html.includes(marker)) throw new Error(`Tema comercial ausente: ${marker}`);
}
for (const asset of ['pet-shop.webp', 'adega.webp', 'conveniencia.webp', 'doceria.webp', 'hortifruti.webp', 'grafica-tecnologia.webp', 'informatica.webp', 'futurista.webp', 'neon-laranja.webp', 'neon-verde.webp', 'borracharia.webp', 'oficina-motos.webp', 'oficina-carros.webp', 'autopecas.webp', 'mercado.webp', 'moda.webp', 'beleza.webp', 'material-construcao.webp', 'papelaria.webp', 'farmacia.webp']) {
  if (!fs.existsSync(new URL(`../assets/temas/${asset}`, import.meta.url))) throw new Error(`Imagem do tema ausente: ${asset}`);
  if (!serviceWorkerSource.includes(`'/assets/temas/${asset}'`)) throw new Error(`Imagem do tema fora do cache offline: ${asset}`);
}
if (html.includes('onclick="alternarTema()"')) throw new Error('O botão Tema não pode mais alternar cores sem abrir o painel.');
const themeStart = html.indexOf('const TEMA_PADRAO');
const themeEnd = html.indexOf('function produtoRaizEstoque', themeStart);
if (themeStart < 0 || themeEnd < 0) throw new Error('Não foi possível localizar os controles de tema.');
const themeHelpers = new Function(`${html.slice(themeStart, themeEnd)}; return { normalizarUrlImagemTema, normalizarTema, TEMAS_PREDEFINIDOS, razaoContrasteTema };`)();
if (themeHelpers.normalizarUrlImagemTema('https://exemplo.com/fundo.jpg') !== 'https://exemplo.com/fundo.jpg') throw new Error('O link HTTPS da imagem do tema não foi aceito.');
if (themeHelpers.normalizarUrlImagemTema('/assets/temas/pet-shop.webp') !== '/assets/temas/pet-shop.webp') throw new Error('A imagem local dos temas prontos não foi aceita.');
if (themeHelpers.normalizarUrlImagemTema('./assets/temas/pet-shop.webp') !== '/assets/temas/pet-shop.webp') throw new Error('O caminho antigo da imagem não foi migrado para a raiz.');
let imagemInseguraAceita = false;
try { themeHelpers.normalizarUrlImagemTema('javascript:alert(1)'); imagemInseguraAceita = true; } catch (_) {}
if (imagemInseguraAceita) throw new Error('O tema aceitou um protocolo de imagem inseguro.');
for (const [nome, tema] of Object.entries(themeHelpers.TEMAS_PREDEFINIDOS)) {
  const seguro = themeHelpers.normalizarTema(tema);
  if (themeHelpers.razaoContrasteTema(seguro.texto, seguro.cartao) < 4.5) throw new Error(`Contraste insuficiente entre texto e cartão no tema ${nome}.`);
  if (themeHelpers.razaoContrasteTema(seguro.textoBotao, seguro.botao) < 4.5) throw new Error(`Contraste insuficiente no botão do tema ${nome}.`);
  if (themeHelpers.razaoContrasteTema(seguro.textoBarra, seguro.barra) < 4.5) throw new Error(`Contraste insuficiente na barra do tema ${nome}.`);
}

for (const marker of ['function temaPublicoAtual', 'tema: temaPublicoAtual()']) {
  if (!catalogAdminSource.includes(marker)) throw new Error(`Sincronização do tema com o catálogo incompleta: ${marker}`);
}
for (const marker of ['function aplicarTemaCatalogo', 'aplicarTemaCatalogo(loja.tema)', '--tema-imagem', '--raio-cartao', '--raio-botao', '--recorte-botao']) {
  if (!publicCatalogSource.includes(marker) && !publicCatalogCss.includes(marker)) throw new Error(`Tema do catálogo público incompleto: ${marker}`);
}
if (!firestoreRules.includes("'descricaoCurta', 'tema', 'ativo'")) throw new Error('As regras públicas não permitem a projeção sanitizada do tema.');
if (!firestoreRules.includes('request.resource.data.tema.formatoBotao')) throw new Error('As regras públicas não permitem salvar o formato dos botões.');
if (!catalogAdminSource.includes('formatoBotao:')) throw new Error('A publicação do catálogo não inclui o formato dos botões.');
const catalogThemeStart = publicCatalogSource.indexOf('const TEMA_CATALOGO_PADRAO');
const catalogThemeEnd = publicCatalogSource.indexOf('const elementos', catalogThemeStart);
if (catalogThemeStart < 0 || catalogThemeEnd < 0) throw new Error('Não foi possível localizar os controles de tema do catálogo.');
const catalogThemeHelpers = new Function(`${publicCatalogSource.slice(catalogThemeStart, catalogThemeEnd)}; return { caminhoImagemTemaCatalogo, normalizarTemaCatalogo };`)();
if (catalogThemeHelpers.caminhoImagemTemaCatalogo('/assets/temas/pet-shop.webp') !== '/assets/temas/pet-shop.webp') throw new Error('O catálogo não resolveu a imagem local do tema.');
if (catalogThemeHelpers.caminhoImagemTemaCatalogo('./assets/temas/pet-shop.webp') !== '/assets/temas/pet-shop.webp') throw new Error('O catálogo não converteu o caminho antigo do tema.');
if (catalogThemeHelpers.caminhoImagemTemaCatalogo('javascript:alert(1)') !== '') throw new Error('O catálogo aceitou um protocolo de imagem inseguro.');
const temaCatalogoTeste = catalogThemeHelpers.normalizarTemaCatalogo({ fundo: '#16090d', botao: '#c18a2d', imagem: '/assets/temas/adega.webp' });
if (temaCatalogoTeste.fundo !== '#16090d' || temaCatalogoTeste.botao !== '#c18a2d' || temaCatalogoTeste.imagem !== '/assets/temas/adega.webp') throw new Error('A aparência do tema não chegou corretamente ao catálogo.');

const featureContext = {
  console,
  clientesFiado: [{ id: 'cl-1', nome: 'Cliente Teste' }],
  vendas: [
    { id: 'v-paga', data: '2026-09-10T12:00:00', total: 100, clienteId: 'cl-1', pagamento: { tipo: 'pix' } },
    { id: 'v-fiado', data: '2026-09-10T13:00:00', total: 80, clienteId: 'cl-1', pagamento: { tipo: 'fiado', clienteId: 'cl-1' } },
    { id: 'v-saldo', data: '2026-09-10T13:30:00', total: 10, clienteId: 'cl-1', pagamento: { tipo: 'dinheiro', saldoUtilizado: 5, valorCobrado: 5 } }
  ],
  pagamentosFiado: [{ id: 'pf-1', clienteId: 'cl-1', valor: 30, data: '2026-09-10T14:00:00' }],
  movimentosSaldoCliente: [
    { id: 'msc-1', clienteId: 'cl-1', tipo: 'credito', valor: 10, data: '2026-09-10T11:00:00' },
    { id: 'msc-2', clienteId: 'cl-1', tipo: 'debito', valor: 5, data: '2026-09-10T13:30:00', vendaId: 'v-saldo' }
  ],
  movimentos: [
    { id: 'm-despesa', tipo: 'saida', finalidade: 'despesa', categoriaFinanceira: 'Alimentação', valor: 20, descricao: 'Compra', data: '2026-09-10T15:00:00' },
    { id: 'm-sangria', tipo: 'saida', finalidade: 'sangria', valor: 50, descricao: 'Guardar', data: '2026-09-10T16:00:00' }
  ],
  lancamentosFinanceiros: [{ id: 'lf-1', tipo: 'receita', categoria: 'Salário', valor: 2000, descricao: 'Pró-labore', data: '2026-09-10T12:00:00' }],
  saldosIniciaisFinanceiros: { '2026-09': 250.35 },
  saldoClienteFiado: () => 50,
  ehOperadorAtual: () => false,
  salvarDados: () => {},
  salvarRascunhoVenda: () => {},
  mostrarMensagem: () => {},
  exigirTitular: () => true,
  confirm: () => true,
  document: {}
};
featureContext.window = featureContext;
vm.runInNewContext(customerFinanceSource, featureContext);
if (!featureContext.validarCpfCliente('529.982.247-25') || featureContext.validarCpfCliente('111.111.111-11')) throw new Error('A validação de CPF falhou.');
if (featureContext.parseValorMonetario('1,15') !== 1.15 || featureContext.parseValorMonetario('1.234,56') !== 1234.56) throw new Error('A leitura de valores com centavos falhou.');
if (featureContext.comprasDoCliente('cl-1').length !== 3) throw new Error('O histórico não relacionou vendas pagas, fiado e compras com saldo ao cliente.');
if (featureContext.saldoCreditoCliente('cl-1') !== 5) throw new Error('O saldo disponível do cliente está incorreto.');
if (featureContext.limitarSaldoCredito(8, 10, 20) !== 8 || featureContext.limitarSaldoCredito(20, 10, 20) !== 10) throw new Error('O uso do saldo não respeitou o disponível e o total da compra.');
const lancamentosTeste = featureContext.todosLancamentosFinanceiros();
if (!lancamentosTeste.some(item => item.id === 'venda_v-paga' && item.valor === 100 && !item.pendente)) throw new Error('A venda paga não entrou no Financeiro.');
if (!lancamentosTeste.some(item => item.id === 'venda_v-saldo' && item.valor === 5 && !item.pendente)) throw new Error('A venda com saldo duplicou o valor já recebido no Financeiro.');
if (!lancamentosTeste.some(item => item.id === 'venda_v-fiado' && item.valor === 50 && item.pendente)) throw new Error('O saldo fiado pendente está incorreto.');
if (!lancamentosTeste.some(item => item.id === 'caixa_m-despesa' && item.valor === 20)) throw new Error('A despesa do caixa não entrou no Financeiro.');
if (lancamentosTeste.some(item => item.id === 'caixa_m-sangria')) throw new Error('A sangria alterou o Financeiro indevidamente.');
const resumoFinanceiro = featureContext.calcularResumoFinanceiro([
  { tipo: 'receita', valor: 100 },
  { tipo: 'despesa', valor: 155 },
  { tipo: 'despesa', valor: 999, considerado: false }
], 250.35);
if (resumoFinanceiro.resultado !== -55 || Math.abs(resumoFinanceiro.saldoPrevisto - 195.35) > 0.001 || Math.abs(resumoFinanceiro.economia + 55) > 0.001) throw new Error(`O resumo mensal do Financeiro está incorreto: ${JSON.stringify(resumoFinanceiro)}`);
const historicoContinuo = [
  { tipo: 'transferencia', direcao: 'entrada', valor: 10000, data: '2026-09-01T12:00:00' },
  { tipo: 'receita', valor: 1000, data: '2026-09-10T12:00:00' },
  { tipo: 'despesa', valor: 500, data: '2026-09-20T12:00:00' },
  { tipo: 'despesa', valor: 200, data: '2026-10-05T12:00:00' },
  { tipo: 'transferencia', direcao: 'saida', valor: 300, data: '2026-10-06T12:00:00' }
];
const saldoInicialOutubro = featureContext.saldoAntesDoPeriodo(historicoContinuo, '2026-10');
const outubro = featureContext.calcularResumoFinanceiro(historicoContinuo.filter(item => item.data.startsWith('2026-10')), saldoInicialOutubro);
if (saldoInicialOutubro !== 10500 || outubro.resultado !== -200 || outubro.transferencias !== -300 || outubro.saldoPrevisto !== 10000) throw new Error('A continuidade automática entre meses falhou.');

const finalizarStart = html.indexOf('function finalizarVenda()');
const finalizarEnd = html.indexOf('function limparVenda()', finalizarStart);
if (finalizarStart < 0 || finalizarEnd < 0) throw new Error('Não foi possível localizar a finalização da venda.');
const camposVenda = {
  desconto: { value: '0' },
  'cliente-venda': { value: 'cl-1' },
  'valor-recebido': { value: '5' },
  'pix-id': { value: '' },
  'tipo-cartao': { value: 'credito' },
  parcelas: { value: '1' },
  'fiado-vencimento': { value: '' }
};
const vendaContext = {
  carrinho: [{ produtoId: 'servico-1', nome: 'Serviço teste', quantidade: 1, preco: 10, unidade: 'un', tipo: 'servico' }],
  vendaAtual: { tipo: 'dinheiro' },
  produtos: [{ id: 'servico-1', nome: 'Serviço teste', tipo: 'servico' }],
  clientesFiado: [{ id: 'cl-1', nome: 'Cliente Teste' }],
  vendas: [], movimentos: [], movimentosSaldoCliente: [],
  document: { getElementById: id => camposVenda[id] },
  exigirCaixaAberto: () => ({ id: 'cx-1' }),
  valorSaldoAplicadoVenda: () => 5,
  saldoCreditoCliente: () => 5,
  calcularDescontoVenda: () => ({ tipo: 'percentual', informado: 0, percentual: 0, valorDesconto: 0 }),
  arredondarCentavos: valor => Math.round(Number(valor) * 100) / 100,
  montarPagamentoVenda: valor => ({ pagamento: { tipo: 'dinheiro', valorRecebido: valor, troco: 0, valorCobrado: valor } }),
  solicitarAutorizacaoDesconto: () => false,
  formasPagamentoRegistradas: (pagamento, valor) => [{ ...pagamento, valor: Number(pagamento.valorCobrado ?? valor) }],
  saldoClienteFiado: () => 0,
  mostrarMensagem: () => {},
  produtoRaizEstoque: produto => produto,
  estoqueDisponivel: () => 999,
  normalizarEstoquesVinculados: () => {},
  vendedorAtual: () => ({ id: 'titular', nome: 'Titular' }),
  salvarDados: () => {}, atualizarFinanceiro: () => {}, mostrarComprovante: () => {}, limparVenda: () => {}
};
vm.runInNewContext(html.slice(finalizarStart, finalizarEnd), vendaContext);
vendaContext.finalizarVenda();
if (vendaContext.vendas.length !== 1 || vendaContext.vendas[0].pagamento.saldoUtilizado !== 5 || vendaContext.vendas[0].pagamento.valorCobrado !== 5) throw new Error('A venda não registrou corretamente a divisão entre saldo e pagamento atual.');
if (vendaContext.movimentos.length !== 1 || vendaContext.movimentos[0].valor !== 5) throw new Error('O caixa recebeu novamente o valor usado do saldo do cliente.');
if (vendaContext.movimentosSaldoCliente.length !== 1 || vendaContext.movimentosSaldoCliente[0].tipo !== 'debito' || vendaContext.movimentosSaldoCliente[0].valor !== 5) throw new Error('O saldo usado na venda não foi debitado do cliente.');

const descontoAutorizacaoStart = html.indexOf('function autorizacaoNecessariaDesconto');
const descontoAutorizacaoEnd = html.indexOf('function solicitarAutorizacaoDesconto', descontoAutorizacaoStart);
if (descontoAutorizacaoStart < 0 || descontoAutorizacaoEnd < 0) throw new Error('Não foi possível localizar os limites de desconto por função.');
const criarRegraDesconto = new Function('ehEquipeAtual', 'ehGerenteAtual', `${html.slice(descontoAutorizacaoStart, descontoAutorizacaoEnd)}; return autorizacaoNecessariaDesconto;`);
const regraOperador = criarRegraDesconto(() => true, () => false);
const regraGerente = criarRegraDesconto(() => true, () => true);
const regraTitular = criarRegraDesconto(() => false, () => false);
if (regraOperador(5) !== null || regraOperador(5.01)?.tipoSenha !== 'titular') throw new Error('O limite de 5% do operador não foi aplicado corretamente.');
if (regraGerente(5) !== null || regraGerente(20)?.tipoSenha !== 'usuario' || regraGerente(20.01)?.tipoSenha !== 'titular') throw new Error('Os limites de desconto do gerente não foram aplicados corretamente.');
if (regraTitular(100) !== null) throw new Error('O titular não pode depender de uma segunda autorização de desconto.');

const suspenderStart = html.indexOf('function suspenderVenda()');
const suspenderEnd = html.indexOf('function abrirVendasSuspensas()', suspenderStart);
if (suspenderStart < 0 || suspenderEnd < 0) throw new Error('Não foi possível localizar a suspensão de vendas.');
const suspenderContext = {
  carrinho: [{ produtoId: 'p-1', nome: 'Produto', quantidade: 2, preco: 5 }],
  vendasSuspensas: [],
  prompt: () => 'Cliente aguardando',
  vendedorAtual: () => ({ id: 'op-1', nome: 'Operador Teste' }),
  capturarEstadoVenda: () => ({ carrinho: [{ produtoId: 'p-1', quantidade: 2, preco: 5 }] }),
  salvarDados: () => {},
  limparVenda: () => {},
  atualizarVendasSuspensas: () => {},
  mostrarMensagem: () => {}
};
vm.runInNewContext(html.slice(suspenderStart, suspenderEnd), suspenderContext);
suspenderContext.suspenderVenda();
if (suspenderContext.vendasSuspensas.length !== 1 || suspenderContext.vendasSuspensas[0].nome !== 'Cliente aguardando' || suspenderContext.vendasSuspensas[0].estado.carrinho.length !== 1) throw new Error('A venda suspensa não guardou o carrinho e sua identificação.');

const reportStart = html.indexOf('function chaveDataRelatorio');
const reportEnd = html.indexOf('function atualizarFiltroVendedores', reportStart);
if (reportStart < 0 || reportEnd < 0) throw new Error('Não foi possível localizar as funções do relatório por data.');
const reportHelpersSource = html.slice(reportStart, reportEnd);
const reportSales = [
  { id: 'ontem', data: '2026-09-10T12:00:00', total: 10 },
  { id: 'hoje', data: '2026-09-11T12:00:00', total: 20 }
];
const makeReportHelpers = new Function('vendas', 'document', `${reportHelpersSource}; return { chaveDataRelatorio, vendasDaDataRelatorio };`);
const reportHelpers = makeReportHelpers(reportSales, {});
if (reportHelpers.vendasDaDataRelatorio('2026-09-10').map(venda => venda.id).join(',') !== 'ontem') {
  throw new Error('O relatório não separou corretamente as vendas por data local.');
}

const comissaoStart = html.indexOf('function calcularComissaoOperador');
const comissaoEnd = html.indexOf('function atualizarFiltroVendedores', comissaoStart);
if (comissaoStart < 0 || comissaoEnd < 0) throw new Error('Não foi possível localizar o cálculo de comissão.');
const resultadoComissao = { innerHTML: '', classList: { remove() {} } };
const camposComissao = {
  'comissao-operador': { value: 'op-1', selectedOptions: [{ textContent: 'Operador Teste' }] },
  'comissao-mes': { value: '2026-09' },
  'comissao-percentual': { value: '10' },
  'resultado-comissao': resultadoComissao
};
const criarCalculoComissao = new Function('vendas', 'document', 'exigirTitular', 'chaveVendedorVenda', 'chaveDataRelatorio', 'arredondarCentavos', 'textoSeguro', 'moedaRelatorio', 'mostrarMensagem', `${html.slice(comissaoStart, comissaoEnd)}; return calcularComissaoOperador;`);
criarCalculoComissao(
  [
    { data: '2026-09-01T10:00:00', total: 100, vendedor: { id: 'op-1' } },
    { data: '2026-09-20T10:00:00', total: 50, vendedor: { id: 'op-1' } },
    { data: '2026-08-20T10:00:00', total: 999, vendedor: { id: 'op-1' } },
    { data: '2026-09-20T10:00:00', total: 999, vendedor: { id: 'op-2' } }
  ],
  { getElementById: id => camposComissao[id] },
  () => true,
  venda => venda.vendedor.id,
  data => data.slice(0, 10),
  valor => Math.round(valor * 100) / 100,
  String,
  valor => `R$ ${Number(valor).toFixed(2)}`,
  () => {}
)();
if (!resultadoComissao.innerHTML.includes('R$ 150.00') || !resultadoComissao.innerHTML.includes('R$ 15.00')) throw new Error('O cálculo mensal de comissão por funcionário está incorreto.');

const start = html.indexOf('function produtoRaizEstoque');
const end = html.indexOf('function atualizarOpcoesVinculoEstoque', start);
if (start < 0 || end < 0) throw new Error('Não foi possível localizar as funções de estoque.');
const helperSource = html.slice(start, end);
const makeHelpers = new Function('produtos', 'carrinho', 'window', `${helperSource}; return { produtoRaizEstoque, estoqueDisponivel, estoqueMinimoProduto, estoquesBaixos, chaveEstoque, normalizarEstoquesVinculados, totalReservadoNoEstoque, restaurarEstoqueDosItens };`);

const produtos = [
  { id: 'pb', nome: 'Xerox preto e branco', tipo: 'produto', unidade: 'un', estoque: 2200, estoqueMinimo: 500 },
  { id: 'color', nome: 'Xerox colorida', tipo: 'produto', unidade: 'un', estoque: 0, estoqueMinimo: 10, estoqueVinculadoId: 'pb' },
  { id: 'servico', nome: 'Arte final', tipo: 'servico', estoque: 0, estoqueMinimo: 100 }
];
const carrinho = [
  { produtoId: 'pb', quantidade: 100 },
  { produtoId: 'color', quantidade: 75 }
];
const helpers = makeHelpers(produtos, carrinho, {});
helpers.normalizarEstoquesVinculados();
if (helpers.estoqueDisponivel(produtos[1]) !== 2200 || produtos[1].estoque !== 2200) throw new Error('O saldo vinculado não foi sincronizado.');
if (helpers.estoqueMinimoProduto(produtos[1]) !== 500 || produtos[1].estoqueMinimo !== 500) throw new Error('O estoque vinculado não herdou o limite mínimo da origem.');
if ('estoqueMinimo' in produtos[2]) throw new Error('Serviços não podem gerar alertas de estoque.');
if (helpers.totalReservadoNoEstoque(produtos[0]) !== 175) throw new Error('O carrinho não somou o consumo compartilhado.');

produtos[0].estoque -= 175;
helpers.normalizarEstoquesVinculados();
if (produtos[0].estoque !== 2025 || produtos[1].estoque !== 2025) throw new Error('A baixa compartilhada falhou.');
helpers.restaurarEstoqueDosItens([
  { produtoId: 'pb', estoqueOrigemId: 'pb', quantidade: 100 },
  { produtoId: 'color', estoqueOrigemId: 'pb', quantidade: 75 }
]);
if (produtos[0].estoque !== 2200 || produtos[1].estoque !== 2200) throw new Error('A restauração compartilhada falhou.');
if (helpers.estoquesBaixos().length !== 0) throw new Error('O alerta apareceu antes de o estoque atingir o limite.');
produtos[0].estoqueMinimo = 2500;
helpers.normalizarEstoquesVinculados();
const alertasEstoque = helpers.estoquesBaixos();
if (alertasEstoque.length !== 1 || alertasEstoque[0].id !== 'pb' || alertasEstoque[0].vinculados.join(',') !== 'Xerox colorida') {
  throw new Error('Os alertas de estoque mínimo não agruparam corretamente o estoque compartilhado.');
}
if (html.includes("produtos.filter(p => p.estoque <= 5)")) throw new Error('O relatório ainda usa um limite fixo de estoque baixo.');

const cloudSource = fs.readFileSync(new URL('../pdv-cloud.js', import.meta.url), 'utf8');
for (const marker of ["chaveLocal('pending')", "chaveLocal('finance_pending')", "window.addEventListener('online'", 'sincronizarPrincipal', 'snap.metadata.fromCache', 'nova tentativa automática', 'movimentosSaldoCliente', 'vendasSuspensas', "['operator', 'manager'].includes"]) {
  if (!cloudSource.includes(marker)) throw new Error(`Fila de sincronização offline incompleta: ${marker}`);
}
const mergeStart = cloudSource.indexOf('const same =');
const mergeEnd = cloudSource.indexOf('async function salvarNuvem', mergeStart);
const makeCloudHelpers = new Function('uid', `${cloudSource.slice(mergeStart, mergeEnd)}; return { mergeState, cloneState };`);
const { mergeState, cloneState } = makeCloudHelpers('empresa-1');
const emptyCollections = { vendasSuspensas: [], movimentos: [], caixas: [], clientesFiado: [], pagamentosFiado: [], movimentosSaldoCliente: [], orcamentos: [], categorias: [], categoriasOcultas: [], configSistema: {}, configPix: {} };
const base = { ...emptyCollections, produtos: [{ id: 'papel', estoque: 2200 }], vendas: [] };
const local = { ...emptyCollections, produtos: [{ id: 'papel', estoque: 2100 }], vendas: [{ id: 'v-local', total: 10 }] };
const remote = { ...emptyCollections, produtos: [{ id: 'papel', estoque: 2125 }], vendas: [{ id: 'v-remota', total: 20 }] };
const merged = mergeState(base, local, remote);
if (merged.produtos[0].estoque !== 2025) throw new Error('A mesclagem simultânea calculou o estoque incorretamente.');
if (merged.vendas.length !== 2) throw new Error('A mesclagem simultânea perdeu uma venda.');

// Reproduz a venda feita logo após carregar os dados da nuvem. A base não pode
// mudar junto com os objetos da tela, ou a venda e a baixa parecem não existir.
const recebido = { ...emptyCollections, produtos: [{ id: 'produto-1', estoque: 10 }], vendas: [] };
const baseIsolada = cloneState(recebido);
const tela = cloneState(recebido);
tela.produtos[0].estoque -= 1;
tela.vendas.push({ id: 'venda-1', total: 1 });
const vendaMesclada = mergeState(baseIsolada, tela, recebido);
if (baseIsolada.produtos[0].estoque !== 10) throw new Error('A base da nuvem foi alterada junto com a tela.');
if (vendaMesclada.produtos[0].estoque !== 9) throw new Error('A baixa de estoque da venda foi perdida.');
if (vendaMesclada.vendas.length !== 1) throw new Error('O registro da venda foi perdido.');

for (const marker of ['createUserWithEmailAndPassword', 'initializeApp(app.options', 'sendPasswordResetEmail']) {
  if (!operatorAdmin.includes(marker)) throw new Error(`Fluxo direto de operadores incompleto: ${marker}`);
}
for (const marker of ['deleteDoc', "remove.textContent = 'Excluir'", 'function deleteOperator']) {
  if (!operatorAdmin.includes(marker)) throw new Error(`Exclusão de operadores incompleta: ${marker}`);
}
if (!firestoreRules.includes("resource.data.ownerUid == request.auth.uid")) throw new Error('O titular precisa ter permissão para excluir os próprios operadores.');
if (operatorAdmin.includes('httpsCallable')) throw new Error('A gestão de operadores não pode depender de uma Cloud Function.');
if (!html.includes('text-[#f6c453]') || !html.includes('>ADM do PDV</button>')) throw new Error('O botão ADM do PDV precisa manter o texto dourado.');
if (!firestoreRules.includes("request.resource.data.role == 'operator'")) throw new Error('As regras de criação de operadores não foram encontradas.');
if (!operatorAdmin.includes("['operator', 'manager'].includes(role)") || !operatorAdmin.includes("operator.role === 'manager'")) throw new Error('O cadastro de gerente está incompleto no ADM.');
if (!authSource.includes("['operator', 'manager'].includes(dadosPerfil.role)")) throw new Error('O login não reconhece o perfil de gerente.');
if (!firestoreRules.includes("request.resource.data.role == 'manager'") || !firestoreRules.includes('activeStaffFor')) throw new Error('As regras do Firebase não reconhecem o gerente como membro da empresa.');

if (html.includes("getElementById('form-movimentacao-caixa')?.classList.toggle('hidden', operador)")) {
  throw new Error('O formulário de movimentação não pode ser ocultado do operador.');
}
if (html.includes("document.getElementById('btn-registrar-movimento').disabled = !caixa || ehOperadorAtual()")
  || html.includes("document.getElementById(id).disabled = !caixa || ehOperadorAtual()")) {
  throw new Error('Os campos de movimentação precisam permanecer habilitados para o operador quando o caixa estiver aberto.');
}
for (const marker of ['movimentoAutorizadoPorSenha', 'Confirme a senha solicitada antes de registrar a movimentação.']) {
  if (!html.includes(marker)) throw new Error(`Proteção da movimentação do operador ausente: ${marker}`);
}
if (!authSource.includes('validarSenhaTitular') || !cloudSource.includes('validarSenhaTitular(emailTitular, uid, senha)')) {
  throw new Error('A movimentação do operador precisa validar a conta do titular.');
}

console.log('Verificações do PDV concluídas com sucesso.');
