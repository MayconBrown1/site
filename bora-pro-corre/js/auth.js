// =====================================================
// BORA PRO CORRE — Autenticação
// =====================================================

import { auth, db, CIDADE_MVP, ESTADO_MVP } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  doc,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const VERSAO_TERMOS = "1.0";

/**
 * Cadastra uma nova LOJA.
 * Cria o documento em /users/{uid} (role="loja", status="pendente")
 * e o documento completo em /stores/{uid}.
 */
export async function cadastrarLoja(formData) {
  const cred = await createUserWithEmailAndPassword(auth, formData.email, formData.senha);
  const uid = cred.user.uid;

  await updateProfile(cred.user, { displayName: formData.nomeComercial });

  const agora = serverTimestamp();

  const batch = writeBatch(db);
  batch.set(doc(db, "users", uid), {
    uid,
    role: "loja",
    email: formData.email,
    nome: formData.nomeComercial,
    aprovado: false,
    bloqueado: false,
    criadoEm: agora,
    consentimento: {
      versaoTermos: VERSAO_TERMOS,
      aceitoEm: agora
    }
  });

  batch.set(doc(db, "stores", uid), {
    uid,
    nomeComercial: formData.nomeComercial,
    tipoEstabelecimento: formData.tipoEstabelecimento || "outro",
    razaoSocial: formData.razaoSocial || "",
    cnpjCpf: formData.cnpjCpf,
    responsavel: formData.responsavel,
    telefone: formData.telefone,
    whatsapp: formData.whatsapp || formData.telefone,
    email: formData.email,
    endereco: {
      logradouro: formData.endereco,
      numero: formData.numero,
      complemento: formData.complemento || "",
      bairro: formData.bairro,
      cep: formData.cep,
      cidade: CIDADE_MVP,
      estado: ESTADO_MVP,
      pontoReferencia: formData.pontoReferencia || ""
    },
    horarioFuncionamento: formData.horarioFuncionamento || "",
    status: "pendente",
    verificacao: {
      contatoWhatsappFeito: false,
      documentosRecebidos: false,
      notasAdmin: ""
    },
    assinatura: {
      status: "pendente",
      inicioEm: agora,
      proximaCobranca: null,
      ultimoPagamento: null
    },
    avaliacao: { media: 0, total: 0 },
    cidadeId: CIDADE_MVP.toLowerCase(),
    criadoEm: agora
  });
  await batch.commit();

  return uid;
}

/**
 * Cadastra um novo ENTREGADOR.
 * Cria /users/{uid} (role="entregador") e /couriers/{uid} completo.
 */
export async function cadastrarEntregador(formData) {
  const cred = await createUserWithEmailAndPassword(auth, formData.email, formData.senha);
  const uid = cred.user.uid;

  await updateProfile(cred.user, { displayName: formData.nomeCompleto });

  const agora = serverTimestamp();

  const batch = writeBatch(db);
  batch.set(doc(db, "users", uid), {
    uid,
    role: "entregador",
    email: formData.email,
    nome: formData.nomeCompleto,
    aprovado: false,
    bloqueado: false,
    criadoEm: agora,
    consentimento: {
      versaoTermos: VERSAO_TERMOS,
      aceitoEm: agora
    }
  });

  batch.set(doc(db, "couriers", uid), {
    uid,
    nomeCompleto: formData.nomeCompleto,
    cpf: formData.cpf,
    dataNascimento: formData.dataNascimento,
    telefone: formData.telefone,
    whatsapp: formData.whatsapp || formData.telefone,
    email: formData.email,
    endereco: {
      logradouro: formData.endereco,
      numero: formData.numero,
      complemento: formData.complemento || "",
      bairro: formData.bairro,
      cep: formData.cep,
      cidade: CIDADE_MVP,
      estado: ESTADO_MVP
    },
    veiculo: {
      tipo: formData.tipoVeiculo, // "moto" | "bicicleta"
      marca: formData.marca || "",
      modelo: formData.modelo || "",
      ano: formData.ano || "",
      cor: formData.cor || "",
      placa: formData.placa || ""
    },
    status: "pendente", // pendente | em_analise | aprovado | reprovado | bloqueado
    verificacao: {
      contatoWhatsappFeito: false,
      documentosRecebidos: false, // doc pessoal + doc do veículo, conferidos por WhatsApp
      notasAdmin: ""
    },
    online: false,
    entregasAtivas: 0,
    assinatura: {
      status: "pendente",
      inicioEm: agora,
      proximaCobranca: null,
      ultimoPagamento: null
    },
    avaliacao: { media: 0, total: 0 },
    estatisticas: { entregasRealizadas: 0, cancelamentos: 0 },
    cidadeId: CIDADE_MVP.toLowerCase(),
    criadoEm: agora
  });
  await batch.commit();

  return uid;
}

export async function login(email, senha) {
  const cred = await signInWithEmailAndPassword(auth, email, senha);
  return cred.user;
}

export async function recuperarSenha(email) {
  await sendPasswordResetEmail(auth, email);
}
