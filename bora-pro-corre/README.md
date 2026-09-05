# Bora Pro Corre

Plataforma de intermediação entre estabelecimentos e entregadores, inicialmente configurada para Parnamirim/RN.

## O que está implementado

- Cadastro e login individual por e-mail e senha para estabelecimentos e entregadores.
- Aprovação manual e bloqueio pelo administrador.
- Mensalidade fixa de **R$ 29,99** por estabelecimento e por entregador, sem comissão por corrida.
- Publicação de entrega com categoria, descrição do produto, destinatário, retirada, destino, observações e valor oferecido.
- Lista de corridas em tempo real para entregadores online e aprovados.
- Aceite atômico: o primeiro entregador a aceitar fica com a corrida.
- Limite de duas entregas simultâneas por entregador.
- Confirmação bilateral de retirada e entrega.
- Avaliações mútuas, reputação e histórico.
- Painel administrativo com aprovação, mensalidade, busca, filtros e bloqueio.
- Termos de uso, privacidade, suporte, PWA e layout responsivo.

## Arquitetura

- HTML, CSS e JavaScript em módulos, sem framework.
- Firebase Authentication para contas.
- Cloud Firestore para perfis, corridas, pagamentos e avaliações.
- Firestore Rules para autorização, mensalidade e transições críticas.
- Build estático em `dist/` e publicação pelo OpenAI Sites.

## Preparação do Firebase

1. Ative **Authentication → E-mail/senha** no projeto `bora-pro-corre`.
2. Crie o Firestore em modo produção na região desejada.
3. Publique `firebase/firestore.rules` e `firebase/firestore.indexes.json`.
4. Cadastre `mayconbrown083@gmail.com` no Authentication e confirme o e-mail. Esse é o superadministrador configurado nas regras.
5. Adicione o domínio publicado em **Authentication → Settings → Authorized domains**.

As fotos de documentos não são enviadas ao site. A conferência ocorre pelo atendimento e o administrador registra apenas o resultado da verificação.

## Comandos locais

```bash
npm run check
npm run build
```

Sirva a raiz do projeto por HTTP para desenvolvimento. Os caminhos públicos partem de `/`, portanto o site pode ser publicado em domínio próprio sem renomear o repositório.

## Coleções principais

- `users`: papel e estado geral da conta.
- `stores`: estabelecimentos, verificação, reputação e assinatura.
- `couriers`: entregadores, veículo, disponibilidade, reputação e assinatura.
- `deliveries`: produto, rota, valor, aceite e confirmações.
- `ratings`: avaliações imutáveis por corrida e autor.
- `subscriptions` e `payments`: controle financeiro manual do administrador.

Antes de operação comercial, valide os textos jurídicos com assessoria local e configure um provedor de cobrança/webhook caso queira automatizar a baixa da mensalidade. O painel já permite confirmação manual segura pelo administrador.
