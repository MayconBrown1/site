let deferredPrompt;
const installButton = document.createElement("button");

installButton.innerText = "📲 Instalar App";
installButton.style.position = "fixed";
installButton.style.bottom = "20px";
installButton.style.right = "20px";
installButton.style.background = "#2563eb";
installButton.style.color = "#fff";
installButton.style.padding = "12px 18px";
installButton.style.border = "none";
installButton.style.borderRadius = "9999px";
installButton.style.fontSize = "16px";
installButton.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
installButton.style.cursor = "pointer";
installButton.style.display = "none";
installButton.style.zIndex = "9999";
document.body.appendChild(installButton);

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  installButton.style.display = "block";
});

installButton.addEventListener("click", async () => {
  installButton.style.display = "none";
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      console.log("Usuário aceitou a instalação");
    } else {
      console.log("Usuário recusou a instalação");
    }
    deferredPrompt = null;
  }
});

window.addEventListener("appinstalled", () => {
  console.log("App instalado com sucesso!");
});
