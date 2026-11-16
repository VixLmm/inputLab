/* =========================================================
   InputLab — overlay para OBS (fundo transparente)
   Configuração vem de ?c= (gerado no Lab) ou ?g= (skin da galeria)
   ========================================================= */
(function () {
  "use strict";
  const N = window.InputLabNotation, P = window.InputLabPad;
  const params = new URLSearchParams(location.search);
  let cfg;
  try {
    if (params.get("g") && window.INPUTLAB_GALLERY) cfg = P.fromGallery(window.INPUTLAB_GALLERY[params.get("g")]);
    else cfg = P.normalizeConfig(params.get("c") ? JSON.parse(decodeURIComponent(escape(atob(params.get("c"))))) : null);
  } catch (e) { cfg = P.defaultConfig(); }
  if (params.get("hist") === "0") cfg.history = false;

  const pad = P.buildPad(document.getElementById("padStage"), cfg);
  const reader = P.InputReader(function () { return cfg; });
  const history = P.History(10);
  const list = document.getElementById("historyList");
  list.hidden = !cfg.history;
  const byId = {}; P.activeButtons(cfg).forEach(function (b) { byId[b.id] = b; });
  let lastT = performance.now();

  function chip(id) {
    const b = byId[id]; if (!b) return "";
    const bg = b.label === "" ? P.UNUSED : b.color;
    return '<span class="il-btn-chip" style="background:' + bg + ";color:" + P.labelColor(bg) + '">' + window.InputLabUtil.escapeHtml(b.label || id) + "</span>";
  }
  function loop(now) {
    const dt = (now - lastT) / (1000 / 60); lastT = now;
    const s = reader.read();
    pad.update(s);
    history.push(N.toNumpad(s.dirs, cfg.side === "p2"), s.buttons, now, dt);
    if (cfg.history) {
      list.innerHTML = history.items.map(function (it) {
        return '<li><span class="frames">' + Math.round(it.frames) + '</span><span class="dir">' + N.formatDir(it.dir, cfg.notation) + "</span><span>" + it.buttons.map(chip).join("") + "</span></li>";
      }).join("");
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
