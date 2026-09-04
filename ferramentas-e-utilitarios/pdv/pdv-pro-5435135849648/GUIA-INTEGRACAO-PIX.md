# Guia da integração PIX automática — PDV Pro

Este guia explica, em linguagem simples, como colocar a confirmação automática do PIX para funcionar. A versão atual possui um conector pronto para **Mercado Pago**. Qualquer banco continua funcionando no modo **PIX manual**, mas só pode confirmar sozinho quando a instituição oferece uma API empresarial de cobrança e um webhook e quando existe um conector específico no backend.

## O que acontece numa venda automática

1. O operador abre o caixa, adiciona os produtos e toca em **PIX**.
2. O PDV pede ao Firebase para criar uma cobrança no Mercado Pago.
3. O Firebase devolve apenas o QR Code; o Access Token nunca volta ao navegador.
4. O cliente paga no aplicativo bancário dele.
5. O Mercado Pago chama o webhook do Firebase. Como segurança extra, o Firebase consulta o pagamento diretamente na API oficial e confere o valor.
6. Somente quando a API responder `approved`, o PDV baixa o estoque, registra a entrada no caixa e finaliza a venda automaticamente.

Se a internet cair, a cobrança continua existindo. Quando o PDV voltar a conectar, ele consulta novamente o status e retoma a venda que estava salva naquele aparelho.

## Parte 1 — preparar o Firebase (feita uma vez pelo dono do sistema)

### 1. Usar o plano necessário

Cloud Functions acessa a API do provedor e recebe o webhook. Por isso, o projeto Firebase precisa estar no plano **Blaze**, com uma conta de faturamento vinculada. O Firebase possui franquias gratuitas, mas não é correto prometer custo zero: o uso que ultrapassar as franquias e os preços do provedor podem gerar cobrança.

No Console do Firebase, abra o projeto `pdv-brown`, clique em **Fazer upgrade** e vincule uma conta de faturamento.

### 2. Instalar as ferramentas no computador

Instale o Node.js LTS e o Firebase CLI. Depois, abra o PowerShell dentro da pasta do PDV e execute:

```powershell
npm install -g firebase-tools
firebase login
firebase use pdv-brown
npm --prefix functions install
```

### 3. Criar a chave que protege os tokens dos lojistas

No PowerShell, execute as três linhas abaixo:

```powershell
$pixBytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($pixBytes)
[Convert]::ToBase64String($pixBytes)
```

Copie o texto gerado. Em seguida execute:

```powershell
firebase functions:secrets:set PIX_CREDENTIALS_KEY
```

Quando o terminal pedir o valor, cole o texto gerado e confirme. Essa chave fica no Google Secret Manager. Não coloque essa chave no HTML, no GitHub ou no `firebase-config.js`.

Guarde uma cópia em um gerenciador de senhas. Se ela for perdida ou trocada, os lojistas precisarão salvar novamente o Access Token no PDV.

### 4. Publicar backend, regras e site

Ainda dentro da pasta, execute:

```powershell
firebase deploy --only functions,firestore:rules,hosting
```

O endereço esperado é `https://pdv-brown.web.app/login.html`.

O workflow do GitHub também publica o projeto, mas o segredo `PIX_CREDENTIALS_KEY` precisa ser criado uma vez pelo Firebase CLI antes da primeira publicação das novas Functions.

### 5. O que aparece no Firestore

- `users/{uid}/app/pixIntegration`: nome do provedor, estado e identificação pública da conta. Não contém token.
- `users/{uid}/private/pixCredentials`: Access Token criptografado. As regras proíbem qualquer leitura pelo navegador.
- `users/{uid}/pixPayments/{id}`: cobranças, valor e status confirmado.
- `pixWebhookPayments/{id}` e `pixProviderAccounts/{id}`: índices privados usados pelo webhook.

Não crie esses documentos à mão. As Cloud Functions criam e atualizam tudo.

## Parte 2 — Mercado Pago (cada lojista faz na própria conta)

### Requisitos

- Uma conta Mercado Pago que possa receber PIX e tenha uma chave PIX cadastrada.
- Uma aplicação criada no painel Mercado Pago Developers.
- Credenciais de **produção**. Um QR criado com credencial de produção representa uma cobrança real.

### Como obter o Access Token

1. Entre na conta Mercado Pago do lojista.
2. Abra [Suas integrações no Mercado Pago Developers](https://www.mercadopago.com.br/developers/panel/app).
3. Crie uma aplicação para pagamentos online/Checkout Transparente, caso ainda não exista.
4. Abra **Credenciais de produção** e habilite as credenciais conforme o cadastro solicitado pelo Mercado Pago.
5. Copie somente o **Access Token de produção**, normalmente iniciado por `APP_USR-`.
6. No PDV, entre em **ADM → Aprovação automática do PIX**.
7. Escolha **Mercado Pago — automático**, cole o Access Token e clique em **Salvar e validar conexão**.
8. O PDV apaga o campo depois de enviar. Isso é esperado: o token passa a ficar criptografado no Firebase.

Nunca informe senha da conta Mercado Pago, código de SMS, senha do e-mail ou chave privada. O PDV precisa apenas do Access Token da aplicação.

### Webhook

Cada cobrança já é criada com esta URL HTTPS:

```text
https://southamerica-east1-pdv-brown.cloudfunctions.net/mercadoPagoWebhook
```

Se o painel da aplicação permitir cadastrar notificações de pagamento, use essa mesma URL no ambiente de produção e selecione o evento de pagamentos. O PDV também consulta o status a cada poucos segundos; assim, a confirmação não depende apenas da notificação.

### Teste correto

1. Abra o caixa no PDV.
2. Faça uma venda pequena, de preferência R$ 1,00, e selecione PIX.
3. Pague com uma conta diferente da conta recebedora.
4. Não clique em **Finalizar venda**. Aguarde a mensagem de confirmação.
5. Confira se a venda apareceu no relatório, se o estoque baixou e se a entrada apareceu no caixa.
6. Confira também o pagamento no extrato do Mercado Pago.

Teste com credenciais de produção movimenta dinheiro real. Consulte as instruções de contas de teste do provedor antes de tentar um ambiente de testes.

## Parte 3 — RecargaPay

O QR Code comum da conta RecargaPay pode ser usado no modo **PIX manual**: informe a chave, o recebedor, a cidade e o banco nas configurações PIX do PDV.

Para confirmação automática, um QR estático ou comprovante não basta. O lojista deve falar com o atendimento/comercial oficial da RecargaPay e perguntar especificamente se a conta tem acesso a:

- API empresarial de cobrança PIX dinâmica (Pix Cob);
- credenciais OAuth ou Access Token para servidor;
- webhook de pagamento confirmado;
- documentação de assinatura do webhook;
- ambiente de homologação;
- tarifas e contrato de uso da API.

Se a RecargaPay fornecer documentação privada e credenciais, será necessário desenvolver um conector `recargapay` nas Cloud Functions. Não cole senha da conta, certificado ou segredo RecargaPay no campo do Mercado Pago. Enquanto não houver API oficial liberada para a conta, use confirmação manual.

## Parte 4 — Efí, Asaas, PagBank e bancos tradicionais

Cada instituição usa um processo diferente. Em geral, o lojista precisa criar uma aplicação empresarial no portal da instituição e solicitar **API Pix Cobrança**. Alguns pedem `client_id` e `client_secret`; outros também exigem certificado mTLS `.p12` ou `.pem`.

Antes de desenvolver outro conector, obtenha da instituição:

1. Link da documentação oficial da API.
2. Endpoint de homologação e de produção.
3. `client_id` e `client_secret` ou método OAuth equivalente.
4. Certificado mTLS, quando exigido, e a senha do certificado.
5. Instruções do webhook e validação da assinatura.
6. Lista de IPs, se houver liberação por firewall.
7. Contrato, limite de requisições e tarifas.

Certificados e segredos devem ser enviados e guardados no backend/Secret Manager. Eles nunca devem ficar em `localStorage`, Firestore público, HTML ou repositório GitHub. A tela atual aceita somente o conector Mercado Pago; os demais precisam de código específico porque nomes de campos, autenticação e estados variam.

## Instruções que devem ser mostradas ao lojista

- Use **PIX manual** se não tiver uma conta de provedor compatível.
- Para aprovação automática, use uma credencial da conta que realmente receberá o dinheiro.
- Nunca compartilhe senha bancária, código SMS ou senha do e-mail.
- Faça a primeira venda com valor baixo e confira o extrato.
- Não altere o carrinho depois de gerar o QR Code. Se alterar, gere uma cobrança nova.
- Se a tela disser “aguardando”, confira a conexão. Não entregue o produto apenas com base em comprovante enviado pelo cliente.
- Em caso de valor divergente, confira o extrato e faça a conciliação manual; o sistema bloqueia a finalização automática.
- Para trocar de conta, salve o novo Access Token. Para desligar, clique em **Usar somente PIX manual**.

## Solução de problemas

### “PIX_CREDENTIALS_KEY ainda não foi configurado”

Crie o segredo conforme a Parte 1 e publique novamente as Functions.

### “Access Token inválido” ou “não autorizado”

Copie novamente a credencial de produção no painel do Mercado Pago. Verifique se pertence à aplicação e à conta corretas e se não foi revogada.

### O QR aparece, mas não finaliza

Confirme se o pagamento consta como aprovado no Mercado Pago, se o valor é idêntico e se o PDV está com internet. Clique em **Testar conexão salva**. Consulte os logs em **Firebase Console → Functions → Logs**.

### Venda não pode ser feita

O caixa precisa estar aberto. Essa regra também se aplica à cobrança PIX e à finalização automática.

## Segurança e responsabilidade

O backend não aceita o status enviado pelo navegador como prova de pagamento. No webhook e na consulta periódica, ele busca o pagamento diretamente no Mercado Pago e compara o ID e o valor. Ainda assim, o lojista deve conferir o primeiro uso, manter credenciais protegidas e observar estornos, disputas e regras comerciais do provedor.

