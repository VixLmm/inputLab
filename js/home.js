/* =========================================================
   InputLab — página inicial
   1) Controle do topo que responde ao teclado/controle (com histórico)
   2) Botão de pausar o carrossel (WCAG 2.2.2)
   ========================================================= */
(function () {
  "use strict";
  const N = window.InputLabNotation;
  const P = window.InputLabPad;

  /* ---------- 1. Controle ao vivo no topo ---------- */
  const stage = document.getElementById("homePad");
  const log = document.getElementById("homeLog");
  if (stage && P && N) {
    const config = P.defaultConfig();          // arcade de 8 botões, teclas WASD + UIOP / JKLÇ
    const pad = P.buildPad(stage, config, {});
    // keepScroll: as setas continuam rolando a página (o Início é para ler)
    const reader = P.InputReader(function () { return config; }, { keepScroll: true });
    const history = P.History(7);
    const labelOf = {};
    P.activeButtons(config).forEach(function (b) { labelOf[b.id] = b.label; });

    let lastT = performance.now(), lastHtml = "";
    const loop = function (now) {
      const dt = (now - lastT) / (1000 / 60); lastT = now;
      const s = reader.read();
      pad.update(s);
      history.push(N.toNumpad(s.dirs, false), s.buttons, now, dt);
      // Histórico estilo modo treino: direção + botões e quantos frames durou
      const html = history.items.map(function (it) {
        const btns = it.buttons.map(function (id) { return labelOf[id] || id; }).join("+");
        return "<li><span>" + N.formatDir(it.dir, "numpad") + (btns ? " " + btns : "") +
               '</span><span class="f">' + Math.round(it.frames) + "f</span></li>";
      }).join("");
      if (html !== lastHtml) { log.innerHTML = html; lastHtml = html; }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---------- 2. Pausar / continuar o carrossel ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    const el = document.getElementById("skinCarousel");
    const btn = document.getElementById("carPause");
    if (!el || !btn || !window.bootstrap) return;
    const reduce = document.documentElement.classList.contains("il-reduce-motion") ||
      (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    // Recria o carrossel com ou sem giro automático. Só "pause()" não basta:
    // o Bootstrap volta a girar quando o mouse sai de cima dele.
    function setPaused(paused) {
      const old = bootstrap.Carousel.getInstance(el);
      if (old) old.dispose();
      const c = new bootstrap.Carousel(el, paused ? { interval: false, ride: false } : { interval: 6000, ride: "carousel" });
      if (!paused) c.cycle();
      btn.setAttribute("aria-pressed", paused ? "true" : "false");
      btn.querySelector("i").className = "bi " + (paused ? "bi-play-fill" : "bi-pause-fill");
      btn.querySelector("span").textContent = paused ? "Continuar" : "Pausar";
    }
    btn.addEventListener("click", function () { setPaused(btn.getAttribute("aria-pressed") !== "true"); });
    setPaused(reduce);
  });
})();
