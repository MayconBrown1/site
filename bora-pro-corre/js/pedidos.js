import { db } from "./firebase-config.js";
import {
  addDoc, collection, doc, getDoc, increment, limit, onSnapshot, orderBy,
  query, runTransaction, serverTimestamp, updateDoc, where
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

export const STATUS_FINAIS = ["entregue", "cancelado"];

export function assinaturaValida(perfil) {
  const status = perfil?.assinatura?.status;
  if (perfil?.status !== "aprovado" || !["ativo", "trial"].includes(status)) return false;
  const vencimento = perfil?.assinatura?.proximaCobranca;
  if (!vencimento) return status === "trial";
  const data = vencimento.toDate ? vencimento.toDate() : new Date(vencimento);
  return Number.isFinite(data.getTime()) && data.getTime() > Date.now();
}

export function motivoBloqueio(perfil) {
  if (!perfil) return "Perfil não encontrado.";
  if (perfil.status === "bloqueado") return "Acesso bloqueado pela administração.";
  if (perfil.status !== "aprovado") return "Seu cadastro ainda está em análise.";
  if (!assinaturaValida(perfil)) {
    const vencimento = perfil.assinatura?.proximaCobranca;
    const data = vencimento?.toDate ? vencimento.toDate() : vencimento ? new Date(vencimento) : null;
    return data && Number.isFinite(data.getTime()) && data.getTime() <= Date.now()
      ? "Mensalidade vencida. Regularize para usar a plataforma."
      : "Mensalidade pendente. Regularize para usar a plataforma.";
  }
  return "";
}

export async function criarEntrega(storeId, dados) {
  const storeSnap = await getDoc(doc(db, "stores", storeId));
  if (!storeSnap.exists() || !assinaturaValida(storeSnap.data())) throw new Error("PERFIL_INATIVO");
  const valor = Number(dados.valor);
  if (!Number.isFinite(valor) || valor <= 0) throw new Error("VALOR_INVALIDO");
  return addDoc(collection(db, "deliveries"), {
    storeId,
    storeNome: storeSnap.data().nomeComercial,
    storeAvaliacao: storeSnap.data().avaliacao || { media: 0, total: 0 },
    categoriaProduto: dados.categoriaProduto,
    descricaoProduto: dados.descricaoProduto,
    destinatario: dados.destinatario,
    telefoneDestinatario: dados.telefoneDestinatario,
    retirada: dados.retirada,
    destino: dados.destino,
    valor,
    observacoes: dados.observacoes || "",
    formaPagamentoEntrega: dados.formaPagamentoEntrega || "combinar",
    status: "disponivel",
    courierId: null,
    courierNome: null,
    confirmacoes: {
      retiradaLoja: false, retiradaEntregador: false,
      entregaLoja: false, entregaEntregador: false
    },
    criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp()
  });
}

export function observarEntregasDisponiveis(callback, onError) {
  const q = query(collection(db, "deliveries"), where("status", "==", "disponivel"), orderBy("criadoEm", "desc"), limit(50));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))), onError);
}

export function observarEntregasDaLoja(storeId, callback, onError) {
  const q = query(collection(db, "deliveries"), where("storeId", "==", storeId), orderBy("criadoEm", "desc"), limit(50));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))), onError);
}

export function observarEntregasDoEntregador(courierId, callback, onError) {
  const q = query(collection(db, "deliveries"), where("courierId", "==", courierId), orderBy("criadoEm", "desc"), limit(50));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))), onError);
}

export async function aceitarEntrega(deliveryId, courierId) {
  const deliveryRef = doc(db, "deliveries", deliveryId);
  const courierRef = doc(db, "couriers", courierId);
  await runTransaction(db, async transaction => {
    const [deliverySnap, courierSnap] = await Promise.all([transaction.get(deliveryRef), transaction.get(courierRef)]);
    if (!deliverySnap.exists() || deliverySnap.data().status !== "disponivel") throw new Error("CORRIDA_INDISPONIVEL");
    if (!courierSnap.exists() || !assinaturaValida(courierSnap.data())) throw new Error("PERFIL_INATIVO");
    const ativas = Number(courierSnap.data().entregasAtivas || 0);
    if (ativas >= 2) throw new Error("LIMITE_ATINGIDO");
    transaction.update(deliveryRef, {
      status: "aceito", courierId, courierNome: courierSnap.data().nomeCompleto,
      courierAvaliacao: courierSnap.data().avaliacao || { media: 0, total: 0 },
      aceitoEm: serverTimestamp(), atualizadoEm: serverTimestamp()
    });
    transaction.update(courierRef, { entregasAtivas: ativas + 1 });
  });
}

export async function atualizarValor(deliveryId, storeId, novoValor) {
  const valor = Number(novoValor);
  if (!Number.isFinite(valor) || valor <= 0) throw new Error("VALOR_INVALIDO");
  const ref = doc(db, "deliveries", deliveryId);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().storeId !== storeId || snap.data().status !== "disponivel") throw new Error("NAO_PERMITIDO");
  await updateDoc(ref, { valor, atualizadoEm: serverTimestamp() });
}

export async function cancelarEntrega(deliveryId, storeId) {
  const ref = doc(db, "deliveries", deliveryId);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().storeId !== storeId || snap.data().status !== "disponivel") throw new Error("NAO_PERMITIDO");
  await updateDoc(ref, { status: "cancelado", canceladoEm: serverTimestamp(), atualizadoEm: serverTimestamp() });
}

export async function confirmarEtapa(deliveryId, papel, etapa, userId) {
  const deliveryRef = doc(db, "deliveries", deliveryId);
  await runTransaction(db, async transaction => {
    const snap = await transaction.get(deliveryRef);
    if (!snap.exists()) throw new Error("CORRIDA_INDISPONIVEL");
    const dados = snap.data();
    const ehLoja = papel === "loja" && dados.storeId === userId;
    const ehEntregador = papel === "entregador" && dados.courierId === userId;
    if (!ehLoja && !ehEntregador) throw new Error("NAO_PERMITIDO");
    if (STATUS_FINAIS.includes(dados.status)) throw new Error("NAO_PERMITIDO");
    const campo = etapa === "retirada"
      ? (ehLoja ? "retiradaLoja" : "retiradaEntregador")
      : (ehLoja ? "entregaLoja" : "entregaEntregador");
    const confirmacoes = { ...dados.confirmacoes, [campo]: true };
    let status = dados.status;
    if (confirmacoes.retiradaLoja && confirmacoes.retiradaEntregador) status = "retirado";
    if (confirmacoes.entregaLoja && confirmacoes.entregaEntregador) status = "entregue";
    transaction.update(deliveryRef, {
      confirmacoes, status, atualizadoEm: serverTimestamp(),
      ...(status === "retirado" ? { retiradoEm: serverTimestamp() } : {}),
      ...(status === "entregue" ? { entregueEm: serverTimestamp() } : {})
    });
    if (status === "entregue" && dados.status !== "entregue" && dados.courierId) {
      transaction.update(doc(db, "couriers", dados.courierId), {
        entregasAtivas: increment(-1), "estatisticas.entregasRealizadas": increment(1)
      });
    }
  });
}

export function nomeStatus(status) {
  return ({ disponivel:"Disponível", aceito:"A caminho da retirada", retirado:"Em rota", entregue:"Entregue", cancelado:"Cancelada" })[status] || status;
}
