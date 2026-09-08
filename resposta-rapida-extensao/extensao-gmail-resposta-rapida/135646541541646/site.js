/*
 * Cole abaixo o endereço fornecido pelo seu checkout (Mercado Pago, Kiwify,
 * Hotmart, Stripe etc.). Configure esse checkout para redirecionar pagamentos
 * aprovados para: https://SEU-DOMINIO/obrigado.html
 */
const CHECKOUT_URL = "";

const checkoutButton = document.getElementById("checkoutButton");
const checkoutDialog = document.getElementById("checkoutDialog");

if (checkoutButton) {
  checkoutButton.addEventListener("click", () => {
    if (CHECKOUT_URL) {
      window.location.href = CHECKOUT_URL;
      return;
    }
    checkoutDialog.showModal();
  });
}

if (checkoutDialog) {
  checkoutDialog.querySelector(".dialog-close").addEventListener("click", () => checkoutDialog.close());
  checkoutDialog.querySelector(".dialog-ok").addEventListener("click", () => checkoutDialog.close());
  checkoutDialog.addEventListener("click", (event) => {
    if (event.target === checkoutDialog) checkoutDialog.close();
  });
}

const copyButton = document.getElementById("copySerial");
const serialValue = document.getElementById("serialValue");
const copyStatus = document.getElementById("copyStatus");

if (copyButton && serialValue) {
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(serialValue.textContent.trim());
      copyButton.textContent = "Serial copiado!";
      copyButton.classList.add("copied");
      copyStatus.textContent = "Agora cole o serial na tela de ativação da extensão.";
      setTimeout(() => {
        copyButton.textContent = "Copiar serial";
        copyButton.classList.remove("copied");
      }, 2600);
    } catch (error) {
      const range = document.createRange();
      range.selectNodeContents(serialValue);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      copyStatus.textContent = "O serial foi selecionado. Pressione Ctrl+C para copiar.";
    }
  });
}

const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();
