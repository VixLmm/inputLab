# InputLab

Personalize seu controle, veja seus inputs em notação de jogos de luta e treine sua execução.

Projeto Final da disciplina **Desenvolvimento de Interfaces (2/2026)**, com o Prof. Dr. Felipe Batista da Silva.

> **Site publicado:** https://vixlmm.github.io/inputLab/
> **Repositório:** https://github.com/VixLmm/inputLab

---

## 1. O que é

O InputLab é um site para quem joga jogos de luta (Street Fighter, Tekken, Guilty Gear, Under Night…). Ele lê o controle (pela Gamepad API) ou o teclado e mostra em tempo real:

- o controle desenhado na tela (arcade stick, leverless/hitbox ou controle estilo Xbox/PlayStation), com os botões acendendo;
- a direção atual em **notação numpad** (o padrão da comunidade: 5 = neutro, 6 = frente, 2 = baixo…);
- um **histórico de inputs com contagem de frames**, igual ao modo treino dos jogos;
- a **detecção de movimentos especiais** (236, 214, 623, 421, 41236, 63214, 632146, 22), com contador de acertos.

O usuário pode montar o próprio controle: **8 botões por padrão**, com opção de **adicionar ou remover botões** (até 16), **arrastar cada botão** para reproduzir o layout real, mudar **a cor e o rótulo de cada botão** e aplicar **presets por jogo** (Street Fighter 6, Tekken 8, Guilty Gear -Strive-, Under Night In-Birth II, Mortal Kombat 1 e genéricos de 6 e 8 botões). Também pode remapear qualquer botão (pelo controle ou pelo teclado), criar uma conta, salvar presets e gerar um **overlay para o OBS**.

## 2. Como executar

O site não tem etapa de build: é só HTML, CSS e JavaScript.

```bash
# servidor local (recomendado: a Gamepad API e o login precisam de http://)
python3 -m http.server 8000
# acesse http://localhost:8000
```

**Sem controle?** Use o teclado: `W A S D` (ou as setas) para as direções, `U I O P` para a fileira de cima e `J K L Ç` para a de baixo. As teclas são lidas pela posição física (`event.code`), então funcionam em teclado ABNT2 e US.

**Com controle:** conecte por USB ou Bluetooth e **aperte qualquer botão**. Por privacidade, o navegador só mostra o controle para a página depois do primeiro toque.

**Testes unitários** (precisa do Node.js 18 ou mais recente):

```bash
node --test tests/notation.test.js
```

## 3. Estrutura de pastas

```
inputlab/
├── index.html           Início: controle que responde ao teclado, como funciona, notação, carrossel, problemas comuns
├── lab.html             Ferramenta principal: visualizador + personalização em abas + presets + overlay
├── glossario.html       Glossário pesquisável (25 termos) com filtros por categoria
├── login.html           Login, cadastro e "esqueci minha senha"
├── contato.html         Formulário de contato + declaração de acessibilidade
├── overlay.html         Página com fundo transparente para o OBS
├── css/style.css        Paleta, temas claro/escuro, alto contraste, componentes e páginas
├── js/
│   ├── main.js          Tema, painel de acessibilidade, estado de login na barra de navegação
│   ├── auth.js          "Fachada" de login usada pelo resto do site (quem está logado, presets)
│   ├── firebase-auth.js Login real com Firebase Authentication
│   ├── firebase-config.js Configuração do projeto Firebase
│   ├── notation.js      Lógica pura: numpad, SOCD, detecção de especiais (testável)
│   ├── pad.js           Modelo de botões, presets, leitura de controle/teclado, desenho SVG, histórico
│   ├── pad-assets.js    Desenhos dos controles PlayStation e Xbox (adaptados do Trailpad, CC0)
│   ├── home.js          Início: controle ao vivo no topo e botão de pausar o carrossel
│   ├── lab.js           Página do Lab (loop, personalização, presets, link do overlay)
│   ├── overlay.js       Página do overlay
│   ├── gallery.js       Skins prontas do carrossel
│   ├── glossario.js     Dados e busca do glossário
│   └── forms.js         Validação de login, cadastro e contato
├── img/                 Imagens das skins (geradas pelo próprio renderizador), prints do Lab e favicon
├── vendor/              Bootstrap 5.3.9, Bootstrap Icons, Firebase JS SDK 13.2.0 e fontes (cópias locais)
└── tests/               Testes unitários (node:test)
```

## 4. Construção passo a passo

### Passo 1: Planejamento e escolha do tema
A ideia inicial era só um overlay de controle para o OBS. Na pesquisa, encontrei uma limitação técnica: o navegador só entrega o controle para a janela em foco (ver seção 8). Por isso, o escopo virou um **visualizador e treinador de inputs**, que funciona bem no navegador, com o overlay como recurso secundário.

### Passo 2: Paleta de cores e WCAG
A paleta segue uma convenção dos jogos de luta: **P1 vermelho e P2 azul**, com **dourado** para os destaques. O contraste de cada cor foi calculado com a fórmula de luminância relativa do WCAG antes de escrever o CSS:

| Token | Escuro | Contraste | Claro | Contraste |
|---|---|---|---|---|
| Fundo | `#0F1117` | — | `#F7F7FA` | — |
| Texto | `#F2F4F8` | 17.1:1 | `#14161F` | 16.9:1 |
| Texto secundário | `#A0A7B8` | 7.8:1 | `#4A5163` | 7.4:1 |
| P1 (vermelho) | `#FF5A4E` | 6.1:1 | `#C0262D` | 5.5:1 |
| P2 (azul) | `#3DB8FF` | 8.5:1 | `#0A5FA3` | 6.2:1 |
| Destaque (dourado) | `#FFC53D` | 12.0:1 | `#8A5A00` | 5.5:1 |

Todas passam no nível AA (4.5:1 para texto normal). No modo claro, as cores foram escurecidas, porque o vermelho `#FF5A4E` sobre fundo claro não passaria. No topo do Início, o lado P1 usa texto `#0B0D10` sobre `#FF5A4E` (6.3:1) nos dois temas.

### Passo 3: Estrutura base com Bootstrap
- Bootstrap 5.3 copiado para `vendor/`, para o site funcionar sem internet e no GitHub Pages.
- Tema escuro e claro feitos com o atributo `data-bs-theme` do Bootstrap, sobrescrevendo as variáveis CSS (`--bs-body-bg`, etc.) com os tokens da paleta.
- Cabeçalho (navbar responsiva), rodapé e painel de acessibilidade (offcanvas) iguais em todas as páginas.

### Passo 4: Acessibilidade
- Link "Pular para o conteúdo", foco sempre visível, `lang="pt-BR"`, hierarquia de títulos correta.
- **Painel de acessibilidade** (botão flutuante ou menu): tema claro/escuro/automático, tamanho do texto (90% a 150%), alto contraste, reduzir animações e sublinhar links. As preferências ficam salvas no `localStorage`.
- O tema automático respeita `prefers-color-scheme`, e as animações respeitam `prefers-reduced-motion`.
- **Carrossel:** pausa com o mouse em cima, com o foco do teclado, com o botão **Pausar** visível ou com "reduzir animações" (WCAG 2.2.2).
- Mensagens dinâmicas (especial detectado, tema trocado, resultados da busca) são anunciadas por `aria-live`.
- Imagens com texto alternativo descrevendo o que mostram (WCAG 1.1.1).
- Auditoria com **axe-core** (regras WCAG 2.0, 2.1 e 2.2 A/AA) nas páginas, nos dois temas e na largura de celular: **0 violações**.

### Passo 5: Identidade visual
A primeira versão tinha cara de "site genérico": gradientes, brilho neon, cantos muito arredondados. Na revisão da estética:
- **Fontes próprias, servidas localmente:** Barlow Condensed (títulos, lembra placares de torneio), IBM Plex Sans (texto) e IBM Plex Mono (números e notação, porque os dígitos têm a mesma largura).
- Cantos quase retos (2 px), sem gradientes nem brilho.
- **Desenhos dos controles** no estilo do Trailpad: arcade com manche que desliza e deixa rastro, base transparente (boa para o OBS) e controles PlayStation e Xbox desenhados a partir das artes do Trailpad (licença CC0).

### Passo 6: Páginas de conteúdo
- **Início:** dividido como uma tela de "P1 contra P2". O lado P1 explica o site; o lado P2 tem um **controle que responde ao teclado ou ao controle do visitante**, com o histórico de inputs ao lado, como no modo treino (`js/home.js`). Depois vêm uma faixa com golpes famosos em notação, os passos **"Conecte → Configure → Leve para o OBS"** com prints reais do Lab, a notação explicada no teclado numérico, o **carrossel de skins com miniaturas** e a seção de **problemas comuns**.
- **Glossário:** 25 termos, busca que ignora acentos (`notacao` encontra "notação"), destaque do termo buscado com `<mark>`, filtros por categoria e estado vazio com sugestão.
- **Contato:** validação HTML5 com mensagens em português, contador de caracteres e foco no primeiro campo inválido.
- **Login/Cadastro:** contas reais com **Firebase Authentication** (cadastro, entrar, sair, "esqueci minha senha"), validação, mostrar/ocultar senha e confirmação de senha. A sessão continua ativa ao recarregar a página.

### Passo 7: A ferramenta (Lab)
1. `notation.js`: converte as 4 direções em número do numpad, aplica a limpeza SOCD e detecta os especiais como **subsequência dentro de uma janela de tempo** (450 ms), como o buffer de um jogo real. Os movimentos mais longos são testados primeiro, então 41236 tem prioridade sobre 236.
2. `pad.js`: lê o controle a cada quadro (`requestAnimationFrame`) e desenha o controle em **SVG**. A cor do rótulo de cada botão (preta ou branca) é escolhida automaticamente pelo maior contraste.
3. **Controle como modelo de dados:** cada botão é um objeto `{id, rótulo, cor, x, y, tamanho, botão do controle, tecla}`, e o desenho é gerado a partir dessa lista. Isso permitiu:
   - adicionar e remover botões e mudar a cor de cada um;
   - **presets por jogo**, definidos como dados e aplicados aos três tipos de controle;
   - **edição de layout**: arrastar no desenho (Pointer Events) e, como alternativa sem arrastar, campos X/Y/Tamanho (WCAG 2.2, critério 2.5.7 — *Dragging Movements*).
4. **Organização da tela:** uma **barra rápida** em cima do controle (Arcade · Leverless · PlayStation · Xbox, jogo e "Meus presets") e o painel de personalização em **abas** (Visual, Botões, Controle, OBS). Quando o link do overlay fica desatualizado, aparece um aviso na aba OBS.
5. **Botões de sistema:** SELECT, START, L3 e R3 aparecem em todos os controles e acendem quando apertados, com cor personalizável.

### Passo 8: Compatibilidade com controles diferentes
A Gamepad API entrega cada controle de um jeito, dependendo do sistema, do navegador e do driver. Os problemas encontrados nos testes e as soluções:
- **Mapeamento "padrão" x "cru":** no Chrome/OBS os controles conhecidos vêm no mapeamento `standard`; no Firefox/Zen no Linux, vêm "crus", na ordem do driver. Os botões remapeados são guardados pelo **nome físico** (`"RT"`, `"X"`…) e traduzidos para o índice certo em cada navegador, então o mesmo remapeamento funciona no Lab e no OBS.
- **Gatilhos como eixos:** em alguns drivers, LT/RT chegam como eixos (−1 a 1). O remapeamento também captura eixos.
- **Controles genéricos (ex.: 8BitDo no modo HID):** usam outra ordem de eixos e trocam X com Y. O site reconhece o tipo pela posição de repouso dos gatilhos e guarda o resultado por controle.
- **Analógico direito:** mexe no desenho dos controles PlayStation e Xbox. Como cada driver usa eixos diferentes, existe o botão **"Detectar analógico direito"** (empurre para a direita e depois para baixo), que também encontra o analógico quando o navegador o entrega como se fosse gatilho.
- **Ajustes manuais:** "Trocar X e Y" e "Trocar A e B" para os casos que a detecção automática não cobre, e uma leitura ao vivo dos eixos e botões para diagnóstico.

### Passo 9: Testes
- Testes unitários da lógica de notação (`tests/notation.test.js`, 10 casos).
- Testes de interface automatizados com Playwright e controles simulados: troca de layout, presets, remapeamento, troca X/Y, analógico direito nos mapeamentos padrão e cru, botões de sistema, carrossel com pausa e auditoria do axe-core.
- Testes com controles físicos (CachyOS Linux):

| Controle | Navegador | Resultado |
|---|---|---|
| DualShock 4 (Sony Wireless Controller) | [preencher] | [preencher] |
| 8BitDo Ultimate 2C Wired | Zen (Firefox) | [preencher: botões, gatilhos, analógico direito] |
| Controle Xbox 360 com fio (driver xpad) | [preencher] | [preencher] |
| Teclado ABNT2 | Zen e Chrome | [preencher] |

### Passo 10: Publicação
GitHub Pages, publicado a partir da branch `main` (ver seção 7).

## 5. Configurar o login (Firebase)

1. Criar um projeto em https://console.firebase.google.com (plano gratuito Spark).
2. **Segurança → Authentication → Vamos começar → Método de login → E-mail/senha → Ativar.**
3. **Configurações do projeto → Seus apps → Web (`</>`)**: registrar o app e copiar o objeto `firebaseConfig`.
4. Colar os valores `apiKey`, `authDomain`, `projectId` e `appId` em `js/firebase-config.js`.
5. **Authentication → Configurações → Domínios autorizados**: adicionar `vixlmm.github.io`.

A `apiKey` não é uma senha: ela só identifica o projeto, e todo site com Firebase a mostra no navegador. Quem protege as contas é o servidor do Firebase.

## 6. Tecnologias

- HTML5, CSS3 (variáveis CSS, grid, `clip-path`), JavaScript (sem frameworks JS)
- **Bootstrap 5.3.9** e **Bootstrap Icons**
- **Firebase Authentication** (Firebase JS SDK 13.2.0, empacotado com esbuild em `vendor/firebase/`)
- Web APIs: Gamepad API, Pointer Events, Clipboard API, localStorage
- Ferramentas: VS Code/Neovim, Git e GitHub, Chrome DevTools, axe-core, Playwright, Node.js (`node:test`)

## 7. Como publicar no GitHub Pages

1. Suba os arquivos para o repositório no GitHub.
2. Vá em **Settings → Pages → Source: Deploy from a branch → `main` / root**.
3. A cada `git push`, o GitHub publica a versão nova em 1 ou 2 minutos.

## 8. Limitações conhecidas e trabalho futuro

- **Overlay x foco da janela:** por segurança, os navegadores só entregam inputs do controle para a página em foco. Desde o OBS 31, a fonte de navegador segue essa regra. Enquanto o jogo estiver em foco, o overlay pode parar de atualizar.
  - *Solução futura:* um pequeno programa nativo que lê o controle e envia os inputs por WebSocket para o overlay, como faz o plugin *input-overlay* do OBS.
- **Presets por conta:** o login é real, mas os presets ficam no navegador, separados pela conta. Em outro computador, a conta funciona, mas os presets não aparecem. *Futuro:* guardar no Cloud Firestore.
- **Contato:** o envio é simulado (o site é estático, sem servidor). *Futuro:* integração com Formspree ou EmailJS.
- **Controles:** a Gamepad API muda de controle para controle. A detecção automática e os ajustes do Lab cobrem os casos testados, mas outros controles podem precisar de remapeamento.
- **Presets por jogo:** são sugestões de layout montadas para o projeto, não configurações oficiais dos jogos.

## 9. Créditos e licenças

- **Trailpad** (https://github.com/chrisdejoya/Trailpad): desenhos dos controles PlayStation e Xbox e inspiração para o arcade. Licença CC0 1.0 (domínio público).
- **Bootstrap** e **Bootstrap Icons**: licença MIT.
- **Firebase JS SDK**: licença Apache 2.0.
- **Barlow Condensed** e **IBM Plex Sans/Mono**: SIL Open Font License 1.1 (licenças em `vendor/fonts/`).
- Nomes de jogos e de controles pertencem aos seus donos; o InputLab é um projeto acadêmico sem fins lucrativos.

## 10. Uso de IA

O projeto foi desenvolvido com apoio do Claude (Anthropic), de forma incremental, como orientado na disciplina: a IA ajudou a escrever e revisar partes do código e a testar a acessibilidade; as decisões de escopo, os testes com controles reais e a revisão de cada mudança foram meus. A redação da Parte C.1 do relatório foi escrita por mim e avaliada com apoio de IA, que apontou erros de informação, de português e trechos pouco naturais. Detalhes na Parte D do relatório.
