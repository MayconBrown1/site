const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
const region = 'southamerica-east1';
const OWNER_EMAIL = 'mayconbrown083@gmail.com';
const requireAdmin = request => { if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Apenas administradores.'); };

exports.bootstrapOwnerAdmin = onCall({ region }, async request => {
  const uid = request.auth?.uid;
  const tokenEmail = request.auth?.token?.email?.toLowerCase();
  if (!uid || tokenEmail !== OWNER_EMAIL) throw new HttpsError('permission-denied', 'Esta conta não é a proprietária configurada.');
  const user = await admin.auth().getUser(uid);
  if (user.email?.toLowerCase() !== OWNER_EMAIL) throw new HttpsError('permission-denied', 'E-mail do usuário não confere.');
  await admin.auth().setCustomUserClaims(uid, { ...(user.customClaims || {}), admin: true, owner: true });
  await db.collection('users').doc(uid).set({ email: OWNER_EMAIL, role: 'owner', status: 'ativo', approvedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return { ok: true };
});

exports.approveCustomer = onCall({ region }, async request => {
  requireAdmin(request);
  const requestId = request.data?.requestId;
  if (!requestId) throw new HttpsError('invalid-argument', 'requestId é obrigatório.');
  const ref = db.collection('accessRequests').doc(requestId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Solicitação não encontrada.');
  const data = snap.data();
  let user;
  try { user = await admin.auth().getUserByEmail(data.email); }
  catch (_) { user = await admin.auth().createUser({ email: data.email, password: require('crypto').randomBytes(24).toString('base64url'), displayName: data.name }); }
  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.runTransaction(async tx => {
    tx.set(db.collection('users').doc(user.uid), { name: data.name, email: data.email, whatsapp: data.whatsapp, status: 'ativo', role: 'client', approvedAt: now, blockedAt: null }, { merge: true });
    tx.update(ref, { status: 'ativo', uid: user.uid, approvedAt: now, blockedAt: null });
  });
  return { uid: user.uid, message: 'Cliente aprovado. Oriente-o a usar “Esqueci minha senha” para definir sua senha.' };
});

exports.setCustomerStatus = onCall({ region }, async request => {
  requireAdmin(request);
  const { requestId, status } = request.data || {};
  if (!requestId || !['ativo', 'bloqueado', 'inativo'].includes(status)) throw new HttpsError('invalid-argument', 'Dados inválidos.');
  const ref = db.collection('accessRequests').doc(requestId); const snap = await ref.get();
  if (!snap.exists || !snap.data().uid) throw new HttpsError('failed-precondition', 'Cliente ainda não foi aprovado.');
  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.runTransaction(async tx => { tx.update(ref, { status, blockedAt: status === 'bloqueado' ? now : null }); tx.update(db.collection('users').doc(snap.data().uid), { status, blockedAt: status === 'bloqueado' ? now : null }); });
  return { status };
});
