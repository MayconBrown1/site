# Regras do catálogo

Estas regras pertencem ao projeto Firebase `ferramentas-e-utilitarios`.

> Importante: o comando de deploy substitui as regras atuais do projeto. Se esse mesmo Firebase tiver outras coleções usadas por aplicativos externos a esta pasta, mescle as regras antes de publicar.

Antes de publicar as regras, crie ou confirme pelo menos um usuário administrador em **Firebase Console → Authentication → Users**. O painel de produtos usa e-mail e senha desse mesmo projeto.

Para publicar a partir desta pasta, com o Firebase CLI autenticado:

```powershell
firebase deploy --only firestore:rules,storage
```

As páginas públicas podem somente ler as nove coleções de produtos. Criação, alteração, exclusão e upload de imagens exigem usuário autenticado.
