// =====================================================
// BORA PRO CORRE — Controle de permissões
// =====================================================
// IMPORTANTE: isto é apenas conveniência de UI (mostrar/esconder
// botões, redirecionar). A segurança de verdade está 100% nas
// Firestore Rules — nunca confie só nisto para proteger dados.

import { auth, db, SUPER_ADMIN_EMAIL } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

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

      const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL && user.emailVerified;

      // Verifica se é admin promovido (coleção /admins/{uid})
      let isAdmin = isSuperAdmin;
      if (!isAdmin) {
        try {
          const adminSnap = await getDoc(doc(db, "admins", user.uid));
          isAdmin = adminSnap.exists() && adminSnap.data().ativo === true;
        } catch (e) {
          isAdmin = false;
        }
      }

      if (isAdmin) {
        resolve({ user, role: "admin", dados: null, isSuperAdmin });
        return;
      }

      // Busca perfil em /users/{uid} para saber se é loja ou entregador
      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (!userSnap.exists()) {
          resolve({ user, role: null, dados: null, isSuperAdmin: false });
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
    window.location.href = "/login.html";
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
      window.location.href = "/admin/dashboard.html";
      break;
    case "loja":
      window.location.href = "/loja/dashboard.html";
      break;
    case "entregador":
      window.location.href = "/entregador/dashboard.html";
      break;
    default:
      window.location.href = "/login.html";
  }
}

export async function sair() {
  await signOut(auth);
  window.location.href = "/index.html";
}
