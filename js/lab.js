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
  const BODY_COLOR = "#15181E";   // tampo do controle, onde ficam os botões (fixo nos dois temas — ver style.css)
  /** Cor que fica atrás dos botões: a base escolhida ou, se for transparente, o fundo do palco. */
  function bodyColor() {
    if (config.layout === "pad") return "#1B1C20";
    if (config.baseColor) return config.baseColor;
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(getComputedStyle($("stageBox")).backgroundColor || "");
    return m ? "#" + [m[1], m[2], m[3]].map(function (n) { return (+n).toString(16).padStart(2, "0"); }).join("") : BODY_COLOR;
  }
  // WCAG 1.4.11: componentes de interface precisam de 3:1 contra o que está ao redor
  // No arcade e no leverless, o anel preto do botão também separa o botão do fundo (WCAG 1.4.11)
  function bodyContrast(color) {
    const bg = bodyColor(), c = P.contrast(color, bg);
    return config.layout === "pad" ? c : Math.max(c, P.contrast("#0B0B0B", bg));
  }

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
        '<button type="button" class="btn btn-il-ghost btn-sm map-btn" data-act="map-gp" title="Remapear no controle" aria-label="Botão do controle para ' + esc(name) + ': ' + esc(P.describeGp(b, config.pad.style)) + '. Clique para remapear"><i class="bi bi-controller" aria-hidden="true"></i> ' + esc(P.describeGp(b, config.pad.style)) + "</button>" +
        '<button type="button" class="btn btn-il-ghost btn-sm map-btn" data-act="map-key" title="Remapear no teclado" aria-label="Tecla para ' + esc(name) + ': ' + esc(P.describeKey(b.key)) + '. Clique para remapear"><i class="bi bi-keyboard" aria-hidden="true"></i> ' + esc(P.describeKey(b.key)) + "</button>" +
        (isPad ? "" :
          '<button type="button" class="btn btn-il-ghost btn-sm" data-act="select" aria-pressed="' + (b.id === selectedId) + '" aria-label="Posicionar ' + esc(name) + '" title="Posição e tamanho"><i class="bi bi-arrows-move" aria-hidden="true"></i></button>' +
          '<button type="button" class="btn btn-il-ghost btn-sm" data-act="remove" aria-label="Remover ' + esc(name) + '" title="Remover"><i class="bi bi-trash" aria-hidden="true"></i></button>') +
        "</li>";
    }).join("");
    $("btnAddButton").hidden = isPad;
    $("padAddNote").hidden = !isPad;
    $("editModeBox").hidden = isPad;
    $("baseBox").hidden = isPad;
    $("trailBox").hidden = config.layout !== "stick";
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
        "Contraste com o corpo do controle: " + c.toFixed(1) + ":1 " + (ok ? "(passa 3:1)" : "(abaixo de 3:1: o botão some no fundo)");
    } else $("selContrast").textContent = "";
  }

  function fullRefresh() { redrawPad(); renderList(); renderSelectedEditor(); renderDirKeys(); updateKeyHint(); updateFillBox(); persist(); }

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
    if (now - lastAxesT > 100) { lastAxesT = now; renderAxes(s); }
    renderNumpad(dir);
    const r = history.push(dir, s.buttons, now, dt);
    if (r.newPress.size && !mappingId) {
      const m = N.detectMotion(r.dirLog, now, 450);
      if (m) {
        const btns = Array.from(r.newPress).map(function (id) { const b = findItem(id); return b ? (b.label || id) : id; }).join("+");
        const text = m.code + btns + " · " + m.name;
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

  /* ---------- Leitura ao vivo dos eixos (diagnóstico) ---------- */
  let lastAxesT = 0;
  const LAYOUT_NAMES = { standard: "padrão", xpad: "cru, tipo Xbox", generic: "cru, tipo genérico" };
  function renderAxes(s) {
    const out = $("axesReadout");
    if (!out) return;
    if (!s.gamepad) { out.textContent = "Sem controle."; return; }
    const f = function (v) { return (v >= 0 ? "+" : "") + v.toFixed(2); };
    out.textContent = "Leitura: " + (LAYOUT_NAMES[s.layout] || s.layout) + "\n" +
      s.rawAxes.map(function (v, i) { return "eixo " + i + ": " + f(v); }).join("   ") + "\n" +
      "botões (valor): " + s.rawButtons.map(function (v, i) { return i + ":" + v.toFixed(2); }).join(" ") + "\n" +
      "analógico direito lido: x " + f(s.raxes.x) + "  y " + f(s.raxes.y);
  }

  /* ---------- Analógico direito ---------- */
  function rsText() {
    const r = config.rsAxes;
    const nome = function (k) { return typeof k === "number" ? "eixo " + k : "botão " + String(k).slice(1); };
    return r ? "Detectado: " + nome(r.x) + " e " + nome(r.y) + " (" + (r.mapping === "standard" ? "mapeamento padrão" : "mapeamento cru") + ")." : "Usando os eixos padrão.";
  }
  function detectRightStick() {
    const out = $("rsStatus");
    out.textContent = "Empurre o analógico direito para a DIREITA e solte… (Esc cancela)";
    announce(out.textContent);
    reader.startCapture(function (res) {
      if (!res) { out.textContent = "Detecção cancelada. " + rsText(); announce(out.textContent); return; }
      config.rsAxes = res.stick;
      persist();
      out.textContent = rsText();
      announce("Analógico direito detectado.");
    }, "stick", function () {
      out.textContent = "Agora empurre para BAIXO…";
      announce(out.textContent);
    });
  }

  /* ---------- Remapeamento ---------- */
  /** Remove uma tecla de onde ela já estava (botão ou direção), para não ficar duplicada. */
  function freeKey(code, exceptId) {
    let where = null;
    buttons().forEach(function (o) { if (o.key === code && o.id !== exceptId) { o.key = null; where = o.label || o.id; } });
    Object.keys(config.dirKeys).forEach(function (d) { if (config.dirKeys[d] === code && "dir:" + d !== exceptId) { config.dirKeys[d] = null; where = DIR_NAMES[d]; } });
    return where;
  }
  const DIR_NAMES = { up: "↑ cima", down: "↓ baixo", left: "← trás", right: "→ frente" };

  function startMapping(id, mode) {
    const isDir = id.indexOf("dir:") === 0;
    const b = isDir ? null : findItem(id);
    if (!isDir && !b) return;
    const name = isDir ? DIR_NAMES[id.slice(4)] : (b.label || id);
    mappingId = id;
    document.querySelectorAll("#buttonList .il-btn-row").forEach(function (li) { li.classList.toggle("is-mapping", li.getAttribute("data-id") === id); });
    $("remapHint").hidden = false;
    $("remapHint").textContent = (mode === "key" ? "Aperte a tecla" : "Aperte no controle o botão") + " para “" + name + "”… (Esc cancela)";
    reader.startCapture(function (res) {
      mappingId = null;
      if (!res) { $("remapHint").textContent = "Mapeamento cancelado."; }
      else if (res.key) {
        const antes = freeKey(res.key, id);
        if (isDir) config.dirKeys[id.slice(4)] = res.key; else b.key = res.key;
        $("remapHint").textContent = "“" + name + "” agora usa a tecla " + P.describeKey(res.key) + (antes ? " (ela saiu de “" + antes + "”)" : "") + ".";
      } else {
        b.gp = P.portableGp(res.gp, res.mapping, config);   // nome físico, igual em qualquer navegador
        // O mesmo botão do controle não dispara dois botões: tira de onde ele estava
        let antes = null;
        buttons().forEach(function (o) {
          if (o !== b && o.gp != null && JSON.stringify(o.gp) === JSON.stringify(b.gp)) { o.gp = null; antes = o.label || o.id; }
        });
        $("remapHint").textContent = "“" + name + "” agora responde a: " + P.describeGp(b, config.pad.style) + (antes ? " (ele saiu de “" + antes + "”)" : "") + ".";
      }
      announce($("remapHint").textContent);
      renderList(); renderDirKeys(); updateKeyHint(); persist();
    }, mode);
  }

  /* ---------- Teclado: direções e dica de teclas ---------- */
  function renderDirKeys() {
    $("dirKeyList").innerHTML = ["up", "left", "down", "right"].map(function (d) {
      const k = config.dirKeys[d];
      return '<button type="button" class="btn btn-il-ghost btn-sm" data-dir="' + d + '" aria-label="Tecla para ' + DIR_NAMES[d] + ': ' + esc(P.describeKey(k)) + '. Clique para remapear">' +
        DIR_NAMES[d].split(" ")[0] + ' <span class="il-kbd">' + esc(P.describeKey(k)) + "</span></button>";
    }).join("");
  }
  function updateKeyHint() {
    const box = $("keyHint"); if (!box) return;
    const dirs = ["up", "left", "down", "right"].map(function (d) { return P.describeKey(config.dirKeys[d]); }).join(" ");
    const btns = buttons().filter(function (b) { return b.key && b.label !== ""; })
      .map(function (b) { return '<span class="il-kbd">' + esc(P.describeKey(b.key)) + "</span> " + esc(b.label); }).join(" · ");
    box.innerHTML = '<i class="bi bi-keyboard" aria-hidden="true"></i> Teclado: <span class="il-kbd">' + esc(dirs) + "</span> direções (setas também)" + (btns ? " · " + btns : "");
  }

  /* ---------- Cor de fundo dos botões (só arcade/leverless no estilo contorno) ---------- */
  function updateFillBox() {
    $("btnFillBox").hidden = config.layout === "pad" || config.buttonStyle === "filled";
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
  /* O link do overlay leva uma cópia da configuração. O OBS não vê as mudanças
     feitas depois; por isso o Lab avisa quando o link copiado ficou desatualizado. */
  const COPIED_KEY = "inputlab:overlayCopied";
  function copiedUrl() { try { return localStorage.getItem(COPIED_KEY); } catch (e) { return null; } }
  function updateOverlayUrl() {
    const base = location.href.replace(/[?#].*$/, "").replace(/[^/]*$/, "");
    const url = base + "overlay.html?c=" + encodeURIComponent(encodeConfig(config));
    $("overlayUrl").value = url;
    $("overlayOpen").href = url;
    const last = copiedUrl();
    $("overlayStale").hidden = !last || last === url;
    $("obsTabDot").hidden = $("overlayStale").hidden;   // bolinha na aba OBS quando o link copiado ficou velho
  }

  function fillForm() {
    // Barra rápida: Arcade · Leverless · PlayStation · Xbox
    const kind = config.layout === "pad" ? "pad:" + config.pad.style : config.layout;
    document.querySelectorAll('input[name="cfgKind"]').forEach(function (r) { r.checked = r.value === kind; });
    $("cfgPreset").value = config.preset in P.GAME_PRESETS ? config.preset : "generic8";
    $("cfgNotation").value = config.notation;
    $("cfgDirSource").value = config.dirSource || "both";
    $("cfgSwapXY").checked = !!config.swapXY;
    $("cfgSwapAB").checked = !!config.swapAB;
    $("rsStatus").textContent = rsText();
    $("cfgSide").value = config.side;
    $("cfgHistory").checked = config.history;
    $("cfgButtonStyle").value = config.buttonStyle || "outline";
    $("cfgButtonFill").value = config.buttonFill || "#0B0D10";
    $("cfgBaseTransparent").checked = !config.baseColor;
    $("cfgBaseColor").value = config.baseColor || config.baseColorPick || "#242836";
    $("cfgBaseColor").disabled = !config.baseColor;
    $("cfgTrail").checked = config.trail !== false;
    $("cfgSysColor").value = config.sysColor || "#FFC53D";
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

    fillForm(); fullRefresh();
    Auth.onChange(renderPresets);   // mostra os presets quando o login termina de carregar

    document.querySelectorAll('input[name="cfgKind"]').forEach(function (r) {
      r.addEventListener("change", function (e) {
        const v = e.target.value.split(":");          // "stick", "leverless", "pad:ps", "pad:xbox"
        config.layout = v[0];
        if (v[1]) config.pad.style = v[1];
        selectedId = null; fullRefresh();
      });
    });
    // Link para lab.html#overlay abre direto a aba do OBS
    if (location.hash === "#overlay" && window.bootstrap) bootstrap.Tab.getOrCreateInstance($("tab-obs")).show();
    $("btnApplyPreset").addEventListener("click", function () {
      const key = $("cfgPreset").value;
      P.applyPreset(config, key); selectedId = null; fullRefresh();
      announce("Preset " + P.GAME_PRESETS[key].name + " aplicado");
    });
    $("cfgNotation").addEventListener("change", function (e) { config.notation = e.target.value; persist(); });
    $("cfgDirSource").addEventListener("change", function (e) { config.dirSource = e.target.value; persist(); });
    $("cfgSwapXY").addEventListener("change", function (e) { config.swapXY = e.target.checked; persist(); });
    $("cfgSwapAB").addEventListener("change", function (e) { config.swapAB = e.target.checked; persist(); });
    $("btnDetectRS").addEventListener("click", detectRightStick);
    $("cfgSide").addEventListener("change", function (e) { config.side = e.target.value; persist(); });
    $("cfgHistory").addEventListener("change", function (e) { config.history = e.target.checked; persist(); });
    $("cfgButtonStyle").addEventListener("change", function (e) { config.buttonStyle = e.target.value; redrawPad(); updateFillBox(); persist(); });
    $("cfgButtonFill").addEventListener("input", function (e) { config.buttonFill = e.target.value; redrawPad(); persist(); });
    // Base do controle: transparente (padrão) ou numa cor escolhida
    $("cfgBaseTransparent").addEventListener("change", function (e) {
      config.baseColor = e.target.checked ? null : (config.baseColorPick || "#242836");
      $("cfgBaseColor").disabled = e.target.checked;
      redrawPad(); renderList(); renderSelectedEditor(); persist();
    });
    $("cfgBaseColor").addEventListener("input", function (e) {
      config.baseColorPick = e.target.value;
      if (!$("cfgBaseTransparent").checked) config.baseColor = e.target.value;
      redrawPad(); renderList(); renderSelectedEditor(); persist();
    });
    $("cfgTrail").addEventListener("change", function (e) { config.trail = e.target.checked; persist(); });
    $("cfgSysColor").addEventListener("input", function (e) { config.sysColor = e.target.value; redrawPad(); persist(); });
    $("dirKeyList").addEventListener("click", function (e) {
      const btn = e.target.closest("[data-dir]"); if (btn) startMapping("dir:" + btn.getAttribute("data-dir"), "key");
    });
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
      redrawPad(); renderSelectedEditor(); updateKeyHint(); persist();
      if (f === "color" && config.layout !== "pad") {
        const warn = li.querySelector(".phys");
        warn.innerHTML = bodyContrast(b.color) < 3 ? '<i class="bi bi-exclamation-triangle-fill il-p1"></i>' : "";
      }
    });
    $("buttonList").addEventListener("click", function (e) {
      const btn = e.target.closest("[data-act]"); if (!btn) return;
      const id = btn.closest("[data-id]").getAttribute("data-id");
      const act = btn.getAttribute("data-act");
      if (act === "map-gp") startMapping(id, "gp");
      if (act === "map-key") startMapping(id, "key");
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
        function () {
          try { localStorage.setItem(COPIED_KEY, input.value); } catch (e) {}
          $("overlayStale").hidden = true;
          $("obsTabDot").hidden = true;
          announce("Link do overlay copiado"); $("btnCopyOverlay").innerHTML = '<i class="bi bi-check2" aria-hidden="true"></i> Copiado';
        },
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
      $("padStatusText").textContent = gp ? "Controle conectado: " + gp.id + (gp.mapping === "standard" ? "" : " (mapeamento não padrão; use Remapear se algo não responder)") : "Nenhum controle conectado (aperte um botão do controle para conectar e confira se seu navegador permite leitura de dispositivos usb)";
    });

    requestAnimationFrame(loop);
  });
})();
