// Testes unitários da lógica de notação — rodar com: node --test tests/
const test = require("node:test");
const assert = require("node:assert");
const N = require("../js/notation.js");

const D = (s) => ({ up: s.includes("u"), down: s.includes("d"), left: s.includes("l"), right: s.includes("r") });

test("direções básicas viram números do numpad (lado P1)", () => {
  assert.strictEqual(N.toNumpad(D("")), 5);
  assert.strictEqual(N.toNumpad(D("r")), 6);
  assert.strictEqual(N.toNumpad(D("d")), 2);
  assert.strictEqual(N.toNumpad(D("dr")), 3);
  assert.strictEqual(N.toNumpad(D("ul")), 7);
});

test("lado P2 espelha esquerda e direita", () => {
  assert.strictEqual(N.toNumpad(D("r"), true), 4);
  assert.strictEqual(N.toNumpad(D("dl"), true), 3);
});

test("limpeza SOCD: esquerda+direita = neutro, cima+baixo = cima", () => {
  assert.strictEqual(N.toNumpad(D("lr")), 5);
  assert.strictEqual(N.toNumpad(D("ud")), 8);
});

test("zona morta do analógico", () => {
  assert.deepStrictEqual(N.axesToDirections(0.3, 0.3), { left: false, right: false, up: false, down: false });
  assert.deepStrictEqual(N.axesToDirections(0.9, 0.9), { left: false, right: true, up: false, down: true });
});

const seq = (dirs, step = 30) => dirs.map((d, i) => ({ dir: d, t: i * step }));

test("detecta 236 (QCF)", () => {
  assert.strictEqual(N.detectMotion(seq([5, 2, 3, 6]), 100).code, "236");
});
test("prioriza 623 (DP) sobre 236 quando os dois aparecem", () => {
  assert.strictEqual(N.detectMotion(seq([6, 5, 2, 3, 6]), 130).code, "623");
});
test("prioriza meia-lua 41236 sobre 236", () => {
  assert.strictEqual(N.detectMotion(seq([4, 1, 2, 3, 6]), 130).code, "41236");
});
test("ignora movimento fora da janela de tempo", () => {
  assert.strictEqual(N.detectMotion(seq([2, 3, 6], 300), 1000, 400), null);
});
test("segurar baixo não conta como 22", () => {
  assert.strictEqual(N.detectMotion(seq([2, 2, 2]), 60), null);
  assert.strictEqual(N.detectMotion(seq([2, 5, 2]), 60).code, "22");
});
test("formata em setas", () => {
  assert.strictEqual(N.formatDir(3, "arrows"), "↘");
  assert.strictEqual(N.formatDir(3, "numpad"), "3");
});
