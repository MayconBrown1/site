const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
const region = 'southamerica-east1';
const OWNER_EMAIL = 'mayconbrown083@gmail.com';
const requireAdmin = request => { if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Apenas administradores.'); };

async function requireBusinessOwner(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Entre na sua conta para continuar.');
  const profile = await db.collection('users').doc(uid).get();
  const data = profile.data();
  if (!profile.exists || data?.status !== 'ativo' || data?.role === 'operator') {
    throw new HttpsError('permission-denied', 'Apenas o titular da empresa pode gerenciar operadores.');
  }
  return { uid, data };
}

function cleanText(value, max) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
}

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

exports.createOperator = onCall({ region }, async request => {
  const owner = await requireBusinessOwner(request);
  const name = cleanText(request.data?.name, 80);
  const email = cleanText(request.data?.email, 160).toLowerCase();
  const password = String(request.data?.password || '');
  if (name.length < 2) throw new HttpsError('invalid-argument', 'Informe o nome do operador.');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpsError('invalid-argument', 'Informe um e-mail válido.');
  if (password.length < 6) throw new HttpsError('invalid-argument', 'A senha precisa ter pelo menos 6 caracteres.');

  let existing = null;
  try { existing = await admin.auth().getUserByEmail(email); } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
  }
  if (existing) throw new HttpsError('already-exists', 'Este e-mail já está cadastrado no sistema.');

  const user = await admin.auth().createUser({ email, password, displayName: name, disabled: false });
  const now = admin.firestore.FieldValue.serverTimestamp();
  try {
    await admin.auth().setCustomUserClaims(user.uid, { operator: true, ownerUid: owner.uid });
    await db.collection('users').doc(user.uid).set({
      name, email, role: 'operator', status: 'ativo', ownerUid: owner.uid,
      createdAt: now, updatedAt: now
    });
  } catch (error) {
    await admin.auth().deleteUser(user.uid).catch(() => {});
    throw error;
  }
  return { uid: user.uid, name, email, status: 'ativo' };
});

exports.listOperators = onCall({ region }, async request => {
  const owner = await requireBusinessOwner(request);
  const snapshot = await db.collection('users').where('ownerUid', '==', owner.uid).get();
  const operators = snapshot.docs
    .map(item => ({ uid: item.id, ...item.data() }))
    .filter(item => item.role === 'operator')
    .map(item => ({ uid: item.uid, name: item.name || '', email: item.email || '', status: item.status || 'inativo' }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return { operators };
});

exports.setOperatorStatus = onCall({ region }, async request => {
  const owner = await requireBusinessOwner(request);
  const operatorUid = cleanText(request.data?.operatorUid, 128);
  const status = request.data?.status;
  if (!operatorUid || !['ativo', 'inativo'].includes(status)) throw new HttpsError('invalid-argument', 'Dados inválidos.');
  const ref = db.collection('users').doc(operatorUid);
  const snapshot = await ref.get();
  const profile = snapshot.data();
  if (!snapshot.exists || profile?.role !== 'operator' || profile?.ownerUid !== owner.uid) {
    throw new HttpsError('not-found', 'Operador não encontrado nesta empresa.');
  }
  await Promise.all([
    admin.auth().updateUser(operatorUid, { disabled: status !== 'ativo' }),
    ref.update({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
  ]);
  return { status };
});

exports.updateOperatorPassword = onCall({ region }, async request => {
  const owner = await requireBusinessOwner(request);
  const operatorUid = cleanText(request.data?.operatorUid, 128);
  const password = String(request.data?.password || '');
  if (!operatorUid || password.length < 6) throw new HttpsError('invalid-argument', 'A nova senha precisa ter pelo menos 6 caracteres.');
  const snapshot = await db.collection('users').doc(operatorUid).get();
  const profile = snapshot.data();
  if (!snapshot.exists || profile?.role !== 'operator' || profile?.ownerUid !== owner.uid) {
    throw new HttpsError('not-found', 'Operador não encontrado nesta empresa.');
  }
  await admin.auth().updateUser(operatorUid, { password });
  await snapshot.ref.update({ updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  return { ok: true };
});
