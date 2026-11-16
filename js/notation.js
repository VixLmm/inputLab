/* =========================================================
   InputLab — lógica de notação (pura, sem DOM)
   Mantida separada da interface para poder ser testada
   com testes unitários (útil também em Engenharia de Software).
   ========================================================= */
(function (global) {
  "use strict";

  /*  Notação numpad (padrão da comunidade de jogos de luta)
        7 8 9      ↖ ↑ ↗
        4 5 6  =   ← • →      (personagem virado para a direita)
        1 2 3      ↙ ↓ ↘                                           */
  const ARROWS = { 1: "↙", 2: "↓", 3: "↘", 4: "←", 5: "•", 6: "→", 7: "↖", 8: "↑", 9: "↗" };

  /**
   * Converte as quatro direções em um número do numpad.
   * Aplica limpeza SOCD (direções opostas simultâneas), comum em hitbox:
   *   esquerda + direita = neutro horizontal; cima + baixo = cima.
   * @param {{up:boolean,down:boolean,left:boolean,right:boolean}} d
   * @param {boolean} [p2Side=false] espelha esquerda/direita (personagem virado para a esquerda)
   * @returns {number} 1..9
   */
  function toNumpad(d, p2Side) {
    let h = (d.right ? 1 : 0) - (d.left ? 1 : 0);   // -1, 0, 1
    let v = d.up ? 1 : (d.down ? -1 : 0);           // cima tem prioridade
    if (p2Side) h = -h;
    return 5 + h + v * 3;
  }

  /** Lê eixos analógicos com zona morta e devolve as quatro direções. */
  function axesToDirections(x, y, deadzone) {
    const dz = deadzone == null ? 0.5 : deadzone;
    return { left: x < -dz, right: x > dz, up: y < -dz, down: y > dz };
  }

  /** Movimentos especiais reconhecidos (do mais longo para o mais curto). */
  const MOTIONS = [
    { seq: [6, 3, 2, 1, 4, 6], code: "632146", name: "Meia-lua para trás + frente" },
    { seq: [4, 1, 2, 3, 6],    code: "41236",  name: "Meia-lua para frente (HCF)" },
    { seq: [6, 3, 2, 1, 4],    code: "63214",  name: "Meia-lua para trás (HCB)" },
    { seq: [6, 2, 3],          code: "623",    name: "Dragon Punch (DP)" },
    { seq: [4, 2, 1],          code: "421",    name: "DP invertido" },
    { seq: [2, 3, 6],          code: "236",    name: "Quarto de círculo para frente (QCF)" },
    { seq: [2, 1, 4],          code: "214",    name: "Quarto de círculo para trás (QCB)" },
    { seq: [2, 2],             code: "22",     name: "Baixo, baixo" }
  ];

  /**
   * Verifica se `seq` aparece em ordem (como subsequência) dentro de `dirs`.
   * Permite "sujeira" entre as direções, como o buffer de um jogo real.
   * Como repetições consecutivas são removidas antes, "22" só é aceito
   * se houver outra direção (ex.: neutro) entre os dois baixos.
   */
  function containsInOrder(dirs, seq) {
    let i = 0;
    for (let k = 0; k < dirs.length && i < seq.length; k++) {
      if (dirs[k] === seq[i]) i++;
    }
    return i === seq.length;
  }

  /**
   * Detecta o movimento especial executado antes de apertar um botão.
   * @param {Array<{dir:number,t:number}>} history  direções em ordem cronológica
   * @param {number} now   instante do aperto (ms)
   * @param {number} [windowMs=400] janela de tempo aceita
   * @returns {{code:string,name:string}|null}
   */
  function detectMotion(history, now, windowMs) {
    const win = windowMs || 400;
    const dirs = history.filter(function (h) { return now - h.t <= win; }).map(function (h) { return h.dir; });
    // remove repetições consecutivas (segurar a direção não conta duas vezes)
    const compact = dirs.filter(function (d, i) { return i === 0 || d !== dirs[i - 1]; });
    for (const m of MOTIONS) {
      if (containsInOrder(compact, m.seq)) return { code: m.code, name: m.name };
    }
    return null;
  }

  /** Formata uma direção conforme o estilo escolhido. */
  function formatDir(n, style) {
    return style === "arrows" ? ARROWS[n] : String(n);
  }

  const api = { toNumpad: toNumpad, axesToDirections: axesToDirections, detectMotion: detectMotion, formatDir: formatDir, MOTIONS: MOTIONS, ARROWS: ARROWS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;   // Node (testes)
  else global.InputLabNotation = api;                                          // Navegador
})(typeof window !== "undefined" ? window : globalThis);
