# PDV - Pro

## Publicação inicial

1. No Firebase Console do projeto **pdv-brown**, habilite Authentication > E-mail/senha. A conta proprietária configurada é **mayconbrown083@gmail.com**.
2. Após publicar as Functions, entre com essa conta e abra `admin.html` uma vez. A Function segura atribuirá a custom claim `admin: true` somente a ela.
3. Instale o Firebase CLI e Node.js. Nesta pasta, execute `firebase login`, `firebase use pdv-brown`, `npm --prefix functions install` e `firebase deploy --only firestore:rules,functions,hosting`. Cloud Functions requer que o projeto esteja no plano Blaze.
4. Para testar antes de publicar, use um servidor HTTP local (por exemplo `py -m http.server 8080`) e abra `http://localhost:8080/login.html`; não abra os arquivos por duplo clique. Defina o link real em `PAYMENT_URL` de `firebase-config.js`.

## Estrutura de dados

- `accessRequests/{id}`: pedidos públicos, sem senha.
- `users/{uid}`: perfil e status, criado/alterado apenas por Cloud Function administrativa.
- `users/{uid}/app/state`: produtos, estoque, vendas, caixa, categorias, configurações e rascunho do PDV daquele cliente, sincronizados em tempo real.

As credenciais administrativas não existem no frontend. A conta aprovada recebe senha aleatória no backend e deve usar **Esqueci minha senha** para configurar a própria senha.
