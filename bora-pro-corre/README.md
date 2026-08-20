# 🚀 BORA PRO CORRE

Conectando quem precisa entregar com quem tá no corre.
Plataforma de corridas de entrega para lojas e entregadores, inicialmente em **Parnamirim/RN**.

Stack: HTML5 + CSS3 (Tailwind via CDN) + JavaScript puro (ES Modules, sem build tools) + Firebase (Auth, Firestore). Hospedagem: GitHub Pages.

**Sem Firebase Storage.** Fotos de documento, da moto/carro e demais comprovantes são coletados manualmente pelo WhatsApp após o cadastro — não há upload de arquivo dentro da plataforma. O que fica registrado no Firestore é só o resultado da conferência (texto): `verificacao.documentosRecebidos` e `verificacao.notasAdmin`, dentro do cadastro da loja/entregador.

---

## Status deste repositório (Etapas concluídas)

- ✅ **Etapa 1** — Arquitetura, estrutura de arquivos, Firebase config
- ✅ **Etapa 2** — Authentication (cadastro, login, logout, recuperação de senha, permissões por perfil)
- ✅ **Etapa 3** — Cadastro de loja e de entregador, com status `pendente`
- ⏳ Etapa 4 — Painel da loja (dashboard, novo pedido, histórico...)
- ⏳ Etapa 5 — Painel do entregador (pedidos disponíveis, online/offline...)
- ⏳ Etapa 6 — Sistema de pedidos em tempo real
- ⏳ Etapa 7 — Aceite concorrente + limite de 2 entregas simultâneas
- ⏳ Etapa 8 — Fluxo de retirada e entrega (confirmação dupla)
- ⏳ Etapa 9 — Avaliações e histórico
- ⏳ Etapa 10 — Painel administrativo completo
- ⏳ Etapa 11 — Revisão final de segurança
- ⏳ Etapa 12 — PWA (ícones reais, botão instalar)
- ⏳ Etapa 13 — Assinaturas via Cacto
- ⏳ Etapa 14 — Testes
- ⏳ Etapa 15 — Publicação no GitHub Pages

---

## 1. Criar o projeto Firebase

Você já tem o projeto criado (`bora-pro-corre`) e a config já está em `js/firebase-config.js`. Se precisar recriar: [console.firebase.google.com](https://console.firebase.google.com) → **Adicionar projeto**.

## 2. Ativar Authentication

Console Firebase → **Build → Authentication → Sign-in method** → ative **E-mail/senha**.

**Crie sua própria conta de super-admin agora:**
Vá em **Authentication → Users → Add user**, cadastre `mayconbrown083@gmail.com` com uma senha seguRA (ou use a que você já tem). Depois, no mesmo painel, abra o usuário e **verifique o e-mail manualmente** (ou peça um e-mail de verificação real) — as regras exigem `email_verified == true` para reconhecer o super-admin.

## 3. Configurar Firestore

Console Firebase → **Build → Firestore Database → Criar banco de dados** → modo produção → região `southamerica-east1` (São Paulo, mais perto do RN).

## 4. Publicar as regras do Firestore

Instale a CLI do Firebase, se ainda não tiver:

```bash
npm install -g firebase-tools
firebase login
```

Na raiz do projeto:

```bash
firebase init firestore
# aponte pros arquivos que já existem:
# firebase/firestore.rules, firebase/firestore.indexes.json
```

Depois, sempre que editar as regras:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## 5. Configurar índices

Os índices compostos já estão em `firebase/firestore.indexes.json`. Eles sobem junto no comando acima. Se faltar algum índice no futuro, o próprio erro do Firestore no console do navegador traz um link pra criar automaticamente.

## 6. Configurar o primeiro administrador (você)

**Não crie administradores editando `role` direto no Firestore por um usuário comum** — a regra bloqueia isso de propósito. O super-admin (`mayconbrown083@gmail.com`) é reconhecido **automaticamente** pelas Rules assim que você faz login com esse e-mail verificado — não precisa criar nenhum documento manual pra você mesmo.

Para promover **outros** administradores no futuro, será feito dentro do próprio painel admin (Etapa 10), criando um documento em `admins/{uid}` — ação que só o super-admin consegue executar, conforme protegido em `firebase/firestore.rules`.

## 7. Configurar PWA

Os ícones em `/icons/` ainda são placeholders — antes de publicar, gere os ícones reais (192x192, 512x512 e as versões "maskable") e substitua os arquivos. Recomendo o [Maskable.app](https://maskable.app/editor) para gerar as versões maskable.

## 8. Configurar GitHub

```bash
git init
git add .
git commit -m "Etapas 1-3: arquitetura, auth e cadastros"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/bora-pro-corre.git
git push -u origin main
```

## 9. Ativar GitHub Pages

No repositório → **Settings → Pages** → Source: `main` / `root` → Save. Sua URL ficará algo como `https://SEU_USUARIO.github.io/bora-pro-corre/`.

⚠️ **Importante sobre domínio do Firebase Auth:** vá em Console Firebase → Authentication → Settings → **Authorized domains** e adicione o domínio do GitHub Pages (`SEU_USUARIO.github.io`), senão o login vai falhar em produção.

## 10. Domínio personalizado (opcional)

GitHub Pages → Settings → Pages → Custom domain. Depois repita o passo 10 (adicionar o novo domínio nos Authorized domains do Firebase).

## 11. Configurar Cacto (assinaturas — Etapa 13)

Ainda não implementado neste estágio. Quando chegarmos na Etapa 13: a chave secreta da Cacto **nunca** vai no JavaScript público — só dentro de uma Cloud Function que recebe o webhook de pagamento confirmado e atualiza `subscriptions/{uid}` no Firestore.

## 12. Testar localmente

Como o projeto não usa build tools, basta servir os arquivos estáticos:

```bash
npx serve .
# ou
python3 -m http.server 8080
```

Abra `http://localhost:8080` (ou a porta indicada). Teste cadastro de loja, cadastro de entregador, login, logout e recuperação de senha.

## 13. Publicar

`git push` já publica automaticamente via GitHub Pages (leva ~1 min pra propagar).

## 14. Atualizar

Sempre que enviar mudanças, o Service Worker cacheia o app shell — para forçar atualização em dispositivos já instalados, incremente a constante `CACHE_NOME` em `service-worker.js` (ex: `bpc-shell-v2`).

---

## Estrutura de arquivos atual

```
/
├── index.html                  ✅ Landing page
├── login.html                  ✅
├── cadastro-loja.html          ✅
├── cadastro-entregador.html    ✅
├── termos.html                 ⏳ (próxima etapa)
├── privacidade.html            ⏳ (próxima etapa)
├── suporte.html                ⏳ (próxima etapa)
├── manifest.json               ✅
├── service-worker.js           ✅
├── README.md                   ✅
│
├── loja/                       ⏳ Etapa 4
├── entregador/                 ⏳ Etapa 5
├── admin/                      ⏳ Etapa 10
│
├── css/
│   ├── style.css                ✅
│   ├── responsive.css           ✅
│   └── dashboard.css            ⏳ Etapa 4
│
├── js/
│   ├── firebase-config.js       ✅
│   ├── auth.js                  ✅
│   ├── permissions.js           ✅
│   ├── utils.js                 ✅
│   ├── pedidos.js               ⏳ Etapa 6
│   ├── loja.js                  ⏳ Etapa 4
│   ├── entregador.js            ⏳ Etapa 5
│   ├── admin.js                 ⏳ Etapa 10
│   ├── avaliacoes.js            ⏳ Etapa 9
│   └── pagamentos.js            ⏳ Etapa 13
│
└── firebase/
    ├── firestore.rules          ✅
    └── firestore.indexes.json   ✅
```

Não há Firebase Storage nem pasta de upload — fotos e documentos são tratados 100% fora da plataforma, pelo WhatsApp.

## Modelo de negócio

- R$ 20/mês por loja + R$ 20/mês por entregador
- Sem comissão sobre corridas — o valor combinado vai inteiro pro entregador
- A loja define o valor de cada entrega e pode reajustar se ninguém aceitar

## Segurança — pontos que nunca devem ser simplificados

- `role`, `status`/`aprovado`, `bloqueado`, `assinatura` e `verificacao` **nunca** são editáveis pelo próprio usuário — só por admin (protegido em `firebase/firestore.rules`)
- Documentos pessoais (CPF, CNH, foto da moto/carro) não passam pela plataforma — são conferidos manualmente pelo WhatsApp, e o admin só registra o resultado em texto (`verificacao.documentosRecebidos`, `verificacao.notasAdmin`)
- O aceite de corrida deve sempre usar `runTransaction()` no client, e a regra do Firestore garante atomicidade mesmo se a transação for tentada por dois entregadores ao mesmo tempo
- O limite de 2 entregas ativas é validado nas Rules, não só no JavaScript
