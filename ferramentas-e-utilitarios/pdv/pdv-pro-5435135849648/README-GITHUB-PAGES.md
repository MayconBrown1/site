# PDV - Pro — modo GitHub Pages

Esta versão não usa Cloud Functions nem Firebase CLI. Ela funciona como site estático no GitHub Pages com Firebase Authentication e Cloud Firestore.

## Configuração única no Firebase Console

1. Authentication > Sign-in method: habilite **E-mail/senha**.
2. Authentication > Settings > Authorized domains: adicione `SEU-USUARIO.github.io` (sem `https://` e sem o nome do repositório).
3. Firestore Database > Rules: cole e publique o conteúdo de `firestore.rules` deste pacote.

## Publicação no GitHub

Envie os arquivos deste pacote para a raiz do repositório. Em Settings > Pages, selecione **Deploy from a branch**, a branch `main` e a pasta `/(root)`.

Abra `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/login.html`.

## Primeiro acesso do proprietário

Entre com **mayconbrown083@gmail.com**. O sistema cria automaticamente o perfil de proprietário e abre `admin.html`. Nessa tela você aprova ou bloqueia clientes.

## Fluxo de cliente

No cadastro, a conta Firebase Authentication é criada como **pendente** e permanece bloqueada no PDV. A senha não é salva no Firestore. Após a aprovação no painel, o cliente faz login normalmente.
