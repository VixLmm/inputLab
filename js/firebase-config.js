/* =========================================================
   InputLab — configuração do Firebase
   COMO PREENCHER: Firebase Console → ⚙ Configurações do projeto →
   "Seus apps" → app da Web → copie o objeto firebaseConfig para cá.

   Esses valores NÃO são segredos: todo site que usa Firebase
   expõe essa configuração no navegador. Quem protege as contas
   é o servidor do Firebase (senha com hash, limite de tentativas).
   ========================================================= */
export const firebaseConfig = {
  apiKey: "AIzaSyDGJ2yTuXBiH3CgPQ9G4rxBd4ugyFmfc8Y",
  authDomain: "inputlab-ff356.firebaseapp.com",
  projectId: "inputlab-ff356",
  appId: "1:78324521143:web:fbe7b953bb56c6686b1532"
};

/* Emulador local do Firebase (só para testes no computador).
   Ativado automaticamente quando a URL tem ?emulador=1 */
export const useEmulator = new URLSearchParams(location.search).get("emulador") === "1";
