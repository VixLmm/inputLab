/* =========================================================
   InputLab — autenticação DEMONSTRATIVA (somente front-end)
   ATENÇÃO: não existe servidor. As contas ficam no localStorage
   do próprio navegador e a senha é guardada como hash SHA-256.
   Isso serve para demonstrar o fluxo de login na disciplina,
   mas NÃO é segurança real (ver seção de limitações no README).
   ========================================================= */
(function () {
  "use strict";
  const USERS = "inputlab:users";
  const SESSION = "inputlab:session";

  function read(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  async function sha256(text) {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }

  const Auth = {
    current: function () {
      const email = read(SESSION, null);
      if (!email) return null;
      const u = read(USERS, {})[email];
      return u ? { email: email, name: u.name } : null;
    },
    register: async function (name, email, password) {
      email = email.trim().toLowerCase();
      const users = read(USERS, {});
      if (users[email]) throw new Error("Já existe uma conta com esse e-mail.");
      users[email] = { name: name.trim(), hash: await sha256(email + ":" + password), presets: [] };
      write(USERS, users); write(SESSION, email);
    },
    login: async function (email, password) {
      email = email.trim().toLowerCase();
      const u = read(USERS, {})[email];
      if (!u || u.hash !== await sha256(email + ":" + password)) throw new Error("E-mail ou senha incorretos.");
      write(SESSION, email);
    },
    logout: function () { try { localStorage.removeItem(SESSION); } catch (e) {} },
    getPresets: function () {
      const s = read(SESSION, null); if (!s) return [];
      const u = read(USERS, {})[s]; return u ? (u.presets || []) : [];
    },
    savePreset: function (preset) {
      const s = read(SESSION, null); if (!s) return false;
      const users = read(USERS, {}); if (!users[s]) return false;
      const list = users[s].presets || [];
      const i = list.findIndex(function (p) { return p.name === preset.name; });
      if (i >= 0) list[i] = preset; else list.push(preset);
      users[s].presets = list; return write(USERS, users);
    },
    deletePreset: function (name) {
      const s = read(SESSION, null); if (!s) return;
      const users = read(USERS, {}); if (!users[s]) return;
      users[s].presets = (users[s].presets || []).filter(function (p) { return p.name !== name; });
      write(USERS, users);
    }
  };
  window.InputLabAuth = Auth;
})();
