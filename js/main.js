/* =========================================================
   InputLab — script comum a todas as páginas
   - Tema claro/escuro
   - Painel de acessibilidade (fonte, contraste, movimento, links)
   - Estado de login na barra de navegação
   ========================================================= */
(function () {
  "use strict";

  const STORAGE_KEY = "inputlab:a11y";
  const defaults = { theme: null, fontScale: 1, highContrast: false, reduceMotion: false, underlineLinks: false };

  // localStorage pode falhar (modo privado, iframes) — sempre protegido por try/catch
  function load() {
    try { return Object.assign({}, defaults, JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}); }
    catch (e) { return Object.assign({}, defaults); }
  }
  function save(prefs) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch (e) { /* ignora */ }
  }

  const prefs = load();
  const root = document.documentElement;

  // Se o usuário nunca escolheu, respeita a preferência do sistema operacional
  function resolvedTheme() {
    if (prefs.theme) return prefs.theme;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function apply() {
    root.setAttribute("data-bs-theme", resolvedTheme());
    root.style.setProperty("--il-font-scale", prefs.fontScale);
    root.classList.toggle("il-high-contrast", prefs.highContrast);
    root.classList.toggle("il-reduce-motion", prefs.reduceMotion);
    root.classList.toggle("il-underline-links", prefs.underlineLinks);
    syncControls();
  }

  // Aplica o quanto antes para evitar "flash" de tema errado
  apply();

  function syncControls() {
    const isDark = resolvedTheme() === "dark";
    document.querySelectorAll("[data-il-theme-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(isDark));
      btn.setAttribute("aria-label", isDark ? "Mudar para modo claro" : "Mudar para modo escuro");
      const icon = btn.querySelector("i");
      if (icon) icon.className = isDark ? "bi bi-sun-fill" : "bi bi-moon-stars-fill";
    });
    const fontOut = document.getElementById("a11yFontValue");
    if (fontOut) fontOut.textContent = Math.round(prefs.fontScale * 100) + "%";
    [["a11yContrast", "highContrast"], ["a11yMotion", "reduceMotion"], ["a11yLinks", "underlineLinks"]].forEach(function (pair) {
      const el = document.getElementById(pair[0]);
      if (el) el.checked = prefs[pair[1]];
    });
    const themeSel = document.getElementById("a11yTheme");
    if (themeSel) themeSel.value = prefs.theme || "auto";
  }

  function announce(msg) {
    const live = document.getElementById("il-live");
    if (live) { live.textContent = ""; setTimeout(function () { live.textContent = msg; }, 50); }
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Botão de tema na navbar
    document.querySelectorAll("[data-il-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        prefs.theme = resolvedTheme() === "dark" ? "light" : "dark";
        save(prefs); apply();
        announce(prefs.theme === "dark" ? "Modo escuro ativado" : "Modo claro ativado");
      });
    });

    // Painel de acessibilidade
    const bind = function (id, event, fn) { const el = document.getElementById(id); if (el) el.addEventListener(event, fn); };
    bind("a11yTheme", "change", function (e) { prefs.theme = e.target.value === "auto" ? null : e.target.value; save(prefs); apply(); });
    bind("a11yFontUp", "click", function () { prefs.fontScale = Math.min(1.5, +(prefs.fontScale + 0.1).toFixed(1)); save(prefs); apply(); announce("Fonte em " + Math.round(prefs.fontScale * 100) + "%"); });
    bind("a11yFontDown", "click", function () { prefs.fontScale = Math.max(0.9, +(prefs.fontScale - 0.1).toFixed(1)); save(prefs); apply(); announce("Fonte em " + Math.round(prefs.fontScale * 100) + "%"); });
    bind("a11yContrast", "change", function (e) { prefs.highContrast = e.target.checked; save(prefs); apply(); });
    bind("a11yMotion", "change", function (e) { prefs.reduceMotion = e.target.checked; save(prefs); apply(); pauseCarousels(); });
    bind("a11yLinks", "change", function (e) { prefs.underlineLinks = e.target.checked; save(prefs); apply(); });
    bind("a11yReset", "click", function () { Object.assign(prefs, defaults); save(prefs); apply(); announce("Preferências restauradas"); });

    // Link ativo da navegação
    const page = document.body.getAttribute("data-page");
    document.querySelectorAll(".il-navbar .nav-link[data-page]").forEach(function (a) {
      if (a.getAttribute("data-page") === page) { a.classList.add("active"); a.setAttribute("aria-current", "page"); }
    });

    // Estado de login: o menu é redesenhado sempre que alguém entra ou sai
    if (window.InputLabAuth) window.InputLabAuth.onChange(renderNavUser);

    const year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();

    pauseCarousels();
  });

  // Com "reduzir movimento" o carrossel não gira sozinho (WCAG 2.2.2)
  function pauseCarousels() {
    if (!window.bootstrap) return;
    const reduce = prefs.reduceMotion || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    document.querySelectorAll(".carousel").forEach(function (el) {
      const c = bootstrap.Carousel.getOrCreateInstance(el);
      if (reduce) c.pause();
    });
  }

  function renderNavUser(user) {
    const slot = document.getElementById("navUser");
    if (!slot) return;
    if (user) {
      slot.innerHTML = '<div class="dropdown"><button class="btn btn-il-ghost btn-sm dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false"><i class="bi bi-person-circle" aria-hidden="true"></i> ' +
        escapeHtml(user.name.split(" ")[0]) + '</button><ul class="dropdown-menu dropdown-menu-end"><li><span class="dropdown-item-text small text-muted">' + escapeHtml(user.email) + '</span></li><li><a class="dropdown-item" href="lab.html">Meus presets</a></li><li><button class="dropdown-item" id="navLogout">Sair</button></li></ul></div>';
      document.getElementById("navLogout").addEventListener("click", async function () {
        await window.InputLabAuth.logout();
        location.href = "index.html";
      });
    } else {
      slot.innerHTML = '<a class="btn btn-il-ghost btn-sm" href="login.html"><i class="bi bi-box-arrow-in-right" aria-hidden="true"></i> Entrar</a>';
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  window.InputLabUtil = { escapeHtml: escapeHtml, announce: announce };
})();
