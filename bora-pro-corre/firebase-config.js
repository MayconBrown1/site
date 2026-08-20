// =====================================================
// BORA PRO CORRE — Configuração do Firebase
// =====================================================
// A apiKey do Firebase NÃO é um segredo: ela apenas identifica
// o projeto no navegador. A segurança de verdade está nas
// Firestore Rules (pasta /firebase). Nunca coloque aqui
// chaves de serviços de pagamento (ex: Cacto) — essas sim são
// secretas e devem ficar só em Cloud Functions.
//
// OBS: este projeto NÃO usa Firebase Storage. Fotos de documento,
// da moto/carro etc. são coletadas manualmente pelo WhatsApp após
// o cadastro — só ficam registradas em texto no Firestore (ex:
// "documentos recebidos: sim", com notas do admin).

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAS67FLyqHpSD57ng30qxJp0HnDYEoccXo",
  authDomain: "bora-pro-corre.firebaseapp.com",
  projectId: "bora-pro-corre",
  storageBucket: "bora-pro-corre.firebasestorage.app",
  messagingSenderId: "747026511320",
  appId: "1:747026511320:web:51f08947ee2e1489622ead"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Mantém o usuário logado entre sessões (fecha o navegador e continua logado)
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Erro ao configurar persistência de sessão:", err);
});

// E-mail do super-admin nato da plataforma.
// Espelha exatamente a regra hardcoded em firebase/firestore.rules.
// Usado só para exibições de UI — a segurança real está nas Rules.
export const SUPER_ADMIN_EMAIL = "mayconbrown083@gmail.com";

// Cidade única do MVP — trava operacional no cadastro (item 51 do prompt mestre)
export const CIDADE_MVP = "Parnamirim";
export const ESTADO_MVP = "RN";
