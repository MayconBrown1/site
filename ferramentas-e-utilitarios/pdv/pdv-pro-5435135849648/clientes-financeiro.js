const CATEGORIAS_RECEITA = ['Venda', 'Salário', 'Freelance', 'Serviços', 'Rendimentos', 'Outras receitas'];
const CATEGORIAS_DESPESA = ['Alimentação', 'Saúde', 'Transporte', 'Estoque e fornecedores', 'Aluguel', 'Contas e serviços', 'Impostos', 'Manutenção', 'Outros'];

function escaparDado(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[caractere]));
}

function moedaBR(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function somenteDigitos(valor) {
    return String(valor || '').replace(/\D/g, '');
}

function dataLocalISO(data = new Date()) {
    const valor = new Date(data);
    return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`;
}

function periodoDaData(data) {
    const valor = new Date(data);
    return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}`;
}

function formatarCpf(valor) {
    return somenteDigitos(valor).slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatarCpfCliente(campo) {
    campo.value = formatarCpf(campo.value);
}

function formatarTelefoneCliente(campo) {
    const numeros = somenteDigitos(campo.value).slice(0, 13);
    const nacional = numeros.startsWith('55') && numeros.length > 11 ? numeros.slice(2) : numeros;
    campo.value = nacional.length <= 10
        ? nacional.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (_, ddd, parte1, parte2) => [ddd && `(${ddd})`, parte1, parte2 && `-${parte2}`].filter(Boolean).join(' '))
        : nacional.replace(/(\d{2})(\d{0,5})(\d{0,4})/, (_, ddd, parte1, parte2) => [ddd && `(${ddd})`, parte1, parte2 && `-${parte2}`].filter(Boolean).join(' '));
}

function validarCpfCliente(cpf) {
    const numeros = somenteDigitos(cpf);
    if (!numeros) return true;
    if (numeros.length !== 11 || /^(\d)\1{10}$/.test(numeros)) return false;
    const calcular = tamanho => {
        let soma = 0;
        for (let i = 0; i < tamanho; i++) soma += Number(numeros[i]) * (tamanho + 1 - i);
        const resto = (soma * 10) % 11;
        return resto === 10 ? 0 : resto;
    };
    return calcular(9) === Number(numeros[9]) && calcular(10) === Number(numeros[10]);
}

function normalizarClientesLegados() {
    let alterou = false;
    clientesFiado = clientesFiado.map(cliente => {
        const whatsapp = cliente.whatsapp || cliente.telefone || '';
        if (cliente.whatsapp === whatsapp && cliente.tipoCadastro === 'cliente') return cliente;
        alterou = true;
        return { ...cliente, whatsapp, telefone: whatsapp, tipoCadastro: 'cliente', atualizadoEm: cliente.atualizadoEm || cliente.createdAt || new Date().toISOString() };
    });
    return alterou;
}

function comprasDoCliente(clienteId) {
    return vendas.filter(venda => venda.clienteId === clienteId || venda.pagamento?.clienteId === clienteId);
}

function pagamentosDoCliente(clienteId) {
    return pagamentosFiado.filter(pagamento => pagamento.clienteId === clienteId);
}

function totalPagoPeloCliente(clienteId) {
    const comprasPagas = comprasDoCliente(clienteId)
        .filter(venda => venda.pagamento?.tipo !== 'fiado')
        .reduce((total, venda) => total + Number(venda.total || 0), 0);
    return comprasPagas + pagamentosDoCliente(clienteId).reduce((total, pagamento) => total + Number(pagamento.valor || 0), 0);
}

function mostrarFormCliente() {
    document.getElementById('form-cliente').classList.remove('hidden');
    document.getElementById('cliente-nome').focus();
}

function cancelarCliente() {
    clienteFiadoEditando = null;
    document.getElementById('titulo-form-cliente').textContent = 'Cadastrar cliente';
    ['cliente-nome', 'cliente-cpf', 'cliente-whatsapp', 'cliente-email', 'cliente-nascimento', 'cliente-cidade', 'cliente-endereco', 'cliente-observacoes']
        .forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('form-cliente').classList.add('hidden');
}

function salvarCliente() {
    const nome = document.getElementById('cliente-nome').value.trim();
    const cpf = somenteDigitos(document.getElementById('cliente-cpf').value);
    const emailCampo = document.getElementById('cliente-email');
    if (!nome) return mostrarMensagem('Informe o nome do cliente.', 'erro');
    if (!validarCpfCliente(cpf)) return mostrarMensagem('Informe um CPF válido ou deixe o campo vazio.', 'erro');
    if (emailCampo.value && !emailCampo.checkValidity()) return mostrarMensagem('Informe um e-mail válido.', 'erro');
    const cpfDuplicado = clientesFiado.some(cliente => somenteDigitos(cliente.cpf) === cpf && cpf && cliente.id !== clienteFiadoEditando?.id);
    if (cpfDuplicado) return mostrarMensagem('Já existe um cliente cadastrado com este CPF.', 'erro');

    const agora = new Date().toISOString();
    const dados = {
        ...(clienteFiadoEditando || {}),
        id: clienteFiadoEditando?.id || 'cl_' + Date.now(),
        tipoCadastro: 'cliente',
        nome,
        cpf,
        whatsapp: document.getElementById('cliente-whatsapp').value.trim(),
        telefone: document.getElementById('cliente-whatsapp').value.trim(),
        email: emailCampo.value.trim().toLowerCase(),
        nascimento: document.getElementById('cliente-nascimento').value,
        cidade: document.getElementById('cliente-cidade').value.trim(),
        endereco: document.getElementById('cliente-endereco').value.trim(),
        observacoes: document.getElementById('cliente-observacoes').value.trim(),
        semLimite: true,
        limite: 0,
        createdAt: clienteFiadoEditando?.createdAt || agora,
        atualizadoEm: agora
    };
    const indice = clientesFiado.findIndex(cliente => cliente.id === dados.id);
    if (indice >= 0) clientesFiado[indice] = dados;
    else clientesFiado.push(dados);
    salvarDados();
    cancelarCliente();
    atualizarClientes();
    mostrarMensagem('Cliente salvo com sucesso.', 'sucesso');
}

function editarCliente(id) {
    const cliente = clientesFiado.find(item => item.id === id);
    if (!cliente) return;
    clienteFiadoEditando = cliente;
    document.getElementById('titulo-form-cliente').textContent = 'Editar cliente';
    const valores = {
        'cliente-nome': cliente.nome,
        'cliente-cpf': formatarCpf(cliente.cpf),
        'cliente-whatsapp': cliente.whatsapp || cliente.telefone,
        'cliente-email': cliente.email,
        'cliente-nascimento': cliente.nascimento,
        'cliente-cidade': cliente.cidade,
        'cliente-endereco': cliente.endereco,
        'cliente-observacoes': cliente.observacoes
    };
    Object.entries(valores).forEach(([idCampo, valor]) => { document.getElementById(idCampo).value = valor || ''; });
    mostrarFormCliente();
    document.getElementById('form-cliente').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function excluirCliente(id) {
    const cliente = clientesFiado.find(item => item.id === id);
    if (!cliente) return;
    if (comprasDoCliente(id).length || pagamentosDoCliente(id).length) {
        mostrarMensagem('Este cliente possui histórico e não pode ser excluído. Você ainda pode editar os dados.', 'erro');
        return;
    }
    if (!confirm(`Excluir o cadastro de ${cliente.nome}?`)) return;
    clientesFiado = clientesFiado.filter(item => item.id !== id);
    salvarDados();
    atualizarClientes();
    document.getElementById('historico-cliente').classList.add('hidden');
}

function atualizarSelectClientes() {
    const select = document.getElementById('cliente-venda');
    if (!select) return;
    const atual = select.value;
    const opcoes = [...clientesFiado].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .map(cliente => `<option value="${escaparDado(cliente.id)}">${escaparDado(cliente.nome)}${cliente.cpf ? ` · ${formatarCpf(cliente.cpf)}` : ''}</option>`).join('');
    select.innerHTML = '<option value="">Consumidor não identificado</option>' + opcoes;
    if (clientesFiado.some(cliente => cliente.id === atual)) select.value = atual;
}

function atualizarClienteVendaSelecionado() {
    const cliente = clientesFiado.find(item => item.id === document.getElementById('cliente-venda')?.value);
    const info = document.getElementById('fiado-info');
    if (info) {
        info.innerHTML = cliente
            ? `<strong>${escaparDado(cliente.nome)}</strong> · Saldo fiado atual: ${moedaBR(saldoClienteFiado(cliente.id))}`
            : 'Selecione acima o cliente desta venda.';
    }
    salvarRascunhoVenda();
}

function atualizarClientes() {
    if (!document.getElementById('lista-clientes')) return;
    const migrou = normalizarClientesLegados();
    if (migrou && window.usuarioPdv) salvarDados();
    atualizarSelectClientes();
    const busca = (document.getElementById('busca-clientes').value || '').trim().toLocaleLowerCase('pt-BR');
    const buscaNumerica = somenteDigitos(busca);
    const filtrados = [...clientesFiado]
        .filter(cliente => [cliente.nome, cliente.cpf, cliente.whatsapp, cliente.telefone, cliente.email].some(valor => {
            const texto = String(valor || '').toLocaleLowerCase('pt-BR');
            return texto.includes(busca) || (buscaNumerica && somenteDigitos(texto).includes(buscaNumerica));
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    document.getElementById('total-clientes').textContent = `${filtrados.length} de ${clientesFiado.length} cliente(s)`;
    document.getElementById('lista-clientes').innerHTML = filtrados.map(cliente => {
        const compras = comprasDoCliente(cliente.id).sort((a, b) => new Date(b.data) - new Date(a.data));
        const saldo = saldoClienteFiado(cliente.id);
        const contato = [cliente.whatsapp || cliente.telefone, cliente.email].filter(Boolean).map(escaparDado).join(' · ') || 'Contato não informado';
        return `<article class="rounded-xl border border-slate-200 bg-gray-50 p-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0"><h3 class="text-lg font-bold">${escaparDado(cliente.nome)}</h3><p class="text-sm text-gray-600">${contato}</p><p class="mt-1 text-xs text-gray-500">${cliente.cpf ? `CPF ${formatarCpf(cliente.cpf)}` : 'CPF não informado'}${cliente.cidade ? ` · ${escaparDado(cliente.cidade)}` : ''}</p></div>
                <div class="sm:text-right"><p class="text-sm text-gray-600">${compras.length} compra(s)</p><p class="font-bold ${saldo > 0 ? 'text-amber-700' : 'text-emerald-700'}">Fiado: ${moedaBR(saldo)}</p></div>
            </div>
            <div class="mt-4 flex flex-wrap gap-2"><button onclick="abrirHistoricoCliente('${escaparDado(cliente.id)}')" class="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">Ver histórico</button>${saldo > 0 ? `<button onclick="registrarPagamentoFiado('${escaparDado(cliente.id)}')" class="rounded-lg bg-green-600 px-3 py-2 text-sm text-white">Receber fiado</button><button onclick="gerarExtratoFiado('${escaparDado(cliente.id)}')" class="rounded-lg bg-amber-600 px-3 py-2 text-sm text-white">Extrato PDF</button>` : ''}<button onclick="editarCliente('${escaparDado(cliente.id)}')" class="rounded-lg bg-slate-600 px-3 py-2 text-sm text-white">Editar</button><button onclick="excluirCliente('${escaparDado(cliente.id)}')" class="rounded-lg bg-red-600 px-3 py-2 text-sm text-white">Excluir</button></div>
        </article>`;
    }).join('') || '<p class="rounded-xl border border-dashed p-6 text-center text-gray-500 lg:col-span-2">Nenhum cliente encontrado.</p>';
}

function abrirHistoricoCliente(clienteId) {
    const cliente = clientesFiado.find(item => item.id === clienteId);
    if (!cliente) return;
    const compras = comprasDoCliente(clienteId).sort((a, b) => new Date(b.data) - new Date(a.data));
    const pagamentos = pagamentosDoCliente(clienteId).sort((a, b) => new Date(b.data) - new Date(a.data));
    const totalCompras = compras.reduce((total, venda) => total + Number(venda.total || 0), 0);
    const container = document.getElementById('historico-cliente');
    const comprasHtml = compras.map(venda => {
        const fiado = venda.pagamento?.tipo === 'fiado';
        const itens = (venda.itens || []).map(item => `${Number(item.quantidade || 0).toLocaleString('pt-BR')}x ${escaparDado(item.nome)}`).join(', ');
        return `<article class="rounded-lg border border-slate-200 p-3"><div class="flex flex-wrap items-start justify-between gap-2"><div><strong>${new Date(venda.data).toLocaleString('pt-BR')}</strong><p class="mt-1 text-sm text-gray-600">${itens || 'Itens não informados'}</p><p class="mt-1 text-xs font-semibold uppercase text-slate-500">${fiado ? 'Compra fiado' : `Pago em ${escaparDado(venda.pagamento?.tipo || 'não informado')}`}</p></div><strong class="${fiado ? 'text-amber-700' : 'text-emerald-700'}">${moedaBR(venda.total)}</strong></div></article>`;
    }).join('') || '<p class="text-sm text-gray-500">Este cliente ainda não possui compras registradas.</p>';
    const pagamentosHtml = pagamentos.map(pagamento => `<li class="flex justify-between gap-3 border-b py-2 text-sm"><span>${new Date(pagamento.data).toLocaleString('pt-BR')}</span><strong class="text-emerald-700">${moedaBR(pagamento.valor)}</strong></li>`).join('') || '<li class="text-sm text-gray-500">Nenhum pagamento de fiado registrado.</li>';
    container.innerHTML = `<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p class="text-sm font-semibold uppercase tracking-wide text-blue-700">Histórico do cliente</p><h3 class="text-2xl font-bold">${escaparDado(cliente.nome)}</h3><p class="text-sm text-gray-600">${[cliente.whatsapp || cliente.telefone, cliente.email, cliente.cpf ? `CPF ${formatarCpf(cliente.cpf)}` : ''].filter(Boolean).map(escaparDado).join(' · ')}</p></div><button onclick="fecharHistoricoCliente()" class="self-start rounded-lg border px-3 py-2 text-sm">Fechar</button></div>
        <div class="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><div class="rounded-lg bg-blue-50 p-3"><span class="text-sm text-blue-800">Compras</span><strong class="block text-lg text-blue-700">${compras.length}</strong></div><div class="rounded-lg bg-emerald-50 p-3"><span class="text-sm text-emerald-800">Total comprado</span><strong class="block text-lg text-emerald-700">${moedaBR(totalCompras)}</strong></div><div class="rounded-lg bg-teal-50 p-3"><span class="text-sm text-teal-800">Total pago</span><strong class="block text-lg text-teal-700">${moedaBR(totalPagoPeloCliente(clienteId))}</strong></div><div class="rounded-lg bg-amber-50 p-3"><span class="text-sm text-amber-800">Saldo fiado</span><strong class="block text-lg text-amber-700">${moedaBR(saldoClienteFiado(clienteId))}</strong></div></div>
        <div class="mt-5 grid gap-5 lg:grid-cols-[1.4fr_.6fr]"><div><h4 class="mb-3 font-semibold">Compras</h4><div class="space-y-2">${comprasHtml}</div></div><div><h4 class="mb-3 font-semibold">Pagamentos de fiado</h4><ul>${pagamentosHtml}</ul></div></div>`;
    container.classList.remove('hidden');
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fecharHistoricoCliente() {
    document.getElementById('historico-cliente').classList.add('hidden');
}

function categoriasDoTipo(tipo) {
    return tipo === 'despesa' ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA;
}

function preencherCategorias(select, tipo, valorAtual = '') {
    if (!select) return;
    select.innerHTML = categoriasDoTipo(tipo).map(categoria => `<option value="${escaparDado(categoria)}">${escaparDado(categoria)}</option>`).join('');
    if (categoriasDoTipo(tipo).includes(valorAtual)) select.value = valorAtual;
}

function atualizarCamposMovimento() {
    const tipo = document.getElementById('movimento-tipo')?.value || 'entrada';
    const finalidade = document.getElementById('movimento-finalidade')?.value || 'sangria';
    document.getElementById('campo-finalidade-movimento')?.classList.toggle('hidden', tipo !== 'saida');
    document.getElementById('campo-categoria-despesa')?.classList.toggle('hidden', tipo !== 'saida' || finalidade !== 'despesa');
    preencherCategorias(document.getElementById('movimento-categoria'), 'despesa', document.getElementById('movimento-categoria')?.value);
}

function atualizarCamposEdicaoMovimento() {
    const tipo = document.getElementById('edit-movimento-tipo')?.value || 'entrada';
    const finalidade = document.getElementById('edit-movimento-finalidade')?.value || 'sangria';
    document.getElementById('edit-campo-finalidade-movimento')?.classList.toggle('hidden', tipo !== 'saida');
    document.getElementById('edit-campo-categoria-despesa')?.classList.toggle('hidden', tipo !== 'saida' || finalidade !== 'despesa');
    preencherCategorias(document.getElementById('edit-movimento-categoria'), 'despesa', document.getElementById('edit-movimento-categoria')?.value);
}

function periodoFinanceiroAtual() {
    const agora = new Date();
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
}

function clienteDaVenda(venda) {
    return clientesFiado.find(cliente => cliente.id === (venda.clienteId || venda.pagamento?.clienteId));
}

function todosLancamentosFinanceiros() {
    const pagamentosDisponiveis = new Map();
    pagamentosFiado.forEach(pagamento => pagamentosDisponiveis.set(pagamento.clienteId, (pagamentosDisponiveis.get(pagamento.clienteId) || 0) + Number(pagamento.valor || 0)));
    const saldoPendentePorVenda = new Map();
    vendas.filter(venda => venda.pagamento?.tipo === 'fiado').sort((a, b) => new Date(a.data) - new Date(b.data)).forEach(venda => {
        const clienteId = venda.clienteId || venda.pagamento?.clienteId;
        const disponivel = pagamentosDisponiveis.get(clienteId) || 0;
        const totalVenda = Number(venda.total || 0);
        const abatido = Math.min(disponivel, totalVenda);
        saldoPendentePorVenda.set(venda.id, Math.max(0, totalVenda - abatido));
        pagamentosDisponiveis.set(clienteId, Math.max(0, disponivel - abatido));
    });
    const vendasAutomaticas = vendas.flatMap(venda => {
        const fiado = venda.pagamento?.tipo === 'fiado';
        const cliente = clienteDaVenda(venda);
        const valor = fiado ? saldoPendentePorVenda.get(venda.id) || 0 : Number(venda.total || 0);
        if (fiado && valor <= 0) return [];
        return [{ id: `venda_${venda.id}`, data: venda.data, tipo: 'receita', categoria: 'Venda', valor, descricao: `${fiado ? 'Saldo fiado' : 'Venda'} #${venda.id}${cliente ? ` · ${cliente.nome}` : ''}`, origem: 'venda', automatico: true, pendente: fiado }];
    });
    const recebimentos = pagamentosFiado.map(pagamento => {
        const cliente = clientesFiado.find(item => item.id === pagamento.clienteId);
        return { id: `fiado_${pagamento.id}`, data: pagamento.data, tipo: 'receita', categoria: 'Venda', valor: Number(pagamento.valor || 0), descricao: `Recebimento de fiado${cliente ? ` · ${cliente.nome}` : ''}`, origem: 'recebimento', automatico: true };
    });
    const despesasCaixa = movimentos.filter(movimento => movimento.tipo === 'saida' && movimento.finalidade === 'despesa')
        .map(movimento => ({ id: `caixa_${movimento.id}`, data: movimento.data, tipo: 'despesa', categoria: movimento.categoriaFinanceira || 'Outros', valor: Number(movimento.valor || 0), descricao: movimento.descricao, origem: 'caixa', automatico: true }));
    const manuais = lancamentosFinanceiros.map(lancamento => ({ ...lancamento, automatico: false, origem: 'manual' }));
    return [...vendasAutomaticas, ...recebimentos, ...despesasCaixa, ...manuais];
}

function mostrarFormFinanceiro(tipo) {
    if (!exigirTitular('O controle financeiro está disponível somente para o titular.')) return;
    document.getElementById('form-financeiro').classList.remove('hidden');
    document.getElementById('financeiro-tipo').value = tipo;
    document.getElementById('financeiro-data').value = dataLocalISO();
    document.getElementById('titulo-form-financeiro').textContent = tipo === 'receita' ? 'Adicionar receita' : 'Adicionar despesa';
    atualizarCategoriasFinanceiro();
    document.getElementById('financeiro-descricao').focus();
}

function atualizarCategoriasFinanceiro() {
    const tipo = document.getElementById('financeiro-tipo')?.value || 'receita';
    preencherCategorias(document.getElementById('financeiro-categoria'), tipo, document.getElementById('financeiro-categoria')?.value);
    document.getElementById('titulo-form-financeiro').textContent = tipo === 'receita' ? 'Adicionar receita' : 'Adicionar despesa';
}

function cancelarFormFinanceiro() {
    document.getElementById('form-financeiro').classList.add('hidden');
    ['financeiro-descricao', 'financeiro-valor'].forEach(id => { document.getElementById(id).value = ''; });
}

function salvarLancamentoFinanceiro() {
    if (!exigirTitular('O controle financeiro está disponível somente para o titular.')) return;
    const tipo = document.getElementById('financeiro-tipo').value;
    const categoria = document.getElementById('financeiro-categoria').value;
    const descricao = document.getElementById('financeiro-descricao').value.trim();
    const valor = Number(document.getElementById('financeiro-valor').value);
    const data = document.getElementById('financeiro-data').value;
    if (!descricao || !valor || valor <= 0 || !data) return mostrarMensagem('Preencha descrição, valor e data do lançamento.', 'erro');
    lancamentosFinanceiros.push({ id: 'lf_' + Date.now(), tipo, categoria, descricao, valor, data: `${data}T12:00:00`, criadoEm: new Date().toISOString() });
    salvarDados();
    window.salvarFinanceiro?.();
    cancelarFormFinanceiro();
    atualizarFinanceiro();
    mostrarMensagem(tipo === 'receita' ? 'Receita adicionada.' : 'Despesa adicionada.', 'sucesso');
}

function excluirLancamentoFinanceiro(id) {
    if (!exigirTitular('O controle financeiro está disponível somente para o titular.')) return;
    const lancamento = lancamentosFinanceiros.find(item => item.id === id);
    if (!lancamento || !confirm(`Excluir o lançamento “${lancamento.descricao}”?`)) return;
    lancamentosFinanceiros = lancamentosFinanceiros.filter(item => item.id !== id);
    salvarDados();
    window.salvarFinanceiro?.();
    atualizarFinanceiro();
}

function atualizarFinanceiro() {
    if (!document.getElementById('financeiro-section') || ehOperadorAtual()) return;
    const campoPeriodo = document.getElementById('financeiro-periodo');
    if (!campoPeriodo.value) campoPeriodo.value = periodoFinanceiroAtual();
    const periodo = campoPeriodo.value;
    const lancamentos = todosLancamentosFinanceiros().filter(item => periodoDaData(item.data) === periodo).sort((a, b) => new Date(b.data) - new Date(a.data));
    const realizados = lancamentos.filter(item => !item.pendente);
    const receitas = realizados.filter(item => item.tipo === 'receita').reduce((total, item) => total + item.valor, 0);
    const despesas = realizados.filter(item => item.tipo === 'despesa').reduce((total, item) => total + item.valor, 0);
    const resultado = receitas - despesas;
    const aReceber = clientesFiado.reduce((total, cliente) => total + saldoClienteFiado(cliente.id), 0);
    document.getElementById('financeiro-receitas').textContent = moedaBR(receitas);
    document.getElementById('financeiro-despesas').textContent = moedaBR(despesas);
    const campoResultado = document.getElementById('financeiro-resultado');
    campoResultado.textContent = moedaBR(resultado);
    campoResultado.className = `mt-1 block text-xl ${resultado >= 0 ? 'text-emerald-300' : 'text-rose-300'}`;
    document.getElementById('financeiro-a-receber').textContent = moedaBR(aReceber);

    const rotulosOrigem = { venda: 'Venda automática', recebimento: 'Fiado recebido', caixa: 'Despesa do caixa', manual: 'Lançamento manual' };
    document.getElementById('lista-financeiro').innerHTML = lancamentos.map(item => `<article class="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><strong>${escaparDado(item.descricao)}</strong>${item.pendente ? '<span class="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">A receber</span>' : ''}</div><p class="text-xs text-gray-500">${new Date(item.data).toLocaleDateString('pt-BR')} · ${escaparDado(item.categoria)} · ${rotulosOrigem[item.origem] || 'Lançamento'}</p></div><div class="flex items-center justify-between gap-3 sm:justify-end"><strong class="${item.tipo === 'receita' ? item.pendente ? 'text-amber-700' : 'text-emerald-700' : 'text-rose-700'}">${item.tipo === 'despesa' ? '-' : '+'}${moedaBR(item.valor)}</strong>${!item.automatico ? `<button onclick="excluirLancamentoFinanceiro('${escaparDado(item.id)}')" class="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">Excluir</button>` : ''}</div></article>`).join('') || '<p class="rounded-lg border border-dashed p-6 text-center text-gray-500">Nenhum lançamento neste período.</p>';

    const totaisCategoria = new Map();
    realizados.forEach(item => {
        const chave = `${item.tipo}|${item.categoria}`;
        totaisCategoria.set(chave, (totaisCategoria.get(chave) || 0) + item.valor);
    });
    const maior = Math.max(1, ...totaisCategoria.values());
    document.getElementById('resumo-categorias-financeiro').innerHTML = [...totaisCategoria.entries()].sort((a, b) => b[1] - a[1]).map(([chave, valor]) => {
        const [tipo, categoria] = chave.split('|');
        const cor = tipo === 'receita' ? 'bg-emerald-500' : 'bg-rose-500';
        return `<div><div class="mb-1 flex justify-between gap-3 text-sm"><span>${escaparDado(categoria)}</span><strong>${moedaBR(valor)}</strong></div><div class="h-2 overflow-hidden rounded-full bg-slate-100"><div class="h-full ${cor}" style="width:${Math.max(4, valor / maior * 100).toFixed(1)}%"></div></div></div>`;
    }).join('') || '<p class="text-sm text-gray-500">Sem valores realizados no período.</p>';
}

window.atualizarSelectClientesFiado = atualizarSelectClientes;
window.atualizarClientesFiado = atualizarClientes;
window.mostrarFormCliente = mostrarFormCliente;
window.cancelarCliente = cancelarCliente;
window.salvarCliente = salvarCliente;
window.editarCliente = editarCliente;
window.excluirCliente = excluirCliente;
window.atualizarSelectClientes = atualizarSelectClientes;
window.atualizarClienteVendaSelecionado = atualizarClienteVendaSelecionado;
window.atualizarClientes = atualizarClientes;
window.abrirHistoricoCliente = abrirHistoricoCliente;
window.fecharHistoricoCliente = fecharHistoricoCliente;
window.atualizarCamposMovimento = atualizarCamposMovimento;
window.atualizarCamposEdicaoMovimento = atualizarCamposEdicaoMovimento;
window.mostrarFormFinanceiro = mostrarFormFinanceiro;
window.atualizarCategoriasFinanceiro = atualizarCategoriasFinanceiro;
window.cancelarFormFinanceiro = cancelarFormFinanceiro;
window.salvarLancamentoFinanceiro = salvarLancamentoFinanceiro;
window.excluirLancamentoFinanceiro = excluirLancamentoFinanceiro;
window.atualizarFinanceiro = atualizarFinanceiro;
