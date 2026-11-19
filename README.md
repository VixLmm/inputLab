# InputLab

Personalize seu controle, veja seus inputs em notação de jogos de luta e treine sua execução.

Projeto Final da disciplina **Desenvolvimento de Interfaces (2/2026)**, com o Prof. Dr. Felipe Batista da Silva.

> **Site publicado:** `https://SEU-USUARIO.github.io/inputlab/`

---

## 1. O que é

O InputLab é um site para quem joga jogos de luta (Street Fighter, Tekken, Guilty Gear, etc.). Ele lê o controle (pela Gamepad API) ou o teclado e mostra em tempo real:

- o controle desenhado na tela (arcade stick, leverless/hitbox ou pad estilo Xbox/PlayStation), com os botões acendendo;
- a direção atual em **notação numpad** (o padrão da comunidade: 5 = neutro, 6 = frente, 2 = baixo…);
- um **histórico de inputs com contagem de frames**, igual ao modo treino dos jogos;
- a **detecção de movimentos especiais** (236, 214, 623, 41236, 63214, 632146, 22), com contador de acertos.

O usuário pode montar o próprio controle: **8 botões por padrão** (como os sticks e leverless atuais), com opção de **adicionar ou remover botões** (até 16), **arrastar cada botão** para reproduzir o layout real, mudar **a cor e o rótulo de cada botão** e aplicar **presets por jogo** (Street Fighter 6, Tekken 8, Guilty Gear -Strive-, Under Night In-Birth II, Mortal Kombat 1 e genéricos de 6 e 8 botões). Também pode remapear qualquer botão (pelo controle ou pelo teclado), salvar presets numa conta e gerar um **overlay para o OBS**.

## 2. Como executar

O site não tem etapa de build: é só HTML, CSS e JavaScript.

```bash
# opção 1: abrir direto
xdg-open index.html

# opção 2 (recomendada): servidor local, necessário para a Gamepad API em alguns navegadores
python3 -m http.server 8000
# acesse http://localhost:8000
```

**Sem controle?** Use o teclado: `W A S D` (ou as setas) para as direções, `U I O P` para a fileira de cima e `J K L Ç` para a de baixo. As teclas são lidas pela posição física (`event.code`), então funcionam em teclado ABNT2 e US.

**Testes unitários** (precisa do Node.js 18 ou mais recente):

```bash
node --test tests/notation.test.js
```

## 3. Estrutura de pastas

```
inputlab/
├── index.html          Página inicial (hero, cards de recursos, carrossel, "como funciona")
├── lab.html            Ferramenta principal: visualizador + personalização + presets + overlay
├── glossario.html      Glossário pesquisável com filtros por categoria
├── login.html          Login e cadastro
├── contato.html        Formulário de contato + declaração de acessibilidade
├── overlay.html        Página com fundo transparente para o OBS
├── css/style.css       Paleta, temas claro/escuro, alto contraste, componentes
├── js/
│   ├── main.js         Tema, painel de acessibilidade, estado de login na navbar
│   ├── auth.js         Login demonstrativo (localStorage + hash SHA-256)
│   ├── notation.js     Lógica pura: numpad, SOCD, detecção de especiais (testável)
│   ├── pad.js          Modelo de botões, presets por jogo, leitura de controle/teclado, desenho SVG, histórico
│   ├── lab.js          Página do Lab (loop, personalização, presets, URL do overlay)
│   ├── overlay.js      Página do overlay
│   ├── gallery.js      Skins prontas da galeria
│   ├── glossario.js    Dados e busca do glossário
│   └── forms.js        Validação de login, cadastro e contato
├── img/                Imagens das skins (geradas a partir do próprio renderizador) e favicon
├── vendor/             Bootstrap 5.3.9 e Bootstrap Icons (cópia local, funciona offline)
└── tests/              Testes unitários (node:test)
```

## 4. Construção passo a passo

### Passo 1: Planejamento e escolha do tema
A ideia inicial era um overlay de controle para o OBS. Na pesquisa, encontramos uma limitação técnica (ver seção 7). Por isso, o escopo foi ajustado para um **visualizador e treinador de inputs**, que funciona bem no navegador, com o overlay como recurso secundário.

### Passo 2: Paleta de cores e WCAG
A paleta segue uma convenção dos jogos de luta: **P1 vermelho e P2 azul**, com **dourado** para os destaques. Calculamos o contraste de cada cor com a fórmula de luminância relativa do WCAG antes de escrever qualquer CSS:

| Token | Escuro | Contraste | Claro | Contraste |
|---|---|---|---|---|
| Fundo | `#0F1117` | — | `#F7F7FA` | — |
| Texto | `#F2F4F8` | 17.1:1 | `#14161F` | 16.9:1 |
| Texto secundário | `#A0A7B8` | 7.8:1 | `#4A5163` | 7.4:1 |
| P1 (vermelho) | `#FF5A4E` | 6.1:1 | `#C0262D` | 5.5:1 |
| P2 (azul) | `#3DB8FF` | 8.5:1 | `#0A5FA3` | 6.2:1 |
| Destaque (dourado) | `#FFC53D` | 12.0:1 | `#8A5A00` | 5.5:1 |

Todas passam no nível AA (4.5:1 para texto normal). No modo claro, as cores precisaram ser escurecidas: o vermelho `#FF5A4E` sobre fundo claro não passaria.

### Passo 3: Estrutura base com Bootstrap
- Bootstrap 5.3 copiado para `vendor/`, para o site funcionar sem internet e no GitHub Pages.
- Tema escuro e claro feitos com o atributo `data-bs-theme` do Bootstrap, sobrescrevendo as variáveis CSS (`--bs-body-bg`, etc.) com os tokens da paleta.
- Cabeçalho (navbar responsiva), rodapé e painel de acessibilidade (offcanvas) iguais em todas as páginas.

### Passo 4: Acessibilidade
- Link "Pular para o conteúdo", foco sempre visível, `lang="pt-BR"`, hierarquia de títulos correta.
- **Painel de acessibilidade** (botão flutuante ou menu): tema claro/escuro/automático, tamanho do texto (90% a 150%), alto contraste, reduzir animações e sublinhar links. As preferências ficam salvas no `localStorage`.
- O tema automático respeita `prefers-color-scheme`, e as animações respeitam `prefers-reduced-motion`.
- O carrossel pausa com o mouse em cima, com o foco do teclado ou com "reduzir animações" (WCAG 2.2.2).
- Mensagens dinâmicas (especial detectado, tema trocado, resultados da busca) são anunciadas por `aria-live`.
- Auditoria com **axe-core** (regras WCAG 2.0, 2.1 e 2.2 A/AA) nas 5 páginas, nos dois temas: **0 violações**.

### Passo 5: Páginas de conteúdo
- **Início:** hero com exemplo de notação, cards de recursos, carrossel de skins, cards de "como funciona" e chamada para criar conta.
- **Glossário:** 24 termos, busca que ignora acentos (`notacao` encontra "notação"), destaque do termo buscado com `<mark>`, filtros por categoria e estado vazio com sugestão.
- **Contato:** validação HTML5 com mensagens em português, contador de caracteres e foco no primeiro campo inválido.
- **Login/Cadastro:** validação, botão de mostrar/ocultar senha e confirmação de senha.

### Passo 6: A ferramenta (Lab)
1. `notation.js`: converte as 4 direções em número do numpad, aplica a limpeza SOCD e detecta os especiais como **subsequência dentro de uma janela de tempo** (450 ms), como o buffer de um jogo real. Os movimentos mais longos são testados primeiro, então 41236 tem prioridade sobre 236, e 623 sobre 236.
2. `pad.js`: lê o controle a cada quadro (`requestAnimationFrame`) e desenha o controle em **SVG**. A cor do rótulo de cada botão (preta ou branca) é escolhida automaticamente pelo maior contraste.
3. **Versão 2 do motor (depois do primeiro teste):** o controle passou a ser um **modelo de dados**. Cada botão é um objeto com `{id, rótulo, cor, x, y, tamanho, botão do controle, tecla}`, e o desenho é gerado a partir dessa lista. Foi isso que permitiu:
   - 8 botões por padrão, adicionar e remover botões, e cor por botão;
   - **presets por jogo**, definidos como dados (fileira de cima e fileira de baixo) e aplicados aos três tipos de controle;
   - **pad realista**: corpo com pegadas, gatilhos, bumpers, dois analógicos (o esquerdo se move com as direções), direcional em cruz, nos modelos Xbox e PlayStation (✕ ○ □ △);
   - **edição de layout**: arrastar no desenho (Pointer Events) e, como alternativa sem arrastar, campos X/Y/Tamanho (exigência do WCAG 2.2, critério 2.5.7 — *Dragging Movements*).
4. `lab.js`: editor da lista de botões, **verificação de contraste de cada botão com o corpo do controle** (WCAG 1.4.11, mínimo 3:1; o controle tem corpo escuro fixo para essa conta não mudar com o tema), remapeamento, presets por conta e link do overlay (configuração em Base64 na URL).
5. **Remapeamento robusto:** botões do controle são guardados pelo nome físico (`"RT"`, `"X"`…) e traduzidos para índice conforme o navegador. No Chrome, o mapeamento é `standard`. No Firefox/Zen no Linux, o driver costuma entregar os gatilhos como **eixos**, e o remapeamento também captura eixos (guarda eixo + limiar).

### Passo 7: Testes
- Testes unitários da lógica de notação (`tests/notation.test.js`, 10 casos).
- Testes de interface automatizados com Playwright: fluxo de cadastro → Lab → salvar preset, validação dos formulários e simulação de 236 + soco pelo teclado.
- Teste manual com controle físico: **[pendente: registrar controle, sistema, navegador e resultado]**.

### Passo 8: Publicação
GitHub Pages (ver seção 6).

## 5. Tecnologias

- HTML5, CSS3 (variáveis CSS, `color-mix`, grid), JavaScript (ES2017, sem frameworks JS)
- **Bootstrap 5.3.9** e **Bootstrap Icons**
- Web APIs: Gamepad API, Web Crypto (SHA-256), Clipboard API, localStorage
- Ferramentas: VS Code/Neovim, Git e GitHub, Chrome DevTools, axe-core, Playwright, Node.js (`node:test`)

## 6. Como publicar no GitHub Pages

1. Crie um repositório `inputlab` no GitHub e suba os arquivos.
2. Vá em **Settings → Pages → Source: Deploy from a branch → `main` / root**.
3. Em 1 ou 2 minutos, o site fica em `https://SEU-USUARIO.github.io/inputlab/`.

## 7. Limitações conhecidas e trabalho futuro

- **Overlay x foco da janela:** por segurança, os navegadores só entregam inputs do controle para a página em foco. Desde o OBS 31, a fonte de navegador segue essa regra. Enquanto o jogo estiver em foco, o overlay pode parar de atualizar.
  - *Solução futura:* um pequeno programa nativo que lê o controle e envia os inputs por WebSocket para o overlay. É a mesma arquitetura do plugin *input-overlay* do OBS.
- **Login demonstrativo:** não há servidor. As contas ficam no `localStorage` do navegador, com a senha em hash SHA-256 (sem *salt* aleatório nem limite de tentativas). Isso **não** é autenticação segura. *Futuro:* um back-end com banco de dados e hash com bcrypt ou Argon2.
- **Contato:** o envio é simulado. *Futuro:* integração com Formspree ou EmailJS.
- **Mapeamento de controles:** a Gamepad API não é igual em todos os controles, sistemas e navegadores. A tabela de mapeamento "não padrão" foi escrita para o driver xpad do Linux. Para outros casos, o remapeamento do Lab (botões e eixos) contorna o problema.
- **Presets por jogo:** são sugestões de layout montadas para o projeto, não configurações oficiais dos jogos. Todos os rótulos e cores podem ser editados.
