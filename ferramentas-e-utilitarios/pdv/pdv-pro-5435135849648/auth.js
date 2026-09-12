import { app, auth, db } from './firebase-config.js';
import { deleteApp, initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { EmailAuthProvider, getAuth, reauthenticateWithCredential, signInWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { doc, getDoc, getDocFromServer, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const OWNER_EMAIL = 'mayconbrown083@gmail.com';
const PROFILE_CACHE_PREFIX = 'pdv_offline_profile_';

function perfilEmCache(uid) {
  try { return JSON.parse(localStorage.getItem(`${PROFILE_CACHE_PREFIX}${uid}`) || 'null'); }
  catch (_) { return null; }
}

function salvarPerfilEmCache(uid, perfil) {
  localStorage.setItem(`${PROFILE_CACHE_PREFIX}${uid}`, JSON.stringify(perfil));
}

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
  const dadosPerfil = perfil.exists() ? perfil.data() : {};
  const status = dadosPerfil.status || 'pendente';
  if (status !== 'ativo') {
    await signOut(auth);
    if (status === 'bloqueado') throw new Error('Seu acesso está bloqueado. Entre em contato com o administrador.');
    if (status === 'pendente') throw new Error('Seu acesso ainda está aguardando confirmação do pagamento.');
    throw new Error('Seu acesso não está ativo. Entre em contato com o administrador.');
  }
  if (dadosPerfil.role === 'operator') {
    const titular = dadosPerfil.ownerUid ? await getDoc(doc(db, 'users', dadosPerfil.ownerUid)) : null;
    if (!titular?.exists() || titular.data().status !== 'ativo') {
      await signOut(auth);
      throw new Error('O acesso da empresa está indisponível. Entre em contato com o titular.');
    }
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
export async function validarSenhaTitular(emailTitular, uidTitular, senha) {
  if (!emailTitular || !uidTitular || !senha) return false;
  const appValidacao = initializeApp(app.options, `validar-titular-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const authValidacao = getAuth(appValidacao);
  try {
    const credencial = await signInWithEmailAndPassword(authValidacao, emailTitular, String(senha));
    return credencial.user.uid === uidTitular;
  } catch (erro) {
    if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-mismatch', 'auth/invalid-login-credentials', 'auth/user-not-found'].includes(erro.code)) return false;
    throw erro;
  } finally {
    await signOut(authValidacao).catch(() => {});
    await deleteApp(appValidacao).catch(() => {});
  }
}
export async function sair() { await signOut(auth); location.replace('./login.html'); }
export function protegerPagina(callback) {
  return onAuthStateChanged(auth, async user => {
    if (!user) return location.replace('./login.html');
    const validar = async (somenteServidor = false) => {
      const buscar = somenteServidor ? getDocFromServer : getDoc;
      const perfil = await buscar(doc(db, 'users', user.uid));
      if (!perfil.exists() || perfil.data().status !== 'ativo') throw new Error('acesso-restrito');
      const dadosPerfil = perfil.data();
      if (dadosPerfil.role === 'operator') {
        const titular = dadosPerfil.ownerUid ? await buscar(doc(db, 'users', dadosPerfil.ownerUid)) : null;
        if (!titular?.exists() || titular.data().status !== 'ativo') throw new Error('acesso-restrito');
      }
      salvarPerfilEmCache(user.uid, dadosPerfil);
      return dadosPerfil;
    };

    try {
      callback(user, await validar());
    } catch (erro) {
      const cache = perfilEmCache(user.uid);
      if (!navigator.onLine && erro.message !== 'acesso-restrito' && cache?.status === 'ativo') callback(user, cache);
      else {
        console.error('Não foi possível validar o acesso.', erro);
        await signOut(auth);
        location.replace('./login.html?status=restrito');
        return;
      }
    }

    // O acesso offline usa a última autorização válida do aparelho. Assim que a
    // rede volta, o servidor é consultado para aplicar bloqueios sem demora.
    window.addEventListener('online', async () => {
      try { await validar(true); }
      catch (erro) {
        console.error('O acesso não pôde ser revalidado.', erro);
        if (erro.message === 'acesso-restrito') {
          await signOut(auth);
          location.replace('./login.html?status=restrito');
        }
      }
    });
  });
}
