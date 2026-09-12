from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "pdf" / "101-roteiros-reels-pdv-pro.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

FONT_REGULAR = Path("C:/Windows/Fonts/arial.ttf")
FONT_BOLD = Path("C:/Windows/Fonts/arialbd.ttf")
pdfmetrics.registerFont(TTFont("PdvSans", str(FONT_REGULAR)))
pdfmetrics.registerFont(TTFont("PdvSansBold", str(FONT_BOLD)))

NAVY = colors.HexColor("#101B2D")
NAVY_2 = colors.HexColor("#17263E")
EMERALD = colors.HexColor("#0B9A73")
EMERALD_DARK = colors.HexColor("#087257")
MINT = colors.HexColor("#E8F7F1")
ORANGE = colors.HexColor("#FF8B3D")
GOLD = colors.HexColor("#F6C453")
INK = colors.HexColor("#1A2433")
MUTED = colors.HexColor("#5D6A7B")
LINE = colors.HexColor("#DDE4EC")
PAPER = colors.HexColor("#F5F8FB")
WHITE = colors.white


WEEKS = [
    ("Semana 1", "Dor, transformação e visão geral"),
    ("Semana 2", "Venda rápida no balcão"),
    ("Semana 3", "Pagamentos e comprovantes"),
    ("Semana 4", "Produtos, serviços e estoque"),
    ("Semana 5", "Clientes e relacionamento"),
    ("Semana 6", "Fiado sem confusão"),
    ("Semana 7", "Caixa organizado"),
    ("Semana 8", "Financeiro do titular"),
    ("Semana 9", "Relatórios, histórico e segurança"),
    ("Semana 10", "Equipe e operadores"),
    ("Semana 11", "Orçamentos profissionais"),
    ("Semana 12", "Catálogo que ajuda a vender"),
    ("Semana 13", "Catálogo conectado ao estoque e ao tema"),
    ("Semana 14", "Identidade, nuvem e fechamento"),
]

WEEK_COUNTS = [7, 7, 7, 8, 7, 7, 7, 7, 7, 8, 7, 7, 7, 8]


def R(title, hook, shot1, shot2, speech, overlay, cta, caption):
    return {
        "title": title,
        "hook": hook,
        "shot1": shot1,
        "shot2": shot2,
        "speech": speech,
        "overlay": overlay,
        "cta": cta,
        "caption": caption,
    }


SCRIPTS = [
    R("O caderno está custando caro", "Você ainda fecha o caixa no caderno?", "Mostre um caderno, papéis e uma calculadora sobre o balcão.", "Corte para o painel do PDV e passe rapidamente por Vendas, Caixa e Relatórios.", "Anotar tudo no papel parece simples, até aparecer uma diferença no caixa, uma venda esquecida ou um estoque que não bate. No PDV Pro, a venda já alimenta o caixa, o estoque e os relatórios. Você registra uma vez e encontra a informação depois, sem refazer conta no fim do dia.", "Menos papel. Mais controle.", "Quer organizar sua loja? Mande PDV no direct.", "Seu negócio cresceu. O controle também precisa crescer. Fale comigo e conheça o PDV Pro."),
    R("Tudo em um só lugar", "Quantos aplicativos você abre para cuidar da loja?", "Grave a tela alternando entre Vendas, Produtos, Clientes, Caixa, Financeiro e Relatórios.", "Volte para a câmera e conte nos dedos as áreas que ficaram centralizadas.", "O PDV Pro reúne venda, cadastro de produtos e serviços, clientes, fiado, caixa, financeiro, relatórios, orçamentos e catálogo público. Em vez de espalhar informações, você acompanha a operação em um único sistema e ganha clareza para decidir.", "Venda + estoque + caixa + clientes", "Comente QUERO para receber uma demonstração.", "Uma operação organizada começa quando as informações conversam entre si."),
    R("Para comércio e serviço", "Seu negócio vende produto, serviço ou os dois?", "Mostre no cadastro a escolha entre Produto e Serviço.", "Abra o carrinho com um item físico e um serviço juntos.", "O sistema não é só para loja com prateleira. Você pode cadastrar produtos com estoque e também serviços sem controle de quantidade. Isso atende pet shop, adega, conveniência, gráfica, assistência técnica, doceria, hortifruti e muitos outros negócios.", "Produto e serviço no mesmo PDV", "Envie este vídeo para quem trabalha por conta própria.", "Do balcão à prestação de serviço: um sistema que acompanha a realidade do pequeno negócio."),
    R("Venda sem adivinhação", "Você sabe quanto vendeu hoje agora, sem fazer conta?", "Mostre uma venda sendo finalizada.", "Depois abra Relatórios e destaque vendas e faturamento da data.", "Quando a venda é registrada no PDV Pro, ela fica disponível no histórico e nos indicadores do dia. Você não precisa esperar o fechamento nem somar papelzinho para entender o movimento. É controle durante o expediente, não só depois do problema.", "Saiba o resultado do dia", "Salve este vídeo para lembrar na hora de escolher seu PDV.", "Informação rápida ajuda você a agir rápido."),
    R("PDV no celular", "Seu balcão cabe na palma da mão.", "Abra o sistema no celular e use o menu móvel.", "Mostre a busca de produto e o carrinho em tela pequena.", "O PDV Pro se adapta ao celular e ao computador. No celular, o menu fica organizado e você consegue consultar itens, vender e acompanhar a operação sem depender de uma tela grande. É praticidade para balcão, atendimento externo e rotina corrida.", "Use no celular ou computador", "Quer ver funcionando no seu aparelho? Chame no direct.", "Mais liberdade para atender onde o cliente estiver."),
    R("Instale como aplicativo", "Quer abrir o PDV sem procurar link toda vez?", "Mostre o botão Instalar PDV e simule a instalação.", "Exiba o ícone do sistema na tela inicial ou na área de trabalho.", "O PDV Pro pode ser instalado no celular ou no computador como um aplicativo. Depois, basta tocar no ícone para abrir. Isso deixa o acesso mais rápido e passa uma sensação profissional para quem usa o sistema todos os dias.", "Instale e abra por um toque", "Compartilhe com alguém que vive perdendo o link dos sistemas.", "Um detalhe simples que economiza tempo todos os dias."),
    R("Cada empresa no seu espaço", "Seus dados de venda não podem se misturar com os de ninguém.", "Mostre a tela de login e depois o painel da empresa.", "Destaque que produtos, vendas, clientes e configurações pertencem à conta.", "Cada conta do PDV Pro mantém os dados da própria empresa separados na nuvem. Produtos, vendas, clientes, caixa e configurações ficam vinculados ao acesso correto. Assim, cada negócio trabalha no seu ambiente e a equipe autorizada vê apenas o que precisa.", "Dados separados por empresa", "Fale com a gente para criar seu acesso.", "Organização também é saber onde cada informação pertence."),

    R("Abra o caixa antes de vender", "Uma venda organizada começa antes do primeiro cliente.", "Entre em Caixa e mostre o botão Abrir caixa.", "Volte para Vendas e destaque que o atendimento está liberado.", "Antes de começar o dia, abra o caixa no sistema. Esse passo cria a sessão do expediente e ajuda a separar o movimento de cada período. Quando chegar a hora de fechar, você terá um histórico muito mais claro do que entrou e saiu.", "Primeiro passo do dia: abrir o caixa", "Salve para usar como rotina de abertura da loja.", "Processo simples, fechamento mais tranquilo."),
    R("Busque pelo nome", "Não precisa decorar código para vender rápido.", "Clique na busca e digite parte do nome de um produto.", "Selecione o item encontrado e mostre ele entrando no carrinho.", "No PDV Pro, você pode localizar o item pelo nome ou pelo código. Digite poucas letras, escolha o produto e ele vai para o carrinho. É uma forma fácil de atender mesmo quando o funcionário ainda está aprendendo o estoque.", "Digite, encontre, venda", "Quer um atendimento mais rápido? Mande uma mensagem.", "Menos procura no balcão, mais agilidade para o cliente."),
    R("Venda pelo código de barras", "Bipou, entrou no carrinho.", "Deixe o cursor no campo de busca e leia um código de barras.", "Mostre o produto aparecendo no carrinho e o total atualizando.", "Cadastre o código de barras do produto uma vez. Na venda, basta usar o leitor para encontrar o item. O campo de busca recebe o foco automaticamente quando você volta para Vendas, ajudando a manter o ritmo do atendimento.", "Código lido. Produto encontrado.", "Envie para quem tem fila no balcão.", "Cada segundo economizado melhora a experiência de quem está esperando."),
    R("A câmera vira leitor", "Sem leitor de código? Use a câmera do celular.", "Toque no ícone da câmera ao lado da busca.", "Aponte para um código e mostre a confirmação no sistema.", "No celular compatível, o PDV Pro usa a câmera traseira para ler códigos de barras. Você aponta, o sistema identifica e leva o código para a busca. É uma solução prática para começar sem comprar equipamento extra.", "Seu celular pode ler o código", "Quer testar no seu comércio? Chame no direct.", "Comece com o equipamento que você já tem."),
    R("Cadastro por câmera", "Até cadastrar produto pode ficar mais rápido.", "Abra Novo item e toque na câmera ao lado do código.", "Leia a embalagem e mostre o código preenchido no cadastro.", "A câmera também pode ajudar no cadastro. Em vez de digitar todos os números da embalagem, você lê o código e continua preenchendo nome, preço, custo e estoque. Isso reduz erro de digitação e acelera a montagem da sua base.", "Leia o código no cadastro", "Salve para lembrar quando organizar seu estoque.", "Um cadastro bem feito deixa a venda muito mais simples."),
    R("Carrinho sem complicação", "Errou a quantidade? Corrija em um toque.", "Adicione um produto e use os botões de aumentar e diminuir.", "Remova um item e mostre o total sendo recalculado.", "No carrinho, você ajusta quantidade, remove itens e acompanha o subtotal na hora. Nada de apagar a venda inteira porque o cliente mudou de ideia. O atendimento continua rápido e o valor fica sempre visível.", "Ajuste o carrinho na hora", "Marque alguém que atende clientes todos os dias.", "Flexibilidade no carrinho evita retrabalho no balcão."),
    R("Desconto com total automático", "Dar desconto não precisa virar conta de cabeça.", "Mostre o campo Desconto e informe uma porcentagem.", "Aproxime a gravação do subtotal, desconto e total final.", "Digite o percentual de desconto e o PDV Pro recalcula o total automaticamente. Você vê o valor original, o desconto aplicado e quanto o cliente vai pagar. Isso traz velocidade e reduz o risco de cobrar errado.", "Desconto calculado automaticamente", "Quer vender com mais segurança? Fale comigo.", "Negocie com o cliente sem perder o controle da conta."),

    R("Troco calculado", "Troco errado também é prejuízo.", "Escolha Dinheiro e digite o valor recebido.", "Mostre o troco aparecendo em destaque.", "Na venda em dinheiro, informe quanto o cliente entregou. O sistema calcula o troco na hora e deixa o valor destacado. É simples, mas ajuda muito nos momentos de fila, pressa e notas parecidas.", "Recebeu. Calculou. Conferiu.", "Compartilhe com quem trabalha no caixa.", "Pequenos controles evitam perdas repetidas."),
    R("PIX com valor certo", "Chega de digitar o valor do PIX no celular do cliente.", "Escolha PIX em uma venda pronta.", "Mostre o QR Code com o valor exato e os dados do recebedor.", "Depois de configurar sua chave, o PDV Pro gera um QR Code PIX com o valor exato da venda. O cliente escaneia e já encontra o valor preenchido. Isso agiliza o pagamento e reduz erro de digitação.", "QR Code com o valor da venda", "Quer ver essa função ao vivo? Peça uma demonstração.", "Pagamento rápido para o cliente e conferência mais fácil no balcão."),
    R("PIX copia e cola", "Nem todo cliente consegue apontar a câmera para o QR Code.", "Abra o PIX e mostre o botão Copiar código PIX.", "Cole o código em uma conversa de exemplo, sem enviar para ninguém.", "Além do QR Code, o sistema pode disponibilizar o código PIX copia e cola. Você copia e mostra ao cliente como encaminhar para o próprio aparelho. É uma alternativa útil quando o pagamento está sendo feito de outro celular.", "QR Code ou copia e cola", "Salve este vídeo para mostrar à sua equipe.", "Mais de um caminho para concluir a mesma venda."),
    R("Crédito, débito e parcelas", "Cartão não é tudo igual no relatório.", "Escolha Cartão e alterne entre crédito e débito.", "Mostre a escolha de parcelas no crédito.", "Ao registrar uma venda no cartão, informe se foi crédito ou débito e escolha a quantidade de parcelas disponível. Esses detalhes ficam ligados à venda e ajudam a consultar depois como o pagamento foi feito.", "Registre o tipo e as parcelas", "Comente CARTÃO se isso faz falta no seu controle.", "Detalhe registrado hoje evita dúvida amanhã."),
    R("Fiado dentro da venda", "Fiado sem registro vira dor de cabeça.", "Escolha Fiado na forma de pagamento.", "Selecione um cliente e mostre a data prevista de pagamento.", "No PDV Pro, a venda fiado exige um cliente cadastrado e pode receber uma data prevista de pagamento. O valor entra no saldo daquele cliente, com os itens e a data da compra. Você para de depender da memória ou de um caderninho solto.", "Fiado com cliente e vencimento", "Mande este vídeo para quem ainda anota fiado no papel.", "Vender fiado é uma decisão. Perder o controle não precisa ser."),
    R("Compra ligada ao cliente", "Quer saber o que seu cliente já comprou?", "Antes de finalizar uma venda paga, selecione um cliente.", "Depois abra o histórico desse cliente e mostre a compra registrada.", "Mesmo quando a venda é em dinheiro, PIX ou cartão, você pode associar o cliente. Assim, o histórico guarda data, produtos, valor, forma de pagamento e comprovante. Isso ajuda no atendimento e no relacionamento.", "Venda paga também entra no histórico", "Quer conhecer melhor seus clientes? Fale com a gente.", "Histórico bom transforma atendimento em relacionamento."),
    R("Venda em andamento fica guardada", "O navegador fechou no meio da venda?", "Monte um carrinho e mostre os dados de pagamento preenchidos.", "Reabra a tela e destaque a recuperação do rascunho da venda.", "Enquanto você monta a venda, o PDV Pro salva um rascunho no aparelho. Carrinho, desconto e dados de pagamento podem ser recuperados se a tela for recarregada. É uma proteção prática para uma rotina que não pode parar por qualquer toque errado.", "Rascunho automático da venda", "Salve este recurso na sua lista de diferenciais.", "Continuidade no atendimento também é produtividade."),

    R("Comprovante na tela", "O cliente quer conferir a compra antes de sair?", "Finalize uma venda e abra o comprovante.", "Percorra itens, total, pagamento e dados da operação.", "Ao concluir, o sistema mostra um comprovante com os itens, valores e forma de pagamento. Você confere junto com o cliente e mantém a informação ligada à venda. É transparência no balcão e menos discussão depois.", "Tudo conferido no comprovante", "Quer profissionalizar seu atendimento? Chame no direct.", "Um comprovante claro passa segurança."),
    R("Imprima ou salve em PDF", "Seu comprovante pode ir para o papel ou para o celular.", "No comprovante, toque em Imprimir/PDF.", "Mostre as opções de impressão e geração do arquivo.", "Depois da venda, você escolhe imprimir ou gerar o comprovante em PDF. O arquivo pode ser guardado ou enviado ao cliente pelos canais que sua empresa já usa. Assim, você atende quem prefere papel e quem prefere digital.", "Papel ou PDF", "Envie este vídeo para quem quer reduzir papel no caixa.", "O cliente escolhe como quer receber; você mantém o processo organizado."),
    R("Sua empresa no comprovante", "Seu cupom precisa ter a cara da sua empresa.", "Abra as configurações e mostre nome, CNPJ, razão social e contato.", "Gere um comprovante e destaque os dados preenchidos.", "Cadastre os dados da empresa uma vez e eles passam a aparecer nos comprovantes e documentos do sistema. Nome, CNPJ validado, razão social, inscrição estadual, telefone, e-mail e endereço deixam a entrega mais profissional.", "Dados da empresa no documento", "Quer causar uma impressão mais profissional? Fale comigo.", "Detalhes de apresentação aumentam a confiança do cliente."),
    R("Venda protegida contra exclusão", "Apagar venda não pode ser um clique sem controle.", "Abra o histórico e toque na opção de excluir uma venda.", "Mostre a tela pedindo confirmação administrativa, sem digitar senha real.", "O sistema exige confirmação administrativa para ações sensíveis, como excluir uma venda. Isso reduz o risco de alguém remover registros por engano ou sem autorização. Controle também é proteger o histórico.", "Ações sensíveis pedem confirmação", "Salve para comparar com o sistema que você usa hoje.", "Segurança prática para a rotina do caixa."),
    R("Cadastre produto completo", "Um bom estoque começa num cadastro bem feito.", "Abra Novo item e percorra nome, código, preço, custo e unidade.", "Mostre estoque, categoria, descrição, imagem e catálogo.", "No cadastro de produto, você reúne as informações que fazem a operação funcionar: nome, código de barras, preço, custo, unidade, estoque, categoria, descrição, imagem e visibilidade no catálogo. Depois disso, vender e divulgar fica muito mais rápido.", "Cadastre uma vez. Use em todo o sistema.", "Quer montar sua base com organização? Peça uma demonstração.", "O cadastro é a fundação do seu controle."),
    R("Cadastre serviços", "Seu trabalho não cabe numa caixinha de estoque.", "No cadastro, mude o tipo de Produto para Serviço.", "Adicione o serviço ao carrinho e ajuste o valor unitário.", "Serviços entram no PDV sem movimentar estoque. Você define um preço e, quando necessário, ajusta o valor no carrinho para aquele atendimento. É útil para gráfica, assistência técnica, manutenção, instalação e muitos outros profissionais.", "Serviço sem controle de estoque", "Marque um prestador de serviço que precisa disso.", "Venda serviço com a mesma organização de uma loja."),
    R("Unidades que fazem sentido", "Nem tudo é vendido por unidade.", "Mostre as opções unidade, quilo, grama, litro e mililitro.", "Cadastre exemplos como ração, doce, bebida ou produto a granel.", "O PDV Pro permite escolher a unidade que combina com o item: unidade, quilo, grama, litro ou mililitro. Isso deixa o cadastro mais fiel ao que você realmente vende e facilita a leitura de estoque e comprovantes.", "Un, kg, g, l e ml", "Qual unidade você mais usa? Responda nos comentários.", "O sistema precisa falar a linguagem do seu balcão."),
    R("Venda por peso", "Vende por quilo? Olha isso.", "Abra um produto configurado por quilo e mostre a tela de pesagem.", "Digite o peso em gramas e destaque o valor calculado.", "Para um produto vendido por quilo, informe o peso em gramas. O PDV converte para quilo, calcula o valor e adiciona ao carrinho. Isso ajuda casas de ração, doces, hortifruti e qualquer negócio que trabalha com quantidade fracionada.", "Digite o peso. O valor sai na hora.", "Envie para quem vende produto a granel.", "Pesagem simples, cobrança mais precisa."),

    R("Preço e custo no cadastro", "Você sabe o que vende ou só sabe o que recebe?", "Abra um produto e destaque os campos Preço de venda e Custo.", "Mostre a lista de produtos organizada, sem expor dados reais.", "Registrar preço e custo no mesmo cadastro ajuda a lembrar que faturamento não é lucro. O PDV Pro guarda essas referências para o produto e deixa a base mais completa para a gestão do negócio.", "Preço de venda não é custo", "Salve este lembrete para revisar seus cadastros.", "Controle começa quando os números têm nome."),
    R("Estoque baixa com a venda", "Vendeu? O estoque precisa saber.", "Mostre o saldo de um produto antes da venda.", "Finalize a venda e volte ao produto para mostrar o novo saldo.", "Quando um produto é vendido, o saldo é atualizado no sistema. Você não precisa dar baixa manual em cada item depois. Isso reduz esquecimento e ajuda a enxergar o que realmente ainda está disponível.", "Venda registrada, estoque atualizado", "Quer parar de contar no escuro? Mande PDV no direct.", "Estoque atualizado começa no momento da venda."),
    R("Alerta de estoque baixo", "Descobrir que acabou só quando o cliente pede é tarde.", "Abra Relatórios e aproxime o indicador Estoque Baixo.", "Mostre alguns produtos com pouco saldo na lista.", "O painel destaca quantos produtos estão com estoque baixo. Assim, você identifica a necessidade de reposição antes de perder vendas. É uma informação simples, mas muito valiosa para quem compra mercadoria no dia a dia.", "Veja o que precisa repor", "Compartilhe com quem faz as compras da loja.", "Reposição planejada custa menos que venda perdida."),
    R("Estoque compartilhado", "Dois produtos podem consumir o mesmo pacote de estoque.", "Mostre um item de origem e outro vinculado em Estoque compartilhado.", "Simule uma venda e destaque que o saldo comum foi reduzido.", "Se diferentes ofertas usam o mesmo saldo, vincule os produtos. Por exemplo: uma ração vendida em porções ou um serviço que consome o mesmo material. A venda de qualquer item vinculado baixa a mesma origem e evita saldo duplicado.", "Vários itens, um único saldo", "Comente ESTOQUE se esse problema acontece no seu negócio.", "O estoque deve representar a mercadoria real, não nomes diferentes na tela."),
    R("Categorias reutilizáveis", "Sua lista de produtos virou uma bagunça?", "Crie uma categoria pelo botão + Nova.", "Abra Gerenciar e mostre as categorias disponíveis.", "Organize produtos e serviços por categorias que fazem sentido para sua loja. Você pode criar novas opções, reutilizar no cadastro e remover as que não precisa mais. Isso facilita busca, catálogo e leitura da base.", "Categorias do seu jeito", "Qual categoria não pode faltar na sua loja?", "Organizar por categoria ajuda você e ajuda o cliente."),
    R("Foto e descrição do produto", "O cliente compra melhor quando entende o que está vendo.", "Abra os campos de descrição e URL da imagem.", "Depois mostre o mesmo item aparecendo bonito no catálogo.", "Cadastre uma descrição clara e uma imagem pública para o produto. Esses dados alimentam o catálogo e ajudam o cliente a conhecer melhor o item antes de chamar no WhatsApp. É o cadastro trabalhando também na divulgação.", "Cadastro que vira vitrine", "Salve para melhorar seus produtos um por um.", "Informação boa reduz dúvida e aproxima a compra."),
    R("Escolha o que vai ao catálogo", "Nem todo item interno precisa aparecer para o cliente.", "Mostre a opção Visível no catálogo no cadastro.", "Alterne entre marcado e desmarcado e abra a vitrine pública.", "Você decide quais produtos e serviços ficam públicos. Um item pode continuar cadastrado para venda interna sem aparecer no catálogo. Isso dá liberdade para divulgar apenas o que está pronto para oferecer.", "Você controla a vitrine", "Quer montar um catálogo mais estratégico? Fale comigo.", "Mostrar menos, mas mostrar melhor, também vende."),

    R("Cadastro completo de clientes", "Cliente não é só um nome no WhatsApp.", "Abra Novo cliente e percorra os campos do cadastro.", "Mostre nome, CPF, WhatsApp, e-mail, nascimento, cidade e endereço.", "No PDV Pro, você cria uma ficha organizada para cada cliente. Os dados são opcionais além do nome, então dá para começar simples e completar com o tempo. Isso deixa contatos, compras e fiado no mesmo histórico.", "Uma ficha para cada cliente", "Quer sair das conversas perdidas? Peça uma demonstração.", "Informação organizada melhora o atendimento."),
    R("CPF com validação", "Um número digitado errado pode estragar seu cadastro.", "Digite um CPF de exemplo inválido e mostre o aviso.", "Depois preencha um formato de demonstração válido, sem usar dado real.", "O campo de CPF formata e valida o número antes de salvar. Isso ajuda a reduzir cadastros incompletos ou com erro de digitação. Para a demonstração, use sempre dados fictícios e nunca exponha documentos de clientes.", "Validação para reduzir erros", "Salve este vídeo como ideia de demonstração segura.", "Dados corretos começam no cadastro."),
    R("Encontre qualquer cliente", "Procurar conversa antiga não é cadastro.", "Use a busca por nome, CPF, WhatsApp e e-mail.", "Abra o cartão de um cliente encontrado.", "A busca do PDV Pro localiza clientes por diferentes dados. Você digita o que lembra e encontra a ficha certa sem percorrer uma lista enorme. É rapidez no atendimento e menos chance de cadastrar a mesma pessoa duas vezes.", "Busque pelo dado que lembrar", "Marque quem sempre pergunta: onde anotei esse cliente?", "Uma busca boa devolve tempo para vender."),
    R("Histórico de compras", "Seu cliente pediu o mesmo produto de antes. Você lembra qual era?", "Abra a ficha de um cliente e entre no histórico.", "Mostre datas, itens, valores e formas de pagamento.", "Ao associar o cliente à venda, o sistema monta um histórico com produtos, datas, valores e pagamento. Na próxima conversa, você consulta o que ele levou e atende com muito mais contexto.", "Atenda lembrando do cliente", "Quer transformar histórico em relacionamento? Fale comigo.", "Quem conhece o cliente atende melhor."),
    R("WhatsApp organizado", "O WhatsApp vende, mas não deve ser sua única memória.", "Mostre o campo de WhatsApp no cadastro do cliente.", "Abra a ficha pronta e destaque o contato junto do histórico.", "Guarde o WhatsApp na ficha do cliente e mantenha o contato ao lado das compras e observações. Assim, a conversa continua no canal que ele já usa, mas sua empresa não depende apenas do histórico do aplicativo.", "Contato e compras no mesmo lugar", "Envie para quem vende muito pelo WhatsApp.", "Use o WhatsApp para conversar e o PDV para organizar."),
    R("Detalhes que ajudam a vender", "Uma pequena informação pode melhorar o próximo atendimento.", "Mostre data de nascimento, cidade, endereço e observações.", "Dê exemplos fictícios de preferência, entrega ou referência.", "Além do contato, você pode guardar data de nascimento, endereço, cidade e observações. Use esses campos com responsabilidade para registrar informações úteis ao atendimento, como preferência de entrega ou uma necessidade específica.", "Mais contexto, melhor atendimento", "Salve e adapte à realidade do seu negócio.", "Personalização começa com informação relevante."),
    R("Cliente sem limite obrigatório", "Você não precisa oferecer crédito para cadastrar alguém.", "Cadastre um cliente comum sem preencher limite.", "Associe esse cliente a uma venda paga.", "O cadastro de cliente não obriga você a definir limite de fiado. Qualquer pessoa pode entrar na base e ter compras pagas associadas ao histórico. O crédito só é configurado quando fizer sentido para a sua política.", "Cadastro de cliente não é crédito", "Compartilhe com quem confunde ficha de cliente com caderneta.", "Relacionamento e crédito são decisões diferentes."),

    R("Fiado sem limite fixo", "Tem cliente antigo que compra sem um teto definido?", "Abra a configuração de fiado e mostre a opção sem limite.", "Faça uma venda fictícia e destaque o saldo do cliente.", "Quando sua política permitir, o cliente pode ficar marcado como sem limite fixo. Mesmo assim, cada compra fica registrada com itens, data e saldo. A liberdade comercial não precisa significar falta de controle.", "Sem limite fixo, com histórico", "Quer organizar sua caderneta? Chame no direct.", "Confiança com registro é muito mais segura."),
    R("Fiado com limite", "Dizer sim para toda venda fiado pode apertar seu caixa.", "Mostre um cliente com limite configurado.", "Simule uma compra perto do teto e destaque a informação de saldo.", "Você também pode definir um limite de crédito por cliente. Antes de concluir, o sistema mostra a situação do saldo e ajuda a seguir a regra que sua empresa decidiu. É uma forma mais clara de vender a prazo.", "Crédito com regra definida", "Salve para conversar sobre política de fiado na sua loja.", "Limite não é desconfiança; é proteção para os dois lados."),
    R("Dia e vencimento do fiado", "Cobrança sem data vira promessa aberta.", "Mostre o dia de pagamento no cadastro do cliente.", "Na venda fiado, escolha a data prevista de pagamento.", "Registre o dia habitual do cliente e a data prevista para aquela venda. Assim, o saldo não fica solto e você consegue conversar com base no que foi combinado. O objetivo é deixar o acordo claro.", "Combine e registre a data", "Envie para quem administra contas a receber.", "O que tem data é muito mais fácil de acompanhar."),
    R("Recebimento parcial", "O cliente pagou uma parte. E agora?", "Abra Receber / Fechamento na ficha do cliente.", "Registre um valor parcial e mostre o saldo restante.", "No PDV Pro, você registra pagamentos parciais sem apagar a dívida original. O histórico mostra o que foi comprado, quanto já foi recebido e qual saldo continua pendente. Cada acerto fica documentado.", "Recebeu uma parte? Registre.", "Comente FIADO se você quer ver essa função completa.", "Pagamento parcial não precisa virar conta confusa."),
    R("Extrato do fiado em PDF", "Chega de discutir saldo olhando anotação solta.", "Na ficha, toque em Extrato PDF.", "Mostre páginas com compras, itens, pagamentos e saldo, usando dados fictícios.", "O extrato em PDF reúne compras, itens, datas, pagamentos e o saldo pendente do cliente. Você pode conferir junto com ele e guardar um fechamento mais claro. Transparência ajuda a preservar o relacionamento.", "Extrato completo do cliente", "Quer apresentar o saldo com clareza? Peça uma demonstração.", "Conta bem explicada evita ruído na cobrança."),
    R("Edite o cliente sem perder histórico", "Telefone mudou? Corrija a ficha, não crie outra.", "Abra um cliente existente e toque em Editar.", "Altere um contato fictício e volte ao histórico.", "Os dados do cliente podem ser atualizados sem apagar as compras e pagamentos já registrados. Isso evita fichas duplicadas e mantém a trajetória daquela pessoa em um só lugar.", "Atualize a ficha, preserve o histórico", "Salve como rotina de revisão cadastral.", "Cadastro vivo acompanha as mudanças do cliente."),
    R("Dívida não some com um clique", "Excluir cliente com saldo aberto seria perigoso.", "Mostre um cliente com saldo e a tentativa de exclusão.", "Depois mostre que a exclusão só fica disponível com saldo zerado.", "Para proteger o histórico financeiro, o sistema só permite excluir um cliente quando o saldo do fiado está zerado. Primeiro você registra o recebimento e encerra a pendência; depois decide se a ficha deve ser removida.", "Saldo aberto protege o histórico", "Compartilhe com quem administra o crediário.", "Controle bom impede atalhos que criam problemas."),

    R("Entrada de caixa", "Entrou dinheiro que não veio de uma venda? Registre.", "Abra Caixa, escolha Entrada e preencha valor e descrição.", "Mostre o histórico de movimentos atualizado.", "O caixa permite registrar entradas com valor e descrição. Assim, o saldo representa melhor o dinheiro físico disponível e você consegue consultar depois de onde veio aquele movimento.", "Toda entrada precisa de motivo", "Quer fechar o caixa com menos diferença? Fale comigo.", "Movimento explicado é movimento conferível."),
    R("Sangria de caixa", "Caixa cheio não é caixa seguro.", "Escolha Saída e finalidade Sangria.", "Digite um valor fictício e mostre o saldo diminuindo.", "A sangria registra o dinheiro retirado do caixa para ser guardado. Ela reduz o saldo físico daquele caixa, mas não vira despesa do negócio. É a classificação correta para não distorcer o resultado.", "Sangria não é despesa", "Salve para treinar sua equipe.", "Dar o nome certo ao movimento protege seus números."),
    R("Despesa no caixa", "Pagou uma conta com dinheiro do caixa?", "Escolha Saída, finalidade Despesa e uma categoria.", "Mostre o lançamento refletindo no Financeiro.", "Quando uma retirada foi realmente usada para pagar algo da empresa, classifique como despesa e escolha a categoria. Essa saída reduz o caixa e também entra no resultado financeiro. Assim, a gestão entende o destino do dinheiro.", "Despesa afeta o resultado", "Envie para quem mistura retirada com gasto.", "O mesmo valor pode ter significados diferentes; classifique certo."),
    R("Transferência não é gasto", "Mandar dinheiro para outra conta não significa que você perdeu dinheiro.", "Registre uma saída com finalidade Transferência.", "Abra o Financeiro e destaque transferências separadas de despesas.", "Use Transferência quando o valor apenas mudou de lugar, como do caixa para a conta bancária. O movimento altera a carteira, mas não é tratado como receita ou despesa. Isso evita um resultado falso.", "Mudou de conta, não virou despesa", "Salve para o próximo fechamento.", "Gestão melhora quando fluxo e resultado não se confundem."),
    R("Movimento do operador com autorização", "Nem todo funcionário deve retirar dinheiro sozinho.", "Entre como operador e tente registrar entrada ou retirada.", "Mostre a solicitação de senha do titular, sem revelar nenhuma credencial.", "Operadores podem acompanhar e abrir ou fechar o caixa, mas entradas e retiradas exigem a senha do titular. Isso mantém a equipe trabalhando sem abrir mão do controle sobre movimentos sensíveis.", "Equipe ágil, titular no controle", "Quer acesso por função? Peça uma demonstração.", "Permissão certa reduz risco sem travar a operação."),
    R("Fechamento com PDF", "Fechar o caixa não deveria terminar numa foto de calculadora.", "Clique em Fechar caixa e confirme o encerramento.", "Mostre o PDF com resumo e dados do período.", "Ao fechar o caixa, o PDV Pro salva a sessão e gera um PDF do fechamento. O documento ajuda na conferência, no arquivamento e na comparação com o dinheiro contado.", "Fechou, salvou, gerou PDF", "Compartilhe com quem fecha loja todo dia.", "Um fechamento documentado traz paz no dia seguinte."),
    R("Histórico de fechamentos", "Perdeu o PDF de ontem?", "Abra o histórico de fechamentos.", "Escolha um registro antigo e use Baixar PDF novamente.", "Os fechamentos ficam guardados no histórico e o PDF pode ser baixado outra vez. Você consulta data, responsáveis e informações da sessão sem depender de um arquivo salvo no aparelho.", "Fechamentos disponíveis na nuvem", "Salve este diferencial para comparar sistemas.", "Histórico acessível facilita conferência e prestação de contas."),

    R("Venda entra no financeiro", "Você não deveria digitar a mesma venda duas vezes.", "Finalize uma venda de demonstração.", "Abra o Financeiro e mostre o lançamento automático.", "As vendas registradas alimentam automaticamente o painel financeiro do titular. Você vende no balcão e a receita aparece no controle, sem criar um lançamento manual para repetir a informação.", "Venda registrada uma única vez", "Quer reduzir retrabalho? Chame no direct.", "Automação simples libera tempo para gerir."),
    R("Fiado recebido vira entrada", "Venda fiado não é dinheiro no caixa até o cliente pagar.", "Mostre um saldo fiado e registre um recebimento.", "Abra o Financeiro e destaque a entrada correspondente.", "O sistema separa a compra fiado do recebimento. Quando o cliente paga, esse valor entra no financeiro como recebimento. Assim, você não trata promessa de pagamento como dinheiro já disponível.", "Recebimento no momento certo", "Envie para quem controla contas a receber.", "Fluxo de caixa precisa respeitar quando o dinheiro realmente chegou."),
    R("Receita manual", "Nem toda entrada vem de uma venda no balcão.", "Clique em + Receita no Financeiro.", "Preencha categoria, descrição, valor e data.", "Para outras entradas, o titular pode criar uma receita manual com categoria, descrição, valor e data. O histórico fica completo mesmo quando o dinheiro veio de outra fonte da operação.", "Registre receitas fora do balcão", "Qual receita extra existe no seu negócio?", "Toda entrada importante merece contexto."),
    R("Despesa com centavos", "R$ 1,15 também conta no fim do mês.", "Clique em + Despesa e digite um valor com vírgula.", "Mostre o lançamento e o total atualizado.", "O financeiro aceita valores com centavos usando vírgula ou ponto. Você registra despesas pequenas sem arredondar e mantém o resultado mais fiel. Somadas, essas pequenas diferenças podem representar muito.", "Centavos também são dinheiro", "Salve para lembrar de registrar os pequenos gastos.", "Precisão diária melhora a visão mensal."),
    R("Transferência na carteira", "Dinheiro entrou na conta, mas não foi venda?", "Clique em + Transferência e escolha entrada ou saída.", "Mostre o indicador de transferências separado.", "A transferência adiciona ou retira dinheiro da carteira sem classificar o valor como receita ou despesa. É útil para movimentar recursos entre caixa e banco mantendo o resultado do negócio limpo.", "Movimento de carteira separado", "Compartilhe com quem faz conciliação.", "Saldo e resultado são números relacionados, mas não iguais."),
    R("Saldo continua no mês seguinte", "Virou o mês. Seu dinheiro não voltou para zero.", "Selecione um mês com saldo final.", "Avance para o mês seguinte e destaque o saldo inicial automático.", "O saldo final de um mês vira o saldo inicial do seguinte. O PDV Pro trata a carteira como uma continuidade, porque o dinheiro disponível não desaparece na mudança do calendário.", "Fechamento de um mês abre o próximo", "Quer uma visão financeira mais real? Fale comigo.", "Gestão mensal sem quebrar a continuidade do caixa."),
    R("Resultado e economia", "Faturar muito não basta. Quanto ficou?", "Abra os indicadores de receitas, despesas e resultado.", "Destaque o percentual de economia mensal.", "O painel compara receitas consideradas, despesas consideradas e resultado. Também calcula o percentual de economia sobre as receitas. É uma leitura rápida para saber se o movimento está virando resultado.", "Receita - despesa = resultado", "Comente GESTÃO se você quer enxergar isso no seu negócio.", "O objetivo não é só vender; é entender o que a venda deixa."),

    R("Resumo por categoria", "Qual tipo de gasto está pesando mais?", "Abra a área Por categoria no Financeiro.", "Percorra duas ou três categorias fictícias.", "Os lançamentos são agrupados por categoria para facilitar a leitura. Em vez de olhar uma lista sem fim, você identifica onde o dinheiro entra e onde sai com mais frequência.", "Veja o peso de cada categoria", "Salve para sua análise de fim de mês.", "Decisão boa começa quando o gasto deixa de ser genérico."),
    R("Guarde sem afetar cálculos", "Quer registrar uma informação sem mudar o saldo?", "Abra um lançamento manual e desmarque Considerar nos cálculos.", "Mostre o item guardado no histórico.", "Um lançamento pode ficar salvo para consulta sem alterar resultado nem saldo da carteira. Essa opção é útil para anotações financeiras que você quer documentar, mas que não pertencem ao cálculo daquele momento.", "No histórico, fora do cálculo", "Quer conhecer os detalhes do Financeiro? Peça uma demonstração.", "Flexibilidade com clareza: você escolhe o que entra na conta."),
    R("Relatório de qualquer dia", "Quer conferir uma venda de terça-feira passada?", "Abra Relatórios e escolha uma data anterior.", "Mostre vendas, faturamento e lista daquele dia.", "O filtro de data permite consultar qualquer dia salvo. Você vê quantidade de vendas, faturamento, itens, formas de pagamento e ações disponíveis. É muito mais rápido do que procurar por memória.", "Escolha a data e confira", "Envie para quem vive procurando venda antiga.", "Histórico pesquisável transforma dúvida em resposta."),
    R("Venda por operador", "Quem vendeu esse pedido?", "No relatório, abra o filtro Vendas por operador.", "Selecione um nome e mostre o resumo filtrado.", "Cada venda feita por um acesso individual guarda o nome do vendedor. No relatório, o titular pode filtrar por operador e conferir o movimento de cada pessoa na data escolhida.", "Saiba quem registrou a venda", "Quer acompanhar sua equipe com clareza? Fale comigo.", "Responsabilidade registrada melhora o processo."),
    R("Resumo do dia", "Quatro números para entender o balcão.", "Mostre os cartões Vendas, Faturamento, Produtos e Estoque baixo.", "Aponte para cada indicador enquanto explica.", "O dashboard reúne o número de vendas da data, o faturamento, a quantidade de produtos cadastrados e o alerta de estoque baixo. Em poucos segundos, você tem um retrato do dia e da operação.", "Vendas, faturamento, produtos e estoque", "Salve como referência de painel simples.", "Informação importante não precisa ficar escondida."),
    R("Reabra um comprovante antigo", "O cliente voltou pedindo o comprovante.", "Escolha uma data no relatório e localize a venda.", "Abra o comprovante daquela venda.", "O histórico permite abrir novamente o comprovante de uma venda salva. Você consulta os itens e o pagamento sem criar outro pedido. Isso ajuda no atendimento pós-venda e na conferência.", "Comprovante disponível no histórico", "Compartilhe com quem atende troca e suporte.", "Pós-venda organizado começa com histórico acessível."),
    R("Backup completo", "Nuvem não elimina a boa prática de ter backup.", "Abra Relatórios e clique em Backup Completo.", "Mostre o arquivo sendo salvo, sem abrir dados reais.", "O PDV Pro permite exportar um backup completo da operação. Faça isso periodicamente e guarde o arquivo em um local seguro. Backup é uma camada extra de tranquilidade para qualquer negócio.", "Crie backups periódicos", "Salve este vídeo e escolha um dia fixo para o backup.", "Prevenção é mais barata que reconstrução."),
    R("Recupere um backup", "Trocar de aparelho não precisa significar começar do zero.", "Mostre o botão Recuperar Backup.", "Selecione apenas um arquivo fictício de demonstração e pare antes de confirmar.", "Com um arquivo de backup válido, você pode iniciar a recuperação dos dados pelo próprio sistema. Antes de qualquer importação real, confira a data e mantenha uma cópia do estado atual.", "Backup também precisa ser recuperável", "Envie para quem está organizando a migração do caixa.", "Guardar é importante; saber recuperar é essencial."),

    R("Crie um acesso por funcionário", "Compartilhar a senha do dono não é trabalho em equipe.", "Abra o ADM e mostre o cadastro de operador.", "Preencha nome e um e-mail fictício, sem salvar credenciais reais.", "O titular cria um acesso individual para cada funcionário, com nome, e-mail e senha inicial. Assim, ninguém precisa usar a conta do dono e as ações ficam ligadas à pessoa certa.", "Um login para cada operador", "Quer organizar os acessos da equipe? Chame no direct.", "Acesso individual é mais profissional e mais seguro."),
    R("Venda com nome do vendedor", "Sua venda pode responder quem atendeu.", "Entre com um operador de demonstração e finalize uma venda.", "Abra o relatório e destaque o nome do vendedor.", "Quando o operador usa o próprio login, a venda registra o nome dele. Depois, o titular consulta essa informação no histórico e nos filtros de relatório. Não depende de perguntar quem estava no caixa.", "Vendedor registrado na venda", "Marque um gestor que precisa desse controle.", "Rastreabilidade simples melhora a rotina da equipe."),
    R("Permissões por função", "Funcionário precisa vender, não mexer em tudo.", "Mostre o menu de um operador e as áreas disponíveis.", "Depois mostre o menu do titular com Financeiro, Tema e ADM.", "Operadores acessam as rotinas necessárias, como vendas, orçamentos, clientes e caixa. Áreas sensíveis e administrativas ficam reservadas ao titular. Cada perfil vê o que combina com sua função.", "Cada pessoa vê o necessário", "Quer separar operação e administração? Peça uma demonstração.", "Permissão certa é liberdade com limite."),
    R("Pause e reative acessos", "Funcionário de férias não precisa ficar com acesso ativo.", "Abra a lista de operadores e mostre Pausar.", "Depois mostre a opção de reativar o mesmo acesso.", "O titular pode pausar e reativar operadores. Isso ajuda em afastamentos, trocas de turno ou qualquer período em que o acesso não deve ser usado, sem precisar criar tudo novamente depois.", "Pause hoje. Reative quando precisar.", "Salve como prática de segurança da equipe.", "Acesso deve acompanhar a situação real do funcionário."),
    R("Exclua um operador", "Quem saiu da empresa ainda consegue entrar no sistema?", "Na lista de operadores, destaque o botão Excluir.", "Mostre a confirmação, sem concluir em uma conta real.", "Quando o vínculo termina, o titular pode excluir o operador. O perfil deixa de aparecer na empresa e novos acessos ficam bloqueados. É uma etapa importante do desligamento.", "Desligou? Revogue o acesso.", "Compartilhe com quem administra funcionários.", "Segurança também é encerrar acessos no momento certo."),
    R("ADM protegido", "Configuração importante não pode ficar aberta no balcão.", "Toque em ADM do PDV.", "Mostre a tela de confirmação de senha, sem digitar a senha.", "O acesso às configurações administrativas pede confirmação do titular. Ali ficam operadores, PIX e dados da empresa. Essa barreira ajuda a evitar mudanças acidentais ou não autorizadas.", "Administração com confirmação", "Quer proteger as configurações do negócio? Fale comigo.", "Um bom sistema facilita o trabalho e protege o que é sensível."),
    R("Equipe sem acesso ao financeiro", "O caixa precisa funcionar sem expor toda a gestão.", "Entre como operador e mostre que Financeiro não aparece.", "Volte como titular e abra o painel financeiro.", "O Financeiro é uma área exclusiva do titular. O operador registra vendas e executa a rotina permitida, mas não visualiza receitas, despesas e saldo geral da carteira. Privacidade financeira continua com o responsável.", "Financeiro só para o titular", "Comente EQUIPE para saber como os perfis funcionam.", "Delegar atendimento não significa abrir todos os números."),

    R("Orçamento em poucos minutos", "Seu cliente pediu preço por escrito. E agora?", "Abra Orçamentos e clique em Novo orçamento.", "Preencha cliente e adicione produtos ou serviços cadastrados.", "Você monta uma proposta usando itens que já estão no PDV. Informe cliente, validade, produtos ou serviços e condições. O sistema calcula os valores e organiza tudo em um documento profissional.", "Do cadastro para a proposta", "Quer parar de montar orçamento do zero? Chame no direct.", "Responder rápido aumenta a chance de fechar."),
    R("Orçamento sem baixar estoque", "Proposta enviada não é venda concluída.", "Mostre o saldo de um produto.", "Crie um orçamento e volte ao estoque para provar que ele não mudou.", "Criar um orçamento não movimenta estoque nem caixa. Ele registra uma proposta, não uma venda. Isso permite negociar com o cliente sem distorcer a operação antes da aprovação.", "Orçou, mas ainda não vendeu", "Salve para explicar esse diferencial à equipe.", "Cada etapa deve mexer apenas no que realmente aconteceu."),
    R("Ajuste só naquele orçamento", "O preço da negociação não precisa mudar seu cadastro.", "Adicione um item ao orçamento.", "Altere quantidade ou valor unitário apenas na proposta.", "Os valores podem ser ajustados dentro do orçamento sem alterar o preço original do produto ou serviço. Assim, você negocia um projeto específico e mantém a tabela padrão intacta.", "Negocie sem bagunçar o cadastro", "Envie para quem faz proposta personalizada.", "Flexibilidade comercial com base organizada."),
    R("Desconto, frete e condições", "Preço sozinho não fecha uma boa proposta.", "Mostre desconto percentual e frete ou acréscimo.", "Percorra condições de pagamento, prazo e observações.", "No orçamento, você informa desconto, frete ou acréscimo, condições de pagamento, prazo de entrega e observações. O cliente recebe uma proposta mais completa e entende o que está incluído.", "Proposta clara reduz objeção", "Quer enviar orçamentos mais profissionais? Fale comigo.", "Quanto mais claro o acordo, mais fácil aprovar."),
    R("Rascunho e histórico", "O cliente ainda não decidiu? Não perca o trabalho.", "Salve um orçamento como rascunho.", "Abra o histórico e mostre editar, duplicar e buscar.", "Você pode salvar a proposta como rascunho, voltar depois, editar, duplicar e localizar pelo cliente ou número. Isso é ótimo para versões parecidas e negociações que levam mais de uma conversa.", "Salve agora. Termine depois.", "Salve este vídeo para sua rotina comercial.", "A proposta continua organizada mesmo quando a resposta demora."),
    R("Orçamento em PDF", "Uma proposta bonita muda a forma como o cliente enxerga seu trabalho.", "Finalize um orçamento com dados fictícios.", "Abra o PDF e percorra empresa, cliente, itens, total e aceite.", "Ao finalizar, o PDV Pro gera um PDF com dados da empresa, cliente, itens, valores, condições, prazo e espaços de aceite. Você entrega uma apresentação mais profissional sem diagramar documento manualmente.", "PDF pronto para apresentar", "Quer ver um modelo completo? Peça uma demonstração.", "Profissionalismo também aparece antes da venda."),
    R("CNPJ validado no orçamento", "Documento com dado errado perde credibilidade.", "Abra as configurações da empresa e mostre o campo CNPJ.", "Mostre que o orçamento final usa os dados salvos.", "Para finalizar a proposta, o sistema confere o CNPJ cadastrado da empresa. Os dados do emitente são puxados para o PDF, reduzindo repetição e ajudando a manter uma identidade consistente.", "Dados do emitente reaproveitados", "Compartilhe com quem cria propostas toda semana.", "Cadastre certo uma vez e reaproveite nos documentos."),

    R("Publique seu catálogo", "Sua loja pode ficar visível mesmo quando o balcão está fechado.", "Abra Meu Catálogo e preencha nome, WhatsApp e descrição.", "Clique em Salvar e publicar catálogo e mostre o link gerado.", "O PDV Pro cria uma vitrine pública com um endereço próprio. Você configura os dados da loja, publica e compartilha o mesmo link com os clientes. Eles conhecem seus itens antes de chamar.", "Um link para sua vitrine", "Quer colocar seu catálogo no ar? Chame no direct.", "Seu atendimento começa antes da primeira mensagem."),
    R("WhatsApp direto do catálogo", "O cliente gostou. Qual é o próximo passo?", "Abra um produto no catálogo público.", "Toque no botão de WhatsApp e mostre a conversa sendo preparada.", "No catálogo, o cliente encontra o produto e segue para o WhatsApp da loja. O caminho entre interesse e conversa fica curto, sem formulário complicado. Você recebe o contato no canal que já usa para vender.", "Do produto para o WhatsApp", "Envie este vídeo para quem vende pelo Instagram.", "Menos passos entre ver e pedir."),
    R("Produtos e serviços na vitrine", "Seu catálogo pode mostrar mais do que mercadoria.", "Mostre produtos com foto, preço e categoria.", "Depois mostre um serviço visível sem quantidade de estoque.", "Produtos com estoque positivo podem aparecer com foto, descrição, preço e categoria. Serviços marcados como visíveis também entram na vitrine sem controle de quantidade. O catálogo acompanha negócios mistos.", "Produto e serviço no mesmo link", "Qual item você colocaria primeiro no catálogo?", "Uma vitrine flexível mostra o que seu negócio realmente oferece."),
    R("Estoque protege a vitrine", "Anunciar produto esgotado gera frustração.", "Mostre um produto público com estoque.", "Zere o saldo em demonstração e atualize o catálogo para mostrar que ele deixa de ser ofertado.", "O catálogo público considera o estoque dos produtos visíveis. Quando não há saldo positivo, o item deixa de ser oferecido. Isso reduz a chance de o cliente pedir algo que já acabou.", "Catálogo acompanha o estoque", "Salve para comparar com catálogo feito só de fotos.", "Vitrine conectada evita promessa que o balcão não consegue cumprir."),
    R("Catálogo com categorias e detalhes", "Cliente perdido não compra rápido.", "Use os filtros de categoria no catálogo.", "Abra o detalhe de um item com imagem, descrição e preço.", "As categorias ajudam o cliente a navegar e o detalhe do item reúne as informações importantes. Em vez de mandar dezenas de fotos no WhatsApp, você envia um link organizado e deixa a pessoa explorar.", "Navegue, abra, escolha", "Quer apresentar seus produtos melhor? Fale comigo.", "Organização também vende."),
    R("Copie e compartilhe o link", "Seu catálogo precisa chegar onde o cliente está.", "No PDV, use Copiar link.", "Depois mostre Compartilhar e exemplos de destino sem enviar nada.", "Depois de publicar, copie o link ou use a opção de compartilhamento. Coloque na bio do Instagram, no status, em uma conversa ou em um QR Code impresso. O mesmo endereço continua sendo sua vitrine.", "Um link, vários canais", "Salve estas ideias de divulgação.", "O catálogo funciona melhor quando aparece em todos os pontos de contato."),
    R("Tema do PDV no catálogo", "Sua vitrine e seu sistema podem falar a mesma língua visual.", "Troque o tema no PDV e salve.", "Abra o catálogo no mesmo link e mostre cores, fonte e fundo atualizados.", "Ao salvar o tema do PDV, a configuração visual também é publicada no catálogo. Cores, fonte, cantos e imagem de fundo seguem a mesma identidade. Você muda uma vez e mantém consistência para equipe e clientes.", "Uma identidade em todo lugar", "Quer deixar sua marca mais reconhecível? Chame no direct.", "Consistência visual transmite cuidado."),

    R("Treze temas prontos", "Qual dessas lojas parece mais com a sua?", "Passe rapidamente pelos temas Padrão, Escuro e Dourado.", "Depois mostre Pet Shop, Adega, Conveniência, Doceria, Hortifruti, Gráfica, Informática, Futurista e os dois Neon.", "O Painel de Tema traz treze opções prontas para diferentes tipos de comércio. Cada uma combina cores, cartões, botões, fonte e imagem de fundo. Você escolhe, vê a prévia e salva sem precisar entender de design.", "13 visuais prontos para escolher", "Comente o nome do tema que combina com seu negócio.", "Seu sistema também pode ter personalidade."),
    R("Tema personalizado", "Não encontrou exatamente sua cor? Ajuste.", "Abra os controles de fundo, texto, cartões, botões e barra.", "Mude fonte, cantos e imagem de fundo e mostre a prévia.", "Além dos temas prontos, o titular pode personalizar cores, fonte, arredondamento e imagem de fundo. As mudanças aparecem antes de salvar, então você testa com calma até chegar ao visual da marca.", "Prévia antes de salvar", "Quer um PDV com a cara da sua empresa? Fale comigo.", "Personalização simples, identidade própria."),
    R("Volte ao padrão", "Personalizou e mudou de ideia?", "Escolha o tema Padrão.", "Mostre também o botão Restaurar padrão e a volta ao visual original.", "O tema original continua disponível. A qualquer momento, escolha Padrão ou use Restaurar padrão para remover a personalização. Você pode experimentar sem medo de ficar preso a uma escolha.", "Experimente e volte quando quiser", "Salve este vídeo antes de testar os temas.", "Liberdade para mudar também é parte de uma boa experiência."),
    R("Dados sincronizados", "Atualizou em um aparelho? A equipe precisa ver.", "Mostre o mesmo produto em duas telas de demonstração.", "Faça uma alteração em uma e mostre a atualização na outra.", "Os dados da empresa são sincronizados na nuvem para os acessos autorizados. Produtos, vendas, clientes, caixa e configurações acompanham a operação, ajudando titular e operadores a trabalhar com a mesma base.", "Uma base para a empresa", "Quer trabalhar sem versões diferentes da verdade? Chame no direct.", "Sincronização mantém a equipe na mesma página."),
    R("Recursos essenciais offline", "A internet oscilou. A tela precisa continuar abrindo.", "Ative o modo offline apenas para demonstração.", "Reabra o sistema e mostre os recursos essenciais carregados pelo cache.", "O PDV Pro usa cache para manter recursos essenciais disponíveis no aparelho. Isso ajuda a interface a abrir em situações de conexão instável. A sincronização completa depende da internet voltar, por isso mantenha também seus backups em dia.", "Interface preparada para conexão instável", "Salve e teste com responsabilidade no seu ambiente.", "Resiliência é combinar cache, nuvem e backup."),
    R("O PDV que cresce com a rotina", "Hoje você vende. Amanhã precisa entender o negócio.", "Faça um passeio rápido por venda, estoque, cliente, caixa e relatório.", "Termine no catálogo e no financeiro.", "O valor do PDV Pro não está em uma tela isolada. A venda atualiza estoque, aparece no histórico, alimenta relatórios e conversa com o financeiro. Clientes, fiado, equipe, orçamentos e catálogo completam uma operação que pode crescer com mais organização.", "Uma venda conecta toda a gestão", "Mande QUERO no direct e veja uma demonstração.", "Mais do que registrar pedidos: organize o caminho inteiro da venda."),
    R("Antes e depois do PDV", "Antes: papel, contas repetidas e dúvida. Depois: tudo registrado.", "Grave três cenas rápidas de papéis, calculadora e mensagens perdidas.", "Troque para o PDV mostrando venda, relatório e catálogo.", "Antes, cada informação fica em um lugar e o dono passa o dia procurando. Com o PDV Pro, a operação ganha um fluxo: cadastrar, vender, receber, acompanhar e divulgar. Não é mágica; é processo bem organizado para sobrar mais tempo para o cliente e para a gestão.", "Do improviso para o processo", "Se você se reconheceu no antes, fale comigo hoje.", "Seu negócio não precisa continuar dependendo da memória."),
    R("Convite para demonstração", "Se eu mostrasse seu negócio dentro deste sistema, o que você queria ver primeiro?", "Olhe para a câmera e faça a pergunta.", "Intercale respostas visuais: venda, estoque, fiado, orçamento, catálogo e temas.", "Cada negócio sente uma dor diferente. Pode ser fila no caixa, estoque que não bate, fiado sem controle, orçamento demorado ou catálogo desatualizado. O PDV Pro reúne essas rotinas em um só lugar. Me conte qual é seu maior desafio e eu mostro a parte certa do sistema.", "Qual é o maior desafio da sua loja?", "Escreva sua dúvida no comentário ou mande uma mensagem.", "A melhor demonstração começa pelo problema real do seu negócio."),
]

assert len(SCRIPTS) == 101, f"Esperados 101 roteiros, encontrados {len(SCRIPTS)}"


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="BodyPdv", fontName="PdvSans", fontSize=9.4, leading=13.1, textColor=INK, spaceAfter=0))
styles.add(ParagraphStyle(name="SmallPdv", fontName="PdvSans", fontSize=8.2, leading=11.2, textColor=MUTED))
styles.add(ParagraphStyle(name="TinyPdv", fontName="PdvSans", fontSize=7.5, leading=9.7, textColor=MUTED))
styles.add(ParagraphStyle(name="LabelPdv", fontName="PdvSansBold", fontSize=7.2, leading=8.6, textColor=EMERALD_DARK, uppercase=True, tracking=0.7))
styles.add(ParagraphStyle(name="TitlePdv", fontName="PdvSansBold", fontSize=20, leading=23, textColor=NAVY))
styles.add(ParagraphStyle(name="HookPdv", fontName="PdvSansBold", fontSize=15.5, leading=19, textColor=WHITE, alignment=TA_LEFT))
styles.add(ParagraphStyle(name="CardTitle", fontName="PdvSansBold", fontSize=9, leading=11.5, textColor=NAVY))
styles.add(ParagraphStyle(name="QuotePdv", fontName="PdvSans", fontSize=10.1, leading=14.2, textColor=INK))
styles.add(ParagraphStyle(name="CoverKicker", fontName="PdvSansBold", fontSize=10, leading=12, textColor=GOLD, alignment=TA_CENTER, tracking=1.5))
styles.add(ParagraphStyle(name="CoverTitle", fontName="PdvSansBold", fontSize=35, leading=39, textColor=WHITE, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="CoverSub", fontName="PdvSans", fontSize=13, leading=18, textColor=colors.HexColor("#D7E4F3"), alignment=TA_CENTER))
styles.add(ParagraphStyle(name="SectionTitle", fontName="PdvSansBold", fontSize=22, leading=25, textColor=NAVY))
styles.add(ParagraphStyle(name="Calendar", fontName="PdvSans", fontSize=7.8, leading=10, textColor=INK))


def P(text, style="BodyPdv"):
    clean = str(text).replace("\u2011", "-").replace("\u2013", "-").replace("\u2014", "-")
    return Paragraph(escape(clean), styles[style])


def page_base(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    canvas.setFillColor(NAVY)
    canvas.rect(0, A4[1] - 13 * mm, A4[0], 13 * mm, stroke=0, fill=1)
    canvas.setFont("PdvSansBold", 8)
    canvas.setFillColor(WHITE)
    canvas.drawString(16 * mm, A4[1] - 8.3 * mm, "PDV PRO  |  101 ROTEIROS PARA REELS")
    canvas.setFont("PdvSans", 8)
    canvas.setFillColor(colors.HexColor("#D7E4F3"))
    canvas.drawRightString(A4[0] - 16 * mm, A4[1] - 8.3 * mm, "GUIA DE CONTEUDO")
    canvas.setStrokeColor(LINE)
    canvas.line(16 * mm, 13 * mm, A4[0] - 16 * mm, 13 * mm)
    canvas.setFont("PdvSans", 7.8)
    canvas.setFillColor(MUTED)
    canvas.drawString(16 * mm, 8.2 * mm, "Roteiros simples para gravar mostrando a tela e falando com o cliente")
    canvas.drawRightString(A4[0] - 16 * mm, 8.2 * mm, f"Pagina {doc.page}")
    canvas.restoreState()


def cover(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    canvas.setFillColor(NAVY_2)
    canvas.circle(35 * mm, 252 * mm, 58 * mm, stroke=0, fill=1)
    canvas.setFillColor(EMERALD)
    canvas.circle(184 * mm, 42 * mm, 78 * mm, stroke=0, fill=1)
    canvas.setFillColor(ORANGE)
    canvas.circle(185 * mm, 250 * mm, 16 * mm, stroke=0, fill=1)
    canvas.setFillColor(GOLD)
    canvas.roundRect(24 * mm, 226 * mm, 162 * mm, 3 * mm, 1.5 * mm, stroke=0, fill=1)
    canvas.setFillColor(WHITE)
    canvas.roundRect(24 * mm, 33 * mm, 162 * mm, 27 * mm, 5 * mm, stroke=0, fill=1)
    canvas.setFont("PdvSansBold", 10)
    canvas.setFillColor(EMERALD_DARK)
    canvas.drawCentredString(A4[0] / 2, 49 * mm, "101 DIAS DE CONTEUDO")
    canvas.setFont("PdvSans", 9.4)
    canvas.setFillColor(INK)
    canvas.drawCentredString(A4[0] / 2, 41 * mm, "O que mostrar, o que falar, texto na tela, CTA e legenda pronta")
    canvas.setFont("PdvSans", 8)
    canvas.setFillColor(colors.HexColor("#D7E4F3"))
    canvas.drawCentredString(A4[0] / 2, 18 * mm, "Edicao 2026  |  Baseado nos recursos reais do PDV Pro")
    canvas.restoreState()


def box(title, content, bg=WHITE, border=LINE, label_color=EMERALD_DARK, pad=9):
    label = Paragraph(escape(title.upper()), ParagraphStyle("tmpLabel", parent=styles["LabelPdv"], textColor=label_color))
    data = [[label], [content]]
    t = Table(data, colWidths=[A4[0] - 32 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.8, border),
        ("ROUNDEDCORNERS", [8]),
        ("LEFTPADDING", (0, 0), (-1, -1), pad),
        ("RIGHTPADDING", (0, 0), (-1, -1), pad),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 3),
        ("TOPPADDING", (0, 1), (-1, 1), 3),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 9),
    ]))
    return t


def make_doc():
    doc = BaseDocTemplate(
        str(OUT), pagesize=A4,
        leftMargin=16 * mm, rightMargin=16 * mm,
        topMargin=20 * mm, bottomMargin=18 * mm,
        title="101 roteiros de Reels para vender o PDV Pro",
        author="PDV Pro",
        subject="Calendario de 101 dias com roteiros simples e persuasivos",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=frame, onPage=cover),
        PageTemplate(id="content", frames=frame, onPage=page_base),
    ])
    story = []

    story.append(Spacer(1, 74 * mm))
    story.append(P("CONTEUDO QUE MOSTRA VALOR", "CoverKicker"))
    story.append(Spacer(1, 6 * mm))
    story.append(P("101 roteiros de Reels para vender o PDV Pro", "CoverTitle"))
    story.append(Spacer(1, 8 * mm))
    story.append(P("Um calendario de tres meses para explicar o sistema de forma simples, gerar desejo e levar o publico para a demonstracao.", "CoverSub"))
    story.append(PageBreak())
    doc.handle_nextPageTemplate("content")

    story.append(P("Como usar este guia", "SectionTitle"))
    story.append(Spacer(1, 4 * mm))
    story.append(P("Voce nao precisa decorar nenhum texto. Leia o roteiro, entenda a ideia e fale com suas palavras. Grave em pe, com o celular na vertical, perto de uma janela ou luz frontal. Use dados ficticios na demonstracao e nunca mostre senhas, chaves PIX, documentos ou dados reais de clientes."))
    story.append(Spacer(1, 5 * mm))
    checklist = [
        ("1. Gancho", "Comece olhando para a camera e diga a primeira frase em ate 3 segundos."),
        ("2. Prova", "Mostre a funcao funcionando na tela. A imagem do sistema sustenta o que voce fala."),
        ("3. Beneficio", "Explique o problema que aquela funcao resolve na rotina do comercio."),
        ("4. Convite", "Termine com uma acao simples: comentar, salvar, compartilhar ou pedir demonstracao."),
    ]
    rows = [[P(a, "CardTitle"), P(b, "SmallPdv")] for a, b in checklist]
    t = Table(rows, colWidths=[36 * mm, doc.width - 36 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), WHITE), ("BOX", (0, 0), (-1, -1), .8, LINE),
        ("INNERGRID", (0, 0), (-1, -1), .5, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 9), ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    story.append(t)
    story.append(Spacer(1, 5 * mm))
    story.append(box("Formato recomendado", P("Duracao: 25 a 45 segundos. Resolucao: 1080 x 1920. Coloque legenda automatica, corte os silencios e use musica baixa. Grave a tela separadamente quando o texto ficar pequeno; depois encaixe essa gravacao por cima da sua fala.", "BodyPdv"), bg=MINT, border=colors.HexColor("#B7E5D4")))
    story.append(Spacer(1, 5 * mm))
    story.append(box("Regra de ouro", P("Um Reel deve vender uma ideia, nao o sistema inteiro. Mostre uma dor e uma solucao por video. O calendario repete alguns beneficios por angulos diferentes porque o publico nao ve todas as publicacoes.", "BodyPdv"), bg=colors.HexColor("#FFF4EA"), border=colors.HexColor("#FFD0AE"), label_color=colors.HexColor("#B94D0C")))
    story.append(PageBreak())

    story.append(P("Plano de publicacao em 14 semanas", "SectionTitle"))
    story.append(Spacer(1, 3 * mm))
    story.append(P("Publique um roteiro por dia. Se preferir tres Reels por semana, este mesmo material dura aproximadamente sete meses. Alterne videos falando para a camera, gravacoes da tela e cenas do balcao."))
    story.append(Spacer(1, 4 * mm))
    week_rows = [[P("PERIODO", "LabelPdv"), P("TEMA CENTRAL", "LabelPdv"), P("DIAS", "LabelPdv")]]
    start = 1
    for idx, (wk, focus) in enumerate(WEEKS):
        count = WEEK_COUNTS[idx]
        end = start + count - 1
        week_rows.append([P(wk, "CardTitle"), P(focus, "SmallPdv"), P(f"{start} a {end}", "SmallPdv")])
        start = end + 1
    wt = Table(week_rows, colWidths=[30 * mm, 105 * mm, 25 * mm], repeatRows=1)
    wt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY), ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, PAPER]), ("BOX", (0, 0), (-1, -1), .8, LINE),
        ("INNERGRID", (0, 0), (-1, -1), .4, LINE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(wt)
    story.append(PageBreak())

    # Indice de titulos em blocos compactos.
    calendar_chunk = 28
    for chunk_start in range(0, len(SCRIPTS), calendar_chunk):
        chunk_end = min(chunk_start + calendar_chunk, len(SCRIPTS))
        story.append(P(f"Calendario rapido - dias {chunk_start + 1} a {chunk_end}", "SectionTitle"))
        story.append(Spacer(1, 3 * mm))
        rows = []
        for i in range(chunk_start, chunk_end, 2):
            left = P(f"<b>Dia {i + 1:02d}</b>  {SCRIPTS[i]['title']}", "Calendar")
            right = P(f"<b>Dia {i + 2:02d}</b>  {SCRIPTS[i + 1]['title']}", "Calendar") if i + 1 < chunk_end else P("", "Calendar")
            rows.append([left, right])
        cal = Table(rows, colWidths=[doc.width / 2, doc.width / 2])
        cal.setStyle(TableStyle([
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, PAPER]), ("BOX", (0, 0), (-1, -1), .8, LINE),
            ("INNERGRID", (0, 0), (-1, -1), .4, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(cal)
        story.append(PageBreak())

    for idx, script in enumerate(SCRIPTS):
        cumulative = 0
        week_idx = 0
        for candidate, count in enumerate(WEEK_COUNTS):
            cumulative += count
            if idx < cumulative:
                week_idx = candidate
                break
        week, focus = WEEKS[week_idx]
        story.append(P(f"{week.upper()}  /  {focus.upper()}", "LabelPdv"))
        story.append(Spacer(1, 2 * mm))
        title_table = Table([[P(f"DIA {idx + 1:02d}", "CoverKicker"), P(script["title"], "TitlePdv")]], colWidths=[27 * mm, doc.width - 27 * mm])
        title_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, 0), EMERALD), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOX", (0, 0), (-1, -1), .8, LINE), ("LEFTPADDING", (0, 0), (-1, -1), 9),
            ("RIGHTPADDING", (0, 0), (-1, -1), 9), ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ]))
        story.append(title_table)
        story.append(Spacer(1, 3 * mm))

        hook_table = Table([[P("GANCHO - FALE OLHANDO PARA A CAMERA", "LabelPdv")], [P(script["hook"], "HookPdv")]], colWidths=[doc.width])
        hook_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), NAVY), ("BOX", (0, 0), (-1, -1), 0, NAVY),
            ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("TOPPADDING", (0, 0), (-1, 0), 10), ("BOTTOMPADDING", (0, 0), (-1, 0), 3),
            ("TOPPADDING", (0, 1), (-1, 1), 2), ("BOTTOMPADDING", (0, 1), (-1, 1), 12),
            ("TEXTCOLOR", (0, 0), (-1, -1), WHITE),
        ]))
        story.append(hook_table)
        story.append(Spacer(1, 3 * mm))

        shots = Table([
            [P("CENA 1", "LabelPdv"), P(script["shot1"], "SmallPdv")],
            [P("CENA 2", "LabelPdv"), P(script["shot2"], "SmallPdv")],
            [P("DURACAO", "LabelPdv"), P("25 a 45 segundos. Use cortes curtos e deixe a tela legivel.", "SmallPdv")],
        ], colWidths=[25 * mm, doc.width - 25 * mm])
        shots.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), WHITE), ("BOX", (0, 0), (-1, -1), .8, LINE),
            ("INNERGRID", (0, 0), (-1, -1), .4, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(shots)
        story.append(Spacer(1, 3 * mm))
        story.append(box("Fale isso", P(script["speech"], "QuotePdv"), bg=MINT, border=colors.HexColor("#B7E5D4")))
        story.append(Spacer(1, 3 * mm))

        bottom = Table([
            [P("TEXTO NA TELA", "LabelPdv"), P("CHAMADA FINAL", "LabelPdv")],
            [P(script["overlay"], "CardTitle"), P(script["cta"], "CardTitle")],
        ], colWidths=[doc.width / 2, doc.width / 2])
        bottom.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#FFF4EA")),
            ("BACKGROUND", (1, 0), (1, -1), WHITE),
            ("BOX", (0, 0), (-1, -1), .8, LINE), ("INNERGRID", (0, 0), (-1, -1), .4, LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 9),
            ("RIGHTPADDING", (0, 0), (-1, -1), 9), ("TOPPADDING", (0, 0), (-1, 0), 7),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 3), ("TOPPADDING", (0, 1), (-1, 1), 3),
            ("BOTTOMPADDING", (0, 1), (-1, 1), 8),
        ]))
        story.append(bottom)
        story.append(Spacer(1, 3 * mm))
        story.append(box("Legenda pronta", P(script["caption"], "SmallPdv"), bg=WHITE, border=LINE))
        story.append(Spacer(1, 3 * mm))
        notes = Table([
            [P("CHECKLIST ANTES DE POSTAR", "LabelPdv"), P("ANOTACOES DE GRAVACAO", "LabelPdv")],
            [P("[ ] Dados ficticios  [ ] Tela legivel  [ ] Audio claro  [ ] Legenda  [ ] CTA", "TinyPdv"),
             P("________________________________________________", "TinyPdv")],
            [P("Marque os itens depois da revisao final.", "TinyPdv"),
             P("________________________________________________", "TinyPdv")],
        ], colWidths=[doc.width * .57, doc.width * .43])
        notes.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), PAPER), ("BOX", (0, 0), (-1, -1), .8, LINE),
            ("INNERGRID", (0, 0), (-1, -1), .4, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(notes)
        if idx != len(SCRIPTS) - 1:
            story.append(PageBreak())

    story.append(PageBreak())
    story.append(P("Banco de 30 ganchos extras", "SectionTitle"))
    story.append(Spacer(1, 3 * mm))
    story.append(P("Use estes começos para regravar os temas que mais funcionarem. Troque o gancho, mantenha a demonstração e publique novamente algumas semanas depois."))
    hooks = [
        "Se voce perde dez minutos por dia com isso, veja esta funcao.", "O erro que mais tira dinheiro do pequeno comercio.",
        "Antes de comprar outro caderno, assista a isto.", "Tres toques que organizam uma venda inteira.",
        "O cliente nao precisa esperar voce fazer essa conta.", "Sua equipe ainda pergunta onde anotar isso?",
        "Esta tela responde uma pergunta que todo dono faz.", "Parece detalhe, mas no fim do mes faz diferenca.",
        "Se o estoque nunca bate, comece por aqui.", "Vender mais sem controle pode aumentar o problema.",
        "Uma funcao simples para uma rotina muito corrida.", "O jeito profissional de mostrar isso ao cliente.",
        "Nao e sobre tecnologia; e sobre ganhar tempo.", "Veja o que acontece depois que a venda e finalizada.",
        "A diferenca entre faturamento e dinheiro disponivel.", "Seu catalogo sabe o que ainda existe no estoque?",
        "Quem vende fiado precisa ver isso hoje.", "O dono pode delegar sem perder o controle.",
        "O que eu faria antes de abrir a loja amanha.", "Uma informacao que voce encontra em segundos.",
        "O sistema certo evita digitar a mesma coisa duas vezes.", "Como transformar seu celular em ferramenta de venda.",
        "Se o cliente pediu comprovante, faca assim.", "Uma proposta bonita antes mesmo de fechar a venda.",
        "O dinheiro mudou de lugar ou virou despesa?", "O seu funcionario precisa ver todos os numeros?",
        "A pergunta que evita produto anunciado sem estoque.", "Isso serve para loja e tambem para prestador de servico.",
        "Seu negocio merece sair do improviso.", "Qual destas dores mais acontece no seu balcao?",
    ]
    hook_rows = []
    for i in range(0, 30, 2):
        hook_rows.append([P(f"<b>{i + 1:02d}.</b> {hooks[i]}", "SmallPdv"), P(f"<b>{i + 2:02d}.</b> {hooks[i + 1]}", "SmallPdv")])
    ht = Table(hook_rows, colWidths=[doc.width / 2, doc.width / 2])
    ht.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, PAPER]), ("BOX", (0, 0), (-1, -1), .8, LINE),
        ("INNERGRID", (0, 0), (-1, -1), .4, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(ht)
    story.append(PageBreak())

    story.append(P("Chamadas para vender sem parecer repetitivo", "SectionTitle"))
    story.append(Spacer(1, 4 * mm))
    ctas = [
        ("Para comentario", "Comente QUERO e eu envio os detalhes. / Qual funcao voce usaria primeiro? / Escreva a maior dificuldade do seu caixa."),
        ("Para direct", "Mande PDV no direct. / Peça uma demonstracao. / Fale comigo e eu mostro no seu tipo de negocio."),
        ("Para alcance", "Envie para um comerciante. / Marque quem trabalha no caixa. / Compartilhe com sua equipe."),
        ("Para salvamento", "Salve para testar depois. / Guarde este video para o fechamento. / Salve como checklist da loja."),
        ("Para decisao", "Compare com o sistema que voce usa hoje. / Veja quanto tempo essa funcao pode economizar. / Organize antes que o volume aumente."),
    ]
    for title, content in ctas:
        story.append(box(title, P(content, "BodyPdv"), bg=WHITE))
        story.append(Spacer(1, 3 * mm))
    story.append(Spacer(1, 4 * mm))
    story.append(box("Fechamento recomendado", P("Nos proximos 101 dias, acompanhe quais videos geram mais comentarios, salvamentos e mensagens. Regrave os cinco melhores com outro gancho. O objetivo nao e viralizar uma vez: e construir uma biblioteca que responda duvidas, mostre provas e leve o cliente para a demonstracao.", "QuotePdv"), bg=MINT, border=colors.HexColor("#B7E5D4")))

    doc.build(story)


if __name__ == "__main__":
    make_doc()
    print(OUT)
