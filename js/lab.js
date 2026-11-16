/* =========================================================
   InputLab — página do Lab (visualizador + editor de controle)
   ========================================================= */
(function () {
  "use strict";
  const N = window.InputLabNotation;
  const P = window.InputLabPad;
  const Auth = window.InputLabAuth;
  const esc = window.InputLabUtil.escapeHtml;
  const announce = window.InputLabUtil.announce;
  const LOCAL_KEY = "inputlab:config:v2";

  let config = P.normalizeConfig(loadLocal());
  let pad = null;
  let selectedId = null;
  let editMode = false;
  let mappingId = null;
  const history = P.History(18);
  const reader = P.InputReader(function () { return config; });

  function loadLocal() { try { return JSON.parse(localStorage.getItem(LOCAL_KEY)); } catch (e) { return null; } }
  function saveLocal() { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(config)); } catch (e) {} }
  const $ = function (id) { return document.getElementById(id); };

  function buttons() { return P.activeButtons(config); }
  function findItem(id) {
    if (id && id.indexOf("dir:") === 0) return config.leverless.dirs[id.slice(4)];
    return buttons().find(function (b) { return b.id === id; });
  }
  const BODY_COLOR = "#242836";   // corpo do controle (fixo nos dois temas — ver style.css)
  function bodyColor() { return BODY_COLOR; }
  // WCAG 1.4.11: componentes de interface precisam de 3:1 contra o que está ao redor
  function bodyContrast(color) { return P.contrast(color, bodyColor()); }

  /* ---------- Desenho ---------- */
  function redrawPad() {
    pad = P.buildPad($("padStage"), config, {
      editable: editMode && config.layout !== "pad",
      selectedId: selectedId,
      onSelect: function (id) { selectedId = id; markSelectedRow(); renderSelectedEditor(); },
      onMove: function (id, x, y) {
        const it = findItem(id); if (!it) return;
        it.x = x; it.y = y; renderSelectedEditor(); persist();
      }
    });
    $("stageBox").classList.toggle("editing", editMode && config.layout !== "pad");
  }
  function persist() { saveLocal(); updateOverlayUrl(); }

  /* ---------- Lista de botões ---------- */
  function renderList() {
    const isPad = config.layout === "pad";
    const names = P.PHYS_NAMES[config.pad.style] || P.PHYS_NAMES.xbox;
    $("buttonList").innerHTML = buttons().map(function (b) {
      const name = b.label || (isPad ? names[b.phys] : b.id);
      const low = b.label !== "" && bodyContrast(b.color) < 3;
      return '<li class="il-btn-row' + (b.id === selectedId ? " is-selected" : "") + '" data-id="' + esc(b.id) + '">' +
        (isPad ? '<span class="phys" title="Botão físico">' + esc(names[b.phys]) + "</span>" : '<span class="phys" aria-hidden="true">' + (low ? '<i class="bi bi-exclamation-triangle-fill il-p1"></i>' : "") + "</span>") +
        '<input type="color" class="form-control form-control-color" data-field="color" value="' + esc(b.color) + '" aria-label="Cor do botão ' + esc(name) + '">' +
        '<input class="form-control form-control-sm" data-field="label" maxlength="4" value="' + esc(b.label) + '" aria-label="Rótulo do botão ' + esc(name) + '"' + (isPad ? ' placeholder="(sem uso)"' : "") + ">" +
        '<button type="button" class="btn btn-il-ghost btn-sm map-btn" data-act="map" title="Remapear">' + esc(P.describeInput(b, config.pad.style)) + "</button>" +
        (isPad ? "" :
          '<button type="button" class="btn btn-il-ghost btn-sm" data-act="select" aria-pressed="' + (b.id === selectedId) + '" aria-label="Posicionar ' + esc(name) + '" title="Posição e tamanho"><i class="bi bi-arrows-move" aria-hidden="true"></i></button>' +
          '<button type="button" class="btn btn-il-ghost btn-sm" data-act="remove" aria-label="Remover ' + esc(name) + '" title="Remover"><i class="bi bi-trash" aria-hidden="true"></i></button>') +
        "</li>";
    }).join("");
    $("btnAddButton").hidden = isPad;
    $("padAddNote").hidden = !isPad;
    $("editModeBox").hidden = isPad;
    $("padStyleBox").hidden = !isPad;
    $("buttonCount").textContent = buttons().filter(function (b) { return b.label !== ""; }).length;
  }
  function markSelectedRow() {
    document.querySelectorAll("#buttonList .il-btn-row").forEach(function (li) {
      const on = li.getAttribute("data-id") === selectedId;
      li.classList.toggle("is-selected", on);
      const s = li.querySelector('[data-act="select"]'); if (s) s.setAttribute("aria-pressed", String(on));
    });
  }

  /* ---------- Editor do item selecionado (alternativa ao arrastar — WCAG 2.5.7) ---------- */
  function renderSelectedEditor() {
    const box = $("selectedEditor");
    const it = config.layout === "pad" ? null : findItem(selectedId);
    if (!it) { box.hidden = true; return; }
    box.hidden = false;
    const isDir = selectedId.indexOf("dir:") === 0;
    $("selName").textContent = isDir ? "Direção " + ({ left: "←", right: "→", up: "↑", down: "↓" })[selectedId.slice(4)] : (it.label || "botão");
    $("selX").value = it.x; $("selY").value = it.y;
    $("selSizeBox").hidden = isDir;
    if (!isDir) {
      $("selR").value = it.r || 30;
      const c = bodyContrast(it.color), ok = c >= 3;
      $("selContrast").innerHTML = '<i class="bi ' + (ok ? "bi-check-circle-fill il-p2" : "bi-exclamation-triangle-fill il-p1") + '" aria-hidden="true"></i> ' +
        "Contraste com o corpo do controle: " + c.toFixed(1) + ":1 " + (ok ? "(passa 3:1)" : "(abaixo de 3:1 — o botão some no fundo)");
    } else $("selContrast").textContent = "";
  }

  function fullRefresh() { redrawPad(); renderList(); renderSelectedEditor(); persist(); }

  /* ---------- Numpad e histórico ---------- */
  function renderNumpad(dir) {
    const cells = $("liveNumpad").children, order = [7, 8, 9, 4, 5, 6, 1, 2, 3];
    for (let i = 0; i < 9; i++) {
      cells[i].textContent = N.formatDir(order[i], config.notation);
      cells[i].classList.toggle("on", order[i] === dir);
    }
  }
  function chip(id) {
    const b = findItem(id); if (!b) return "";
    const names = P.PHYS_NAMES[config.pad.style] || P.PHYS_NAMES.xbox;
    const label = b.label || names[b.phys] || id;
    const color = b.label === "" ? P.UNUSED : b.color;
    return '<span class="il-btn-chip" style="background:' + color + ";color:" + P.labelColor(color) + '">' + esc(label) + "</span>";
  }
  function renderHistory() {
    if (!config.history) return;
    $("historyList").innerHTML = history.items.map(function (it) {
      return '<li><span class="frames">' + Math.round(it.frames) + '</span><span class="dir">' + N.formatDir(it.dir, config.notation) +
        "</span><span>" + it.buttons.map(chip).join("") + "</span></li>";
    }).join("");
  }

  /* ---------- Loop principal ---------- */
  let lastT = performance.now();
  let lastMotionText = "";
  function loop(now) {
    const dt = (now - lastT) / (1000 / 60); lastT = now;
    const s = reader.read();
    const dir = N.toNumpad(s.dirs, config.side === "p2");
    if (pad) pad.update(s);
    renderNumpad(dir);
    const r = history.push(dir, s.buttons, now, dt);
    if (r.newPress.size && !mappingId) {
      const m = N.detectMotion(r.dirLog, now, 450);
      if (m) {
        const btns = Array.from(r.newPress).map(function (id) { const b = findItem(id); return b ? (b.label || id) : id; }).join("+");
        const text = m.code + btns + " — " + m.name;
        $("motionOut").textContent = text;
        if (text !== lastMotionText) $("motionLive").textContent = text;
        lastMotionText = text;
        const c = $("counter-" + m.code); if (c) c.textContent = +c.textContent + 1;
      }
    }
    $("historyCard").hidden = !config.history;
    renderHistory();
    requestAnimationFrame(loop);
  }

  /* ---------- Remapeamento ---------- */
  function startMapping(id) {
    const b = findItem(id); if (!b) return;
    mappingId = id;
    document.querySelectorAll("#buttonList .il-btn-row").forEach(function (li) { li.classList.toggle("is-mapping", li.getAttribute("data-id") === id); });
    $("remapHint").hidden = false;
    $("remapHint").textContent = "Aperte no controle ou no teclado o botão para “" + (b.label || id) + "”… (Esc cancela)";
    reader.startCapture(function (res) {
      mappingId = null;
      if (!res) { $("remapHint").textContent = "Mapeamento cancelado."; }
      else {
        if (res.key) b.key = res.key; else b.gp = res.gp;
        $("remapHint").textContent = "“" + (b.label || id) + "” agora responde a: " + P.describeInput(b, config.pad.style);
        announce($("remapHint").textContent);
      }
      renderList(); persist();
    });
  }

  /* ---------- Presets salvos na conta ---------- */
  function renderPresets() {
    const user = Auth.current();
    $("presetLoginHint").hidden = !!user;
    $("presetSaveBox").hidden = !user;
    if (!user) { $("presetList").innerHTML = ""; return; }
    const list = Auth.getPresets();
    $("presetList").innerHTML = list.length ? list.map(function (p) {
      const layout = p.config && p.config.layout ? p.config.layout : "?";
      return '<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent text-reset">' +
        '<span><i class="bi bi-controller" aria-hidden="true"></i> ' + esc(p.name) + ' <small class="text-muted">(' + esc(layout) + ")</small></span>" +
        '<span class="btn-group btn-group-sm"><button class="btn btn-il-ghost" data-load="' + esc(p.name) + '">Carregar</button>' +
        '<button class="btn btn-il-ghost" data-del="' + esc(p.name) + '" aria-label="Excluir preset ' + esc(p.name) + '"><i class="bi bi-trash" aria-hidden="true"></i></button></span></li>';
    }).join("") : '<li class="list-group-item bg-transparent text-muted">Nenhum preset salvo ainda.</li>';
  }

  /* ---------- URL do overlay ---------- */
  function encodeConfig(c) { return btoa(unescape(encodeURIComponent(JSON.stringify(c)))); }
  function updateOverlayUrl() {
    const base = location.href.replace(/[?#].*$/, "").replace(/[^/]*$/, "");
    $("overlayUrl").value = base + "overlay.html?c=" + encodeURIComponent(encodeConfig(config));
  }

  function fillForm() {
    $("cfgLayout").value = config.layout;
    $("cfgPadStyle").value = config.pad.style;
    $("cfgPreset").value = config.preset in P.GAME_PRESETS ? config.preset : "generic8";
    $("cfgNotation").value = config.notation;
    $("cfgSide").value = config.side;
    $("cfgHistory").checked = config.history;
    $("cfgEditMode").checked = editMode;
  }

  /* ---------- Início ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    // Lista de presets de jogo
    $("cfgPreset").innerHTML = Object.keys(P.GAME_PRESETS).map(function (k) {
      return '<option value="' + k + '">' + esc(P.GAME_PRESETS[k].name) + "</option>";
    }).join("");

    // Skin da galeria (?preset=arcade) vinda da página inicial
    const g = new URLSearchParams(location.search).get("preset");
    if (g && window.INPUTLAB_GALLERY && window.INPUTLAB_GALLERY[g]) config = P.fromGallery(window.INPUTLAB_GALLERY[g]);

    fillForm(); fullRefresh(); renderPresets();

    $("cfgLayout").addEventListener("change", function (e) { config.layout = e.target.value; selectedId = null; fullRefresh(); });
    $("cfgPadStyle").addEventListener("change", function (e) { config.pad.style = e.target.value; fullRefresh(); });
    $("btnApplyPreset").addEventListener("click", function () {
      const key = $("cfgPreset").value;
      P.applyPreset(config, key); selectedId = null; fullRefresh();
      announce("Preset " + P.GAME_PRESETS[key].name + " aplicado");
    });
    $("cfgNotation").addEventListener("change", function (e) { config.notation = e.target.value; persist(); });
    $("cfgSide").addEventListener("change", function (e) { config.side = e.target.value; persist(); });
    $("cfgHistory").addEventListener("change", function (e) { config.history = e.target.checked; persist(); });
    $("cfgEditMode").addEventListener("change", function (e) {
      editMode = e.target.checked; redrawPad();
      announce(editMode ? "Modo edição: arraste os botões ou use os campos X e Y" : "Modo edição desligado");
    });

    // Edição na lista (delegação de eventos)
    $("buttonList").addEventListener("input", function (e) {
      const li = e.target.closest("[data-id]"), f = e.target.getAttribute("data-field");
      if (!li || !f) return;
      const b = findItem(li.getAttribute("data-id"));
      b[f] = f === "label" ? e.target.value.slice(0, 4) : e.target.value;
      redrawPad(); renderSelectedEditor(); persist();
      if (f === "color" && config.layout !== "pad") {
        const warn = li.querySelector(".phys");
        warn.innerHTML = bodyContrast(b.color) < 3 ? '<i class="bi bi-exclamation-triangle-fill il-p1"></i>' : "";
      }
    });
    $("buttonList").addEventListener("click", function (e) {
      const btn = e.target.closest("[data-act]"); if (!btn) return;
      const id = btn.closest("[data-id]").getAttribute("data-id");
      const act = btn.getAttribute("data-act");
      if (act === "map") startMapping(id);
      if (act === "select") { selectedId = selectedId === id ? null : id; redrawPad(); markSelectedRow(); renderSelectedEditor(); }
      if (act === "remove") {
        const list = config[config.layout].buttons;
        const b = findItem(id);
        list.splice(list.indexOf(b), 1);
        if (selectedId === id) selectedId = null;
        fullRefresh(); announce("Botão " + (b.label || "") + " removido");
      }
    });
    $("btnAddButton").addEventListener("click", function () {
      const list = config[config.layout].buttons;
      if (list.length >= 16) { announce("Limite de 16 botões"); return; }
      const id = "c" + Date.now().toString(36);
      list.push({ id: id, label: "B" + (list.length + 1), color: "#E6E8EE", x: 360 + (list.length % 4) * 20, y: 300, r: 26, gp: null, key: null });
      selectedId = id; fullRefresh();
      announce("Botão adicionado. Mapeie e posicione nos campos abaixo ou ative Editar posições.");
      startMapping(id);
    });
    ["selX", "selY", "selR"].forEach(function (fid) {
      $(fid).addEventListener("input", function (e) {
        const it = findItem(selectedId); if (!it) return;
        const v = parseInt(e.target.value, 10); if (isNaN(v)) return;
        if (fid === "selX") it.x = Math.min(690, Math.max(30, v));
        if (fid === "selY") it.y = Math.min(330, Math.max(30, v));
        if (fid === "selR") it.r = Math.min(44, Math.max(18, v));
        redrawPad(); persist();
      });
    });

    $("btnReset").addEventListener("click", function () {
      const style = config.pad.style, layout = config.layout;
      config = P.defaultConfig(); config.layout = layout; config.pad.style = style;
      selectedId = null; fillForm(); fullRefresh();
    });
    $("btnClearHistory").addEventListener("click", function () { history.clear(); $("motionOut").textContent = ""; });

    $("btnCopyOverlay").addEventListener("click", function () {
      const input = $("overlayUrl");
      (navigator.clipboard ? navigator.clipboard.writeText(input.value) : Promise.reject()).then(
        function () { announce("Link do overlay copiado"); $("btnCopyOverlay").innerHTML = '<i class="bi bi-check2" aria-hidden="true"></i> Copiado'; },
        function () { input.select(); document.execCommand("copy"); }
      );
      setTimeout(function () { $("btnCopyOverlay").innerHTML = '<i class="bi bi-clipboard" aria-hidden="true"></i> Copiar'; }, 2000);
    });

    $("presetForm").addEventListener("submit", function (e) {
      e.preventDefault();
      const name = $("presetName").value.trim();
      if (!name) { $("presetName").classList.add("is-invalid"); return; }
      $("presetName").classList.remove("is-invalid");
      Auth.savePreset({ name: name, config: JSON.parse(JSON.stringify(config)) });
      $("presetName").value = ""; renderPresets(); announce("Preset " + name + " salvo");
    });
    $("presetList").addEventListener("click", function (e) {
      const load = e.target.closest("[data-load]"), del = e.target.closest("[data-del]");
      if (load) {
        const p = Auth.getPresets().find(function (x) { return x.name === load.getAttribute("data-load"); });
        if (p) { config = P.normalizeConfig(p.config); selectedId = null; fillForm(); fullRefresh(); }
      }
      if (del) { Auth.deletePreset(del.getAttribute("data-del")); renderPresets(); }
    });

    // Tema mudou → recalcula contraste com o corpo do controle
    new MutationObserver(function () { renderList(); renderSelectedEditor(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-bs-theme", "class"] });

    reader.onConnection(function (gp) {
      $("padStatus").classList.toggle("on", !!gp);
      $("padStatusText").textContent = gp ? "Controle conectado: " + gp.id + (gp.mapping === "standard" ? "" : " (mapeamento não padrão — use Remapear se algo não responder)") : "Nenhum controle — usando teclado (aperte um botão do controle para conectar)";
    });

    requestAnimationFrame(loop);
  });
})();
