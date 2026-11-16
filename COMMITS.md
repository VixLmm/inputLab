# Roteiro de commits (para o histórico do GitHub mostrar a evolução)

Rode no terminal, **dentro da pasta `inputlab`**, um bloco por vez, e abra o site entre um bloco e outro para conferir. Depois da aula de quinta, cada ajuste sugerido pelo professor vira um commit seu, com uma mensagem própria.

```bash
git init -b main
git remote add origin https://github.com/SEU-USUARIO/inputlab.git

# 1 — Estrutura e paleta
git add .gitignore vendor/ css/style.css img/favicon.svg
git commit -m "Estrutura inicial: Bootstrap local e paleta P1/P2 validada no WCAG"

# 2 — Tema, acessibilidade e login demonstrativo
git add js/main.js js/auth.js
git commit -m "Tema claro/escuro, painel de acessibilidade e autenticação demonstrativa"

# 3 — Páginas de conteúdo
git add index.html glossario.html contato.html login.html js/glossario.js js/forms.js img/skin-*.png
git commit -m "Páginas: início com carrossel, glossário pesquisável, contato e login"

# 4 — Lógica de notação + testes
git add js/notation.js tests/
git commit -m "Lógica de notação numpad, SOCD e detecção de especiais com testes unitários"

# 5 — Lab e overlay
git add lab.html overlay.html js/pad.js js/lab.js js/overlay.js js/gallery.js
git commit -m "Lab: visualizador de inputs, personalização, presets e overlay para OBS"

# 6 — Documentação
git add README.md COMMITS.md
git commit -m "README com passo a passo da construção"

git push -u origin main
```

Depois, ative o GitHub Pages: **Settings → Pages → Branch `main` / root**.
