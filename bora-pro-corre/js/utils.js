// =====================================================
// BORA PRO CORRE — Utilitários compartilhados
// =====================================================

// ---------- Formatação ----------

export function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(valor) || 0);
}

export function formatarTelefone(valor) {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  if (digitos.length <= 10) {
    return digitos
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digitos
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export function formatarCPF(valor) {
  return valor
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function formatarCNPJ(valor) {
  return valor
    .replace(/\D/g, "")
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function formatarCEP(valor) {
  return valor
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export function tempoRelativo(timestamp) {
  if (!timestamp) return "agora";
  const data = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const segundos = Math.floor((Date.now() - data.getTime()) / 1000);
  if (segundos < 60) return `há ${segundos}s`;
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  return `há ${dias}d`;
}

// ---------- Mensagens de erro amigáveis (item 56 do prompt mestre) ----------

const ERROS_AMIGAVEIS = {
  "auth/invalid-email": "E-mail inválido. Verifique e tente novamente.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/email-already-in-use": "Este e-mail já está cadastrado.",
  "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  "auth/network-request-failed": "Sem conexão com a internet. Verifique sua rede.",
  "permission-denied": "Você não tem permissão para realizar esta ação.",
  "unavailable": "Sem conexão. Algumas ações estão temporariamente indisponíveis."
};

export function mensagemErroAmigavel(erro) {
  const codigo = erro?.code || "";
  return ERROS_AMIGAVEIS[codigo] || "Não foi possível realizar esta ação. Verifique sua conexão e tente novamente.";
}

// ---------- Toast simples (sem dependências) ----------

export function mostrarToast(mensagem, tipo = "info") {
  let container = document.getElementById("bpc-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "bpc-toast-container";
    container.className = "fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-[90%] max-w-sm";
    document.body.appendChild(container);
  }

  const cores = {
    info: "bg-[#171A20] border-[#2A2F38] text-[#F5F3EE]",
    sucesso: "bg-[#0F2B22] border-[#3DDC84] text-[#B8F5D0]",
    erro: "bg-[#2B1414] border-[#FF4D4F] text-[#FFC9C9]",
    aviso: "bg-[#2B2410] border-[#FF6B35] text-[#FFD4B8]"
  };

  const toast = document.createElement("div");
  toast.className = `border rounded-xl px-4 py-3 shadow-lg text-sm font-medium animate-[fadeIn_0.2s_ease-out] ${cores[tipo] || cores.info}`;
  toast.textContent = mensagem;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-8px)";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ---------- Estado de conexão (item 58 do prompt mestre) ----------

export function monitorarConexao() {
  window.addEventListener("offline", () => {
    mostrarToast("Sem conexão. Algumas ações estão temporariamente indisponíveis.", "aviso");
  });
  window.addEventListener("online", () => {
    mostrarToast("Conexão restabelecida.", "sucesso");
  });
}

// ---------- Validação básica ----------

export function validarCPF(cpf) {
  const digitos = cpf.replace(/\D/g, "");
  return digitos.length === 11;
}

export function validarCNPJ(cnpj) {
  const digitos = cnpj.replace(/\D/g, "");
  return digitos.length === 14;
}

export function validarTelefone(tel) {
  const digitos = tel.replace(/\D/g, "");
  return digitos.length >= 10 && digitos.length <= 11;
}
