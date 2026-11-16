/* =========================================================
   InputLab — motor do controle (v2)
   - Modelo de dados: lista de botões configuráveis
     (rótulo, cor, posição, tamanho, botão do controle e tecla)
   - Presets por jogo de luta
   - Leitura de controle (Gamepad API) e teclado, com captura
     para remapear (inclui gatilhos que chegam como eixo)
   - Desenho em SVG: arcade stick, leverless e pad (Xbox / PlayStation)
   ========================================================= */
(function () {
  "use strict";
  const N = window.InputLabNotation;
  const SVGNS = "http://www.w3.org/2000/svg";

  /* ---------- Botões físicos do controle ---------- */
  // "standard mapping" da Gamepad API (Chrome e a maioria dos navegadores)
  const STD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, MENU: 9, LS: 10, RS: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15, HOME: 16 };
  // Mapeamento "cru" do driver xpad no Linux (Firefox/Zen): gatilhos chegam como eixos
  const RAW = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: { a: 2, t: 0, s: 1 }, RT: { a: 5, t: 0, s: 1 }, VIEW: 6, MENU: 7, HOME: 8, LS: 9, RS: 10 };

  const PHYS_NAMES = {
    xbox: { A: "A", B: "B", X: "X", Y: "Y", LB: "LB", RB: "RB", LT: "LT", RT: "RT" },
    ps:   { A: "✕", B: "○", X: "□", Y: "△", LB: "L1", RB: "R1", LT: "L2", RT: "R2" }
  };
  // Ordem usada pela comunidade para jogar de controle: fileira de cima = X Y RB LB
  const TOP_PHYS = ["X", "Y", "RB", "LB"], BOT_PHYS = ["A", "B", "RT", "LT"];
  // Teclado (posição física; no ABNT2 a tecla depois do L é o Ç)
  const TOP_KEYS = ["KeyU", "KeyI", "KeyO", "KeyP"], BOT_KEYS = ["KeyJ", "KeyK", "KeyL", "Semicolon"];
  const DIR_KEYS = { KeyW: "up", ArrowUp: "up", KeyS: "down", ArrowDown: "down", KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right" };

  /* ---------- Presets por jogo (sugestões editáveis) ---------- */
  const GAME_PRESETS = {
    generic8: { name: "Genérico — 8 botões",
      top: [["LP", "#3DB8FF"], ["MP", "#3DB8FF"], ["HP", "#3DB8FF"], ["PPP", "#FFC53D"]],
      bot: [["LK", "#FF5A4E"], ["MK", "#FF5A4E"], ["HK", "#FF5A4E"], ["KKK", "#FFC53D"]] },
    generic6: { name: "Genérico — 6 botões",
      top: [["LP", "#3DB8FF"], ["MP", "#3DB8FF"], ["HP", "#3DB8FF"]],
      bot: [["LK", "#FF5A4E"], ["MK", "#FF5A4E"], ["HK", "#FF5A4E"]] },
    sf6: { name: "Street Fighter 6 (Clássico)",
      top: [["LP", "#9ADBFF"], ["MP", "#3DB8FF"], ["HP", "#1F9BE8"], ["DI", "#5BE38A"]],
      bot: [["LK", "#FF9C94"], ["MK", "#FF5A4E"], ["HK", "#F03A2E"], ["PAR", "#5BE38A"]] },
    t8: { name: "Tekken 8",
      top: [["1", "#FFC53D"], ["2", "#FFC53D"], ["1+2", "#E6E8EE"], ["2+3", "#FF5A4E"]],
      bot: [["3", "#3DB8FF"], ["4", "#3DB8FF"], ["3+4", "#E6E8EE"], ["1+3", "#B48CFF"]] },
    ggst: { name: "Guilty Gear -Strive-",
      top: [["P", "#FF8FC7"], ["K", "#7FD4FF"], ["S", "#5BE38A"], ["H", "#FF5A4E"]],
      bot: [["D", "#FFC53D"], ["DASH", "#E6E8EE"], ["RC", "#B48CFF"], ["BRST", "#FF9F43"]] },
    uni2: { name: "Under Night In-Birth II",
      top: [["A", "#7FD4FF"], ["B", "#5BE38A"], ["C", "#FF5A4E"]],
      bot: [["D", "#FFC53D"]] },
    mk1: { name: "Mortal Kombat 1",
      top: [["FP", "#FFC53D"], ["BP", "#FF9F43"], ["THR", "#E6E8EE"], ["KAM", "#B48CFF"]],
      bot: [["FK", "#3DB8FF"], ["BK", "#1F9BE8"], ["BL", "#5BE38A"]] }
  };

  const UNUSED = "#5B6275";

  /* ---------- Geometria padrão ---------- */
  // Curva "Vewlix": primeira coluna mais baixa, como nos gabinetes de arcade
  function gridPos(layout, row, col) {
    const g = layout === "stick" ? { ox: 345, oy: 150, step: 76, offs: [16, -4, -4, 6], dy: 82 }
                                 : { ox: 385, oy: 140, step: 74, offs: [10, -6, -6, 2], dy: 80 };
    return { x: g.ox + col * g.step, y: g.oy + (g.offs[col] || 0) + row * g.dy };
  }

  function makeButtons(layout, preset) {
    const out = [];
    [["t", preset.top, TOP_PHYS, TOP_KEYS, 0], ["b", preset.bot, BOT_PHYS, BOT_KEYS, 1]].forEach(function (r) {
      r[1].forEach(function (b, i) {
        const p = gridPos(layout, r[4], i);
        out.push({ id: r[0] + i, label: b[0], color: b[1], x: p.x, y: p.y, r: layout === "stick" ? 31 : 30, gp: r[2][i], key: r[3][i] });
      });
    });
    return out;
  }

  function makePadSlots(preset) {
    const out = [];
    [[TOP_PHYS, preset.top, TOP_KEYS], [BOT_PHYS, preset.bot, BOT_KEYS]].forEach(function (r) {
      r[0].forEach(function (phys, i) {
        const b = r[1][i];
        out.push({ id: phys, phys: phys, label: b ? b[0] : "", color: b ? b[1] : UNUSED, gp: phys, key: r[2][i] });
      });
    });
    return out;
  }

  function applyPreset(cfg, key) {
    const p = GAME_PRESETS[key] || GAME_PRESETS.generic8;
    cfg.preset = key;
    cfg.stick.buttons = makeButtons("stick", p);
    cfg.leverless.buttons = makeButtons("leverless", p);
    cfg.pad.slots = makePadSlots(p);
    return cfg;
  }

  function defaultConfig() {
    return applyPreset({
      version: 2, layout: "stick", notation: "numpad", side: "p1", history: true, preset: "generic8",
      stick: { buttons: [] },
      leverless: { buttons: [], dirs: { left: { x: 82, y: 172 }, down: { x: 152, y: 152 }, right: { x: 222, y: 168 }, up: { x: 318, y: 290 } } },
      pad: { style: "xbox", slots: [] }
    }, "generic8");
  }

  /** Valida uma configuração vinda do localStorage/URL; versões antigas voltam ao padrão. */
  function normalizeConfig(c) {
    const d = defaultConfig();
    if (!c || c.version !== 2) return d;
    try {
      const out = JSON.parse(JSON.stringify(c));
      ["notation", "side", "history", "layout", "preset"].forEach(function (k) { if (out[k] === undefined) out[k] = d[k]; });
      if (["stick", "leverless", "pad"].indexOf(out.layout) < 0) out.layout = "stick";
      out.stick = out.stick && Array.isArray(out.stick.buttons) ? out.stick : d.stick;
      out.leverless = out.leverless && Array.isArray(out.leverless.buttons) ? out.leverless : d.leverless;
      out.leverless.dirs = out.leverless.dirs || d.leverless.dirs;
      out.pad = out.pad && Array.isArray(out.pad.slots) ? out.pad : d.pad;
      return out;
    } catch (e) { return d; }
  }

  function activeButtons(cfg) { return cfg.layout === "pad" ? cfg.pad.slots : cfg[cfg.layout].buttons; }

  /** Aplica uma paleta {top, bottom} a todos os layouts (usado pela galeria). */
  function recolor(cfg, palette) {
    const isTop = function (b) { return b.phys ? TOP_PHYS.indexOf(b.phys) >= 0 : b.id.charAt(0) === "t"; };
    [cfg.stick.buttons, cfg.leverless.buttons, cfg.pad.slots].forEach(function (list) {
      list.forEach(function (b) { if (b.label !== "") b.color = isTop(b) ? palette.top : palette.bottom; });
    });
    return cfg;
  }

  function fromGallery(entry) {
    const cfg = applyPreset(defaultConfig(), entry.preset || "generic8");
    cfg.layout = entry.layout || "stick";
    if (entry.padStyle) cfg.pad.style = entry.padStyle;
    if (entry.palette) recolor(cfg, entry.palette);
    return cfg;
  }

  /* ---------- Contraste (WCAG 2.x) ---------- */
  function luminance(hex) {
    const h = hex.replace("#", "");
    return [0, 2, 4].map(function (i) {
      const c = parseInt(h.substr(i, 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }).reduce(function (acc, c, i) { return acc + c * [0.2126, 0.7152, 0.0722][i]; }, 0);
  }
  function contrast(a, b) {
    const la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  /** Rótulo escuro ou branco, o que tiver mais contraste com o botão. */
  function labelColor(bg) { return contrast(bg, "#0F1117") >= contrast(bg, "#FFFFFF") ? "#0F1117" : "#FFFFFF"; }

  /* ---------- Descrição de um input (para a interface) ---------- */
  function keyName(code) {
    if (code === "Semicolon") return "Ç";
    return code.replace(/^Key/, "").replace(/^Digit/, "").replace(/^Numpad/, "Num ").replace(/^Arrow/, "Seta ");
  }
  function describeInput(b, style) {
    const parts = [];
    if (b.gp != null) {
      if (typeof b.gp === "string") parts.push((PHYS_NAMES[style] || PHYS_NAMES.xbox)[b.gp] || b.gp);
      else if (typeof b.gp === "number") parts.push("Botão " + b.gp);
      else parts.push("Eixo " + b.gp.a + (b.gp.s < 0 ? "−" : "+"));
    }
    if (b.key) parts.push(keyName(b.key));
    return parts.length ? parts.join(" · ") : "Sem mapa";
  }

  /* ---------------- Leitura de inputs ---------------- */
  function InputReader(getConfig) {
    const keys = new Set();
    const tapped = new Set();   // teclas apertadas e soltas entre dois quadros (não se perdem)
    let gamepadIndex = null;
    let onConnection = function () {};
    let capture = null;   // { cb, baseline, armed }

    function isTyping(e) {
      const t = e.target;
      return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
    }
    window.addEventListener("keydown", function (e) {
      if (capture) {
        e.preventDefault();
        const cb = capture.cb; capture = null;
        cb(e.code === "Escape" ? null : { key: e.code });
        return;
      }
      if (isTyping(e)) return;
      keys.add(e.code); tapped.add(e.code);
      if (DIR_KEYS[e.code] && e.code.indexOf("Arrow") === 0) e.preventDefault();   // não rolar a página
    });
    window.addEventListener("keyup", function (e) { keys.delete(e.code); });
    window.addEventListener("blur", function () { keys.clear(); });

    window.addEventListener("gamepadconnected", function (e) { gamepadIndex = e.gamepad.index; onConnection(e.gamepad); });
    window.addEventListener("gamepaddisconnected", function (e) { if (gamepadIndex === e.gamepad.index) { gamepadIndex = null; onConnection(null); } });

    function currentPad() {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      if (gamepadIndex != null && pads[gamepadIndex]) return pads[gamepadIndex];
      for (const p of pads) if (p) { gamepadIndex = p.index; onConnection(p); return p; }
      return null;
    }
    function btnDown(btn) { return !!btn && (btn.pressed || btn.value > 0.5); }

    /** Resolve "RT", 7 ou {a:5,t:0,s:1} para o estado atual do controle. */
    function gpPressed(pad, spec) {
      if (spec == null || !pad) return false;
      if (typeof spec === "string") spec = (pad.mapping === "standard" ? STD : RAW)[spec];
      if (spec == null) return false;
      if (typeof spec === "number") return btnDown(pad.buttons[spec]);
      const v = pad.axes[spec.a];
      return v != null && (spec.s || 1) * (v - spec.t) > 0;
    }

    function tickCapture(pad) {
      if (!capture || !pad) return;
      const anyDown = pad.buttons.some(btnDown);
      if (!capture.armed) {           // espera soltar tudo antes de capturar
        if (!anyDown) { capture.armed = true; capture.baseline = pad.axes.slice(); }
        return;
      }
      for (let i = 0; i < pad.buttons.length; i++) {
        if (btnDown(pad.buttons[i])) { const cb = capture.cb; capture = null; cb({ gp: i }); return; }
      }
      // Eixos (gatilhos analógicos). Ignora o analógico esquerdo (0,1) e o hat (6,7).
      for (let a = 2; a < pad.axes.length; a++) {
        if (a === 6 || a === 7) continue;
        const delta = pad.axes[a] - capture.baseline[a];
        if (Math.abs(delta) > 0.6) {
          // limiar = meio do caminho entre o repouso e o valor apertado
          const t = +((capture.baseline[a] + pad.axes[a]) / 2).toFixed(2);
          const cb = capture.cb; capture = null;
          cb({ gp: { a: a, t: t, s: delta > 0 ? 1 : -1 } });
          return;
        }
      }
    }

    return {
      onConnection: function (fn) { onConnection = fn; },
      startCapture: function (cb) { capture = { cb: cb, armed: false, baseline: [] }; },
      cancelCapture: function () { capture = null; },
      isCapturing: function () { return !!capture; },
      read: function () {
        const cfg = getConfig();
        const dirs = { up: false, down: false, left: false, right: false };
        const held = new Set(keys); tapped.forEach(function (k) { held.add(k); }); tapped.clear();
        held.forEach(function (k) { if (DIR_KEYS[k]) dirs[DIR_KEYS[k]] = true; });
        const p = currentPad();
        tickCapture(p);
        const buttons = new Set();
        if (p) {
          if (p.mapping === "standard") {
            if (btnDown(p.buttons[12])) dirs.up = true;
            if (btnDown(p.buttons[13])) dirs.down = true;
            if (btnDown(p.buttons[14])) dirs.left = true;
            if (btnDown(p.buttons[15])) dirs.right = true;
          } else if (p.axes.length >= 8) {   // direcional como "hat" (eixos 6/7)
            const h = N.axesToDirections(p.axes[6], p.axes[7], 0.5);
            Object.keys(h).forEach(function (k) { if (h[k]) dirs[k] = true; });
          }
          const a = N.axesToDirections(p.axes[0] || 0, p.axes[1] || 0, 0.5);
          Object.keys(a).forEach(function (k) { if (a[k]) dirs[k] = true; });
        }
        activeButtons(cfg).forEach(function (b) {
          if ((b.key && held.has(b.key)) || gpPressed(p, b.gp)) buttons.add(b.id);
        });
        return { dirs: dirs, buttons: buttons, gamepad: p ? p.id : null, mapping: p ? p.mapping : null };
      }
    };
  }

  /* ---------------- Desenho ---------------- */
  function el(name, attrs, parent) {
    const n = document.createElementNS(SVGNS, name);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }
  function text(parent, x, y, str, fill, size) {
    const t = el("text", { x: x, y: y, "text-anchor": "middle", "dominant-baseline": "central", fill: fill, class: "btn-label" }, parent);
    if (size) t.style.fontSize = size + "px";
    t.textContent = str;
    return t;
  }
  function fitSize(label, r) {   // diminui a fonte de rótulos longos
    const n = String(label).length;
    return Math.max(10, Math.min(r * 0.62, (r * 1.7) / Math.max(1, n * 0.62)));
  }

  /** Botão redondo (arcade/leverless) dentro de um <g> posicionado por translate. */
  function roundButton(parent, b, opts) {
    const g = el("g", { transform: "translate(" + b.x + " " + b.y + ")", "data-id": b.id, color: b.color }, parent);
    if (opts.editable) g.classList.add("editable");
    if (opts.selectedId === b.id) g.classList.add("selected");
    const c = el("circle", { r: b.r || 30, fill: b.color, class: "btn-shape" }, g);
    text(g, 0, 1, b.label, labelColor(b.color), fitSize(b.label, b.r || 30));
    return { g: g, shape: c };
  }

  function drawStick(svg, cfg, refs, opts) {
    el("rect", { x: 10, y: 30, width: 700, height: 300, rx: 36, class: "body" }, svg);
    // parafusos decorativos do tampo
    [[34, 54], [686, 54], [34, 306], [686, 306]].forEach(function (p) { el("circle", { cx: p[0], cy: p[1], r: 5, class: "screw" }, svg); });
    el("circle", { cx: 165, cy: 190, r: 80, class: "stick-gate" }, svg);
    for (let i = 0; i < 8; i++) {
      const ang = i * Math.PI / 4;
      el("circle", { cx: 165 + Math.cos(ang) * 64, cy: 190 + Math.sin(ang) * 64, r: 3, fill: "currentColor", opacity: .35 }, svg);
    }
    const shaft = el("line", { x1: 165, y1: 190, x2: 165, y2: 190, stroke: "#8a90a2", "stroke-width": 10, "stroke-linecap": "round" }, svg);
    const ball = el("circle", { cx: 165, cy: 190, r: 34, fill: "#FF5A4E", stroke: "#0F1117", "stroke-width": 3 }, svg);
    el("circle", { cx: 155, cy: 180, r: 9, fill: "#fff", opacity: .25 }, svg);   // brilho
    cfg.stick.buttons.forEach(function (b) { refs.btn[b.id] = roundButton(svg, b, opts).shape; });
    return function (dirs) {
      const h = (dirs.right ? 1 : 0) - (dirs.left ? 1 : 0), v = dirs.up ? -1 : (dirs.down ? 1 : 0);
      const k = (h && v) ? 0.72 : 1, x = 165 + h * 46 * k, y = 190 + v * 46 * k;
      ball.setAttribute("cx", x); ball.setAttribute("cy", y);
      shaft.setAttribute("x2", x); shaft.setAttribute("y2", y);
      ball.nextSibling.setAttribute("cx", x - 10); ball.nextSibling.setAttribute("cy", y - 10);
    };
  }

  function drawLeverless(svg, cfg, refs, opts) {
    el("rect", { x: 10, y: 30, width: 700, height: 300, rx: 24, class: "body" }, svg);
    const arrows = { left: "←", down: "↓", right: "→", up: "↑" };
    Object.keys(arrows).forEach(function (d) {
      const p = cfg.leverless.dirs[d];
      const b = { id: "dir:" + d, x: p.x, y: p.y, r: 28, label: arrows[d], color: "#7A8296" };
      const r = roundButton(svg, b, opts);
      r.shape.classList.add("dir-shape");
      refs.dir[d] = r.shape;
    });
    cfg.leverless.buttons.forEach(function (b) { refs.btn[b.id] = roundButton(svg, b, opts).shape; });
    return null;
  }

  /* Pad realista: corpo com pegadas, gatilhos, bumpers, dois analógicos,
     direcional em cruz e botões de face (estilo Xbox ou PlayStation). */
  function drawPad(svg, cfg, refs) {
    const style = cfg.pad.style === "ps" ? "ps" : "xbox";
    const slot = {}; cfg.pad.slots.forEach(function (s) { slot[s.phys] = s; });
    const names = PHYS_NAMES[style];
    const fillOf = function (s) { return s && s.label !== "" ? s.color : UNUSED; };
    const labelOf = function (s, phys) { return s && s.label !== "" ? s.label : names[phys]; };

    // Gatilhos (atrás) e bumpers
    [["LT", 150, 6], ["RT", 480, 6]].forEach(function (t) {
      const s = slot[t[0]], g = el("g", { color: fillOf(s) }, svg);
      refs.btn[t[0]] = el("rect", { x: t[1], y: t[2], width: 90, height: 46, rx: 12, fill: fillOf(s), class: "btn-shape" }, g);
      text(g, t[1] + 45, t[2] + 18, labelOf(s, t[0]), labelColor(fillOf(s)), 14);
    });
    // Corpo
    el("path", { class: "body pad-body", d:
      "M190 66 C260 56 460 56 530 66 C600 76 642 108 662 168 C690 250 702 322 650 337 " +
      "C610 348 582 312 552 272 C522 238 198 238 168 272 C138 312 110 348 70 337 " +
      "C18 322 30 250 58 168 C78 108 120 76 190 66 Z" }, svg);

    [["LB", 112, 50, "M108 78 Q114 48 150 46 L250 46 Q262 46 262 58 L262 66 Z"], ["RB", 462, 50, "M612 78 Q606 48 570 46 L470 46 Q458 46 458 58 L458 66 Z"]].forEach(function (b) {
      const s = slot[b[0]], g = el("g", { color: fillOf(s) }, svg);
      refs.btn[b[0]] = el("path", { d: b[3], fill: fillOf(s), class: "btn-shape" }, g);
      text(g, b[0] === "LB" ? 196 : 524, 58, labelOf(s, b[0]), labelColor(fillOf(s)), 13);
    });

    const pos = style === "xbox"
      ? { ls: [215, 150], dpad: [285, 226], rs: [435, 226] }
      : { ls: [288, 232], dpad: [205, 152], rs: [432, 232] };

    // Analógicos
    let leftCap = null;
    [["ls", pos.ls], ["rs", pos.rs]].forEach(function (s) {
      el("circle", { cx: s[1][0], cy: s[1][1], r: 36, class: "stick-well" }, svg);
      const cap = el("circle", { cx: s[1][0], cy: s[1][1], r: 25, class: "stick-cap" }, svg);
      if (s[0] === "ls") leftCap = cap;
    });

    // Direcional em cruz
    const cx = pos.dpad[0], cy = pos.dpad[1];
    el("circle", { cx: cx, cy: cy, r: 46, class: "dpad-well" }, svg);
    el("rect", { x: cx - 13, y: cy - 13, width: 26, height: 26, class: "dpad-center" }, svg);
    [["up", cx - 13, cy - 41, 26, 30], ["down", cx - 13, cy + 11, 26, 30], ["left", cx - 41, cy - 13, 30, 26], ["right", cx + 11, cy - 13, 30, 26]].forEach(function (d) {
      refs.dir[d[0]] = el("rect", { x: d[1], y: d[2], width: d[3], height: d[4], rx: 5, class: "btn-shape dir-shape dpad-arm" }, svg);
    });

    // Botões centrais
    if (style === "xbox") {
      el("circle", { cx: 360, cy: 108, r: 15, class: "pad-home" }, svg);
      el("circle", { cx: 318, cy: 150, r: 8, class: "pad-small" }, svg);
      el("circle", { cx: 402, cy: 150, r: 8, class: "pad-small" }, svg);
    } else {
      el("rect", { x: 290, y: 74, width: 140, height: 64, rx: 12, class: "pad-touch" }, svg);
      el("rect", { x: 258, y: 86, width: 10, height: 22, rx: 5, class: "pad-small" }, svg);
      el("rect", { x: 452, y: 86, width: 10, height: 22, rx: 5, class: "pad-small" }, svg);
      el("circle", { cx: 360, cy: 186, r: 10, class: "pad-home" }, svg);
    }

    // Botões de face (losango)
    const fc = [515, 150], d = 38;
    [["Y", fc[0], fc[1] - d], ["X", fc[0] - d, fc[1]], ["B", fc[0] + d, fc[1]], ["A", fc[0], fc[1] + d]].forEach(function (f) {
      const s = slot[f[0]], color = fillOf(s), g = el("g", { color: color }, svg);
      refs.btn[f[0]] = el("circle", { cx: f[1], cy: f[2], r: 19, fill: color, class: "btn-shape" }, g);
      const lbl = labelOf(s, f[0]);
      text(g, f[1], f[2] + 1, lbl, labelColor(color), fitSize(lbl, 19));
    });

    return function (dirs) {
      const h = (dirs.right ? 1 : 0) - (dirs.left ? 1 : 0), v = dirs.up ? -1 : (dirs.down ? 1 : 0);
      leftCap.setAttribute("cx", pos.ls[0] + h * 10);
      leftCap.setAttribute("cy", pos.ls[1] + v * 10);
    };
  }

  /**
   * Desenha o controle. opts: { editable, selectedId, onSelect(id), onMove(id,x,y) }
   * Retorna { update(state) }.
   */
  function buildPad(container, cfg, opts) {
    opts = opts || {};
    container.innerHTML = "";
    const names = { stick: "arcade stick", leverless: "controle leverless", pad: "controle " + (cfg.pad.style === "ps" ? "estilo PlayStation" : "estilo Xbox") };
    const svg = el("svg", { viewBox: "0 0 720 360", class: "il-pad w-100", role: "img", "aria-label": "Visualização do " + names[cfg.layout] });
    const refs = { btn: {}, dir: {} };
    let moveDirs = null;
    if (cfg.layout === "stick") moveDirs = drawStick(svg, cfg, refs, opts);
    else if (cfg.layout === "leverless") moveDirs = drawLeverless(svg, cfg, refs, opts);
    else moveDirs = drawPad(svg, cfg, refs);
    container.appendChild(svg);

    // Arrastar para reposicionar (apenas stick/leverless no modo edição)
    if (opts.editable && cfg.layout !== "pad") {
      let drag = null;
      const toSvg = function (e) {
        const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
        return pt.matrixTransform(svg.getScreenCTM().inverse());
      };
      svg.addEventListener("pointerdown", function (e) {
        const g = e.target.closest("g[data-id]"); if (!g) return;
        const p = toSvg(e), m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(g.getAttribute("transform"));
        drag = { g: g, id: g.getAttribute("data-id"), dx: p.x - +m[1], dy: p.y - +m[2], x: +m[1], y: +m[2] };
        svg.setPointerCapture(e.pointerId);
        if (opts.onSelect) opts.onSelect(drag.id, true);
        svg.querySelectorAll("g.selected").forEach(function (x) { x.classList.remove("selected"); });
        g.classList.add("selected");
        e.preventDefault();
      });
      svg.addEventListener("pointermove", function (e) {
        if (!drag) return;
        const p = toSvg(e);
        drag.x = Math.round(Math.min(690, Math.max(30, p.x - drag.dx)) / 2) * 2;
        drag.y = Math.round(Math.min(330, Math.max(30, p.y - drag.dy)) / 2) * 2;
        drag.g.setAttribute("transform", "translate(" + drag.x + " " + drag.y + ")");
      });
      const end = function () { if (drag && opts.onMove) opts.onMove(drag.id, drag.x, drag.y); drag = null; };
      svg.addEventListener("pointerup", end);
      svg.addEventListener("pointercancel", end);
    }

    return {
      update: function (state) {
        Object.keys(refs.btn).forEach(function (id) { refs.btn[id].classList.toggle("pressed", state.buttons.has(id)); });
        Object.keys(refs.dir).forEach(function (d) { refs.dir[d].classList.toggle("pressed", !!state.dirs[d]); });
        if (moveDirs) moveDirs(state.dirs);
      }
    };
  }

  /* ---------------- Histórico (estilo modo treino) ---------------- */
  function History(maxItems) {
    const items = [], dirLog = [];
    let last = null;
    return {
      items: items,
      push: function (dir, buttons, now, dtFrames) {
        const key = dir + "|" + Array.from(buttons).sort().join(",");
        const prev = last ? last.buttons : new Set();
        const newPress = new Set(Array.from(buttons).filter(function (b) { return !prev.has(b); }));
        if (!last || last.dir !== dir) dirLog.push({ dir: dir, t: now });
        while (dirLog.length && now - dirLog[0].t > 1500) dirLog.shift();
        if (!last || last.key !== key) {
          items.unshift({ dir: dir, buttons: Array.from(buttons), frames: 0 });
          if (items.length > maxItems) items.pop();
        }
        items[0].frames = Math.min(99, items[0].frames + dtFrames);
        last = { key: key, dir: dir, buttons: new Set(buttons) };
        return { newPress: newPress, dirLog: dirLog };
      },
      clear: function () { items.length = 0; dirLog.length = 0; last = null; }
    };
  }

  window.InputLabPad = {
    GAME_PRESETS: GAME_PRESETS, PHYS_NAMES: PHYS_NAMES, UNUSED: UNUSED,
    defaultConfig: defaultConfig, normalizeConfig: normalizeConfig, applyPreset: applyPreset,
    activeButtons: activeButtons, fromGallery: fromGallery, describeInput: describeInput,
    contrast: contrast, labelColor: labelColor,
    InputReader: InputReader, buildPad: buildPad, History: History
  };
})();
