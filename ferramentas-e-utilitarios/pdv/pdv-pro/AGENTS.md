# PDV Pro — manutenção obrigatória das Novidades

Sempre que fizer uma alteração funcional ou visual neste projeto:

1. Atualize o primeiro bloco da seção `Novidades` em `index.html`, explicando em linguagem simples o que mudou e como usar.
2. Mantenha as novidades mais recentes antes do histórico anterior.
3. Incremente o `CACHE_NAME` em `sw.js`.
4. Copie exatamente esse novo identificador para `data-novidades-cache` no bloco mais recente de Novidades.
5. Atualize a data visível da versão e o atributo `data-atualizacao`.
6. Execute `node scripts/check.mjs` antes de concluir.

Uma atualização não está concluída se a seção Novidades não tiver sido atualizada. A verificação deve falhar com um aviso claro quando o cache e o registro de Novidades estiverem em versões diferentes.
