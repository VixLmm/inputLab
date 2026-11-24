/* =========================================================
   InputLab — "fachada" de autenticação
   O resto do site (menu, Lab, formulários) conversa só com este
   objeto: window.InputLabAuth. Quem faz o login de verdade é o
   arquivo firebase-auth.js, que se conecta aqui quando carrega.

   Por que separar? O Firebase carrega como módulo (de forma
   assíncrona). Esta fachada existe desde o início da página,
   guarda quem está logado e avisa as outras partes quando muda.
   ========================================================= */
(function () {
  "use strict";
  const listeners = [];
  let user = null;          // { uid, email, name } ou null
  let impl = null;          // funções reais (preenchidas pelo firebase-auth.js)
  let failure = null;       // mensagem de erro se o Firebase não carregar
  let resolveReady;
  const ready = new Promise(function (r) { resolveReady = r; });

  function notify() { listeners.forEach(function (cb) { try { cb(user); } catch (e) { console.error(e); } }); }
  async function call(name, args) {
    await ready;
    if (!impl) throw new Error(failure || "O login não está disponível no momento.");
    return impl[name].apply(null, args);
  }

  // Presets ficam no navegador, separados por usuário (uid do Firebase)
  function presetKey() { return user ? "inputlab:presets:" + user.uid : null; }
  function readPresets() {
    try { return JSON.parse(localStorage.getItem(presetKey())) || []; } catch (e) { return []; }
  }
  function writePresets(list) {
    try { localStorage.setItem(presetKey(), JSON.stringify(list)); return true; } catch (e) { return false; }
  }

  const Auth = {
    ready: ready,
    isReady: false,
    current: function () { return user; },
    error: function () { return failure; },

    /** Registra uma função chamada sempre que o usuário entra ou sai. */
    onChange: function (cb) { listeners.push(cb); if (Auth.isReady) cb(user); },

    login: function (email, password) { return call("login", [email, password]); },
    register: function (name, email, password) { return call("register", [name, email, password]); },
    logout: function () { return call("logout", []); },
    resetPassword: function (email) { return call("resetPassword", [email]); },

    getPresets: function () { return user ? readPresets() : []; },
    savePreset: function (preset) {
      if (!user) return false;
      const list = readPresets();
      const i = list.findIndex(function (p) { return p.name === preset.name; });
      if (i >= 0) list[i] = preset; else list.push(preset);
      return writePresets(list);
    },
    deletePreset: function (name) {
      if (!user) return;
      writePresets(readPresets().filter(function (p) { return p.name !== name; }));
    },

    /* ----- usados só pelo firebase-auth.js ----- */
    _connect: function (implementation) { impl = implementation; },
    _setUser: function (u) {
      user = u;
      if (!Auth.isReady) { Auth.isReady = true; resolveReady(); }
      notify();
    },
    _fail: function (msg) {
      failure = msg;
      if (!Auth.isReady) { Auth.isReady = true; resolveReady(); notify(); }
    }
  };

  // Se o Firebase não responder em 10 s (sem internet, arquivo faltando), libera a página
  setTimeout(function () { if (!Auth.isReady) Auth._fail("Não foi possível conectar ao serviço de login. Verifique sua internet."); }, 10000);

  window.InputLabAuth = Auth;
})();
