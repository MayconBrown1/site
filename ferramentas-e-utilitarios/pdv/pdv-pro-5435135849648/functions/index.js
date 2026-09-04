const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const crypto = require('crypto');
admin.initializeApp();
const db = admin.firestore();
const region = 'southamerica-east1';
const OWNER_EMAIL = 'mayconbrown083@gmail.com';
const PIX_CREDENTIALS_KEY = defineSecret('PIX_CREDENTIALS_KEY');
const requireAdmin = request => { if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Apenas administradores.'); };

async function requireActiveUser(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Faça login para continuar.');
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists || snap.data()?.status !== 'ativo') throw new HttpsError('permission-denied', 'Esta conta não está ativa.');
  return { uid, email: request.auth.token.email || '' };
}

function encryptionKey() {
  const configured = PIX_CREDENTIALS_KEY.value();
  let key;
  try { key = Buffer.from(configured || '', 'base64'); } catch (_) { key = Buffer.alloc(0); }
  if (key.length !== 32) throw new HttpsError('failed-precondition', 'O segredo PIX_CREDENTIALS_KEY ainda não foi configurado no Firebase.');
  return key;
}

function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return { version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') };
}

function decryptSecret(payload) {
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(payload.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(payload.data, 'base64')), decipher.final()]).toString('utf8');
  } catch (error) {
    console.error('Falha ao descriptografar credencial PIX:', error.message);
    throw new HttpsError('failed-precondition', 'Não foi possível abrir a credencial PIX. Salve a integração novamente.');
  }
}

async function mercadoPagoRequest(path, accessToken, options = {}) {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...options,
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`,
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = body.message || body.error || `HTTP ${response.status}`;
    const error = new Error(`Mercado Pago: ${detail}`);
    error.httpStatus = response.status;
    throw error;
  }
  return body;
}

function safeProviderError(error, fallback) {
  console.error(fallback, error);
  if (error instanceof HttpsError) throw error;
  const invalid = error.httpStatus === 400 || error.httpStatus === 401 || error.httpStatus === 403;
  throw new HttpsError(invalid ? 'invalid-argument' : 'unavailable', invalid ? error.message : fallback);
}

async function credentialsFor(uid) {
  const snap = await db.doc(`users/${uid}/private/pixCredentials`).get();
  if (!snap.exists || snap.data()?.provider !== 'mercado_pago') {
    throw new HttpsError('failed-precondition', 'Configure a integração automática do Mercado Pago no ADM do PDV.');
  }
  return { ...snap.data(), accessToken: decryptSecret(snap.data().accessToken) };
}

function publicPaymentData(payment) {
  const pix = payment.point_of_interaction?.transaction_data || {};
  return {
    providerPaymentId: String(payment.id),
    providerStatus: payment.status || 'pending',
    statusDetail: payment.status_detail || '',
    qrCode: pix.qr_code || '',
    qrCodeBase64: pix.qr_code_base64 || '',
    ticketUrl: pix.ticket_url || '',
    expiresAt: payment.date_of_expiration || null
  };
}

async function reconcileMercadoPagoPayment(uid, chargeId, payment, source) {
  const ref = db.doc(`users/${uid}/pixPayments/${chargeId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Cobrança PIX local não encontrada.');
  const charge = snap.data();
  if (String(charge.providerPaymentId) !== String(payment.id)) throw new Error('Pagamento não pertence à cobrança informada.');
  const expected = Number(charge.amount).toFixed(2);
  const received = Number(payment.transaction_amount).toFixed(2);
  const amountMatches = expected === received;
  const approved = payment.status === 'approved' && amountMatches;
  const update = {
    providerStatus: payment.status || 'unknown',
    statusDetail: amountMatches ? (payment.status_detail || '') : 'amount_mismatch',
    status: approved ? 'approved' : (amountMatches ? (payment.status || 'pending') : 'review'),
    lastCheckedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastUpdateSource: source
  };
  if (approved && !charge.paidAt) update.paidAt = admin.firestore.FieldValue.serverTimestamp();
  await ref.set(update, { merge: true });
  return { id: chargeId, ...update, amountMatches };
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

exports.savePixProviderCredentials = onCall({ region, secrets: [PIX_CREDENTIALS_KEY] }, async request => {
  const { uid } = await requireActiveUser(request);
  const provider = String(request.data?.provider || '');
  const accessToken = String(request.data?.accessToken || '').trim();
  if (provider !== 'mercado_pago') throw new HttpsError('invalid-argument', 'Neste momento, a aprovação automática está disponível para Mercado Pago.');
  if (accessToken.length < 30 || accessToken.length > 300) throw new HttpsError('invalid-argument', 'Informe um Access Token válido do Mercado Pago.');

  try {
    const account = await mercadoPagoRequest('/users/me', accessToken);
    const privateRef = db.doc(`users/${uid}/private/pixCredentials`);
    const publicRef = db.doc(`users/${uid}/app/pixIntegration`);
    const accountMapRef = db.doc(`pixProviderAccounts/mercado_pago_${account.id}`);
    const old = await privateRef.get();
    const batch = db.batch();
    if (old.exists && old.data()?.providerAccountId && String(old.data().providerAccountId) !== String(account.id)) {
      batch.delete(db.doc(`pixProviderAccounts/mercado_pago_${old.data().providerAccountId}`));
    }
    batch.set(privateRef, {
      provider,
      providerAccountId: String(account.id),
      accessToken: encryptSecret(accessToken),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    batch.set(publicRef, {
      provider,
      status: 'active',
      accountLabel: account.nickname || account.email || `Conta ${account.id}`,
      providerAccountId: String(account.id),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastTestAt: admin.firestore.FieldValue.serverTimestamp()
    });
    batch.set(accountMapRef, { uid, provider, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    await batch.commit();
    return { ok: true, provider, accountLabel: account.nickname || account.email || `Conta ${account.id}` };
  } catch (error) {
    safeProviderError(error, 'Não foi possível validar a conta do Mercado Pago.');
  }
});

exports.testPixProviderConnection = onCall({ region, secrets: [PIX_CREDENTIALS_KEY] }, async request => {
  const { uid } = await requireActiveUser(request);
  try {
    const credentials = await credentialsFor(uid);
    const account = await mercadoPagoRequest('/users/me', credentials.accessToken);
    await db.doc(`users/${uid}/app/pixIntegration`).set({
      status: 'active',
      accountLabel: account.nickname || account.email || `Conta ${account.id}`,
      lastTestAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return { ok: true, accountLabel: account.nickname || account.email || `Conta ${account.id}` };
  } catch (error) {
    safeProviderError(error, 'A conexão com o Mercado Pago falhou.');
  }
});

exports.removePixProviderCredentials = onCall({ region, secrets: [PIX_CREDENTIALS_KEY] }, async request => {
  const { uid } = await requireActiveUser(request);
  const privateRef = db.doc(`users/${uid}/private/pixCredentials`);
  const old = await privateRef.get();
  const batch = db.batch();
  batch.delete(privateRef);
  batch.set(db.doc(`users/${uid}/app/pixIntegration`), {
    provider: 'manual', status: 'inactive', accountLabel: '', updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  if (old.exists && old.data()?.providerAccountId) batch.delete(db.doc(`pixProviderAccounts/mercado_pago_${old.data().providerAccountId}`));
  await batch.commit();
  return { ok: true };
});

exports.createPixCharge = onCall({ region, secrets: [PIX_CREDENTIALS_KEY] }, async request => {
  const { uid, email } = await requireActiveUser(request);
  const amount = Math.round(Number(request.data?.amount) * 100) / 100;
  const caixaId = String(request.data?.caixaId || '').slice(0, 100);
  const description = String(request.data?.description || 'Venda no PDV Pro').replace(/[<>]/g, '').slice(0, 120);
  if (!Number.isFinite(amount) || amount < 0.01 || amount > 1000000) throw new HttpsError('invalid-argument', 'O valor da cobrança PIX é inválido.');
  if (!caixaId) throw new HttpsError('invalid-argument', 'O caixa aberto não foi identificado.');

  const chargeRef = db.collection('users').doc(uid).collection('pixPayments').doc();
  try {
    const credentials = await credentialsFor(uid);
    const projectId = process.env.GCLOUD_PROJECT || admin.app().options.projectId;
    const notificationUrl = `https://${region}-${projectId}.cloudfunctions.net/mercadoPagoWebhook`;
    const payment = await mercadoPagoRequest('/v1/payments', credentials.accessToken, {
      method: 'POST',
      headers: { 'X-Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        transaction_amount: amount,
        description,
        payment_method_id: 'pix',
        external_reference: chargeRef.id,
        notification_url: notificationUrl,
        payer: { email: email || `caixa-${uid.slice(0, 8)}@example.com` }
      })
    });
    const pix = publicPaymentData(payment);
    if (!pix.qrCode && !pix.qrCodeBase64) throw new Error('O provedor não devolveu um QR Code PIX.');
    const now = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();
    batch.set(chargeRef, {
      provider: 'mercado_pago', amount, caixaId, description,
      ...pix, status: payment.status === 'approved' ? 'approved' : 'pending',
      createdAt: now, lastCheckedAt: now,
      ...(payment.status === 'approved' ? { paidAt: now } : {})
    });
    batch.set(db.doc(`pixWebhookPayments/mercado_pago_${payment.id}`), {
      uid, chargeId: chargeRef.id, provider: 'mercado_pago', createdAt: now
    });
    await batch.commit();
    return { id: chargeRef.id, amount, ...pix, status: payment.status === 'approved' ? 'approved' : 'pending' };
  } catch (error) {
    safeProviderError(error, 'Não foi possível criar a cobrança PIX.');
  }
});

exports.refreshPixCharge = onCall({ region, secrets: [PIX_CREDENTIALS_KEY] }, async request => {
  const { uid } = await requireActiveUser(request);
  const chargeId = String(request.data?.chargeId || '');
  if (!/^[A-Za-z0-9_-]{10,60}$/.test(chargeId)) throw new HttpsError('invalid-argument', 'Cobrança PIX inválida.');
  const chargeSnap = await db.doc(`users/${uid}/pixPayments/${chargeId}`).get();
  if (!chargeSnap.exists) throw new HttpsError('not-found', 'Cobrança PIX não encontrada.');
  try {
    const credentials = await credentialsFor(uid);
    const payment = await mercadoPagoRequest(`/v1/payments/${encodeURIComponent(chargeSnap.data().providerPaymentId)}`, credentials.accessToken);
    const result = await reconcileMercadoPagoPayment(uid, chargeId, payment, 'polling');
    return { id: chargeId, status: result.status, providerStatus: result.providerStatus, statusDetail: result.statusDetail };
  } catch (error) {
    safeProviderError(error, 'Não foi possível consultar a cobrança PIX.');
  }
});

exports.mercadoPagoWebhook = onRequest({ region, secrets: [PIX_CREDENTIALS_KEY], cors: false }, async (request, response) => {
  if (!['POST', 'GET'].includes(request.method)) { response.status(405).send('Método não permitido'); return; }
  const paymentId = String(request.body?.data?.id || request.query?.['data.id'] || request.query?.id || '');
  if (!/^\d+$/.test(paymentId)) { response.status(200).send('ok'); return; }
  try {
    const map = await db.doc(`pixWebhookPayments/mercado_pago_${paymentId}`).get();
    if (!map.exists) { response.status(200).send('ok'); return; }
    const { uid, chargeId } = map.data();
    const credentials = await credentialsFor(uid);
    // Não confiamos no status recebido pelo webhook: buscamos o pagamento novamente na API oficial.
    const payment = await mercadoPagoRequest(`/v1/payments/${encodeURIComponent(paymentId)}`, credentials.accessToken);
    await reconcileMercadoPagoPayment(uid, chargeId, payment, 'webhook');
    response.status(200).send('ok');
  } catch (error) {
    console.error('Erro no webhook Mercado Pago:', error);
    response.status(500).send('erro');
  }
});
