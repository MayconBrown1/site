# Modernização do site Maycon Brown

## O que mudou

- As nove categorias de software e as doze categorias de matrizes agora usam os mesmos arquivos de layout e lógica em `software/assets/`.
- As páginas públicas de categoria ficaram somente para leitura; código de edição foi removido delas.
- Foi criada uma única página dinâmica em `software/produto/`. Ela recebe a categoria e o ID do documento e lê nome, descrição, preço, imagem e link diretamente do Firestore.
- O catálogo de matrizes recebeu a mesma integração por meio de `matriz/produto/`.
- O painel de cada categoria edita o mesmo documento exibido na lista e na página individual. Ao salvar, todos esses locais passam a mostrar os dados novos.
- O painel de produtos agora exige autenticação do projeto Firebase `ferramentas-e-utilitarios`.
- Foram adicionadas busca, ordenação, carregamento preguiçoso de imagens, estados de erro e vazio, layout responsivo e navegação acessível.
- Vídeos pesados nas principais páginas receberam `preload="none"`, evitando download antes de o visitante apertar o play.
- 121 imagens foram recomprimidas preservando formato, nome e dimensões; economia aproximada de 7,86 MB.
- O `sitemap.xml` que já era citado no `robots.txt` foi criado.
- `node_modules/` e arquivos de log foram adicionados ao `.gitignore`.

## Como funciona a nova URL de produto

Exemplo:

```text
https://mayconbrown.com.br/software/produto/?categoria=coreldraw&id=ID_DO_DOCUMENTO
```

O painel gera o endereço automaticamente no botão **Visualizar**. Não é necessário criar outro arquivo HTML.

## Firebase

As regras de software estão em `firebase-catalogo/` e pertencem ao projeto `ferramentas-e-utilitarios`. As regras das matrizes estão em `firebase-matrizes/` e pertencem ao projeto `matriz-esportes`.

1. Ative o provedor **E-mail/senha** em Firebase Authentication nos dois projetos.
2. Crie pelo menos um usuário administrador em cada projeto.
3. Revise o aviso em `firebase-catalogo/README.md` caso o mesmo projeto seja usado por outros aplicativos.
4. Com o Firebase CLI autenticado, execute dentro de `firebase-catalogo/` e depois repita dentro de `firebase-matrizes/`:

```powershell
firebase deploy --only firestore:rules,storage
```

## Peso da pasta

- Total local após a otimização: aproximadamente 653,4 MB.
- Histórico Git (`.git`): aproximadamente 325,9 MB.
- Arquivos publicáveis: aproximadamente 327,6 MB.
- Os maiores arquivos publicáveis continuam sendo vídeos. Eles deixaram de carregar automaticamente, mas continuam ocupando espaço no repositório.

Não envie `.git` nem `node_modules` em uma hospedagem por upload. O histórico Git grande só pode ser reduzido de forma significativa reescrevendo o histórico do repositório, operação que exige planejamento porque altera os commits e normalmente requer `push --force`.

## Compatibilidade

As páginas antigas de produtos específicos foram mantidas para não quebrar links já divulgados. O novo catálogo não depende delas: produtos novos e editados passam a usar a página dinâmica.
