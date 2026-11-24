/* =========================================================
   InputLab — glossário pesquisável de termos de jogos de luta
   ========================================================= */
(function () {
  "use strict";
  const esc = window.InputLabUtil.escapeHtml;

  const TERMS = [
    { t: "Notação numpad", c: "notacao", d: "Sistema que usa os números do teclado numérico para indicar direções: 5 é neutro, 6 é frente, 2 é baixo, 3 é baixo-frente. Ex.: 236P = quarto de círculo para frente + soco.", ex: "236P" },
    { t: "Neutro (5)", c: "notacao", d: "Nenhuma direção pressionada. Também é o nome da fase da luta em que nenhum jogador tem vantagem.", ex: "5" },
    { t: "Quarto de círculo para frente (QCF)", c: "notacao", d: "Baixo, baixo-frente, frente. O movimento especial mais comum dos jogos de luta.", ex: "236" },
    { t: "Quarto de círculo para trás (QCB)", c: "notacao", d: "Baixo, baixo-trás, trás.", ex: "214" },
    { t: "Dragon Punch (DP)", c: "notacao", d: "Frente, baixo, baixo-frente. Movimento em \"Z\" usado em golpes anti-aéreos invencíveis.", ex: "623" },
    { t: "Meia-lua (HCF / HCB)", c: "notacao", d: "Meio círculo de trás para frente (41236) ou de frente para trás (63214). Comum em supers e agarrões de comando.", ex: "41236" },
    { t: "Charge (carga)", c: "notacao", d: "Segurar uma direção por um tempo antes de apertar outra. Escrito como [4]6P: segure trás, depois frente + soco.", ex: "[4]6P" },
    { t: "Frame", c: "frames", d: "A menor unidade de tempo do jogo. A maioria dos jogos de luta roda a 60 frames por segundo, então 1 frame ≈ 16,7 ms.", ex: "1f = 16,7ms" },
    { t: "Frame data", c: "frames", d: "Tabela com startup, active e recovery de cada golpe. Mostra quais ataques são seguros e quais podem ser punidos.", ex: "5LP: 4/2/7" },
    { t: "Startup", c: "frames", d: "Quantos frames um golpe leva até poder acertar. Quanto menor, mais rápido.", ex: "4f" },
    { t: "Recovery", c: "frames", d: "Frames em que o personagem ainda está se recuperando do golpe e não pode agir.", ex: "" },
    { t: "Vantagem / desvantagem (+/−)", c: "frames", d: "Diferença de frames entre os dois jogadores depois que um golpe acerta ou é defendido. +2 significa que você age 2 frames antes.", ex: "+2 on block" },
    { t: "Punish", c: "estrategia", d: "Castigar um golpe inseguro do oponente logo depois de defendê-lo, usando um ataque rápido o suficiente.", ex: "" },
    { t: "Footsies", c: "estrategia", d: "O jogo de distância: andar para frente e para trás no limite do alcance dos golpes, esperando o erro do oponente.", ex: "" },
    { t: "Anti-air", c: "estrategia", d: "Golpe usado para derrubar um oponente que pulou em você. Muitas vezes é um DP (623).", ex: "623P" },
    { t: "Mix-up", c: "estrategia", d: "Situação em que o oponente precisa adivinhar entre duas ou mais opções (ex.: ataque baixo ou agarrão).", ex: "" },
    { t: "Okizeme (oki)", c: "estrategia", d: "Pressão aplicada no momento em que o oponente se levanta do chão.", ex: "" },
    { t: "Combo", c: "estrategia", d: "Sequência de golpes que o oponente não pode defender depois que o primeiro acerta.", ex: "2MK > 236P" },
    { t: "Cancel", c: "estrategia", d: "Interromper a animação de um golpe com um especial. Escrito com \">\" ou \"xx\".", ex: "2MK xx 236P" },
    { t: "Arcade stick", c: "hardware", d: "Controle com alavanca e botões, como nos fliperamas. Direções feitas com a mão esquerda girando a alavanca.", ex: "" },
    { t: "Leverless (hitbox)", c: "hardware", d: "Controle só de botões: as direções também são botões (o \"cima\" fica no polegar). Mais preciso para movimentos como o DP, mas exige limpeza SOCD. Hitbox é o nome da marca que popularizou o formato.", ex: "" },
    { t: "Botão macro", c: "hardware", d: "Um botão que aperta vários ao mesmo tempo, como PPP (três socos) ou KKK. Comum em controles de 8 botões.", ex: "PPP" },
    { t: "SOCD", c: "hardware", d: "Simultaneous Opposing Cardinal Directions: o que acontece quando trás e frente são apertados juntos. Torneios definem regras (ex.: trás + frente = neutro).", ex: "4+6 = 5" },
    { t: "Input lag", c: "hardware", d: "Atraso entre apertar o botão e a ação aparecer na tela. Somado pelo controle, pelo jogo e pelo monitor.", ex: "" },
    { t: "Rollback netcode", c: "hardware", d: "Técnica de jogo online que prevê os inputs do oponente e corrige (\"volta no tempo\") quando erra, deixando a partida mais fluida.", ex: "" }
  ];
  const CATS = { notacao: "Notação", frames: "Frames", estrategia: "Estratégia", hardware: "Hardware" };

  // Remove acentos para que "notacao" encontre "notação"
  function norm(s) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }

  function highlight(text, q) {
    if (!q) return esc(text);
    const n = norm(text), i = n.indexOf(q);
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
  }

  let cat = "todos";
  function render() {
    const raw = document.getElementById("searchInput").value.trim();
    const q = norm(raw);
    const results = TERMS.filter(function (x) {
      return (cat === "todos" || x.c === cat) && (!q || norm(x.t + " " + x.d + " " + x.ex).indexOf(q) >= 0);
    });
    document.getElementById("results").innerHTML = results.map(function (x) {
      return '<div class="col-md-6 col-lg-4"><article class="il-card h-100 p-4">' +
        '<div class="d-flex justify-content-between align-items-start mb-2 gap-2"><h3 class="h5 fw-bold mb-0">' + highlight(x.t, q) + '</h3>' +
        '<span class="il-badge il-p2">' + CATS[x.c] + "</span></div>" +
        '<p class="mb-2">' + highlight(x.d, q) + "</p>" +
        (x.ex ? '<p class="mb-0"><span class="text-muted small">Exemplo:</span> <span class="il-kbd">' + esc(x.ex) + "</span></p>" : "") +
        "</article></div>";
    }).join("");
    const count = results.length;
    document.getElementById("resultCount").textContent = count + (count === 1 ? " termo encontrado" : " termos encontrados");
    document.getElementById("emptyState").hidden = count > 0;
  }

  document.addEventListener("DOMContentLoaded", function () {
    const input = document.getElementById("searchInput");
    const q = new URLSearchParams(location.search).get("q");
    if (q) input.value = q;
    input.addEventListener("input", render);
    document.getElementById("searchForm").addEventListener("submit", function (e) { e.preventDefault(); render(); });
    document.querySelectorAll(".il-filter").forEach(function (b) {
      b.addEventListener("click", function () {
        document.querySelectorAll(".il-filter").forEach(function (x) { x.classList.remove("active"); x.setAttribute("aria-pressed", "false"); });
        b.classList.add("active"); b.setAttribute("aria-pressed", "true");
        cat = b.getAttribute("data-cat"); render();
      });
    });
    render();
  });
})();
