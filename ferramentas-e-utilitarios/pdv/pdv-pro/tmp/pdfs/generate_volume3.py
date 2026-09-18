from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether
)

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output" / "pdf" / "101-roteiros-reels-pdv-pro-volume-3.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

FONT_DIR = Path(r"C:\Windows\Fonts")
pdfmetrics.registerFont(TTFont("Arial", str(FONT_DIR / "arial.ttf")))
pdfmetrics.registerFont(TTFont("Arial-Bold", str(FONT_DIR / "arialbd.ttf")))

NAVY = colors.HexColor("#0F172A")
TEAL = colors.HexColor("#0F766E")
TEAL_DARK = colors.HexColor("#115E59")
CYAN = colors.HexColor("#0891B2")
BLUE = colors.HexColor("#1D4ED8")
AMBER = colors.HexColor("#D97706")
VIOLET = colors.HexColor("#7C3AED")
RED = colors.HexColor("#BE123C")
GREEN = colors.HexColor("#15803D")
SLATE = colors.HexColor("#475569")
LIGHT = colors.HexColor("#F8FAFC")
BORDER = colors.HexColor("#CBD5E1")

# secao, titulo, gancho, cena 1, cena 2, dor, solucao, gatilhos, palavra-chave
RAW = [
    ("Desconto com regra", "O desconto que parecia pequeno", "Quanto custa dar dois reais de desconto cem vezes sem perceber?", "Coloque cem moedas desenhadas numa folha e risque duas de cada grupo.", "No PDV, alterne o desconto de porcentagem para valor e mostre o equivalente percentual.", "Descontos pequenos e repetidos somem no movimento do balcão, mas aparecem no resultado do mês.", "O PDV aceita desconto em reais ou porcentagem e sempre revela o impacto nas duas formas.", "curiosidade, efeito acumulado, clareza", "DESCONTO"),
    ("Desconto com regra", "O sexto por cento", "Por que 6% pode ser mais importante que 20% dentro de uma loja?", "Escreva 5% e 6% em dois cartões e aproxime a câmera.", "Simule um operador tentando ultrapassar o limite e mostre a solicitação da senha do titular.", "Sem um limite objetivo, cada atendente cria sua própria política de desconto.", "O operador concede até 5%; acima disso, a decisão volta para o titular.", "quebra de padrão, autoridade, prevenção", "LIMITE"),
    ("Desconto com regra", "A autonomia de 12%", "Gerente precisa de autonomia, mas não de uma chave sem limite.", "Mostre uma loja movimentada e alguém chamando o dono para cada decisão.", "Aplique 12% como gerente e mostre a confirmação com a própria senha.", "Quando toda exceção depende do proprietário, a fila cresce e a gestão vira gargalo.", "O gerente pode autorizar de 5% até 20% com sua senha, mantendo responsabilidade individual.", "identificação, autonomia controlada, alívio", "GERENTE"),
    ("Desconto com regra", "A fronteira dos 20%", "Existe um ponto em que desconto deixa de ser atendimento e vira decisão do dono.", "Empilhe etiquetas de 5%, 10%, 20% e 25% sobre um produto.", "No PDV, tente 21% com perfil de gerente e destaque a senha do titular.", "Um desconto alto pode consumir margem, comissão e até o custo do produto.", "Acima de 20%, somente o titular autoriza, mesmo quando a venda está com o gerente.", "risco evitado, exclusividade, segurança", "MARGEM"),
    ("Desconto com regra", "Dois reais viram quantos por cento?", "Você sabe de cabeça quanto R$ 2 representam numa venda de R$ 13,70?", "Faça a conta errada de propósito numa calculadora e apague.", "Digite R$ 2 no desconto por valor e mostre a porcentagem calculada automaticamente.", "No balcão, converter valor em porcentagem de cabeça atrasa e aumenta a chance de erro.", "O PDV faz a conversão e registra valor e percentual no comprovante.", "desafio, prova visual, facilidade", "CONVERSAO"),
    ("Desconto com regra", "O orçamento que voltou diferente", "O cliente voltou com o orçamento e o desconto não era o que você lembrava.", "Mostre dois papéis parecidos com valores finais diferentes.", "Abra um orçamento salvo e aproxime a câmera do valor e da porcentagem do desconto.", "Condições combinadas sem registro viram discussão quando o cliente retorna dias depois.", "O orçamento guarda o desconto informado, seu equivalente e o total final.", "memória falha, transparência, confiança", "ORCAMENTO"),
    ("Desconto com regra", "A notinha que evita constrangimento", "Uma linha no comprovante pode evitar uma conversa desconfortável.", "Encene um cliente perguntando onde entrou o desconto prometido.", "Mostre no comprovante o valor descontado e a porcentagem equivalente.", "Quando o benefício não aparece, o cliente pode achar que a promessa não foi cumprida.", "O comprovante deixa explícito quanto foi retirado e qual percentual isso representa.", "prova, confiança, redução de conflito", "COMPROVANTE"),
    ("Desconto com regra", "Preço baixo ou desconto alto?", "Essas duas vendas terminam no mesmo total, mas contam histórias diferentes.", "Mostre duas etiquetas: preço alterado e desconto registrado.", "No PDV, mantenha o preço e aplique desconto visível.", "Alterar o preço para improvisar uma condição especial apaga a referência real do produto.", "Registrar o desconto preserva o preço cadastrado e documenta a exceção.", "comparação, organização, rastreabilidade", "PRECO"),
    ("Desconto com regra", "Delegar sem ficar no escuro", "O medo não é dar acesso à equipe; é não saber até onde esse acesso vai.", "Mostre uma chave grande passando de mão em mão e faça sinal de alerta.", "Exiba os limites diferentes para operador, gerente e titular.", "Muitos donos centralizam tudo porque as ferramentas não separam responsabilidade.", "O PDV divide a autonomia por função e pede a senha certa quando o limite muda.", "segurança, controle, tranquilidade", "DELEGAR"),
    ("Desconto com regra", "A senha certa no momento certo", "Senha compartilhada não é controle: é só um segredo que todo mundo conhece.", "Mostre um papel com uma senha e várias mãos tentando pegá-lo.", "Demonstre gerente usando a própria senha e, acima do limite, a senha do titular.", "Quando todos usam a mesma autorização, fica impossível responsabilizar cada decisão.", "O sistema diferencia a senha do funcionário da autorização exclusiva do proprietário.", "responsabilidade, segurança, bastidor", "SENHA"),

    ("Pagamento dividido", "A compra que não cabia em um cartão", "Você perderia a venda porque faltaram R$ 18 no limite do cartão?", "Encene o aviso de limite insuficiente no celular do cliente.", "Divida a compra entre cartão e PIX no PDV.", "O cliente pode ter dinheiro, mas não concentrado numa única forma de pagamento.", "A venda aceita duas formas e registra exatamente quanto entrou em cada uma.", "objeção real, recuperação de venda, praticidade", "DIVIDIR"),
    ("Pagamento dividido", "Dinheiro no bolso, PIX no celular", "Metade estava no bolso e metade no banco. Isso não deveria virar duas vendas.", "Coloque uma nota de um lado e um celular do outro.", "Selecione dinheiro e PIX e informe os dois valores.", "Separar a mesma compra em duas vendas bagunça caixa, estoque e comprovante.", "O pagamento dividido mantém tudo em uma única venda e baixa o estoque uma vez.", "simplicidade, organização, prova", "PIX"),
    ("Pagamento dividido", "Fiado só no que faltou", "O cliente não precisa fiar a compra inteira porque faltaram vinte reais.", "Mostre uma compra de R$ 120 e destaque apenas R$ 20.", "Divida entre PIX e fiado, vinculando a parte pendente ao cliente.", "Sem divisão, o comerciante registra dívida maior que a real ou perde a venda.", "O PDV separa o valor pago agora da parte que realmente ficou fiada.", "justiça, precisão, confiança", "FIADO"),
    ("Pagamento dividido", "Troco menor sem procurar moedas", "E se o cliente pagar uma parte no PIX só para facilitar o troco?", "Mostre a gaveta sem moedas e uma fila esperando.", "Divida a venda entre PIX e dinheiro e mostre o troco calculado sobre a parte em espécie.", "Falta de troco cria demora e pode transformar uma compra simples em frustração.", "O sistema calcula cada parte e considera o recebido em dinheiro corretamente.", "alívio imediato, agilidade, utilidade", "TROCO"),
    ("Pagamento dividido", "Um comprovante, duas respostas", "O cliente perguntou quanto passou no cartão e quanto saiu no PIX.", "Encene a dúvida olhando dois aplicativos bancários.", "Abra o comprovante com as duas formas e seus valores.", "Sem detalhamento, cliente e loja precisam reconstruir a conta depois.", "A notinha mostra cada pagamento separadamente dentro da mesma venda.", "transparência, prova, tranquilidade", "NOTINHA"),
    ("Pagamento dividido", "O caixa precisa entender a mistura", "Pagamento misto não pode virar um valor sem origem no fechamento.", "Desenhe duas setas entrando na mesma venda.", "Finalize uma venda dividida e mostre dinheiro, PIX e cartão no resumo do caixa.", "Misturar recebimentos sem separar a origem dificulta conferir o fechamento.", "O PDV distribui os valores por forma e mantém o total da venda íntegro.", "controle, bastidor, precisão", "CAIXA"),
    ("Pagamento dividido", "O cliente mudou de ideia no último segundo", "Tudo pronto e ele decidiu trocar metade do pagamento. Você recomeça?", "Encene o cliente guardando o cartão e pegando o celular.", "Abra a divisão, troque as formas e ajuste os valores sem perder o carrinho.", "Mudanças no pagamento durante a fila costumam gerar cancelamento e retrabalho.", "O operador ajusta somente o pagamento e mantém itens, cliente e desconto.", "tensão, solução rápida, fluidez", "AJUSTE"),
    ("Pagamento dividido", "A conta precisa fechar até nos centavos", "R$ 39,90 dividido não pode terminar em R$ 39,89.", "Aproxime a câmera de moedas de um centavo.", "Informe os valores das duas formas e mostre a conferência do total.", "Diferenças pequenas se repetem e viram divergência no caixa.", "O PDV valida a soma das partes antes de permitir a finalização.", "detalhe surpreendente, precisão, prevenção", "CENTAVOS"),
    ("Pagamento dividido", "Por que não fazer duas vendas?", "Duas vendas para uma compra parecem solução até você olhar o estoque.", "Rasgue simbolicamente uma lista de produtos em duas partes.", "Mostre uma única venda com duas formas de pagamento.", "Duplicar o processo cria dois comprovantes, duas baixas e um histórico fragmentado.", "A divisão de pagamento resolve a origem do dinheiro sem quebrar a compra.", "comparação, consequência, simplificação", "UMA_VENDA"),
    ("Pagamento dividido", "Os últimos trinta segundos da fila", "A fila não trava na escolha dos produtos; trava quando chega a hora de pagar.", "Filme três pessoas esperando enquanto o cliente procura opções.", "Use os atalhos para abrir pagamento dividido e concluir.", "Quando a tela exige muitos passos, a indecisão do pagamento se multiplica.", "Formas visíveis, divisão em dois meios e atalhos encurtam o fechamento.", "urgência, identificação, velocidade", "FILA"),

    ("Venda suspensa e atalhos", "Ele esqueceu a carteira", "O cliente vai buscar a carteira. E a fila atrás dele?", "Pare uma sacola no balcão e mostre outras pessoas esperando.", "Clique em Suspender venda, dê um nome e comece outro atendimento.", "Finalizar sem receber ou apagar o carrinho são duas escolhas ruins.", "A venda fica guardada com itens, desconto, cliente e pagamento para continuar depois.", "situação cotidiana, alívio, continuidade", "SUSPENDER"),
    ("Venda suspensa e atalhos", "Cartão recusado não é venda perdida", "A maquininha recusou, mas o cliente prometeu voltar em dez minutos.", "Mostre a mensagem de cartão recusado sem expor dados reais.", "Suspenda o carrinho e depois retome pelo painel de vendas suspensas.", "Repassar todos os produtos quando o cliente volta consome tempo e paciência.", "O PDV conserva o atendimento exatamente no ponto em que parou.", "esperança, recuperação, conveniência", "RETOMAR"),
    ("Venda suspensa e atalhos", "O celular morreu antes do PIX", "Bateria em 1% pode parar uma fila inteira.", "Mostre um celular desligando na hora do pagamento.", "Guarde a venda e abra uma nova enquanto o cliente carrega o aparelho.", "Uma falha fora da loja não deveria obrigar o operador a perder o trabalho feito.", "Suspender permite seguir atendendo sem cobrar antes da confirmação.", "curiosidade, empatia, produtividade", "BATERIA"),
    ("Venda suspensa e atalhos", "Tudo voltou como estava", "O teste de uma venda suspensa é simples: nada pode voltar faltando.", "Antes de suspender, mostre item, quantidade, cliente e desconto.", "Retome e compare cada campo lado a lado.", "Se o carrinho volta incompleto, a equipe precisa conferir tudo novamente.", "O PDV restaura os dados principais do atendimento e permite finalizar normalmente.", "prova visual, segurança, consistência", "CARRINHO"),
    ("Venda suspensa e atalhos", "Três clientes, três esperas diferentes", "Uma encomenda, um cartão recusado e um cliente escolhendo: qual carrinho é qual?", "Use três etiquetas com nomes fictícios sobre o balcão.", "Abra a lista de suspensas com referências diferentes.", "Guardar vários atendimentos sem identificação cria um novo tipo de confusão.", "Cada venda suspensa recebe nome, horário e responsável para ser localizada.", "organização, cenário extremo, clareza", "REFERENCIA"),
    ("Venda suspensa e atalhos", "O atalho que não invade o código de barras", "Atalho rápido é bom; atalho que escreve no campo de busca é um problema.", "Digite um código de barras e mostre que números simples continuam livres.", "Use Alt + 6 para dinheiro e destaque que são duas teclas.", "Teclas únicas podem atrapalhar nomes, códigos e quantidades durante a venda.", "Os atalhos usam Alt mais número para acelerar sem misturar comando com digitação.", "bastidor, prevenção, inteligência", "ATALHO"),
    ("Venda suspensa e atalhos", "Cinco telas sem procurar botão", "Quanto tempo sua equipe perde só procurando onde clicar?", "Faça um cronômetro enquanto navega pelo menu com o mouse.", "Repita usando Alt + 1 até Alt + 5.", "Em horário de pico, pequenos movimentos repetidos aumentam o tempo de cada atendimento.", "Os atalhos abrem Vendas, Orçamentos, Produtos, Clientes e Caixa.", "desafio, ganho de tempo, demonstração", "TECLAS"),
    ("Venda suspensa e atalhos", "Treinamento escondido no próprio sistema", "Funcionário novo não deveria depender de um papel colado na parede.", "Mostre um papel antigo com instruções rasuradas.", "Abra Informações e passe pelos atalhos e orientações.", "Quando a explicação fica fora do sistema, ela some ou fica desatualizada.", "O botão Informações reúne os comandos e cuidados básicos no próprio PDV.", "descoberta, onboarding, autonomia", "INFORMACOES"),
    ("Venda suspensa e atalhos", "Código de barras sem susto", "O operador apertou um número e a tela mudou. Isso já aconteceu por aí?", "Encene a digitação de um código longo no campo de busca.", "Mostre que a navegação exige Alt e que a leitura continua normalmente.", "Atalhos mal escolhidos competem com o trabalho principal do caixa.", "A combinação de duas teclas preserva a busca, o leitor e os campos de texto.", "medo real, correção, confiança", "CODIGO"),
    ("Venda suspensa e atalhos", "O primeiro turno do funcionário", "Qual tela você ensinaria primeiro para alguém que começa hoje?", "Mostre um crachá fictício de primeiro dia.", "Abra Informações, pratique três atalhos e suspenda uma venda teste.", "Treinamento improvisado deixa dúvidas justamente no horário de maior movimento.", "A ajuda interna e os atalhos criam uma sequência simples para aprender a operação.", "acolhimento, simplicidade, competência", "TREINAMENTO"),

    ("Gerência com limites", "O dono saiu por duas horas", "A loja precisa parar quando o proprietário vai ao banco?", "Mostre uma cadeira vazia com a placa Titular.", "Entre como gerente e abra Produtos, Caixa e Relatórios.", "Sem uma função intermediária, a equipe ou fica travada ou recebe acesso demais.", "O perfil gerente mantém a operação funcionando sem abrir Financeiro e ADM.", "continuidade, equilíbrio, confiança", "PERFIL"),
    ("Gerência com limites", "Sangria sem telefonema", "A gaveta encheu. O gerente precisa ligar para o dono só para guardar o dinheiro?", "Mostre notas fictícias acumuladas na gaveta.", "Registre uma retirada com a senha do gerente.", "Esperar autorização remota para toda movimentação expõe dinheiro e atrasa a rotina.", "O gerente confirma a movimentação de caixa com a própria senha.", "segurança física, autonomia, rapidez", "SANGRIA"),
    ("Gerência com limites", "Estoque corrigido antes da próxima venda", "O saldo está errado e o dono só volta à noite. O anúncio continua vendendo?", "Mostre uma prateleira vazia e um número alto na tela.", "Com perfil gerente, abra Produtos e ajuste o cadastro protegido por senha.", "Estoque incorreto afeta venda, alerta e catálogo até alguém autorizado corrigir.", "O gerente pode organizar produtos e estoque sem entrar nas áreas do proprietário.", "urgência, proteção, solução", "ESTOQUE"),
    ("Gerência com limites", "Relatório sem abrir a vida financeira", "Gerenciar vendas não deveria significar enxergar toda a carteira da empresa.", "Coloque duas pastas: Operação e Financeiro.", "Mostre Relatórios visível ao gerente e Financeiro ausente do menu.", "Misturar indicadores operacionais com finanças privadas cria exposição desnecessária.", "O gerente acompanha a loja, enquanto receitas e despesas completas ficam com o titular.", "privacidade, necessidade de saber, segurança", "PRIVACIDADE"),
    ("Gerência com limites", "O botão que o gerente não vê", "Permissão boa também é aquilo que não aparece.", "Abra o menu do gerente e conte os botões visíveis.", "Compare com o menu do titular e destaque ADM, Tema e Financeiro.", "Esconder só a senha, mas deixar ações sensíveis expostas, gera tentativa e confusão.", "O PDV remove do perfil gerente as áreas administrativas exclusivas.", "curiosidade, contraste, proteção", "ADM"),
    ("Gerência com limites", "A venda grande pediu 25%", "O gerente conhece o cliente, mas 25% ainda mexe na margem do dono.", "Mostre uma etiqueta de 25% próxima do preço de custo.", "Tente o desconto e mostre a autorização do titular.", "Autonomia sem teto pode transformar uma negociação em prejuízo.", "O limite do gerente termina em 20%; acima disso, a decisão é do proprietário.", "escassez de margem, hierarquia, segurança", "VINTE"),
    ("Gerência com limites", "Movimento assinado por quem fez", "Se duas pessoas usam a mesma senha, quem realmente retirou o dinheiro?", "Mostre dois crachás e uma única senha escrita.", "Registre movimento como gerente e mostre a identificação do usuário.", "Senha compartilhada apaga a responsabilidade individual.", "O gerente usa seu próprio login e senha nas ações permitidas.", "rastreabilidade, responsabilidade, confiança", "RESPONSAVEL"),
    ("Gerência com limites", "Cinco por cento sem interromper", "O desconto mais comum não precisa chamar o dono toda hora.", "Faça cinco marcações rápidas num papel.", "Aplique 5% como operador e finalize sem popup de senha.", "Pedir autorização para condições pequenas torna o limite inútil e trava o caixa.", "Até 5%, o operador segue o atendimento; acima disso, a regra protege a margem.", "fluidez, regra simples, eficiência", "CINCO"),
    ("Gerência com limites", "Venda com nome, decisão com dono", "O sistema sabe quem vendeu, mas também precisa saber quem pode autorizar.", "Mostre o nome do vendedor numa venda fictícia.", "Compare a venda do operador com a autorização do titular para desconto maior.", "Registrar apenas a venda não resolve quando a exceção foi aprovada por outra pessoa.", "Perfis e senhas separam execução da venda e autorização sensível.", "prestação de contas, clareza, confiança", "EQUIPE"),
    ("Gerência com limites", "Acesso terminou, histórico ficou", "Excluir o acesso não pode apagar as vendas que a pessoa já fez.", "Retire um crachá de um mural, mantendo relatórios ao fundo.", "No ADM, mostre a gestão de operadores e gerentes sem apagar registros de venda.", "Quando alguém sai da equipe, a empresa precisa cortar o acesso e preservar o passado.", "O titular gerencia os acessos, enquanto as vendas continuam identificadas no histórico.", "continuidade, segurança, patrimônio de dados", "ACESSO"),

    ("Comissão e relatórios", "Comissão não é chute", "Você pagaria comissão usando memória, calculadora e conversa de WhatsApp?", "Espalhe anotações de vendas sobre uma mesa.", "Abra Calcular comissão, escolha funcionário, mês e percentual.", "Apuração manual gera dúvida tanto para o dono quanto para quem vendeu.", "O PDV soma as vendas do funcionário no período e calcula a comissão.", "justiça, precisão, transparência", "COMISSAO"),
    ("Comissão e relatórios", "O mês que já fechou", "A comissão de agosto pode ser calculada em setembro sem procurar venda por venda.", "Vire a página de um calendário do mês anterior.", "No popup, selecione o mês passado e calcule.", "Quando o cálculo só olha o mês atual, a conferência atrasada vira trabalho manual.", "O seletor de mês permite revisar períodos anteriores com a mesma regra.", "controle do passado, praticidade, alívio", "MES"),
    ("Comissão e relatórios", "Uma pessoa no meio de todas", "Como separar as vendas da Ana sem esconder o resultado da equipe inteira?", "Mostre vários nomes e circule apenas um.", "Filtre o relatório pelo operador e depois abra a comissão já direcionada.", "Somar todas as vendas e tentar separar depois aumenta erro e desconfiança.", "O filtro identifica cada vendedor e isola seus números.", "personalização, clareza, confiança", "OPERADOR"),
    ("Comissão e relatórios", "Quanto muda de 2% para 3%?", "Um ponto percentual parece pouco até você aplicar no total do mês.", "Escreva 2% e 3% ao lado do mesmo faturamento.", "Troque a porcentagem no cálculo e compare os resultados.", "Decidir política de comissão sem simular valores pode comprometer margem ou motivação.", "O percentual é editável para testar cenários sobre vendas reais do período.", "simulação, contraste, decisão", "PERCENTUAL"),
    ("Comissão e relatórios", "A conversa de comissão sem clima ruim", "Número explicado evita que uma reunião comece com desconfiança.", "Encene duas pessoas olhando cálculos diferentes.", "Mostre quantidade de vendas, total vendido e comissão na mesma tela.", "Quando cada lado chega com uma conta, a discussão começa antes da análise.", "O resumo mensal cria uma base única e verificável para a conversa.", "prova comum, justiça, tranquilidade", "JUSTO"),
    ("Comissão e relatórios", "Hoje é dia 12. O que já foi vendido?", "Você não precisa esperar o fim do mês para enxergar o desempenho.", "Marque o dia 12 num calendário.", "Escolha o mês atual no popup e mostre o acumulado.", "Sem acompanhamento parcial, metas só são discutidas quando já não há tempo de reagir.", "O cálculo usa as vendas registradas até aquele momento no mês.", "antecipação, progresso, ação", "META"),
    ("Comissão e relatórios", "Dois vendedores com o mesmo nome", "Nome parecido não pode misturar comissão.", "Mostre dois crachás com nomes semelhantes e IDs diferentes.", "Abra o filtro e destaque que cada acesso registra seu identificador.", "Depender apenas do nome escrito favorece duplicidade e erro de apuração.", "Cada conta individual acompanha suas próprias vendas.", "detalhe oculto, precisão, identidade", "LOGIN"),
    ("Comissão e relatórios", "A venda de terça às 16h", "Você consegue encontrar uma venda específica sem rolar o mês inteiro?", "Mostre uma mensagem fictícia citando dia e horário.", "Escolha a data no relatório e abra o comprovante correspondente.", "Atender uma dúvida antiga vira demora quando o histórico não aceita recorte.", "O relatório por data e vendedor reduz a busca a poucos registros.", "investigação, rapidez, prova", "DATA"),
    ("Comissão e relatórios", "Faturamento não é comissão", "Comissão sobre venda não transforma todo faturamento em dinheiro livre.", "Separe cartões escritos Faturamento, Custo e Comissão.", "Mostre o total vendido no relatório e a porcentagem aplicada separadamente.", "Misturar faturamento com resultado cria expectativa errada sobre o que pode ser pago.", "O cálculo apresenta a base de vendas e o valor de comissão como números distintos.", "educação, clareza financeira, autoridade", "FATURAMENTO"),
    ("Comissão e relatórios", "Gerente enxerga operação, titular calcula pagamento", "Quem acompanha a loja não precisa definir sozinho a comissão da equipe.", "Mostre o relatório aberto no perfil gerente e o botão de comissão no perfil titular.", "Permissões amplas demais misturam gestão diária com decisões financeiras do dono.", "O gerente consulta relatórios; o cálculo de comissão permanece exclusivo do titular.", "separação de papéis, segurança, governança", "TITULAR"),

    ("Orçamentos e clientes", "Digite três letras, evite oito campos", "Quantas vezes você cadastra o mesmo cliente porque não encontrou o nome?", "Digite apenas as três primeiras letras de um nome fictício.", "Mostre as sugestões de clientes no orçamento e selecione uma.", "Redigitar CPF, telefone e endereço gasta tempo e cria cadastros duplicados.", "A busca sugere clientes existentes e preenche os dados vinculados.", "economia de esforço, descoberta, precisão", "BUSCA"),
    ("Orçamentos e clientes", "O interessado virou cliente sem etapa extra", "O cadastro pode nascer no orçamento sem interromper a conversa.", "Mostre um cliente novo pedindo preço pelo balcão.", "Preencha o orçamento e finalize o PDF; depois localize o cadastro em Clientes.", "Obrigar a sair do orçamento para cadastrar alguém quebra o fluxo do atendimento.", "Ao finalizar, os dados do novo cliente entram automaticamente no painel.", "fluidez, surpresa útil, organização", "NOVO_CLIENTE"),
    ("Orçamentos e clientes", "O orçamento que sabe onde entregar", "Nome e preço não bastam quando a aprovação exige endereço e documento.", "Mostre uma proposta incompleta e marque os campos ausentes.", "Selecione um cliente e revele CPF/CNPJ, telefone, e-mail e endereço preenchidos.", "Dados espalhados atrasam entrega, cobrança e emissão de documentos.", "O vínculo traz as informações completas do cadastro para o orçamento.", "completude, profissionalismo, prevenção", "DADOS"),
    ("Orçamentos e clientes", "Por que duas folhas iguais?", "Uma assinatura não deveria deixar ninguém sem comprovante.", "Separe duas vias impressas: Cliente e Loja.", "Gere o PDF e percorra as duas páginas idênticas.", "Quando existe uma única via, alguém fica sem referência depois da aprovação.", "O orçamento sai em duas folhas com a mesma informação para cada parte guardar uma.", "segurança, reciprocidade, formalidade", "DUAS_VIAS"),
    ("Orçamentos e clientes", "Proposta não é venda", "O cliente pediu preço. Seu estoque deveria diminuir agora?", "Mostre um produto ainda na prateleira após enviar a proposta.", "Finalize um orçamento e confira que o estoque não baixou.", "Reservar ou baixar estoque antes da decisão distorce a disponibilidade real.", "O orçamento permanece proposta até ser aprovado e convertido em venda.", "quebra de expectativa, lógica, controle", "PROPOSTA"),
    ("Orçamentos e clientes", "O sim que movimenta tudo", "O estoque só deve mudar quando o talvez vira sim.", "Troque uma placa de Em análise para Aprovado.", "Clique em Aprovar e vender, informe o pagamento e confira a baixa.", "A aprovação manual fora do sistema deixa venda, caixa e estoque desconectados.", "A conversão registra a venda, o pagamento, o vendedor e a saída do estoque.", "transformação, automação, prova", "APROVADO"),
    ("Orçamentos e clientes", "O não também é informação", "Quantos orçamentos sumiram sem você saber se foram recusados?", "Mostre uma lista de propostas sem status.", "Marque um orçamento como Não aprovado e mantenha-o no histórico.", "Apagar proposta recusada elimina aprendizado sobre preço, prazo e demanda.", "O status registra o desfecho sem fingir que houve venda.", "aprendizado, honestidade, histórico", "NAO_APROVADO"),
    ("Orçamentos e clientes", "A proposta aprovada com dois pagamentos", "O cliente aprovou, mas quer entrada no PIX e restante no cartão.", "Mostre a assinatura e duas formas de pagamento ao lado.", "Na aprovação, selecione PIX e cartão com seus valores.", "Transformar orçamento em venda não pode eliminar a flexibilidade do pagamento.", "A aprovação aceita uma ou duas formas e mantém tudo ligado ao orçamento.", "conveniência, continuidade, solução completa", "ENTRADA"),
    ("Orçamentos e clientes", "Do PDF à notinha térmica", "Proposta aprovada precisa virar comprovante, não apenas desaparecer da lista.", "Mostre o PDF grande e uma bobina térmica pequena.", "Conclua a aprovação e abra o comprovante de venda.", "Sem documento final, cliente e caixa ficam com versões diferentes do acordo.", "O PDV emite a notinha após converter o orçamento em venda.", "continuidade, profissionalismo, prova", "TERMICA"),
    ("Orçamentos e clientes", "A resposta chegou quinze dias depois", "Você encontra o orçamento pelo cliente quando ele volta duas semanas depois?", "Folheie um calendário até a quinzena seguinte.", "Abra o histórico e localize a proposta com nome e status.", "Propostas soltas em arquivos e conversas são difíceis de recuperar.", "O histórico conserva orçamento, cliente, valores e situação.", "memória externa, rapidez, confiança", "HISTORICO"),
    ("Orçamentos e clientes", "Cadastre uma vez, use em três lugares", "Cliente não deveria contar a mesma história na venda, no fiado e no orçamento.", "Repita de propósito nome e telefone três vezes e demonstre cansaço.", "Selecione o mesmo cadastro em áreas diferentes do PDV.", "Informação duplicada ocupa tempo e aumenta divergência entre telas.", "Um cadastro central pode ser associado às vendas, ao fiado e às propostas.", "centralização, eficiência, consistência", "CADASTRO"),

    ("Produtos e estoque", "A compra do fornecedor começa com um PDF", "Antes de repor estoque, você consulta a memória ou uma lista completa?", "Mostre uma ligação do fornecedor e uma folha em branco.", "Baixe o relatório de produtos em PDF e percorra estoque e mínimo.", "Comprar sem visão consolidada favorece falta de item importante e excesso de item parado.", "O relatório reúne produtos, saldo, preço, custo, mínimo e vínculo de estoque.", "preparação, visão geral, decisão", "RELATORIO_PDF"),
    ("Produtos e estoque", "Dois nomes, um único pacote", "Como vender dois serviços diferentes sem fingir que existem dois estoques?", "Mostre um pacote de papel alimentando duas opções de impressão.", "Abra o PDF e destaque a coluna Estoque vinculado.", "Cadastros separados podem duplicar um saldo que fisicamente é o mesmo.", "Produtos vinculados consomem a mesma origem e o relatório revela essa relação.", "bastidor, lógica, precisão", "VINCULO"),
    ("Produtos e estoque", "Seu mínimo não é cinco", "Um aviso fixo serve para todos os produtos ou para nenhum direito.", "Compare um item vendido por dia com outro vendido cem vezes.", "Mostre mínimos diferentes no cadastro e no relatório.", "A mesma quantidade crítica não faz sentido para ritmos de venda diferentes.", "Cada produto recebe seu próprio estoque mínimo para alerta.", "personalização, contexto, prevenção", "MINIMO"),
    ("Produtos e estoque", "Serviço não fica na prateleira", "Quantas unidades de formatação de computador existem no estoque?", "Aponte para uma prateleira vazia e faça a pergunta.", "Cadastre um serviço e mostre o traço na coluna de estoque do PDF.", "Obrigar serviço a ter quantidade cria alertas falsos e confunde relatório.", "O PDV separa produto físico de serviço e controla apenas o que realmente tem saldo.", "humor, lógica, adequação", "SERVICO"),
    ("Produtos e estoque", "Estoque cheio, dinheiro parado", "Cem unidades podem parecer boas até você multiplicar pelo custo.", "Empilhe caixas e coloque uma calculadora ao lado.", "No cabeçalho do PDF, mostre o valor de custo do estoque.", "Olhar somente quantidade esconde quanto capital está imobilizado.", "O relatório calcula a soma do saldo pelo custo cadastrado.", "revelação, consciência financeira, decisão", "CUSTO"),
    ("Produtos e estoque", "A categoria que revela bagunça", "Se metade dos produtos está sem categoria, sua busca já está contando uma história.", "Mostre uma lista misturada de itens sem agrupamento.", "Abra o relatório e percorra a coluna Categoria.", "Cadastros sem padrão dificultam busca, relatório e catálogo.", "A visão completa evidencia campos vazios e ajuda a organizar por categoria.", "diagnóstico, ordem, melhoria", "CATEGORIA"),
    ("Produtos e estoque", "O código que existe só na caixa", "Produto sem código cadastrado obriga o operador a lembrar o nome exato.", "Mostre um código de barras numa embalagem e uma busca sem resultado.", "No PDF, filtre visualmente a coluna Código e identifique lacunas.", "Código ausente reduz a velocidade e aumenta seleção errada de itens parecidos.", "O relatório permite revisar quais produtos ainda precisam de código.", "auditoria, velocidade, prevenção", "CODIGOS"),
    ("Produtos e estoque", "Trinta produtos, duas páginas organizadas", "Lista grande não precisa virar print cortado.", "Tente capturar uma tabela longa na tela e mostre o corte.", "Abra um PDF multipágina com cabeçalho repetido e numeração.", "Prints e listas improvisadas perdem colunas e contexto quando crescem.", "O arquivo pagina automaticamente e mantém títulos para facilitar leitura.", "profissionalismo, escala, legibilidade", "PLANILHA"),
    ("Produtos e estoque", "Correção de estoque sem abrir o financeiro", "Gerente precisa arrumar a prateleira, não enxergar despesas pessoais da empresa.", "Divida a tela em Estoque e Financeiro com um cadeado no segundo.", "Entre como gerente, abra Produtos e depois mostre o menu sem Financeiro.", "Dar acesso ao estoque não deveria liberar áreas administrativas sem relação.", "O perfil gerente organiza produtos com limites claros de permissão.", "privacidade, autonomia, segurança", "ORGANIZAR"),
    ("Produtos e estoque", "O alerta antes da última unidade", "O melhor aviso de falta acontece antes do cliente pedir o que acabou.", "Mostre uma prateleira com apenas duas unidades.", "Abra o contador de alertas e compare saldo com mínimo.", "Descobrir a ruptura no momento da venda custa confiança e oportunidade.", "O PDV sinaliza quando o saldo chega ao limite definido.", "antecipação, perda evitada, utilidade", "ALERTA"),
    ("Produtos e estoque", "A vitrine que respeita a prateleira", "Seu catálogo ainda anuncia o produto que acabou há cinco minutos?", "Mostre o último item saindo da prateleira.", "Finalize a venda e confira a disponibilidade no catálogo público.", "Anunciar sem estoque gera mensagens frustradas e retrabalho no atendimento.", "A vitrine usa a disponibilidade do estoque para proteger o que é exibido.", "coerência, experiência do cliente, automação", "VITRINE"),

    ("Clientes e fiado", "Venda paga também conta história", "Histórico de cliente não deveria existir só quando ele deve.", "Mostre um cliente pagando à vista e saindo.", "Associe o cadastro à venda paga e abra o histórico depois.", "Sem vínculo, a loja perde informação sobre preferências de clientes adimplentes.", "O PDV registra compras pagas ligadas ao cliente, com itens e comprovante.", "relacionamento, memória, personalização", "CLIENTE"),
    ("Clientes e fiado", "O troco que ficou para a próxima", "Troco guardado é compromisso da loja, não favor da memória.", "Mostre uma nota alta e ausência de moedas.", "Adicione saldo ao cliente com valor e motivo.", "Quando o valor fica apenas combinado, qualquer troca de atendente gera insegurança.", "O saldo fica registrado com data, motivo e histórico de uso.", "confiança, reciprocidade, registro", "SALDO"),
    ("Clientes e fiado", "Saldo mais PIX sem cobrar duas vezes", "O cliente tem R$ 7 de saldo e a compra custa R$ 30. Quanto entra no caixa?", "Faça a pergunta na tela e dê três segundos para responder.", "Use o saldo e cobre R$ 23 no PIX.", "Misturar crédito do cliente com pagamento atual pode duplicar a entrada.", "O PDV abate o saldo e lança no caixa somente o valor pago agora.", "quiz, precisão, prova", "ABATER"),
    ("Clientes e fiado", "Uma parte paga, outra prometida", "Fiado não precisa começar com zero recebido.", "Mostre metade da compra marcada como paga.", "Divida a venda entre PIX e fiado.", "Registrar tudo como dívida ignora o dinheiro já recebido e aumenta o saldo devedor.", "A parte paga entra no caixa e somente o restante fica no cliente.", "justiça, flexibilidade, controle", "PARTE"),
    ("Clientes e fiado", "Recebeu pouco? Registre mesmo assim", "Um pagamento parcial não é pequeno demais para entrar no histórico.", "Mostre uma dívida e uma pequena parcela sendo paga.", "Registre o recebimento parcial e abra o extrato atualizado.", "Deixar parcelas pequenas para anotar depois causa esquecimento e cobrança indevida.", "Cada recebimento reduz o saldo e preserva data e valor.", "progresso, transparência, alívio", "PARCIAL"),
    ("Clientes e fiado", "Um dígito errado no CPF", "O erro aparece quando você digita ou quando já precisa do documento?", "Digite um CPF fictício inválido e destaque a mensagem.", "Corrija o número e mostre a validação antes de salvar.", "Documento incorreto compromete orçamento, busca e cadastro do cliente.", "O sistema valida CPF e CNPJ antes de aceitar a informação.", "prevenção, precisão, profissionalismo", "DOCUMENTO"),
    ("Clientes e fiado", "Encontrar antes de cadastrar", "O cliente diz que já tem cadastro. Você acredita ou pesquisa?", "Encene a dúvida com uma fila esperando.", "Digite parte do nome e selecione o registro existente.", "Duplicidade separa histórico, saldo e telefone em fichas diferentes.", "A busca ajuda a reutilizar o cadastro correto.", "economia, organização, rapidez", "ENCONTRAR"),
    ("Clientes e fiado", "Dívida não some com o cadastro", "Excluir o nome faria a dívida desaparecer ou só esconderia o problema?", "Tente jogar uma ficha de dívida no lixo e pare antes.", "Mostre que a exclusão é bloqueada enquanto existir saldo pendente.", "Apagar cliente devedor rompe a ligação entre compra, pagamento e cobrança.", "O PDV preserva o cadastro até que o saldo esteja zerado.", "segurança, integridade, responsabilidade", "DIVIDA"),
    ("Clientes e fiado", "A cobrança que começa pelo extrato", "Antes de cobrar, envie fatos: datas, itens, pagamentos e saldo.", "Mostre uma conversa genérica de cobrança sem detalhes.", "Gere o extrato do cliente em PDF.", "Cobrança baseada em lembrança favorece conflito e demora.", "O extrato organiza compras, recebimentos e valor pendente.", "prova, transparência, respeito", "EXTRATO"),
    ("Clientes e fiado", "O cliente nasceu na proposta", "Quem pediu orçamento hoje pode comprar novamente daqui a três meses.", "Mostre um primeiro contato chegando por mensagem.", "Finalize o orçamento de cliente novo e depois abra seu cadastro completo.", "Se o contato fica apenas no PDF, a loja perde o relacionamento futuro.", "O orçamento pode cadastrar automaticamente o cliente no painel.", "continuidade, oportunidade, memória", "RELACIONAMENTO"),

    ("Caixa, financeiro e continuidade", "Uma tela não deve invadir a outra", "Você atualiza Vendas e, de repente, aparece Financeiro embaixo? Isso é o tipo de ruído que confunde.", "Mostre uma tela dividida e depois limpe a parte indevida.", "Atualize o PDV e mostre Vendas isolada; depois abra Financeiro pelo menu.", "Seções misturadas fazem o usuário duvidar de onde está e do que pode clicar.", "O Financeiro permanece somente na área correta, separado do atendimento.", "identificação, correção visível, simplicidade", "TELA"),
    ("Caixa, financeiro e continuidade", "O número que o operador não precisa ver", "Para vender bem, a equipe precisa conhecer todas as despesas da empresa?", "Cubra uma planilha financeira enquanto mantém a tela de venda aberta.", "Entre como operador e mostre o menu sem Financeiro.", "Expor receitas e despesas completas aumenta risco sem melhorar o atendimento.", "A operação compartilha apenas as informações necessárias a cada função.", "privacidade, foco, segurança", "FINANCEIRO"),
    ("Caixa, financeiro e continuidade", "Guardar dinheiro não é gastar", "Tirar dinheiro da gaveta pode significar três coisas completamente diferentes.", "Coloque etiquetas Sangria, Despesa e Transferência em três envelopes.", "Registre cada finalidade e mostre como só despesa afeta o resultado.", "Classificar toda saída como gasto distorce lucro e saldo.", "O caixa diferencia a finalidade do movimento antes de refletir no Financeiro.", "educação, clareza, controle", "FINALIDADE"),
    ("Caixa, financeiro e continuidade", "O mês virou, o dinheiro não", "À meia-noite o calendário zera; a carteira da empresa não.", "Vire a folha do calendário mantendo as mesmas notas na mesa.", "Troque o período do Financeiro e mostre o saldo inicial automático.", "Zerar manualmente cada mês quebra a continuidade do caixa.", "O fechamento anterior alimenta o saldo inicial do período seguinte.", "continuidade, lógica, tranquilidade", "CONTINUIDADE"),
    ("Caixa, financeiro e continuidade", "A primeira diferença do dia", "Se o caixa começou com R$ 80, por que o sistema deveria começar em zero?", "Conte notas fictícias antes de abrir a loja.", "Abra o caixa informando o valor inicial.", "Ignorar o fundo de caixa torna toda conferência final aparentemente errada.", "A abertura registra quanto já existia antes das vendas.", "causa e efeito, prevenção, precisão", "ABERTURA"),
    ("Caixa, financeiro e continuidade", "O fechamento que explica R$ 3", "Diferença pequena sem registro vira suspeita grande.", "Mostre o esperado e o contado com R$ 3 de diferença.", "Feche o caixa e gere o PDF do resumo.", "Sem comparar valores, sobra apenas a sensação de que algo não bateu.", "O fechamento guarda esperado, contado, diferença e responsáveis.", "transparência, prova, segurança", "FECHAMENTO"),
    ("Caixa, financeiro e continuidade", "A internet caiu com gente na fila", "Você fecha a loja ou continua vendendo quando o Wi-Fi some?", "Desligue simbolicamente o roteador e mantenha o balcão funcionando.", "Mostre o indicador offline e registre uma venda fictícia.", "Depender de conexão constante transforma uma oscilação em paralisação.", "Depois da primeira abertura online, recursos essenciais continuam disponíveis localmente.", "medo real, resiliência, continuidade", "OFFLINE"),
    ("Caixa, financeiro e continuidade", "O que acontece quando a internet volta", "Venda offline não deveria exigir um botão secreto para chegar à nuvem.", "Reconecte o Wi-Fi e observe o indicador mudar.", "Mostre a mensagem de sincronização automática.", "Se a recuperação depende da memória do usuário, dados pendentes podem ficar esquecidos.", "O PDV envia as alterações quando a conexão retorna.", "alívio, automação, confiança", "SINCRONIZAR"),
    ("Caixa, financeiro e continuidade", "Backup não é botão de emergência", "O melhor dia para fazer backup é antes de precisar dele.", "Mostre um guarda-chuva num dia sem chuva.", "Abra a opção de backup do titular e explique a rotina periódica.", "Esperar uma falha para pensar em cópia transforma prevenção em desespero.", "O backup reúne os principais dados para uma recuperação planejada.", "prevenção, analogia, segurança", "BACKUP"),
    ("Caixa, financeiro e continuidade", "O PDV que abre como aplicativo", "Uma aba perdida entre vinte sites também custa tempo.", "Mostre várias abas abertas e procure o PDV.", "Abra o ícone instalado do PDV na tela inicial.", "Depender de favoritos e endereços dificulta o uso diário da equipe.", "A instalação PWA deixa o sistema acessível como aplicativo no aparelho.", "conveniência, hábito, simplicidade", "INSTALAR"),

    ("Experiência e diferenciais", "Uma oficina não precisa parecer uma doceria", "Se a tela parece genérica, ela também perde a identidade do negócio.", "Compare dois ambientes comerciais com cores diferentes.", "Abra o Painel de Tema e aplique um tema coerente com o segmento.", "Interface desconectada do comércio reduz familiaridade e percepção de cuidado.", "O PDV oferece temas prontos e personalização visual.", "identidade, pertencimento, transformação", "TEMA"),
    ("Experiência e diferenciais", "Um link no lugar de vinte fotos", "Quantas imagens você envia até o cliente entender o que vende?", "Role uma conversa fictícia cheia de fotos repetidas.", "Abra o catálogo público com produtos e serviços organizados.", "Atendimento manual repete informação e deixa opções perdidas na conversa.", "O catálogo reúne a vitrine em um link compartilhável.", "economia de tempo, organização, conveniência", "CATALOGO"),
    ("Experiência e diferenciais", "A vitrine que termina no WhatsApp", "Catálogo bonito sem caminho para conversar vira só exposição.", "Mostre um cliente escolhendo um item no catálogo.", "Clique no contato de WhatsApp configurado para a loja.", "Quando o próximo passo não está claro, o interesse esfria.", "A vitrine conduz o cliente ao canal de atendimento da empresa.", "continuidade, ação simples, proximidade", "WHATSAPP"),
    ("Experiência e diferenciais", "A câmera que evita uma etiqueta digitada", "Um número errado transforma um produto existente em produto invisível.", "Tente digitar rapidamente um código longo e erre um dígito.", "Use a câmera do celular para ler o código no cadastro ou na venda.", "Digitação manual de códigos aumenta tempo e falhas.", "A leitura pela câmera localiza ou preenche o código automaticamente.", "demonstração, velocidade, precisão", "CAMERA"),
    ("Experiência e diferenciais", "Serviço com preço ajustado no atendimento", "Nem todo serviço custa igual antes de você ver o problema.", "Mostre dois equipamentos com níveis de dificuldade diferentes.", "Adicione um serviço ao carrinho e ajuste o valor unitário naquela venda.", "Preço rígido obriga criar cadastros duplicados para cada variação de trabalho.", "O serviço mantém cadastro base e permite ajuste pontual no carrinho.", "flexibilidade, contexto, praticidade", "VALOR"),
    ("Experiência e diferenciais", "Meio quilo não é uma unidade", "Arredondar peso para facilitar o sistema significa cobrar errado.", "Coloque 0,650 kg numa balança.", "Adicione a quantidade fracionada e mostre o subtotal.", "Produtos por peso exigem precisão que botões de mais e menos não resolvem sozinhos.", "O PDV aceita quantidades fracionadas para unidades como quilograma.", "precisão, justiça, adequação", "PESO"),
    ("Experiência e diferenciais", "O comprovante também apresenta a empresa", "Se a notinha cair no chão, alguém sabe de qual loja ela veio?", "Mostre um comprovante sem identificação e faça a pergunta.", "Abra um comprovante com nome da empresa e CNPJ.", "Documento genérico perde valor como prova e lembrança da marca.", "As configurações do titular aparecem no comprovante e no PDF térmico.", "credibilidade, marca, prova", "CNPJ"),
    ("Experiência e diferenciais", "O desafio dos 60 segundos", "Em um minuto, quantos problemas de balcão você consegue resolver numa única tela?", "Inicie um cronômetro de 60 segundos.", "Busque produto, adicione cliente, aplique desconto e escolha pagamento.", "Ferramenta lenta obriga a equipe a criar atalhos fora dela.", "O fluxo concentra as etapas principais e ainda oferece atalhos de teclado.", "desafio, demonstração, velocidade", "UM_MINUTO"),
    ("Experiência e diferenciais", "Antes: três papéis. Depois: um histórico", "O ganho do sistema aparece quando alguém faz uma pergunta antiga.", "Mostre caderno, calculadora e conversa de mensagem.", "Pesquise cliente, venda ou orçamento no PDV.", "Informação espalhada funciona até o dia em que precisa ser encontrada rápido.", "Registros conectados transformam procura em consulta.", "antes e depois, prova, alívio", "ORGANIZACAO"),
    ("Experiência e diferenciais", "A pergunta que escolhe o melhor vídeo", "Qual dessas dores custa mais hoje: fila, estoque, fiado ou falta de controle?", "Mostre quatro cartões com as dores e peça para pausar o vídeo.", "Passe rapidamente pelas quatro áreas correspondentes no PDV.", "Falar só de recurso não conecta com quem ainda não nomeou o próprio problema.", "Começar pela dor mostra como diferentes partes do PDV resolvem rotinas reais.", "interatividade, identificação, escolha", "DOR"),
    ("Experiência e diferenciais", "O próximo vídeo pode usar a sua loja", "E se a demonstração fosse feita com um problema real do seu balcão?", "Segure uma caixa vazia com a frase Seu exemplo aqui.", "Mostre o PDV com dados fictícios e convide a audiência a enviar um cenário.", "Demonstração genérica deixa o interessado imaginando se serve para seu negócio.", "Um cenário enviado pelo seguidor pode virar prova prática da solução.", "participação, personalização, convite", "DEMONSTRACAO"),
]

assert len(RAW) == 101, f"Esperados 101 roteiros, encontrados {len(RAW)}"

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="BodyArial", fontName="Arial", fontSize=9.2, leading=12.2, textColor=NAVY, spaceAfter=4))
styles.add(ParagraphStyle(name="SmallArial", fontName="Arial", fontSize=7.7, leading=9.5, textColor=SLATE))
styles.add(ParagraphStyle(name="TitleArial", fontName="Arial-Bold", fontSize=20, leading=23, textColor=NAVY, spaceAfter=5))
styles.add(ParagraphStyle(name="SectionArial", fontName="Arial-Bold", fontSize=8, leading=10, textColor=TEAL, uppercase=True, tracking=0.7))
styles.add(ParagraphStyle(name="HookArial", fontName="Arial-Bold", fontSize=11.5, leading=14.5, textColor=colors.white, alignment=TA_LEFT))
styles.add(ParagraphStyle(name="LabelArial", fontName="Arial-Bold", fontSize=7.6, leading=9, textColor=TEAL_DARK, spaceAfter=1))
styles.add(ParagraphStyle(name="CaptionArial", fontName="Arial", fontSize=8.3, leading=10.4, textColor=NAVY))
styles.add(ParagraphStyle(name="Calendar", fontName="Arial", fontSize=8.5, leading=11, textColor=NAVY))

def esc(text):
    return (str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))

def header_footer(canvas, doc):
    page = canvas.getPageNumber()
    if page == 1:
        return
    width, height = A4
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, height - 16*mm, width, 16*mm, fill=1, stroke=0)
    canvas.setFont("Arial-Bold", 8.5)
    canvas.setFillColor(colors.white)
    canvas.drawString(15*mm, height - 10*mm, "PDV PRO  |  101 ROTEIROS PARA REELS  |  VOLUME 3")
    canvas.setFont("Arial", 8)
    canvas.setFillColor(SLATE)
    canvas.drawString(15*mm, 10*mm, "Conteúdo de curiosidade, dor real e solução prática")
    canvas.drawRightString(width - 15*mm, 10*mm, f"Página {page}")
    canvas.restoreState()

def box(label, text, bg=LIGHT, border=BORDER, text_style="BodyArial", pad=7):
    content = [Paragraph(esc(label).upper(), styles["LabelArial"]), Paragraph(esc(text), styles[text_style])]
    table = Table([[content]], colWidths=[174*mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), bg),
        ("BOX", (0,0), (-1,-1), 0.7, border),
        ("LEFTPADDING", (0,0), (-1,-1), pad),
        ("RIGHTPADDING", (0,0), (-1,-1), pad),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ]))
    return table

def talk_text(day, pain, solution):
    templates = [
        f"Repara nesta situação: {pain} O problema quase nunca aparece numa venda isolada; ele cresce quando se repete todos os dias. {solution} Assim, a equipe resolve a necessidade do cliente sem transformar rapidez em descontrole.",
        f"Isso parece um detalhe de balcão, mas tem consequência: {pain} É por isso que organização não é burocracia; é conseguir responder rápido e com segurança. {solution} O ganho não está só no clique, mas no problema que deixa de voltar.",
        f"Muita loja se acostuma com essa dor: {pain} Até funciona por um tempo, mas depende de memória, papel ou da presença do dono. {solution} A rotina fica mais simples porque a regra passa a estar no processo, não na cabeça de alguém.",
        f"Antes de pensar em vender mais, vale corrigir o que rouba tempo: {pain} Pequenas falhas viram fila, divergência e conversa difícil. {solution} É uma mudança prática para atender melhor e manter o controle depois que o cliente vai embora.",
        f"A pergunta não é se isso acontece, mas quanto custa quando acontece: {pain} O prejuízo pode ser tempo, confiança ou dinheiro. {solution} Quando a informação fica registrada, a decisão deixa de ser improviso.",
        f"Imagine essa cena num sábado cheio: {pain} Ninguém quer parar o atendimento para reconstruir uma conta ou procurar um papel. {solution} O sistema entra como apoio silencioso: resolve a dor sem transformar o vídeo numa propaganda.",
        f"Existe uma diferença entre parecer organizado e conseguir provar o que aconteceu. {pain} É nesse ponto que a rotina costuma falhar. {solution} O resultado é menos dúvida para a equipe e mais clareza para o cliente.",
    ]
    return templates[(day - 1) % len(templates)]

def cta_text(day, keyword):
    options = [
        f"Se essa dor aparece no seu balcão, mande <b>{keyword}</b> no direct e eu mostro como funciona no PDV Pro.",
        f"Quer ver essa situação com os produtos da sua loja? Comente <b>{keyword}</b> e peça uma demonstração.",
        f"Salve este vídeo e, quando quiser organizar essa rotina, fale <b>{keyword}</b> comigo no direct.",
        f"Conhece alguém que vive esse problema? Compartilhe e envie <b>{keyword}</b> para conhecer a ferramenta.",
        f"Se resolver isso já faria diferença no seu dia, escreva <b>{keyword}</b> e veja o PDV Pro em ação.",
    ]
    return options[(day - 1) % len(options)]

def caption_text(title, pain, keyword):
    return f"{title}: uma dor pequena pode se repetir até virar prejuízo. {pain} No vídeo, mostre a situação primeiro e só depois revele a solução no PDV Pro. Para uma demonstração, envie {keyword}."

story = []

# Capa
cover = Table([
    [Paragraph("VOLUME 3", ParagraphStyle(name="CoverTag", fontName="Arial-Bold", fontSize=11, textColor=colors.white, alignment=TA_CENTER))],
    [Paragraph("101 roteiros inéditos<br/>para Reels do PDV Pro", ParagraphStyle(name="CoverTitle", fontName="Arial-Bold", fontSize=29, leading=34, textColor=colors.white, alignment=TA_CENTER))],
    [Paragraph("Curiosidade primeiro. Dor real no centro.<br/>Solução prática antes da chamada de venda.", ParagraphStyle(name="CoverSub", fontName="Arial", fontSize=14, leading=19, textColor=colors.HexColor("#CCFBF1"), alignment=TA_CENTER))],
], colWidths=[180*mm], rowHeights=[18*mm, 55*mm, 35*mm])
cover.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,-1), TEAL_DARK),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("BOX", (0,0), (-1,-1), 0, TEAL_DARK),
    ("TOPPADDING", (0,0), (-1,-1), 10),
    ("BOTTOMPADDING", (0,0), (-1,-1), 10),
]))
story.extend([Spacer(1, 34*mm), cover, Spacer(1, 14*mm), Paragraph("Atualizado com gerente, limites de desconto, comissão, pagamentos divididos, vendas suspensas, clientes no orçamento, PDF de produtos e os demais recursos da plataforma.", ParagraphStyle(name="CoverFoot", fontName="Arial", fontSize=10.5, leading=15, textColor=SLATE, alignment=TA_CENTER)), PageBreak()])

# Guia
story.extend([
    Paragraph("Como usar estes 101 roteiros", styles["TitleArial"]),
    Paragraph("Este volume foi escrito para não começar pela venda. Cada vídeo abre uma curiosidade, coloca uma dor reconhecível no centro, demonstra uma solução e só então convida a pessoa a conhecer o PDV Pro.", styles["BodyArial"]),
    Spacer(1, 4*mm),
    box("1. Gancho em até 3 segundos", "Faça uma pergunta, apresente um contraste ou mostre uma situação inesperada. Não comece dizendo o nome do sistema.", colors.HexColor("#ECFEFF"), colors.HexColor("#67E8F9")),
    Spacer(1, 3*mm),
    box("2. Mostre a dor antes da tela", "Use objetos do balcão, encenação curta, calendário, etiquetas ou uma pergunta visual. A pessoa precisa se reconhecer antes de ver a ferramenta.", colors.HexColor("#FFF7ED"), colors.HexColor("#FDBA74")),
    Spacer(1, 3*mm),
    box("3. Demonstre, não prometa", "Grave dados fictícios e deixe a função visível. Um clique verdadeiro convence mais do que uma lista de benefícios.", colors.HexColor("#F0FDF4"), colors.HexColor("#86EFAC")),
    Spacer(1, 3*mm),
    box("4. Chamada final curta", "A venda aparece somente no final. Alterne entre direct, comentário, demonstração, salvar e compartilhar para o conteúdo não ficar repetitivo.", colors.HexColor("#F5F3FF"), colors.HexColor("#C4B5FD")),
    Spacer(1, 5*mm),
    Paragraph("Formato recomendado", styles["SectionArial"]),
    Paragraph("Duração: 25 a 45 segundos. Enquadramento vertical 9:16. Legendas grandes. Corte entre rosto, dor encenada e tela do sistema. Sempre use clientes, valores e documentos fictícios.", styles["BodyArial"]),
    PageBreak(),
])

# Mapa temático
sections = []
for row in RAW:
    if row[0] not in sections:
        sections.append(row[0])
story.extend([
    Paragraph("Mapa de dores deste volume", styles["TitleArial"]),
    Paragraph("Os roteiros percorrem a jornada completa do pequeno comércio sem repetir a pauta dos volumes anteriores. Use a sequência como calendário ou escolha a dor mais urgente do seu público.", styles["BodyArial"]),
    Spacer(1, 5*mm),
])
for idx, section in enumerate(sections, 1):
    count = sum(1 for row in RAW if row[0] == section)
    story.append(box(f"Bloco {idx:02d}", f"{section} - {count} roteiros", colors.white, BORDER, "BodyArial"))
    story.append(Spacer(1, 2.5*mm))
story.append(PageBreak())

# Calendário em quatro páginas
for start in range(0, 101, 26):
    end = min(start + 26, 101)
    story.append(Paragraph(f"Calendário rápido - dias {start + 1} a {end}", styles["TitleArial"]))
    rows = []
    chunk = RAW[start:end]
    for pos in range(0, len(chunk), 2):
        left = chunk[pos]
        right = chunk[pos + 1] if pos + 1 < len(chunk) else None
        day_left = start + pos + 1
        left_p = Paragraph(f"<b>Dia {day_left:02d}</b><br/>{esc(left[1])}", styles["Calendar"])
        if right:
            right_p = Paragraph(f"<b>Dia {day_left + 1:02d}</b><br/>{esc(right[1])}", styles["Calendar"])
        else:
            right_p = Paragraph("", styles["Calendar"])
        rows.append([left_p, right_p])
    table = Table(rows, colWidths=[86*mm, 86*mm], rowHeights=[15.5*mm]*len(rows))
    table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), colors.white),
        ("BOX", (0,0), (-1,-1), 0.6, BORDER),
        ("INNERGRID", (0,0), (-1,-1), 0.45, BORDER),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING", (0,0), (-1,-1), 7),
        ("RIGHTPADDING", (0,0), (-1,-1), 7),
        ("ROWBACKGROUNDS", (0,0), (-1,-1), [colors.white, LIGHT]),
    ]))
    story.extend([table, PageBreak()])

# 101 páginas de roteiro
section_colors = [TEAL, BLUE, AMBER, VIOLET, RED, GREEN, CYAN]
for day, row in enumerate(RAW, 1):
    section, title, hook, scene1, scene2, pain, solution, triggers, keyword = row
    accent = section_colors[sections.index(section) % len(section_colors)]
    day_chip = Table([[Paragraph(f"DIA {day:02d}", ParagraphStyle(name=f"Day{day}", fontName="Arial-Bold", fontSize=10, textColor=colors.white, alignment=TA_CENTER))]], colWidths=[27*mm], rowHeights=[9*mm])
    day_chip.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), accent), ("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("BOX", (0,0), (-1,-1), 0, accent)]))
    title_row = Table([[Paragraph(esc(section).upper(), styles["SectionArial"]), day_chip]], colWidths=[145*mm, 29*mm])
    title_row.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("LEFTPADDING", (0,0), (-1,-1), 0), ("RIGHTPADDING", (0,0), (-1,-1), 0)]))
    story.extend([title_row, Spacer(1, 2.5*mm), Paragraph(esc(title), styles["TitleArial"]), Spacer(1, 1*mm)])

    hook_table = Table([[Paragraph(esc(hook), styles["HookArial"])]], colWidths=[174*mm])
    hook_table.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), accent), ("BOX", (0,0), (-1,-1), 0, accent), ("LEFTPADDING", (0,0), (-1,-1), 10), ("RIGHTPADDING", (0,0), (-1,-1), 10), ("TOPPADDING", (0,0), (-1,-1), 8), ("BOTTOMPADDING", (0,0), (-1,-1), 8)]))
    story.extend([hook_table, Spacer(1, 3*mm)])

    scenes = Table([
        [Paragraph("CENA 1 - A DOR", styles["LabelArial"]), Paragraph("CENA 2 - A DESCOBERTA", styles["LabelArial"])],
        [Paragraph(esc(scene1), styles["SmallArial"]), Paragraph(esc(scene2), styles["SmallArial"])],
    ], colWidths=[85.5*mm, 85.5*mm])
    scenes.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), LIGHT), ("BOX", (0,0), (-1,-1), 0.7, BORDER),
        ("INNERGRID", (0,0), (-1,-1), 0.45, BORDER), ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
        ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ]))
    story.extend([scenes, Spacer(1, 2.5*mm)])

    story.extend([
        box("A dor que o público reconhece", pain, colors.HexColor("#FFF1F2"), colors.HexColor("#FDA4AF"), "SmallArial", 7),
        Spacer(1, 2.2*mm),
        box("O que mostrar no PDV Pro", solution, colors.HexColor("#ECFDF5"), colors.HexColor("#6EE7B7"), "SmallArial", 7),
        Spacer(1, 2.5*mm),
        Paragraph("FALE ISSO", styles["LabelArial"]),
        Paragraph(esc(talk_text(day, pain, solution)), styles["BodyArial"]),
        Spacer(1, 1.5*mm),
    ])

    meta = Table([
        [Paragraph("GATILHOS", styles["LabelArial"]), Paragraph("TEXTO NA TELA", styles["LabelArial"])],
        [Paragraph(esc(triggers), styles["SmallArial"]), Paragraph(esc(f"{title} - resolva a causa, não só o sintoma"), styles["SmallArial"])],
    ], colWidths=[70*mm, 101*mm])
    meta.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), colors.HexColor("#FFFBEB")), ("BOX", (0,0), (-1,-1), 0.7, colors.HexColor("#FCD34D")),
        ("INNERGRID", (0,0), (-1,-1), 0.45, colors.HexColor("#FCD34D")), ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
        ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ]))
    story.extend([meta, Spacer(1, 2.4*mm)])

    cta = Table([[Paragraph("CHAMADA FINAL", styles["LabelArial"]), Paragraph(cta_text(day, keyword), styles["CaptionArial"])]], colWidths=[31*mm, 140*mm])
    cta.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), colors.HexColor("#F5F3FF")), ("BOX", (0,0), (-1,-1), 0.7, colors.HexColor("#C4B5FD")), ("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7), ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5)]))
    story.extend([cta, Spacer(1, 2.5*mm), Paragraph("LEGENDA PRONTA", styles["LabelArial"]), Paragraph(esc(caption_text(title, pain, keyword)), styles["SmallArial"]), Spacer(1, 2.5*mm)])

    checklist = Table([[Paragraph("[ ] Dados fictícios   [ ] Tela legível   [ ] Áudio claro   [ ] Legenda   [ ] CTA somente no final", styles["SmallArial"]) ]], colWidths=[174*mm])
    checklist.setStyle(TableStyle([("LINEABOVE", (0,0), (-1,0), 0.6, BORDER), ("TOPPADDING", (0,0), (-1,-1), 5), ("LEFTPADDING", (0,0), (-1,-1), 0)]))
    story.extend([checklist, PageBreak()])

doc = SimpleDocTemplate(
    str(OUTPUT), pagesize=A4,
    rightMargin=18*mm, leftMargin=18*mm,
    topMargin=22*mm, bottomMargin=17*mm,
    title="101 novos roteiros para Reels do PDV Pro - Volume 3",
    author="PDV Pro",
    subject="Roteiros de curiosidade, dores e soluções para vídeos no Instagram",
)
doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(OUTPUT)
