import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";

initializeApp();
const ADMIN_EMAIL = "mayconbrown083@gmail.com";
const REGION = "southamerica-east1";

function requireAdmin(request) {
  if (!request.auth || request.auth.token.email !== ADMIN_EMAIL) {
    throw new HttpsError("permission-denied", "Somente o administrador pode executar esta ação.");
  }
}

export const adminSetUserStatus = onCall({ region: REGION }, async request => {
  requireAdmin(request);
  const { uid, status } = request.data || {};
  if (!uid || !["approved", "blocked"].includes(status)) throw new HttpsError("invalid-argument", "Dados inválidos.");
  const user = await getAuth().getUser(uid);
  if (user.email === ADMIN_EMAIL) throw new HttpsError("failed-precondition", "A conta principal não pode ser alterada.");
  await getFirestore().doc(`users/${uid}`).set({ status, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { ok: true, status };
});

export const adminDeleteUser = onCall({ region: REGION }, async request => {
  requireAdmin(request);
  const { uid } = request.data || {};
  if (!uid) throw new HttpsError("invalid-argument", "Usuário não informado.");
  const user = await getAuth().getUser(uid);
  if (user.email === ADMIN_EMAIL) throw new HttpsError("failed-precondition", "A conta principal não pode ser excluída.");
  const db = getFirestore();
  for (const collectionName of ["accounts", "transactions", "budgets", "goals", "categories"]) {
    const snap = await db.collection(collectionName).where("userId", "==", uid).get();
    const batch = db.batch();
    snap.docs.forEach(item => batch.delete(item.ref));
    if (!snap.empty) await batch.commit();
  }
  await db.doc(`users/${uid}`).delete();
  await getAuth().deleteUser(uid);
  return { ok: true };
});
