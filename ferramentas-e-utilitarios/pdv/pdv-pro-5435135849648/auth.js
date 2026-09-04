import { auth, db } from './firebase-config.js';
import { EmailAuthProvider, reauthenticateWithCredential, signInWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const OWNER_EMAIL = 'mayconbrown083@gmail.com';

export async function entrar(email, senha) {
  const cred = await signInWithEmailAndPassword(auth, email, senha);
  // O proprietário é validado pelas Firestore Rules, não apenas por esta navegação.
  if (cred.user.email?.toLowerCase() === OWNER_EMAIL) {
    await setDoc(doc(db, 'users', cred.user.uid), {
      email: OWNER_EMAIL, role: 'owner', status: 'ativo', updatedAt: serverTimestamp()
    }, { merge: true });
    location.replace('./admin.html');
    return;
  }
  const perfil = await getDoc(doc(db, 'users', cred.user.uid));
  const status = perfil.exists() ? perfil.data().status : 'pendente';
  if (status !== 'ativo') {
    await signOut(auth);
    if (status === 'bloqueado') throw new Error('Seu acesso está bloqueado. Entre em contato com o administrador.');
    if (status === 'pendente') throw new Error('Seu acesso ainda está aguardando confirmação do pagamento.');
    throw new Error('Seu acesso não está ativo. Entre em contato com o administrador.');
  }
  location.replace('./index.html');
}
export async function recuperarSenha(email) { await sendPasswordResetEmail(auth, email); }
export async function validarSenhaAtual(senha) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('Nenhuma conta autenticada.');
  try {
    const credencial = EmailAuthProvider.credential(user.email, String(senha || ''));
    await reauthenticateWithCredential(user, credencial);
    return true;
  } catch (erro) {
    if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-mismatch', 'auth/invalid-login-credentials'].includes(erro.code)) return false;
    throw erro;
  }
}
export async function sair() { await signOut(auth); location.replace('./login.html'); }
export function protegerPagina(callback) {
  return onAuthStateChanged(auth, async user => {
    if (!user) return location.replace('./login.html');
    const perfil = await getDoc(doc(db, 'users', user.uid));
    if (!perfil.exists() || perfil.data().status !== 'ativo') { await signOut(auth); return location.replace('./login.html?status=restrito'); }
    callback(user, perfil.data());
  });
}
