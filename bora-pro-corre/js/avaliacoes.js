import { db } from "./firebase-config.js";
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

export function observarAvaliacoes(targetId, callback) {
  const q = query(collection(db, "ratings"), where("alvoId", "==", targetId), orderBy("criadoEm", "desc"), limit(30));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function avaliar({ deliveryId, autorId, autorNome, autorPapel, alvoId, alvoNome, alvoPapel, nota, comentario }) {
  const n = Number(nota);
  if (n < 1 || n > 5) throw new Error("NOTA_INVALIDA");
  const ratingRef = doc(db, "ratings", `${deliveryId}_${autorId}`);
  const deliveryRef = doc(db, "deliveries", deliveryId);
  const alvoRef = doc(db, alvoPapel === "loja" ? "stores" : "couriers", alvoId);
  await runTransaction(db, async transaction => {
    const [ratingSnap, deliverySnap, alvoSnap] = await Promise.all([
      transaction.get(ratingRef), transaction.get(deliveryRef), transaction.get(alvoRef)
    ]);
    if (ratingSnap.exists()) throw new Error("JA_AVALIADO");
    if (!deliverySnap.exists() || !["entregue", "devolvido"].includes(deliverySnap.data().status)) throw new Error("ENTREGA_NAO_FINALIZADA");
    const entrega = deliverySnap.data();
    if (![entrega.storeId, entrega.courierId].includes(autorId) || ![entrega.storeId, entrega.courierId].includes(alvoId)) throw new Error("NAO_PERMITIDO");
    const atual = alvoSnap.data().avaliacao || { media: 0, total: 0 };
    const total = Number(atual.total || 0) + 1;
    const media = ((Number(atual.media || 0) * Number(atual.total || 0)) + n) / total;
    transaction.set(ratingRef, {
      deliveryId, autorId, autorNome, autorPapel, alvoId, alvoNome, alvoPapel,
      nota: n, comentario: String(comentario || "").slice(0, 300), criadoEm: serverTimestamp()
    });
    transaction.update(alvoRef, { avaliacao: { media: Number(media.toFixed(2)), total } });
  });
}
