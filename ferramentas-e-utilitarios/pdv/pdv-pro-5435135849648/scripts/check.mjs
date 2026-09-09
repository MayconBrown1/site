import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const inlineScripts = html
  .split('<script')
  .slice(1)
  .map(part => part.slice(part.indexOf('>') + 1, part.indexOf('</script>')))
  .filter(Boolean);

inlineScripts.forEach(script => new Function(script));

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicateIds.length) throw new Error(`IDs HTML duplicados: ${duplicateIds.join(', ')}`);

for (const marker of [
  'produto-estoque-vinculo',
  'function produtoRaizEstoque',
  'function restaurarEstoqueDosItens',
  'vendedor: vendedorAtual()',
  'function aplicarPermissoesUsuario',
  'filtro-vendedor-relatorio'
]) {
  if (!html.includes(marker)) throw new Error(`Recurso ausente em index.html: ${marker}`);
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
const makeMerge = new Function('uid', `${cloudSource.slice(mergeStart, mergeEnd)}; return mergeState;`);
const mergeState = makeMerge('empresa-1');
const emptyCollections = { movimentos: [], caixas: [], clientesFiado: [], pagamentosFiado: [], orcamentos: [], categorias: [], categoriasOcultas: [], configSistema: {}, configPix: {} };
const base = { ...emptyCollections, produtos: [{ id: 'papel', estoque: 2200 }], vendas: [] };
const local = { ...emptyCollections, produtos: [{ id: 'papel', estoque: 2100 }], vendas: [{ id: 'v-local', total: 10 }] };
const remote = { ...emptyCollections, produtos: [{ id: 'papel', estoque: 2125 }], vendas: [{ id: 'v-remota', total: 20 }] };
const merged = mergeState(base, local, remote);
if (merged.produtos[0].estoque !== 2025) throw new Error('A mesclagem simultânea calculou o estoque incorretamente.');
if (merged.vendas.length !== 2) throw new Error('A mesclagem simultânea perdeu uma venda.');

console.log('Verificações do PDV concluídas com sucesso.');
