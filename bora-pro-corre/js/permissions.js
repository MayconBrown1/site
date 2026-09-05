// =====================================================
// BORA PRO CORRE — Controle de permissões
// =====================================================
// IMPORTANTE: isto é apenas conveniência de UI (mostrar/esconder
// botões, redirecionar). A segurança de verdade está 100% nas
// Firestore Rules — nunca confie só nisto para proteger dados.

import { auth, db, SUPER_ADMIN_EMAIL } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

// A raiz é calculada pelo endereço deste módulo. Assim, os redirecionamentos
// funcionam tanto dentro da subpasta da aplicação quanto na raiz do domínio.
const APP_ROOT = new URL("../", import.meta.url);
const appUrl = (path) => new URL(path, APP_ROOT).href;

/**
 * Retorna o perfil completo do usuário logado:
 * { user, role, dados, isSuperAdmin }
 * role pode ser: "admin" | "loja" | "entregador" | null
 */
export function obterSessao() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        resolve({ user: null, role: null, dados: null, isSuperAdmin: false });
        return;
      }

      // Este e somente este e-mail autenticado controla a administração.
      // A comparação não depende do campo emailVerified do Firebase.
      const isSuperAdmin = user.email?.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

      if (isSuperAdmin) {
        resolve({ user, role: "admin", dados: null, isSuperAdmin });
        return;
      }

      // Busca perfil em /users/{uid} para saber se é loja ou entregador
      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (!userSnap.exists()) {
          // Um perfil excluído pela administração não mantém sessão aberta,
          // mesmo que a credencial ainda exista no Firebase Authentication.
          await signOut(auth);
          resolve({ user: null, role: null, dados: null, isSuperAdmin: false });
          return;
        }
        const dados = userSnap.data();
        resolve({ user, role: dados.role, dados, isSuperAdmin: false });
      } catch (e) {
        resolve({ user, role: null, dados: null, isSuperAdmin: false });
      }
    });
  });
}

/**
 * Protege uma página: exige que o usuário esteja logado E tenha
 * o(s) papel(is) informado(s). Redireciona automaticamente caso
 * contrário. Use no topo de cada página protegida.
 */
export async function exigirPerfil(perfisPermitidos = []) {
  const sessao = await obterSessao();

  if (!sessao.user) {
    window.location.href = appUrl("login.html");
    return null;
  }

  if (!perfisPermitidos.includes(sessao.role)) {
    redirecionarPorPerfil(sessao.role);
    return null;
  }

  return sessao;
}

export function redirecionarPorPerfil(role) {
  switch (role) {
    case "admin":
      window.location.href = appUrl("admin/dashboard.html");
      break;
    case "loja":
      window.location.href = appUrl("loja/dashboard.html");
      break;
    case "entregador":
      window.location.href = appUrl("entregador/dashboard.html");
      break;
    default:
      window.location.href = appUrl("login.html");
  }
}

export async function sair() {
  await signOut(auth);
  window.location.href = appUrl("index.html");
}
