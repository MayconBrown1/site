import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBSO4rtfiRFJi4um73NeAdxY3pc7_cDXYI',
  authDomain: 'pdv-brown.firebaseapp.com',
  projectId: 'pdv-brown',
  storageBucket: 'pdv-brown.firebasestorage.app',
  messagingSenderId: '770606783299',
  appId: '1:770606783299:web:a49ee7a575bec3e2d3adf6'
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const PAYMENT_URL = 'COLOCAR_LINK_DE_PAGAMENTO_AQUI';
