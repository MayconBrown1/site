import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const operatorAdmin = fs.readFileSync(new URL('../operator-admin.js', import.meta.url), 'utf8');
const firestoreRules = fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const authSource = fs.readFileSync(new URL('../auth.js', import.meta.url), 'utf8');
const customerFinanceSource = fs.readFileSync(new URL('../clientes-financeiro.js', import.meta.url), 'utf8');
const serviceWorkerSource = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const catalogAdminSource = fs.readFileSync(new URL('../catalogo-admin.js', import.meta.url), 'utf8');
const publicCatalogSource = fs.readFileSync(new URL('../catalogo/catalogo.js', import.meta.url), 'utf8');
const publicCatalogCss = fs.readFileSync(new URL('../catalogo/catalogo.css', import.meta.url), 'utf8');
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
  'function produtoRaizEstoque',
  'function restaurarEstoqueDosItens',
  'vendedor: vendedorAtual()',
  'function aplicarPermissoesUsuario',
  'filtro-vendedor-relatorio',
  'filtro-data-relatorio',
  'function vendasDaDataRelatorio',
  'Escolha qualquer dia para consultar as vendas e os comprovantes.',
  'function caixaVisivelNoHistorico',
  'somente o fechamento do dia anterior'
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
for (const marker of ['Última atualização', 'Cinco novos temas criativos e neon', 'Gráfica, Informática, Futurista e Neon', 'Uma identidade visual em todo lugar', 'Cinco temas comerciais com imagem', 'O tema padrão continua disponível', 'Exclusão de operadores no ADM', 'Cadastro completo de clientes', 'Financeiro exclusivo do titular', 'Relatórios de dias anteriores']) {
  if (!html.includes(marker)) throw new Error(`Novidades recentes ausentes: ${marker}`);
}
const cacheAtual = serviceWorkerSource.match(/const CACHE_NAME = '([^']+)'/)?.[1];
const cacheDasNovidades = html.match(/data-novidades-cache="([^"]+)"/)?.[1];
if (!cacheAtual || !cacheDasNovidades || cacheAtual !== cacheDasNovidades) {
  throw new Error(`ATUALIZE A ÁREA NOVIDADES: o cache do aplicativo (${cacheAtual || 'não encontrado'}) precisa ser igual ao registro mais recente (${cacheDasNovidades || 'não encontrado'}).`);
}
for (const marker of ['function abrirHistoricoCliente', 'function atualizarFinanceiro', 'finalidade === \'despesa\'']) {
  if (!customerFinanceSource.includes(marker)) throw new Error(`Clientes/financeiro incompleto: ${marker}`);
}
if (!firestoreRules.includes('match /app/financeiro')) throw new Error('As regras privadas do Financeiro não foram encontradas.');

for (const marker of ['modal-tema', 'tema-cor-fundo', 'tema-cor-texto', 'tema-cor-botao', 'tema-imagem-url', 'function abrirPainelTema', 'function salvarTema', 'function restaurarTemaPadrao', 'body.tema-personalizado']) {
  if (!html.includes(marker)) throw new Error(`Painel de Tema incompleto: ${marker}`);
}
for (const marker of ['data-tema-preset="petshop"', 'data-tema-preset="adega"', 'data-tema-preset="conveniencia"', 'data-tema-preset="doceria"', 'data-tema-preset="hortifruti"', 'data-tema-preset="grafica"', 'data-tema-preset="informatica"', 'data-tema-preset="futurista"', 'data-tema-preset="neon-laranja"', 'data-tema-preset="neon-verde"']) {
  if (!html.includes(marker)) throw new Error(`Tema comercial ausente: ${marker}`);
}
for (const asset of ['pet-shop.webp', 'adega.webp', 'conveniencia.webp', 'doceria.webp', 'hortifruti.webp', 'grafica-tecnologia.webp', 'informatica.webp', 'futurista.webp', 'neon-laranja.webp', 'neon-verde.webp']) {
  if (!fs.existsSync(new URL(`../assets/temas/${asset}`, import.meta.url))) throw new Error(`Imagem do tema ausente: ${asset}`);
  if (!serviceWorkerSource.includes(`'./assets/temas/${asset}'`)) throw new Error(`Imagem do tema fora do cache offline: ${asset}`);
}
if (html.includes('onclick="alternarTema()"')) throw new Error('O botão Tema não pode mais alternar cores sem abrir o painel.');
const themeStart = html.indexOf('const TEMA_PADRAO');
const themeEnd = html.indexOf('function produtoRaizEstoque', themeStart);
if (themeStart < 0 || themeEnd < 0) throw new Error('Não foi possível localizar os controles de tema.');
const themeHelpers = new Function(`${html.slice(themeStart, themeEnd)}; return { normalizarUrlImagemTema, normalizarTema };`)();
if (themeHelpers.normalizarUrlImagemTema('https://exemplo.com/fundo.jpg') !== 'https://exemplo.com/fundo.jpg') throw new Error('O link HTTPS da imagem do tema não foi aceito.');
if (themeHelpers.normalizarUrlImagemTema('./assets/temas/pet-shop.webp') !== './assets/temas/pet-shop.webp') throw new Error('A imagem local dos temas prontos não foi aceita.');
let imagemInseguraAceita = false;
try { themeHelpers.normalizarUrlImagemTema('javascript:alert(1)'); imagemInseguraAceita = true; } catch (_) {}
if (imagemInseguraAceita) throw new Error('O tema aceitou um protocolo de imagem inseguro.');

for (const marker of ['function temaPublicoAtual', 'tema: temaPublicoAtual()']) {
  if (!catalogAdminSource.includes(marker)) throw new Error(`Sincronização do tema com o catálogo incompleta: ${marker}`);
}
for (const marker of ['function aplicarTemaCatalogo', 'aplicarTemaCatalogo(loja.tema)', '--tema-imagem', '--raio-cartao']) {
  if (!publicCatalogSource.includes(marker) && !publicCatalogCss.includes(marker)) throw new Error(`Tema do catálogo público incompleto: ${marker}`);
}
if (!firestoreRules.includes("'descricaoCurta', 'tema', 'ativo'")) throw new Error('As regras públicas não permitem a projeção sanitizada do tema.');
const catalogThemeStart = publicCatalogSource.indexOf('const TEMA_CATALOGO_PADRAO');
const catalogThemeEnd = publicCatalogSource.indexOf('const elementos', catalogThemeStart);
if (catalogThemeStart < 0 || catalogThemeEnd < 0) throw new Error('Não foi possível localizar os controles de tema do catálogo.');
const catalogThemeHelpers = new Function(`${publicCatalogSource.slice(catalogThemeStart, catalogThemeEnd)}; return { caminhoImagemTemaCatalogo, normalizarTemaCatalogo };`)();
if (catalogThemeHelpers.caminhoImagemTemaCatalogo('./assets/temas/pet-shop.webp') !== '../assets/temas/pet-shop.webp') throw new Error('O catálogo não resolveu a imagem local do tema.');
if (catalogThemeHelpers.caminhoImagemTemaCatalogo('javascript:alert(1)') !== '') throw new Error('O catálogo aceitou um protocolo de imagem inseguro.');
const temaCatalogoTeste = catalogThemeHelpers.normalizarTemaCatalogo({ fundo: '#16090d', botao: '#c18a2d', imagem: './assets/temas/adega.webp' });
if (temaCatalogoTeste.fundo !== '#16090d' || temaCatalogoTeste.botao !== '#c18a2d' || temaCatalogoTeste.imagem !== '../assets/temas/adega.webp') throw new Error('A aparência do tema não chegou corretamente ao catálogo.');

const featureContext = {
  console,
  clientesFiado: [{ id: 'cl-1', nome: 'Cliente Teste' }],
  vendas: [
    { id: 'v-paga', data: '2026-09-10T12:00:00', total: 100, clienteId: 'cl-1', pagamento: { tipo: 'pix' } },
    { id: 'v-fiado', data: '2026-09-10T13:00:00', total: 80, clienteId: 'cl-1', pagamento: { tipo: 'fiado', clienteId: 'cl-1' } }
  ],
  pagamentosFiado: [{ id: 'pf-1', clienteId: 'cl-1', valor: 30, data: '2026-09-10T14:00:00' }],
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
if (featureContext.comprasDoCliente('cl-1').length !== 2) throw new Error('O histórico não relacionou vendas pagas e fiado ao cliente.');
const lancamentosTeste = featureContext.todosLancamentosFinanceiros();
if (!lancamentosTeste.some(item => item.id === 'venda_v-paga' && item.valor === 100 && !item.pendente)) throw new Error('A venda paga não entrou no Financeiro.');
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

const start = html.indexOf('function produtoRaizEstoque');
const end = html.indexOf('function atualizarOpcoesVinculoEstoque', start);
if (start < 0 || end < 0) throw new Error('Não foi possível localizar as funções de estoque.');
const helperSource = html.slice(start, end);
const makeHelpers = new Function('produtos', 'carrinho', 'window', `${helperSource}; return { produtoRaizEstoque, estoqueDisponivel, chaveEstoque, normalizarEstoquesVinculados, totalReservadoNoEstoque, restaurarEstoqueDosItens };`);

const produtos = [
  { id: 'pb', nome: 'Xerox preto e branco', tipo: 'produto', unidade: 'un', estoque: 2200 },
  { id: 'color', nome: 'Xerox colorida', tipo: 'produto', unidade: 'un', estoque: 0, estoqueVinculadoId: 'pb' }
];
const carrinho = [
  { produtoId: 'pb', quantidade: 100 },
  { produtoId: 'color', quantidade: 75 }
];
const helpers = makeHelpers(produtos, carrinho, {});
helpers.normalizarEstoquesVinculados();
if (helpers.estoqueDisponivel(produtos[1]) !== 2200 || produtos[1].estoque !== 2200) throw new Error('O saldo vinculado não foi sincronizado.');
if (helpers.totalReservadoNoEstoque(produtos[0]) !== 175) throw new Error('O carrinho não somou o consumo compartilhado.');

produtos[0].estoque -= 175;
helpers.normalizarEstoquesVinculados();
if (produtos[0].estoque !== 2025 || produtos[1].estoque !== 2025) throw new Error('A baixa compartilhada falhou.');
helpers.restaurarEstoqueDosItens([
  { produtoId: 'pb', estoqueOrigemId: 'pb', quantidade: 100 },
  { produtoId: 'color', estoqueOrigemId: 'pb', quantidade: 75 }
]);
if (produtos[0].estoque !== 2200 || produtos[1].estoque !== 2200) throw new Error('A restauração compartilhada falhou.');

const cloudSource = fs.readFileSync(new URL('../pdv-cloud.js', import.meta.url), 'utf8');
const mergeStart = cloudSource.indexOf('const same =');
const mergeEnd = cloudSource.indexOf('async function salvarNuvem', mergeStart);
const makeCloudHelpers = new Function('uid', `${cloudSource.slice(mergeStart, mergeEnd)}; return { mergeState, cloneState };`);
const { mergeState, cloneState } = makeCloudHelpers('empresa-1');
const emptyCollections = { movimentos: [], caixas: [], clientesFiado: [], pagamentosFiado: [], orcamentos: [], categorias: [], categoriasOcultas: [], configSistema: {}, configPix: {} };
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

if (html.includes("getElementById('form-movimentacao-caixa')?.classList.toggle('hidden', operador)")) {
  throw new Error('O formulário de movimentação não pode ser ocultado do operador.');
}
if (html.includes("document.getElementById('btn-registrar-movimento').disabled = !caixa || ehOperadorAtual()")
  || html.includes("document.getElementById(id).disabled = !caixa || ehOperadorAtual()")) {
  throw new Error('Os campos de movimentação precisam permanecer habilitados para o operador quando o caixa estiver aberto.');
}
for (const marker of ['movimentoAutorizadoPorSenha', 'A senha do operador não autoriza esta movimentação.']) {
  if (!html.includes(marker)) throw new Error(`Proteção da movimentação do operador ausente: ${marker}`);
}
if (!authSource.includes('validarSenhaTitular') || !cloudSource.includes('validarSenhaTitular(emailTitular, uid, senha)')) {
  throw new Error('A movimentação do operador precisa validar a conta do titular.');
}

console.log('Verificações do PDV concluídas com sucesso.');
