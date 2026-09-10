# Finanças Pro

Aplicativo financeiro instalável (PWA) com login por e-mail/senha no Firebase, dados isolados por usuário e aprovação administrativa.

## O que está pronto

- Cadastro, login e recuperação de senha pelo Firebase Authentication.
- Novas contas ficam **pendentes** até a aprovação do administrador.
- O menu **Gerenciar contas** aparece somente para `mayconbrown083@gmail.com`.
- Administração de acesso: aprovar, bloquear, desbloquear e excluir contas.
- Resumo mensal com saldo inicial, atual e previsto.
- Economia mensal, receitas e despesas consideradas.
- Histórico completo por mês e detalhamento ao tocar nos valores.
- Receitas, despesas e transferências pelo botão `+`.
- Contas, orçamentos, objetivos, relatórios, gráficos, categorias e calendário.
- Modo privado, calculadora, ajuda e instruções para instalação no iPhone.
- PWA instalável no Android, iPhone e computador.
- Publicação automática no GitHub Pages pela pasta `.github/workflows`.

## Configuração obrigatória no Firebase

O projeto já usa a configuração web de `controle-dividas-2a6be`. Antes do primeiro acesso em produção:

1. Abra o [Console do Firebase](https://console.firebase.google.com/) e selecione `controle-dividas-2a6be`.
2. Em **Authentication → Sign-in method**, ative **E-mail/senha**.
3. Em **Firestore Database**, crie o banco caso ainda não exista.
4. Em **Authentication → Settings → Authorized domains**, adicione o domínio final do GitHub Pages e qualquer outro domínio em que publicar o app.
5. Publique as regras e as funções incluídas neste pacote.

Com Node.js instalado, execute na pasta do projeto:

```bash
npm --prefix functions install
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,functions
```

As Cloud Functions usam a região `southamerica-east1`. A função de exclusão remove os dados e o usuário do Firebase Authentication. Se as funções ainda não estiverem publicadas, aprovar/bloquear continua funcionando pelas regras do Firestore, e “Excluir” revoga o acesso marcando a conta como excluída.

## Primeiro acesso administrativo

1. Abra o aplicativo e selecione **Criar conta**.
2. Cadastre-se usando exatamente `mayconbrown083@gmail.com`.
3. Esse e-mail recebe automaticamente o perfil administrativo e pode acessar **Gerenciar contas** no menu lateral.
4. Todos os demais cadastros começam como pendentes e não conseguem abrir o painel financeiro até serem aprovados.

> A exclusividade não depende apenas de esconder o botão: as regras do Firestore e as Cloud Functions também verificam o e-mail administrativo.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie todo o conteúdo desta pasta para a branch `main`.
2. No repositório, abra **Settings → Pages**.
3. Em **Source**, escolha **GitHub Actions**.
4. O fluxo “Publicar Finanças Pro” enviará a pasta `dist` automaticamente.
5. Copie o domínio publicado para **Authorized domains** no Firebase Authentication.

O Firebase também pode hospedar a mesma pasta com:

```bash
npx firebase-tools deploy --only hosting
```

## Executar localmente

Sirva a pasta `dist` com qualquer servidor HTTP. Não abra o arquivo HTML diretamente, porque módulos do Firebase e o service worker exigem HTTP/HTTPS.

```bash
npx serve dist
```

## Instalação como aplicativo

- **Android/Chrome:** entre no app e use **Instalar aplicativo** no menu lateral, ou a opção **Instalar app** do navegador.
- **iPhone/iPad:** abra no Safari, toque em **Compartilhar**, escolha **Adicionar à Tela de Início** e confirme.
- **Computador:** Chrome e Edge exibem o ícone de instalação na barra de endereço; a opção também aparece no menu do Finanças Pro.

## Estrutura

```text
dist/                 aplicativo publicado
  assets/             estilos e lógica
  icons/              ícones do PWA
  index.html           interface principal
  manifest.webmanifest
  service-worker.js
functions/             ações administrativas seguras
firestore.rules        isolamento e permissões
firebase.json          configuração Firebase
.github/workflows/     publicação GitHub Pages
```

## Segurança e modelo de dados

Cada documento financeiro tem o `userId` do proprietário. As regras só permitem leitura e alteração ao dono aprovado. A coleção `users` guarda o estado `pending`, `approved`, `blocked` ou `deleted`. Apenas o e-mail administrativo pode listar usuários ou mudar esses estados.

A `apiKey` do Firebase em um aplicativo web identifica o projeto e, por projeto do próprio Firebase, pode ficar no cliente. A proteção dos dados é feita pelo Authentication, pelas regras do Firestore e pelas verificações das Cloud Functions.
