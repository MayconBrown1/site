# PDV - Pro

## Publicação automática pelo GitHub (recomendado)

O GitHub Pages sozinho não publica as regras de segurança do banco. Este repositório publica automaticamente o site e as regras no Firebase pelo GitHub Actions.

1. Envie **o conteúdo desta pasta** para a raiz de um repositório GitHub.
2. No Google Cloud Console, selecione o projeto `pdv-brown` e vá em **IAM e administrador > Contas de serviço**. Crie uma conta de serviço para implantação e gere uma chave JSON. Atribua as permissões necessárias para publicar Firebase Hosting e Firestore Rules.
3. No GitHub do repositório, vá em **Settings > Secrets and variables > Actions > New repository secret**. Nome: `FIREBASE_SERVICE_ACCOUNT_PDV_BROWN`. Cole o conteúdo completo do JSON da chave e salve.
4. Vá em **Actions > Publicar PDV Pro no Firebase > Run workflow**. Aguarde finalizar em verde. O endereço correto será `https://pdv-brown.web.app/login.html` (ou o URL informado no log), não o GitHub Pages.
5. No Firebase Console, em **Authentication > Settings > Authorized domains**, inclua `pdv-brown.web.app` e `pdv-brown.firebaseapp.com`. Habilite **E-mail/senha**.
6. Entre em `https://pdv-brown.web.app/login.html` com `mayconbrown083@gmail.com`.

Nunca coloque o JSON da conta de serviço no código, em arquivo público, ou em `firebase-config.js`: ele deve existir apenas no Secret do GitHub.

## Publicação inicial por terminal

1. No Firebase Console do projeto **pdv-brown**, habilite Authentication > E-mail/senha. A conta proprietária configurada é **mayconbrown083@gmail.com**.
2. Instale o Firebase CLI e Node.js. Nesta pasta, execute `firebase login`, `firebase use pdv-brown` e `firebase deploy --only firestore:rules,hosting`.
3. Para testar antes de publicar, use um servidor HTTP local (por exemplo `py -m http.server 8080`) e abra `http://localhost:8080/login.html`; não abra os arquivos por duplo clique. Defina o link real em `PAYMENT_URL` de `firebase-config.js`.

## Estrutura de dados

- `accessRequests/{id}`: pedidos públicos, sem senha.
- `users/{uid}`: perfil e status, protegido pelas Firestore Rules.
- `users/{uid}/app/state`: produtos, estoque, vendas, sessões e fechamentos de caixa, categorias e configurações do PDV daquele cliente, sincronizados em tempo real.
- Operadores usam `users/{operatorUid}` com `role: operator` e `ownerUid` apontando para o titular. A conta é criada em uma instância secundária do Firebase Authentication, sem desconectar o titular, e o perfil é protegido pelas Firestore Rules.
- Produtos que compartilham saldo guardam `estoqueVinculadoId`; o produto de origem mantém a quantidade e todos os itens vinculados são sincronizados após vendas e ajustes.
- `catalogOwners/{slug}`: reserva privada e exclusiva do identificador público; o UID não aparece no link nem no documento público.
- `publicCatalogs/{slug}`: somente nome, logo, WhatsApp e descrição pública da loja.
- `publicCatalogs/{slug}/products/{id}`: projeção pública dos produtos visíveis com estoque positivo e dos serviços marcados como visíveis. Custos, vendas, clientes e demais dados internos nunca são copiados.
- O módulo **Orçamentos** cria propostas com produtos e serviços cadastrados, validade, dados completos do cliente e da empresa, histórico e exportação em PDF, sem movimentar estoque ou caixa.

## Catálogo público

1. Publique as regras atualizadas de `firestore.rules`.
2. No PDV, abra **Meu Catálogo**, informe os dados da loja e escolha um identificador exclusivo.
3. Em **Produtos**, marque **Visível no catálogo — Sim** apenas nos itens desejados.
4. Compartilhe o link gerado no formato `catalogo/?loja=identificador`.

O arquivo `catalogo/catalogo.js` contém a constante `LIMITE_ESTOQUE_BAIXO`, inicialmente definida como `5`. Produtos antigos sem `visivelCatalogo` permanecem ocultos até que sejam editados e marcados. Imagens e logo usam URLs públicas HTTPS para não aumentar o documento privado do Firestore nem exigir Firebase Storage.

A senha solicitada pelo ADM do PDV e pelas ações protegidas é a mesma senha de login da conta. Ela é confirmada por reautenticação no Firebase Authentication, sem senha paralela no Firestore ou no `localStorage`.

No ADM do PDV, o titular pode adicionar, pausar e reativar operadores. A troca de senha é enviada ao e-mail individual do funcionário. Ao publicar esta versão, envie em conjunto `firestore:rules` e `hosting`.
