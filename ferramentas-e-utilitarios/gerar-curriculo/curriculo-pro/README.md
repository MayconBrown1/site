# Currículos Brown com Firebase

O projeto tem duas páginas ligadas à coleção `curriculos` do Cloud Firestore:

- `cliente.html`: formulário público, simples e mobile-first. Só cria um novo envio; não lê nenhum dado e não gera PDF.
- `admin.html`: login administrativo por e-mail/senha, caixa de entrada, preenchimento automático, edição local e geração de PDF.
- `preview.html`: visualização temporária por link aleatório, sem foto e sem botões de impressão/download.

A foto não passa pelo Firebase. O cliente recebe a instrução de enviá-la por WhatsApp, e o administrador escolhe o arquivo localmente apenas na hora de gerar o PDF.

O campo de escolaridade inclui opções de completo/incompleto e **Sem escolaridade formal** para quem nunca frequentou a escola.

No topo do painel administrativo há os botões **Copiar link do formulário** e **Abrir formulário**. O endereço de `cliente.html` é calculado automaticamente a partir da pasta onde `admin.html` foi publicado. Portanto, mantenha os dois arquivos na mesma pasta ao enviar o projeto para sua hospedagem.

## 1. Ativar os serviços

No [Firebase Console](https://console.firebase.google.com/), abra o projeto `curriculo-8b75d`.

1. Em **Build > Firestore Database**, crie o banco em modo de produção.
2. Em **Build > Authentication > Sign-in method**, ative **E-mail/senha**.
3. Em **Authentication > Users**, crie a conta do administrador.
4. Copie o **UID** dessa conta.

## 2. Configurar as regras

Abra `firestore.rules` e substitua:

```text
SUBSTITUA_PELO_UID_DO_ADMIN
```

pelo UID copiado no passo anterior. Não use o e-mail no lugar do UID.

Depois publique as regras pelo editor de regras do Firestore ou pela Firebase CLI:

```bash
firebase login
firebase use curriculo-8b75d
firebase deploy --only firestore:rules
```

As regras fazem o seguinte:

- visitante sem login: somente `create` na coleção `curriculos`;
- visitante: sem `get`, `list`, `update` ou `delete`;
- UID administrativo: leitura, atualização e exclusão;
- validação de campos, tipos, tamanhos, quantidades máximas, situação e timestamps do servidor;
- demais coleções: bloqueadas.

## 3. WhatsApp opcional

Em `cliente.html`, procure:

```js
const WHATSAPP_NUMBER = "";
```

Preencha com país + DDD + número, somente dígitos. Exemplo fictício: `5584999999999`. Se ficar vazio, a página continua mostrando a instrução para enviar a foto pelo WhatsApp, mas não mostra um botão direto.

## 4. Publicar

Não abra os arquivos com `file://`: os módulos do Firebase precisam ser servidos por HTTP/HTTPS.

Para Firebase Hosting:

```bash
firebase login
firebase use curriculo-8b75d
firebase deploy --only hosting,firestore:rules
```

Endereços esperados depois da publicação:

- público: `https://SEU-DOMINIO/cliente.html` ou a raiz do site;
- administrativo: `https://SEU-DOMINIO/admin.html`.
- pré-visualização: gerada no painel no formato `https://SEU-DOMINIO/preview.html?id=TOKEN_ALEATORIO`.

O endereço do painel não é a proteção. A proteção real é o Firebase Authentication junto do UID permitido nas regras.

### Sobre “um subdomínio por currículo”

Este pacote usa um link temporário no mesmo domínio. Criar um subdomínio diferente automaticamente para cada currículo exige domínio próprio com DNS curinga e uma camada de roteamento/backend; isso não é feito por duas páginas estáticas no Firebase Hosting. Você pode, porém, publicar o projeto inteiro em um subdomínio fixo, como `curriculos.seudominio.com`, e os links temporários ficarão dentro dele.

No painel, selecione um envio e use **Gerar link de visualização**. O link:

- usa um token aleatório de alta entropia e não permite listar outras visualizações;
- expira para leitura em 7 dias;
- pode ser atualizado ou revogado pelo painel;
- não inclui a foto, mantendo o acordo de não armazená-la online;
- tem marca d’água e bloqueios de impressão/download.

Nenhuma página web oferece DRM real. Uma pessoa com conhecimento técnico pode desativar CSS/JavaScript, copiar o conteúdo ou fazer uma captura de alta resolução. Os bloqueios deste projeto são impedimentos de uso comum, não uma garantia absoluta.

### Exclusão automática das visualizações

As regras impedem a leitura pública imediatamente após `expiresAt`, mesmo que o documento ainda exista. Para remover fisicamente documentos vencidos, configure uma política TTL no Firestore para o grupo de coleções `previews`, usando o campo `expiresAt`. A remoção por TTL não é instantânea; por isso a regra de leitura também verifica a validade.

## 5. Proteção contra abuso

A página aplica um intervalo local de 60 segundos depois de um envio e usa um campo-isca invisível para reduzir duplicações e bots simples. Isso melhora a experiência, mas **não é uma barreira de segurança**: JavaScript e `localStorage` podem ser contornados, e as regras do Firestore não fazem limitação por IP.

Para proteção adicional sem armazenar fotos nem criar um servidor próprio, ative **Firebase App Check com reCAPTCHA Enterprise**:

1. Registre o aplicativo web em **Build > App Check**.
2. Cadastre os domínios publicados.
3. Copie a chave pública do site.
4. Em `cliente.html`, `admin.html` e `preview.html`, preencha `APP_CHECK_SITE_KEY` com a mesma chave pública.
5. Observe as métricas do App Check antes de ativar a imposição para o Firestore.

O App Check reduz abuso, mas não garante a eliminação total. Em caso de ataque direcionado, limitação forte por usuário/IP normalmente exige um backend confiável, como Cloud Functions, Cloud Run ou outro serviço. Este projeto não usa essas funções, conforme solicitado.

## 6. Privacidade e operação

- A configuração web e a `apiKey` do Firebase aparecem no HTML por design; elas não substituem regras de segurança.
- Os dados são pessoais. Mantenha apenas o necessário, apague envios concluídos quando não forem mais úteis e restrinja o acesso à conta administrativa.
- A sessão administrativa usa persistência por aba/sessão, reduzindo o risco de permanecer conectada indefinidamente em computador compartilhado.
- O painel carrega os 100 envios mais recentes para evitar leituras ilimitadas.
- A foto escolhida no painel fica somente no navegador e no PDF gerado; ela não é enviada ao Firestore nem ao Storage.
- A marca d'água pode ser um texto pronto, texto personalizado ou imagem local, com transparência ajustável. Ela aparece no centro da prévia administrativa e em todas as páginas do PDF, sem ser enviada ao Firebase.

## 7. Teste rápido

1. Abra `cliente.html` pelo domínio publicado e envie um formulário de teste.
2. Confirme que não é possível consultar a coleção sem login.
3. Abra `admin.html`, entre com a conta cujo UID está nas regras e clique no cartão recebido.
4. Confira se todos os campos foram preenchidos.
5. Edite algum dado, escolha uma foto local e gere o PDF.
6. Gere um link de visualização, abra-o em uma janela anônima e teste a expiração/revogação.
7. Teste “Marcar concluído” e “Excluir envio”. Excluir um envio também exclui a visualização vinculada.

Se o formulário público mostrar erro de permissão, confira se as regras foram publicadas e se os nomes/tamanhos dos campos não foram alterados sem atualizar `firestore.rules`.
