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
  // Controles HID genéricos no Linux (8BitDo, Xbox por Bluetooth…): o analógico direito
  // vem nos eixos 2/3, os gatilhos nos eixos 4 (RT) e 5 (LT) e o X/Y vem invertido (botões 3/2).
  const RAW_GEN = Object.assign({}, RAW, { X: 3, Y: 2, LT: { a: 5, t: 0, s: 1 }, RT: { a: 4, t: 0, s: 1 } });

  /**
   * Descobre como um controle "cru" numera os eixos olhando o repouso dos gatilhos
   * (gatilho solto = -1): eixo 2 em -1 → xpad (cabo Xbox); eixo 4 em -1 → HID genérico.
   * A resposta fica guardada por controle para não mudar enquanto se joga.
   */
  const LAYOUT_KEY = "inputlab:padLayouts";
  const rawLayoutCache = (function () { try { return JSON.parse(localStorage.getItem(LAYOUT_KEY)) || {}; } catch (e) { return {}; } })();
  function rawLayout(pad, cfg) {
    if (!pad || pad.mapping === "standard") return "standard";
    const r = cfg && cfg.rsAxes;
    if (r && r.mapping === (pad.mapping || "")) return r.x === 2 ? "generic" : "xpad";
    if (rawLayoutCache[pad.id]) return rawLayoutCache[pad.id];
    const near = function (v, t) { return v != null && Math.abs(v - t) < 0.05; };
    let found = null;
    // Os dois gatilhos soltos ficam em -1: eixos 2 e 5 no xpad, 4 e 5 no genérico.
    if (near(pad.axes[5], -1) && near(pad.axes[2], -1) && !near(pad.axes[4], -1)) found = "xpad";
    else if (near(pad.axes[5], -1) && near(pad.axes[4], -1) && !near(pad.axes[2], -1)) found = "generic";
    if (found) {
      rawLayoutCache[pad.id] = found;   // guarda: na próxima vez já sabe, mesmo antes de tocar nos gatilhos
      try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(rawLayoutCache)); } catch (e) { /* sem armazenamento */ }
      return found;
    }
    // Alguns navegadores dão 0 aos gatilhos até o primeiro toque. Enquanto não dá para saber:
    // controles da Microsoft (045e) costumam ser xpad; os outros, HID genérico.
    return pad.id.indexOf("045e-") === 0 ? "xpad" : "generic";
  }
  function tableFor(mapping) { return mapping === "standard" ? STD : mapping === "generic" ? RAW_GEN : RAW; }
  /** "standard", "generic" ou "" (xpad): é o que vai junto com cada captura de botão. */
  function mappingOf(pad, cfg) { const l = rawLayout(pad, cfg); return l === "xpad" ? "" : l; }

  const PHYS_NAMES = {
    xbox: { A: "A", B: "B", X: "X", Y: "Y", LB: "LB", RB: "RB", LT: "LT", RT: "RT" },
    ps:   { A: "✕", B: "○", X: "□", Y: "△", LB: "L1", RB: "R1", LT: "L2", RT: "R2" }
  };
  // Ordem usada pela comunidade para jogar de controle: fileira de cima = X Y RB LB
  const TOP_PHYS = ["X", "Y", "RB", "LB"], BOT_PHYS = ["A", "B", "RT", "LT"];
  // Teclado (posição física; no ABNT2 a tecla depois do L é o Ç)
  const TOP_KEYS = ["KeyU", "KeyI", "KeyO", "KeyP"], BOT_KEYS = ["KeyJ", "KeyK", "KeyL", "Semicolon"];
  const ARROW_KEYS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
  /** Direção de uma tecla: primeiro as teclas escolhidas pelo usuário, depois as setas. */
  function dirOfKey(cfg, code) {
    const k = cfg && cfg.dirKeys ? cfg.dirKeys : {};
    for (const d in k) if (k[d] === code) return d;
    return ARROW_KEYS[code] || null;
  }

  /* ---------- Presets por jogo (sugestões editáveis) ---------- */
  const GAME_PRESETS = {
    generic8: { name: "Genérico, 8 botões",
      top: [["LP", "#3DB8FF"], ["MP", "#3DB8FF"], ["HP", "#3DB8FF"], ["PPP", "#FFC53D"]],
      bot: [["LK", "#FF5A4E"], ["MK", "#FF5A4E"], ["HK", "#FF5A4E"], ["KKK", "#FFC53D"]] },
    generic6: { name: "Genérico, 6 botões",
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

  // Botões de sistema: aparecem em todos os layouts e acendem com o botão físico
  // (nome físico → rótulo). L3/R3 = apertar o analógico esquerdo/direito.
  const SYS = [["VIEW", "SELECT"], ["MENU", "START"], ["LS", "L3"], ["RS", "R3"]];
  const SYS_COLOR = "#FFC53D";   // cor padrão; o usuário troca em cfg.sysColor

  /* ---------- Geometria padrão ---------- */
  // Curva "Vewlix": primeira coluna mais baixa, como nos gabinetes de arcade
  function gridPos(layout, row, col) {
    const g = layout === "stick" ? { ox: 330, oy: 136, step: 88, offs: [24, 0, 0, 0], dy: 76 }
                                 : { ox: 385, oy: 140, step: 74, offs: [10, -6, -6, 2], dy: 80 };
    return { x: g.ox + col * g.step, y: g.oy + (g.offs[col] || 0) + row * g.dy };
  }

  /**
   * Posições das direções do leverless.
   * "far": as posições padrão, afastadas dos botões de ação.
   * "near": coladas nos botões de ação, como num Hitbox. São calculadas a partir
   *   do primeiro botão de cima (LP no padrão), então acompanham qualquer layout.
   */
  function levDirs(cfg, mode) {
    if (mode !== "near") return { left: { x: 82, y: 172 }, down: { x: 152, y: 152 }, right: { x: 222, y: 168 }, up: { x: 318, y: 276 } };
    const btns = (cfg && cfg.leverless && cfg.leverless.buttons) || [];
    const a = btns.find(function (b) { return b.id === "t0"; }) || gridPos("leverless", 0, 0);
    const clampX = function (x) { return Math.max(60, x); }, clampY = function (y) { return Math.min(300, Math.max(70, y)); };
    return {
      left: { x: clampX(a.x - 230), y: clampY(a.y) },
      down: { x: clampX(a.x - 148), y: clampY(a.y - 1) },
      right: { x: clampX(a.x - 73), y: clampY(a.y + 36) },
      up: { x: clampX(a.x - 67), y: clampY(a.y + 138) }
    };
  }

  function makeButtons(layout, preset) {
    const out = [];
    [["t", preset.top, TOP_PHYS, TOP_KEYS, 0], ["b", preset.bot, BOT_PHYS, BOT_KEYS, 1]].forEach(function (r) {
      r[1].forEach(function (b, i) {
        const p = gridPos(layout, r[4], i);
        out.push({ id: r[0] + i, label: b[0], color: b[1], x: p.x, y: p.y, r: layout === "stick" ? 33 : 30, gp: r[2][i], key: r[3][i] });
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
      version: 2, layout: "stick", notation: "numpad", side: "p1", history: true, preset: "generic8", buttonStyle: "outline", buttonFill: "#0B0D10", baseColor: null, baseColorPick: "#242836", trail: true, dirSource: "both", swapXY: false, swapAB: false, rsAxes: null, sysColor: SYS_COLOR, stickLayout2: true, levDirsMode: "far", pockets: null,
      dirKeys: { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD" },
      stick: { buttons: [] },
      leverless: { buttons: [], dirs: levDirs({}, "far") },
      pad: { style: "xbox", slots: [] }
    }, "generic8");
  }

  /** Valida uma configuração vinda do localStorage/URL; versões antigas voltam ao padrão. */
  function normalizeConfig(c) {
    const d = defaultConfig();
    if (!c || c.version !== 2) return d;
    try {
      const out = JSON.parse(JSON.stringify(c));
      ["notation", "side", "history", "layout", "preset", "buttonStyle", "buttonFill", "baseColor", "baseColorPick", "trail", "dirSource", "swapXY", "swapAB", "rsAxes", "sysColor", "pockets"].forEach(function (k) { if (out[k] === undefined) out[k] = d[k]; });
      out.dirKeys = Object.assign({}, d.dirKeys, out.dirKeys || {});
      if (["stick", "leverless", "pad"].indexOf(out.layout) < 0) out.layout = "stick";
      out.stick = out.stick && Array.isArray(out.stick.buttons) ? out.stick : d.stick;
      out.leverless = out.leverless && Array.isArray(out.leverless.buttons) ? out.leverless : d.leverless;
      out.leverless.dirs = out.leverless.dirs || d.leverless.dirs;
      out.pad = out.pad && Array.isArray(out.pad.slots) ? out.pad : d.pad;
      // Configurações salvas antes do novo arcade: reposiciona os 8 botões padrão
      if (!out.stickLayout2) {
        out.stick.buttons.forEach(function (b) {
          const m = /^([tb])([0-3])$/.exec(b.id); if (!m) return;
          const pos = gridPos("stick", m[1] === "t" ? 0 : 1, +m[2]);
          b.x = pos.x; b.y = pos.y; b.r = 33;
        });
        out.stickLayout2 = true;
      }
      if (out.levDirsMode === undefined && out.leverless.dirs.left && out.leverless.dirs.left.x === 155) out.levDirsMode = "near";
      if (out.levDirsMode !== "near") out.levDirsMode = "far";
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
    const NOMES = { Semicolon: "Ç", Space: "Espaço", Enter: "Enter", Backspace: "⌫", Tab: "Tab",
      ShiftLeft: "Shift", ShiftRight: "Shift dir.", ControlLeft: "Ctrl", ControlRight: "Ctrl dir.",
      AltLeft: "Alt", AltRight: "AltGr", Comma: ",", Period: ".", Minus: "-", Equal: "=" };
    if (NOMES[code]) return NOMES[code];
    return code.replace(/^Key/, "").replace(/^Digit/, "").replace(/^Numpad/, "Num ").replace(/^Arrow/, "Seta ");
  }
  function describeGp(b, style) {
    if (b.gp == null) return "—";
    if (typeof b.gp === "string") return (PHYS_NAMES[style] || PHYS_NAMES.xbox)[b.gp] || b.gp;
    if (typeof b.gp === "number") return "Botão " + b.gp;
    return "Eixo " + b.gp.a + (b.gp.s < 0 ? "−" : "+");
  }
  function describeKey(code) { return code ? keyName(code) : "—"; }
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

  /**
   * Converte o botão capturado (número ou eixo, que mudam de navegador para navegador)
   * no nome físico do botão ("X", "RT"...). Assim o mapeamento feito no Zen/Firefox
   * continua certo no OBS (Chromium), e vice-versa. Se não reconhecer, mantém o número.
   */
  function portableGp(spec, mapping, cfg) {
    const table = tableFor(mapping);
    for (const name in table) {
      const v = table[name];
      if (typeof spec === "number" && v === spec) return swapPhys(name, cfg);
      if (spec && typeof spec === "object" && v && typeof v === "object" && v.a === spec.a && (v.s || 1) === (spec.s || 1)) return swapPhys(name, cfg);
    }
    return spec;
  }

  /**
   * Alguns drivers (Linux) e controles no modo Switch entregam X/Y ou A/B trocados.
   * Com "Trocar X e Y" / "Trocar A e B" ligados no Lab, o nome físico é invertido
   * antes de procurar o botão (e ao remapear), então o botão certo acende.
   */
  function swapPhys(name, cfg) {
    if (!cfg || typeof name !== "string") return name;
    if (cfg.swapXY && (name === "X" || name === "Y")) return name === "X" ? "Y" : "X";
    if (cfg.swapAB && (name === "A" || name === "B")) return name === "A" ? "B" : "A";
    return name;
  }

  /* ---------------- Leitura de inputs ---------------- */
  /**
   * opts.keepScroll: não segura as setas/espaço (usado no Início, onde a página precisa rolar).
   */
  function InputReader(getConfig, opts) {
    const keepScroll = !!(opts && opts.keepScroll);
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
        if (e.code === "Escape") { e.preventDefault(); const cb0 = capture.cb; capture = null; cb0(null); return; }
        if (capture.mode === "gp" || capture.mode === "stick") return;   // esperando o controle: ignora o teclado
        e.preventDefault();
        const cb = capture.cb; capture = null;
        cb({ key: e.code });
        return;
      }
      if (isTyping(e)) return;
      keys.add(e.code); tapped.add(e.code);
      // setas e espaço não rolam a página enquanto estiverem sendo usados como controle
      if (!keepScroll && (e.code.indexOf("Arrow") === 0 || (e.code === "Space" && isMapped(e.code)))) e.preventDefault();
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
    /** Lê um "canal": número = eixo (-1..1); "b6" = valor do botão 6 convertido para -1..1. */
    function chanValue(pad, k) {
      if (typeof k === "number") return pad.axes[k];
      const b = pad.buttons[+String(k).slice(1)];
      return b ? b.value * 2 - 1 : null;
    }

    /**
     * Analógico direito. Se o usuário usou "Detectar analógico direito" neste tipo de
     * mapeamento, usa os eixos detectados; senão, o palpite: 2/3 no padrão, 3/4 no xpad cru.
     */
    function rightStickAxes(p, cfg) {
      const r = rsFor(p, cfg);
      if (r && chanValue(p, r.x) != null && chanValue(p, r.y) != null) {
        return { x: r.sx * chanValue(p, r.x), y: r.sy * chanValue(p, r.y) };
      }
      if (p.mapping === "standard" || rawLayout(p, cfg) === "generic") return { x: p.axes[2] || 0, y: p.axes[3] || 0 };
      return p.axes.length >= 5 ? { x: p.axes[3] || 0, y: p.axes[4] || 0 } : { x: 0, y: 0 };
    }

    /** Analógico direito detectado para este tipo de mapeamento (ou null). */
    function rsFor(p, cfg) {
      const r = cfg && cfg.rsAxes;
      return r && p && r.mapping === (p.mapping || "") ? r : null;
    }
    /** Botões que, neste controle, são na verdade o analógico direito (não contam como botão). */
    function rsButtons(p, cfg) {
      const r = rsFor(p, cfg);
      return r ? [r.x, r.y].filter(function (k) { return typeof k === "string"; }).map(function (k) { return +k.slice(1); }) : [];
    }

    /** Resolve "RT", 7 ou {a:5,t:0,s:1} para o estado atual do controle. */
    function gpPressed(pad, spec) {
      if (spec == null || !pad) return false;
      if (typeof spec === "string") spec = tableFor(mappingOf(pad, getConfig()))[spec];
      if (spec == null) return false;
      if (typeof spec === "number") return rsButtons(pad, getConfig()).indexOf(spec) < 0 && btnDown(pad.buttons[spec]);
      const v = pad.axes[spec.a];
      return v != null && (spec.s || 1) * (v - spec.t) > 0;
    }

    function isMapped(code) {
      const cfg = getConfig();
      return !!dirOfKey(cfg, code) || activeButtons(cfg).some(function (b) { return b.key === code; });
    }

    /**
     * Detecta o analógico direito: cada driver numera os eixos de um jeito
     * (Xbox por cabo no Linux = eixos 3/4; por Bluetooth = 2/3; navegador "padrão" = 2/3).
     * O usuário empurra para a DIREITA, solta, e empurra para BAIXO; o eixo que mais
     * mudou em cada passo vira o X e o Y do analógico (com o sinal certo).
     */
    function tickStick(pad) {
      const c = capture;
      // Canais candidatos: eixos 2+ (0 e 1 são o analógico esquerdo) e também o valor dos
      // botões, porque alguns navegadores entregam o analógico direito de certos controles
      // (ex.: 8BitDo no Firefox) como se fosse o "quanto apertado" dos gatilhos.
      const chans = [];
      for (let a = 2; a < pad.axes.length; a++) chans.push(a);
      for (let b = 0; b < pad.buttons.length; b++) chans.push("b" + b);
      if (!c.base) { c.base = {}; chans.forEach(function (k) { c.base[k] = chanValue(pad, k) || 0; }); c.step = 0; return; }
      const delta = function (k) { return (chanValue(pad, k) || 0) - (c.base[k] || 0); };
      if (c.waitRelease) {
        const moving = chans.some(function (k) { return Math.abs(delta(k)) > 0.3; });
        if (!moving) { c.waitRelease = false; if (c.onStep) c.onStep(1); }
        return;
      }
      let best = -1, bd = 0;
      chans.forEach(function (k) {
        if (c.step === 1 && k === c.x) return;
        if (Math.abs(delta(k)) > Math.abs(bd)) { bd = delta(k); best = k; }
      });
      if (best === -1 || Math.abs(bd) < 0.6) return;
      if (c.step === 0) { c.x = best; c.sx = bd > 0 ? 1 : -1; c.step = 1; c.waitRelease = true; return; }
      const cb = c.cb; capture = null;
      cb({ stick: { x: c.x, sx: c.sx, y: best, sy: bd > 0 ? 1 : -1, mapping: pad.mapping || "" } });
    }

    function tickCapture(pad) {
      if (capture && pad && capture.mode === "stick") { tickStick(pad); return; }
      if (!capture || !pad || capture.mode === "key") return;
      const anyDown = pad.buttons.some(function (b, i) { return btnDown(b) && rsButtons(pad, getConfig()).indexOf(i) < 0; });
      if (!capture.armed) {           // espera soltar tudo antes de capturar
        if (!anyDown) { capture.armed = true; capture.baseline = pad.axes.slice(); }
        return;
      }
      const skipB = rsButtons(pad, getConfig());
      for (let i = 0; i < pad.buttons.length; i++) {
        if (skipB.indexOf(i) < 0 && btnDown(pad.buttons[i])) { const cb = capture.cb; capture = null; cb({ gp: i, mapping: mappingOf(pad, getConfig()) }); return; }
      }
      // Eixos (gatilhos analógicos). Ignora os dois analógicos e o hat (6,7).
      const rsCfg = rsFor(pad, getConfig());
      const rsAx = rsCfg ? [rsCfg.x, rsCfg.y] : rawLayout(pad, getConfig()) === "xpad" ? [3, 4] : [2, 3];
      for (let a = 2; a < pad.axes.length; a++) {
        if (a === 6 || a === 7 || rsAx.indexOf(a) >= 0) continue;
        const delta = pad.axes[a] - capture.baseline[a];
        if (Math.abs(delta) > 0.6) {
          // limiar = meio do caminho entre o repouso e o valor apertado
          const t = +((capture.baseline[a] + pad.axes[a]) / 2).toFixed(2);
          const cb = capture.cb; capture = null;
          cb({ gp: { a: a, t: t, s: delta > 0 ? 1 : -1 }, mapping: mappingOf(pad, getConfig()) });
          return;
        }
      }
    }

    return {
      onConnection: function (fn) { onConnection = fn; },
      startCapture: function (cb, mode, onStep) { capture = { cb: cb, mode: mode || "any", armed: false, baseline: [], onStep: onStep }; },
      cancelCapture: function () { capture = null; },
      isCapturing: function () { return !!capture; },
      read: function () {
        const cfg = getConfig();
        const none = function () { return { up: false, down: false, left: false, right: false }; };
        const kbd = none(), dpad = none(), stick = none();
        const held = new Set(keys); tapped.forEach(function (k) { held.add(k); }); tapped.clear();
        held.forEach(function (k) { const d = dirOfKey(cfg, k); if (d) kbd[d] = true; });
        const p = currentPad();
        tickCapture(p);
        const buttons = new Set();
        let axes = { x: 0, y: 0 }, raxes = { x: 0, y: 0 };
        if (p) {
          // D-pad (direcional digital)
          if (p.mapping === "standard") {
            if (btnDown(p.buttons[12])) dpad.up = true;
            if (btnDown(p.buttons[13])) dpad.down = true;
            if (btnDown(p.buttons[14])) dpad.left = true;
            if (btnDown(p.buttons[15])) dpad.right = true;
          } else if (p.axes.length >= 8) {   // alguns drivers entregam o D-pad como "hat" (eixos 6/7)
            const h = N.axesToDirections(p.axes[6], p.axes[7], 0.5);
            Object.keys(h).forEach(function (k) { if (h[k]) dpad[k] = true; });
          }
          // Analógico esquerdo (eixos 0/1), com zona morta
          axes = { x: p.axes[0] || 0, y: p.axes[1] || 0 };
          // Analógico direito: eixos 2/3 no mapeamento padrão; no driver xpad "cru" (Linux) são 3/4
          // (o eixo 2 é o gatilho esquerdo). Só aparece no desenho, não conta como direção.
          raxes = rightStickAxes(p, cfg);
          const a = N.axesToDirections(axes.x, axes.y, 0.5);
          Object.keys(a).forEach(function (k) { if (a[k]) stick[k] = true; });
        }
        // Qual fonte vale para a notação: as duas (padrão), só o D-pad ou só o analógico.
        // O teclado sempre vale (ele não tem analógico).
        const src = cfg.dirSource || "both";
        const dirs = none();
        Object.keys(dirs).forEach(function (k) {
          dirs[k] = kbd[k] || (src !== "stick" && dpad[k]) || (src !== "dpad" && stick[k]);
        });
        const dpadShown = none();
        Object.keys(dpadShown).forEach(function (k) { dpadShown[k] = kbd[k] || (src !== "stick" && dpad[k]); });
        if (src === "dpad") axes = { x: 0, y: 0 };
        activeButtons(cfg).forEach(function (b) {
          if ((b.key && held.has(b.key)) || gpPressed(p, swapPhys(b.gp, cfg))) buttons.add(b.id);
        });
        const sys = new Set();
        if (p) SYS.forEach(function (n) { if (gpPressed(p, n[0])) sys.add(n[0]); });
        return { dirs: dirs, dpad: dpadShown, stick: stick, axes: axes, raxes: raxes, sys: sys, rawAxes: p ? Array.from(p.axes) : [], rawButtons: p ? Array.from(p.buttons, function (b) { return b.value; }) : [], layout: p ? rawLayout(p, cfg) : null, buttons: buttons, gamepad: p ? p.id : null, mapping: p ? p.mapping : null };
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

  /** Variáveis CSS do botão: --c (cor do botão) e --lc (rótulo legível sobre essa cor). */
  function colorVars(color) { return "--c:" + color + ";--lc:" + labelColor(color); }

  /** Moldura do controle: carcaça externa + tampo interno (onde ficam os botões). */
  function frame(svg, rx, cfg) {
    const base = el("rect", { x: 10, y: 30, width: 700, height: 300, rx: rx, class: "body base" }, svg);
    base.style.fill = cfg && cfg.baseColor ? cfg.baseColor : "transparent";   // transparente por padrão (bom para o OBS)
    el("rect", { x: 17, y: 37, width: 686, height: 286, rx: Math.max(6, rx - 6), class: "base-rim" }, svg);
    [[34, 54], [360, 54], [686, 54], [34, 180], [686, 180], [34, 306], [360, 306], [686, 306]].forEach(function (p) {
      el("circle", { cx: p[0], cy: p[1], r: 5, class: "screw" }, svg);
    });
  }

  /** Botão redondo (arcade/leverless) dentro de um <g> posicionado por translate. */
  function roundButton(parent, b, opts) {
    const g = el("g", { transform: "translate(" + b.x + " " + b.y + ")", "data-id": b.id, color: b.color, style: colorVars(b.color) }, parent);
    if (opts.editable) g.classList.add("editable");
    if (opts.selectedId === b.id) g.classList.add("selected");
    el("circle", { r: (b.r || 30) + 5, class: "btn-ring" }, g);                 // anel preto externo
    const c = el("circle", { r: b.r || 30, fill: b.color, class: "btn-shape" }, g);
    el("circle", { r: Math.max(6, (b.r || 30) - 7), class: "btn-gloss" }, g);   // reflexo do miolo
    text(g, 0, 1, b.label, labelColor(b.color), fitSize(b.label, b.r || 30));
    return { g: g, shape: c };
  }

  /**
   * Estilo "Clássico": cada botão fica num rebaixo escuro da chapa, e os rebaixos
   * vizinhos se juntam numa mancha só (como nos leverless tipo Hitbox).
   * Os círculos são opacos dentro de um grupo semitransparente: assim, onde eles
   * se sobrepõem, a cor não escurece duas vezes.
   */
  /** Rebaixo ligado? Escolha do usuário; sem escolha, só no estilo Clássico. */
  function pocketsOn(cfg) { return cfg.pockets === true || (cfg.pockets == null && cfg.buttonStyle === "classic"); }

  function drawPockets(svg, list, cfg) {
    if (!pocketsOn(cfg)) return;
    // Filtro "goo": desfoca e endurece a borda de novo; círculos próximos viram uma
    // mancha só com junções arredondadas, como o rebaixo fresado de um Hitbox.
    const defs = el("defs", {}, svg);
    const f = el("filter", { id: "il-goo", filterUnits: "userSpaceOnUse", x: 0, y: 0, width: 720, height: 360 }, defs);
    el("feGaussianBlur", { in: "SourceGraphic", stdDeviation: 7 }, f);
    el("feColorMatrix", { values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" }, f);
    const outer = el("g", { class: "pockets", opacity: 0.34 }, svg);
    const g = el("g", { filter: "url(#il-goo)" }, outer);
    const R = function (b) { return (b.r || 30) + 15; };
    // Pontes: só entre vizinhos próximos (rebaixos a menos de 25 unidades),
    // para eles ficarem colados sem encher o espaço entre os grupos.
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d - R(a) - R(b) < 25) {
          el("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: "#000", "stroke-width": Math.min(R(a), R(b)) * 1.1, "stroke-linecap": "round" }, g);
        }
      }
    }
    list.forEach(function (b) { el("circle", { cx: b.x, cy: b.y, r: R(b) }, g); });
  }

  /** Fileira SELECT · START · L3 · R3 no alto do arcade e do leverless. */
  function sysColor(cfg) { return /^#[0-9a-f]{6}$/i.test(cfg && cfg.sysColor) ? cfg.sysColor : SYS_COLOR; }

  function drawSysRow(svg, refs, cfg) {
    SYS.forEach(function (n, i) {
      const cx = 470 + i * 58, cy = 64;
      const g = el("g", { class: "sys-btn", style: colorVars(sysColor(cfg)) }, svg);
      refs.sys[n[0]] = el("rect", { x: cx - 25, y: cy - 10, width: 50, height: 20, rx: 10, class: "fn-btn" }, g);
      text(g, cx, cy + 1, n[1], "#D5D8DE", 9).classList.add("sys-label");
    });
  }

  function drawStick(svg, cfg, refs, opts) {
    frame(svg, 30, cfg);
    const CX = 165, CY = 184, REACH = 40;
    // Botões pequenos de função, como no arcade do Trailpad
    drawSysRow(svg, refs, cfg);
    // Gate: área escura, aro e furo central
    el("circle", { cx: CX, cy: CY, r: 66, class: "gate" }, svg);
    el("circle", { cx: CX, cy: CY, r: 61, class: "gate-rim" }, svg);
    el("circle", { cx: CX, cy: CY, r: 15, class: "gate-hole" }, svg);
    // Setinhas das 4 direções: acendem junto com o manche
    [["up", 0, -1], ["down", 0, 1], ["left", -1, 0], ["right", 1, 0]].forEach(function (d) {
      const tx = CX + d[1] * 80, ty = CY + d[2] * 80;
      const pts = [[tx + d[1] * 7, ty + d[2] * 7], [tx - d[2] * 7 - d[1] * 4, ty + d[1] * 7 - d[2] * 4], [tx + d[2] * 7 - d[1] * 4, ty - d[1] * 7 - d[2] * 4]];
      refs.dir[d[0]] = el("path", { d: "M" + pts.join(" L") + " Z", class: "dir-shape gate-arrow" }, svg);
    });
    // Rastro: segmentos que vão sumindo (estilo Trailpad)
    const SEGS = 22, trailG = el("g", { class: "stick-trail" }, svg), segs = [];
    for (let i = 0; i < SEGS; i++) segs.push(el("line", { x1: CX, y1: CY, x2: CX, y2: CY, "stroke-opacity": 0 }, trailG));
    // Haste e bola com brilho (gradiente radial na cor da bola)
    const ballColor = cfg.stick.ballColor || "#FF5A4E";
    const gid = "ballGrad" + Math.random().toString(36).slice(2, 7);
    const defs = el("defs", {}, svg), grad = el("radialGradient", { id: gid, cx: "40%", cy: "32%", r: "70%" }, defs);
    el("stop", { offset: "0%", "stop-color": "#FFFFFF", "stop-opacity": .55 }, grad);
    el("stop", { offset: "35%", "stop-color": ballColor }, grad);
    el("stop", { offset: "100%", "stop-color": ballColor, "stop-opacity": 1 }, grad);
    const shaft = el("line", { x1: CX, y1: CY, x2: CX, y2: CY, class: "stick-shaft" }, svg);
    const ball = el("circle", { cx: CX, cy: CY, r: 36, fill: "url(#" + gid + ")", class: "stick-ball" }, svg);
    drawPockets(svg, cfg.stick.buttons, cfg);
    cfg.stick.buttons.forEach(function (b) { refs.btn[b.id] = roundButton(svg, b, opts).shape; });

    let cx = CX, cy = CY;
    const pts = [];
    const reduce = function () {
      return document.documentElement.classList.contains("il-reduce-motion") ||
        (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    };
    return function (dirs) {
      const h = (dirs.right ? 1 : 0) - (dirs.left ? 1 : 0), v = dirs.up ? -1 : (dirs.down ? 1 : 0);
      const k = (h && v) ? 0.72 : 1, tx = CX + h * REACH * k, ty = CY + v * REACH * k;
      const calm = reduce();
      // Animação: a bola desliza até a direção (sem animação se "reduzir animações" estiver ligado)
      if (calm) { cx = tx; cy = ty; } else { cx += (tx - cx) * 0.45; cy += (ty - cy) * 0.45; }
      ball.setAttribute("cx", cx.toFixed(1)); ball.setAttribute("cy", cy.toFixed(1));
      shaft.setAttribute("x2", cx.toFixed(1)); shaft.setAttribute("y2", cy.toFixed(1));
      // Rastro dos últimos ~22 quadros
      const show = cfg.trail !== false && !calm;
      pts.push([cx, cy]); while (pts.length > SEGS + 1) pts.shift();
      for (let i = 0; i < SEGS; i++) {
        const a = pts[i], b = pts[i + 1];
        if (!show || !a || !b) { segs[i].setAttribute("stroke-opacity", 0); continue; }
        segs[i].setAttribute("x1", a[0]); segs[i].setAttribute("y1", a[1]);
        segs[i].setAttribute("x2", b[0]); segs[i].setAttribute("y2", b[1]);
        segs[i].setAttribute("stroke-opacity", ((i + 1) / SEGS * 0.8).toFixed(2));
      }
    };
  }

  function drawLeverless(svg, cfg, refs, opts) {
    frame(svg, 24, cfg);
    const arrows = { left: "←", down: "↓", right: "→", up: "↑" };
    drawPockets(svg, Object.keys(arrows).map(function (d) { return { x: cfg.leverless.dirs[d].x, y: cfg.leverless.dirs[d].y, r: 28 }; })
      .concat(cfg.leverless.buttons), cfg);
    Object.keys(arrows).forEach(function (d) {
      const p = cfg.leverless.dirs[d];
      // Cor própria opcional (aba Botões); sem ela, aro cinza e vermelho P1 ao apertar
      const b = { id: "dir:" + d, x: p.x, y: p.y, r: 28, label: arrows[d], color: p.color || "#7A8296" };
      const r = roundButton(svg, b, opts);
      r.shape.classList.add("dir-shape");
      if (p.color) r.shape.classList.add("dir-custom");
      r.g.classList.add("dir-btn");                 // no estilo Clássico a seta some, como no Hitbox
      refs.dir[d] = r.shape;
    });
    drawSysRow(svg, refs, cfg);
    cfg.leverless.buttons.forEach(function (b) { refs.btn[b.id] = roundButton(svg, b, opts).shape; });
    return null;
  }

  /* Pad em traço (line art): corpo escuro com contorno cinza, gatilhos empilhados,
     direcional em 4 teclas, analógicos com anel duplo e botões de face com o
     símbolo do controle (PlayStation: △ ○ ✕ □ · Xbox: Y B A X).
     O símbolo usa a cor do botão; o rótulo do jogo (LP, MK...) aparece só no histórico. */
  const PS_SYMBOL = {
    Y: function (g) { el("path", { d: "M0 -9 L9 6 L-9 6 Z", class: "sym" }, g); },
    B: function (g) { el("circle", { r: 8, class: "sym" }, g); },
    A: function (g) { el("path", { d: "M-7 -7 L7 7 M7 -7 L-7 7", class: "sym" }, g); },
    X: function (g) { el("rect", { x: -7, y: -7, width: 14, height: 14, class: "sym" }, g); }
  };

  function drawPadLine(svg, cfg, refs) {
    const ps = cfg.pad.style === "ps";
    const slot = {}; cfg.pad.slots.forEach(function (s) { slot[s.phys] = s; });
    const names = PHYS_NAMES[ps ? "ps" : "xbox"];
    const colorOf = function (s) { return s && s.label !== "" ? s.color : UNUSED; };

    /* Gatilhos (L2/R2 ou LT/RT) e bumpers (L1/R1 ou LB/RB), empilhados como no controle real */
    const shoulder = function (id, d, tx, ty) {
      const s = slot[id], color = colorOf(s);
      const g = el("g", { color: color, style: colorVars(color) }, svg);
      refs.btn[id] = el("path", { d: d, class: "btn-shape bump" }, g);
      text(g, tx, ty, names[id], "#ECEFF3", 12).classList.add("bump-label");   // nome físico (L2, RB...)
    };
    shoulder("LT", "M128 40 C126 18 140 4 168 2 C196 0 212 10 220 34 L220 42 L128 46 Z", 174, 24);
    shoulder("RT", "M592 40 C594 18 580 4 552 2 C524 0 508 10 500 34 L500 42 L592 46 Z", 546, 24);
    shoulder("LB", "M100 76 C100 56 116 44 148 42 L228 40 C238 40 242 48 240 58 L238 64 Z", 172, 54);
    shoulder("RB", "M620 76 C620 56 604 44 572 42 L492 40 C482 40 478 48 480 58 L482 64 Z", 548, 54);

    /* Corpo */
    el("path", { class: "pad2-body", d:
      "M150 74 C220 62 500 62 570 74 C632 84 664 124 678 192 C694 272 686 330 646 340 " +
      "C612 348 588 322 566 294 C550 300 528 306 500 306 L220 306 C192 306 170 300 154 294 " +
      "C132 322 108 348 74 340 C34 330 26 272 42 192 C56 124 88 84 150 74 Z" }, svg);

    const pos = ps
      ? { dpad: [168, 166], face: [552, 166], ls: [290, 246], rs: [430, 246] }
      : { dpad: [272, 248], face: [552, 160], ls: [176, 162], rs: [448, 248] };

    /* Centro do controle */
    if (ps) {
      el("path", { class: "pad2-part", d: "M252 76 L468 76 L456 166 Q452 182 436 182 L284 182 Q268 182 264 166 Z" }, svg);
      el("rect", { x: 226, y: 92, width: 12, height: 26, rx: 6, class: "pad2-part" }, svg);
      el("rect", { x: 482, y: 92, width: 12, height: 26, rx: 6, class: "pad2-part" }, svg);
      el("circle", { cx: 360, cy: 240, r: 9, class: "pad2-part" }, svg);
    } else {
      el("circle", { cx: 360, cy: 108, r: 15, class: "pad2-part" }, svg);
      el("circle", { cx: 318, cy: 160, r: 11, class: "pad2-part" }, svg);
      el("circle", { cx: 402, cy: 160, r: 11, class: "pad2-part" }, svg);
    }

    /* Analógicos: anel externo + topo (o esquerdo se move com as direções) */
    let leftCap = null, rightCap = null;
    [["ls", pos.ls], ["rs", pos.rs]].forEach(function (s) {
      el("circle", { cx: s[1][0], cy: s[1][1], r: 40, class: "pad2-stick-well" }, svg);
      el("circle", { cx: s[1][0], cy: s[1][1], r: 31, class: "pad2-stick-outer" }, svg);
      const cap = el("circle", { cx: s[1][0], cy: s[1][1], r: 21, class: "pad2-stick-inner" }, svg);
      if (s[0] === "ls") leftCap = cap; else rightCap = cap;
    });

    /* Direcional: 4 teclas separadas, cada uma com uma setinha */
    const cx = pos.dpad[0], cy = pos.dpad[1];
    [["up", 0, -1], ["down", 0, 1], ["left", -1, 0], ["right", 1, 0]].forEach(function (d) {
      const vertical = d[1] === 0;
      const w = vertical ? 30 : 36, h = vertical ? 36 : 30;
      const x = cx + d[1] * 30 - w / 2, y = cy + d[2] * 30 - h / 2;
      refs.dir[d[0]] = el("rect", { x: x, y: y, width: w, height: h, rx: 8, class: "dir-shape dpad2" }, svg);
      const ax = cx + d[1] * 36, ay = cy + d[2] * 36;   // setinha apontando para fora
      const tip = [ax + d[1] * 5, ay + d[2] * 5], b1 = [ax - d[2] * 4 - d[1] * 2, ay + d[1] * 4 - d[2] * 2], b2 = [ax + d[2] * 4 - d[1] * 2, ay - d[1] * 4 - d[2] * 2];
      el("path", { d: "M" + tip + " L" + b1 + " L" + b2 + " Z", class: "dpad2-arrow" }, svg);
    });

    /* Botões de face em losango */
    const fc = pos.face, dist = 40;
    [["Y", 0, -1], ["X", -1, 0], ["B", 1, 0], ["A", 0, 1]].forEach(function (f) {
      const s = slot[f[0]], color = colorOf(s);
      const x = fc[0] + f[1] * dist, y = fc[1] + f[2] * dist;
      const g = el("g", { transform: "translate(" + x + " " + y + ")", color: color, style: colorVars(color) }, svg);
      refs.btn[f[0]] = el("circle", { r: 22, class: "btn-shape face" }, g);
      if (ps) PS_SYMBOL[f[0]](g);
      else text(g, 0, 1, names[f[0]], color, 22).classList.add("sym-text");
    });

    return function (dirs, state) {
      const m = stickOffset(dirs, state), r = stickOffset(dirs, state, true);
      leftCap.setAttribute("cx", (pos.ls[0] + m.x * 9).toFixed(1));
      leftCap.setAttribute("cy", (pos.ls[1] + m.y * 9).toFixed(1));
      rightCap.setAttribute("cx", (pos.rs[0] + r.x * 9).toFixed(1));
      rightCap.setAttribute("cy", (pos.rs[1] + r.y * 9).toFixed(1));
    };
  }
  /** Deslocamento do analógico no desenho: posição real do eixo (com controle)
      ou, sem controle, só as setas do teclado (que contam como D-pad, não como analógico). */
  function stickOffset(dirs, state, right) {
    const ax = state && (right ? state.raxes : state.axes);
    if (ax && (Math.abs(ax.x) > 0.08 || Math.abs(ax.y) > 0.08)) {
      return { x: Math.max(-1, Math.min(1, ax.x)), y: Math.max(-1, Math.min(1, ax.y)) };
    }
    return { x: 0, y: 0 };
  }

  /* Pad com os desenhos do Trailpad (CC0), carregados de js/pad-assets.js.
     Se o arquivo não estiver na página, usa o desenho em traço acima. */
  function drawPad(svg, cfg, refs) {
    const art = window.InputLabPadArt && window.InputLabPadArt[cfg.pad.style === "ps" ? "ps" : "xbox"];
    if (!art) return drawPadLine(svg, cfg, refs);
    const ps = cfg.pad.style === "ps";
    const slot = {}; cfg.pad.slots.forEach(function (s) { slot[s.phys] = s; });
    const names = PHYS_NAMES[ps ? "ps" : "xbox"];
    const colorOf = function (s) { return s && s.label !== "" ? s.color : UNUSED; };
    const part = {}; art.forEach(function (p) { part[p.id] = p; });
    const DIRS = { Up: "up", Down: "down", Left: "left", Right: "right" };
    const FACE = { A: true, B: true, X: true, Y: true };
    const SHOULDER = { LT: true, RT: true, LB: true, RB: true };

    /** Coloca o SVG de uma peça dentro de um <g>, na posição do layout. */
    const place = function (p, parent, extra) {
      const g = el("g", Object.assign({ class: "tp-part tp-" + p.id }, extra || {}), parent);
      if (p.svg) {
        const inner = el("svg", { x: p.x, y: p.y, width: p.w, height: p.h, viewBox: p.vb, preserveAspectRatio: "xMidYMid meet", overflow: "visible", fill: "none" }, g);
        inner.innerHTML = p.svg;
        return { g: g, svg: inner };
      }
      return { g: g, svg: null };
    };

    // Ordem de desenho: corpo, gatilhos atrás, bumpers na frente, depois o resto
    const order = ["base", "LT", "RT", "LB", "RB"].concat(art.map(function (p) { return p.id; }).filter(function (id) {
      return ["base", "LT", "RT", "LB", "RB"].indexOf(id) < 0;
    }));
    let leftStick = null, rightStick = null;
    order.forEach(function (id) {
      const p = part[id]; if (!p) return;
      if (SHOULDER[id]) {
        const color = colorOf(slot[id]);
        const r = place(p, svg, { color: color, style: colorVars(color) });
        refs.btn[id] = r.svg;
      } else if (DIRS[id]) {
        const r = place(p, svg);
        r.svg.classList.add("tp-dir");
        refs.dir[DIRS[id]] = r.svg;
      } else if (FACE[id]) {
        // Botão de face: círculo escuro + símbolo do PlayStation (colorido) ou letra do Xbox
        const color = colorOf(slot[id]);
        const g = el("g", { class: "tp-part tp-face", color: color, style: colorVars(color) }, svg);
        const cx = p.x + p.w / 2, cy = p.y + p.h / 2, rr = Math.min(p.w, p.h) / 2;
        refs.btn[id] = el("circle", { cx: cx, cy: cy, r: rr, class: "btn-shape face tp-face-bg" }, g);
        if (p.svg) {
          const sym = el("svg", { x: p.x, y: p.y, width: p.w, height: p.h, viewBox: p.vb, overflow: "visible", fill: "none", class: "tp-sym" }, g);
          sym.innerHTML = p.svg.replace(' class="tp-shape"', "");
        } else {
          text(g, cx, cy + 1, names[id], "#D5D8DE", rr * 1.05).classList.add("tp-letter");
        }
      } else if (id === "LS" || id === "RS") {
        // L3/R3: o analógico acende quando é apertado
        const r = place(p, svg, { style: colorVars(sysColor(cfg)) });
        refs.sys[id] = r.svg;
        if (id === "LS") leftStick = r; else rightStick = r;
      } else if (id === "View" || id === "Menu") {
        const key = id === "View" ? "VIEW" : "MENU";
        if (p.svg) {
          refs.sys[key] = place(p, svg, { style: colorVars(sysColor(cfg)) }).svg;
        } else {
          // O desenho do Xbox não traz esses botões: círculo com o ícone (dois quadrados / três traços)
          const g = el("g", { class: "tp-part sys-btn tp-" + id, style: colorVars(sysColor(cfg)) }, svg);
          const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
          refs.sys[key] = el("circle", { cx: cx, cy: cy, r: p.w / 2, class: "fn-btn" }, g);
          const ic = el("g", { class: "sys-icon" }, g);
          if (id === "View") {
            el("rect", { x: cx - 5, y: cy - 4, width: 7, height: 6, rx: 1 }, ic);
            el("rect", { x: cx - 2, y: cy - 1, width: 7, height: 6, rx: 1 }, ic);
          } else {
            [-3, 0, 3].forEach(function (dy) { el("line", { x1: cx - 5, y1: cy + dy, x2: cx + 5, y2: cy + dy }, ic); });
          }
        }
      } else {
        place(p, svg);
      }
    });

    return function (dirs, state) {
      if (leftStick && leftStick.svg) {
        const m = stickOffset(dirs, state);
        leftStick.svg.setAttribute("x", (part.LS.x + m.x * 9).toFixed(1));
        leftStick.svg.setAttribute("y", (part.LS.y + m.y * 9).toFixed(1));
      }
      if (rightStick && rightStick.svg) {
        const r = stickOffset(dirs, state, true);
        rightStick.svg.setAttribute("x", (part.RS.x + r.x * 9).toFixed(1));
        rightStick.svg.setAttribute("y", (part.RS.y + r.y * 9).toFixed(1));
      }
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
    const svg = el("svg", { viewBox: "0 0 720 360", class: "il-pad w-100" + (cfg.buttonStyle === "filled" ? "" : cfg.buttonStyle === "classic" ? " classic" : " outline"), style: "--il-btn-fill:" + (cfg.buttonFill || "#0B0D10") + ";--il-btn-label:" + labelColor(cfg.buttonFill || "#0B0D10"), role: "img", "aria-label": "Visualização do " + names[cfg.layout] });
    const refs = { btn: {}, dir: {}, sys: {} };
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
        const mark = function (shape, on) {
          shape.classList.toggle("pressed", on);
          if (shape.parentNode && shape.parentNode.tagName === "g") shape.parentNode.classList.toggle("is-pressed", on);
        };
        Object.keys(refs.btn).forEach(function (id) { mark(refs.btn[id], state.buttons.has(id)); });
        Object.keys(refs.sys).forEach(function (id) { mark(refs.sys[id], !!(state.sys && state.sys.has(id))); });
        const lit = cfg.layout === "pad" && state.dpad ? state.dpad : state.dirs;
        Object.keys(refs.dir).forEach(function (d) { mark(refs.dir[d], !!lit[d]); });
        if (moveDirs) moveDirs(state.dirs, state);
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
    describeGp: describeGp, portableGp: portableGp, describeKey: describeKey, dirOfKey: dirOfKey,
    contrast: contrast, labelColor: labelColor, levDirs: levDirs, pocketsOn: pocketsOn,
    InputReader: InputReader, buildPad: buildPad, History: History
  };
})();
