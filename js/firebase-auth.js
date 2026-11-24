/* =========================================================
   InputLab — login real com Firebase Authentication
   - As contas ficam nos servidores do Firebase (Google), não no navegador.
   - A senha nunca é guardada pelo site: ela vai por HTTPS para o
     Firebase, que guarda só um hash e devolve um token de sessão.
   - A sessão continua ativa ao recarregar a página (persistência local).
   ========================================================= */
import {
  initializeApp, getAuth, connectAuthEmulator, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  updateProfile, sendPasswordResetEmail, setPersistence, browserLocalPersistence
} from "../vendor/firebase/firebase-bundle.js";
import { firebaseConfig, useEmulator } from "./firebase-config.js";

const Auth = window.InputLabAuth;

// Mensagens de erro do Firebase traduzidas para o usuário
const MESSAGES = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/invalid-email": "Esse e-mail não é válido.",
  "auth/email-already-in-use": "Já existe uma conta com esse e-mail.",
  "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
  "auth/too-many-requests": "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.",
  "auth/network-request-failed": "Sem conexão com o servidor. Verifique sua internet.",
  "auth/operation-not-allowed": "O login por e-mail e senha não está ativado no Firebase.",
  "auth/user-disabled": "Esta conta foi desativada.",
  "auth/missing-email": "Informe o e-mail."
};
function translate(err) {
  const msg = MESSAGES[err && err.code] || "Não foi possível concluir. Tente novamente.";
  const e = new Error(msg); e.code = err && err.code; return e;
}

// Converte o usuário do Firebase para o formato que o site usa
function toSiteUser(u) {
  if (!u) return null;
  return { uid: u.uid, email: u.email, name: u.displayName || (u.email || "").split("@")[0] };
}

if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "COLE_AQUI") {
  Auth._fail("O login ainda não foi configurado (falta preencher js/firebase-config.js).");
} else {
  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    auth.languageCode = "pt-BR";          // e-mails do Firebase em português
    if (useEmulator) connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    await setPersistence(auth, browserLocalPersistence);

    Auth._connect({
      async login(email, password) {
        try { await signInWithEmailAndPassword(auth, email.trim(), password); }
        catch (err) { throw translate(err); }
      },
      async register(name, email, password) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
          await updateProfile(cred.user, { displayName: name.trim() });
          Auth._setUser(toSiteUser(cred.user));      // atualiza o nome no menu
        } catch (err) { throw translate(err); }
      },
      async logout() { await signOut(auth); },
      async resetPassword(email) {
        try { await sendPasswordResetEmail(auth, email.trim()); }
        catch (err) {
          // Não revela se o e-mail existe ou não (proteção contra enumeração de contas)
          if (err.code === "auth/user-not-found") return;
          throw translate(err);
        }
      }
    });

    // Chamado ao abrir a página (sessão salva) e sempre que alguém entra ou sai
    onAuthStateChanged(auth, function (u) { Auth._setUser(toSiteUser(u)); });
  } catch (err) {
    console.error(err);
    Auth._fail("Não foi possível iniciar o login.");
  }
}
