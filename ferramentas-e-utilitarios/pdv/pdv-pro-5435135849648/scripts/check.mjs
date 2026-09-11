import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const operatorAdmin = fs.readFileSync(new URL('../operator-admin.js', import.meta.url), 'utf8');
const firestoreRules = fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const authSource = fs.readFileSync(new URL('../auth.js', import.meta.url), 'utf8');
const customerFinanceSource = fs.readFileSync(new URL('../clientes-financeiro.js', import.meta.url), 'utf8');
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
  'function caixaVisivelNoHistorico',
  'somente o fechamento do dia anterior'
]) {
  if (!html.includes(marker)) throw new Error(`Recurso ausente em index.html: ${marker}`);
}

for (const marker of [
  'Cadastro de clientes',
  'cliente-venda',
  'financeiro-section',
  'movimento-finalidade'
]) {
  if (!html.includes(marker)) throw new Error(`Novo recurso ausente em index.html: ${marker}`);
}
for (const marker of ['function abrirHistoricoCliente', 'function atualizarFinanceiro', 'finalidade === \'despesa\'']) {
  if (!customerFinanceSource.includes(marker)) throw new Error(`Clientes/financeiro incompleto: ${marker}`);
}
if (!firestoreRules.includes('match /app/financeiro')) throw new Error('As regras privadas do Financeiro não foram encontradas.');

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
if (operatorAdmin.includes('httpsCallable')) throw new Error('O cadastro de operadores ainda depende de uma Cloud Function.');
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
