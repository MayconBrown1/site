# Regras do catálogo de matrizes

Estas regras pertencem ao projeto Firebase `matriz-esportes`.

> Importante: o deploy substitui as regras atuais do projeto. Se esse Firebase tiver outras coleções usadas fora desta pasta, mescle as regras antes de publicar.

Ative o provedor **E-mail/senha** no Firebase Authentication e crie pelo menos um usuário administrador nesse projeto.

Para publicar as regras, com o Firebase CLI autenticado:

```powershell
firebase deploy --only firestore:rules,storage
```
