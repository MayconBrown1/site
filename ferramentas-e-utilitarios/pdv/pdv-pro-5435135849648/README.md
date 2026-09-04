# PDV - Pro

## Publicação automática pelo GitHub (recomendado)

O GitHub Pages sozinho hospeda apenas HTML. A aprovação de clientes e a criação segura de contas exigem Cloud Functions, que este repositório publica automaticamente no Firebase pelo GitHub Actions.

1. Envie **o conteúdo desta pasta** para a raiz de um repositório GitHub.
2. No Google Cloud Console, selecione o projeto `pdv-brown` e vá em **IAM e administrador > Contas de serviço**. Crie uma conta de serviço para implantação e gere uma chave JSON. Atribua as permissões **Firebase Admin** e **Cloud Functions Admin**.
3. No GitHub do repositório, vá em **Settings > Secrets and variables > Actions > New repository secret**. Nome: `FIREBASE_SERVICE_ACCOUNT_PDV_BROWN`. Cole o conteúdo completo do JSON da chave e salve.
4. Vá em **Actions > Publicar PDV Pro no Firebase > Run workflow**. Aguarde finalizar em verde. O endereço correto será `https://pdv-brown.web.app/login.html` (ou o URL informado no log), não o GitHub Pages.
5. No Firebase Console, em **Authentication > Settings > Authorized domains**, inclua `pdv-brown.web.app` e `pdv-brown.firebaseapp.com`. Habilite **E-mail/senha**.
6. Entre em `https://pdv-brown.web.app/login.html` com `mayconbrown083@gmail.com` e abra `admin.html` uma vez. A Function atribui a permissão segura de proprietário a essa conta.

Nunca coloque o JSON da conta de serviço no código, em arquivo público, ou em `firebase-config.js`: ele deve existir apenas no Secret do GitHub.

## Publicação inicial por terminal

1. No Firebase Console do projeto **pdv-brown**, habilite Authentication > E-mail/senha. A conta proprietária configurada é **mayconbrown083@gmail.com**.
2. Após publicar as Functions, entre com essa conta e abra `admin.html` uma vez. A Function segura atribuirá a custom claim `admin: true` somente a ela.
3. Instale o Firebase CLI e Node.js. Nesta pasta, execute `firebase login`, `firebase use pdv-brown`, `npm --prefix functions install` e `firebase deploy --only firestore:rules,functions,hosting`. Cloud Functions requer que o projeto esteja no plano Blaze.
4. Para testar antes de publicar, use um servidor HTTP local (por exemplo `py -m http.server 8080`) e abra `http://localhost:8080/login.html`; não abra os arquivos por duplo clique. Defina o link real em `PAYMENT_URL` de `firebase-config.js`.

## Estrutura de dados

- `accessRequests/{id}`: pedidos públicos, sem senha.
- `users/{uid}`: perfil e status, criado/alterado apenas por Cloud Function administrativa.
- `users/{uid}/app/state`: produtos, estoque, vendas, sessões e fechamentos de caixa, categorias e configurações do PDV daquele cliente, sincronizados em tempo real.
- `users/{uid}/app/security`: hash PBKDF2 com salt da senha interna do ADM do PDV. A senha em texto puro nunca é enviada ao Firestore nem mantida no `localStorage`.

As credenciais de login da conta continuam no Firebase Authentication. A senha interna do ADM do PDV é independente e serve como trava operacional dentro de uma conta já autenticada.
