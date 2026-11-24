/* =========================================================
   InputLab — configuração do Firebase
   COMO PREENCHER: Firebase Console → ⚙ Configurações do projeto →
   "Seus apps" → app da Web → copie o objeto firebaseConfig para cá.

   Esses valores NÃO são segredos: todo site que usa Firebase
   expõe essa configuração no navegador. Quem protege as contas
   é o servidor do Firebase (senha com hash, limite de tentativas).
   ========================================================= */
export const firebaseConfig = {
  apiKey: "COLE_AQUI",
  authDomain: "COLE_AQUI",
  projectId: "COLE_AQUI",
  appId: "COLE_AQUI"
};

/* Emulador local do Firebase (só para testes no computador).
   Ativado automaticamente quando a URL tem ?emulador=1 */
export const useEmulator = new URLSearchParams(location.search).get("emulador") === "1";
