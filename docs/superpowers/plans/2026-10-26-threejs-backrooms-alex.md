# Alex Leão no Mapa Backrooms com Three.js Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir uma aplicação 3D interativa em Three.js com Vite, contendo o mapa dos Backrooms proporcional, o personagem Alex Leão com controles de movimentação em 3ª pessoa (WASD/setas) e 3 ações de animação distintas (Idle, Walk, Roar/Jump), além de uma função extensível para registrar novos modelos 3D.

**Architecture:** A aplicação utiliza Three.js para o pipeline WebGL e carregamento GLTF. O mapa dos Backrooms e o Alex são servidos como assets estáticos em `public/models/`. O controlador do Alex gerencia a física/colisão com raycast e atualiza um `AnimationMixer` com três `AnimationClip`s programáticos para transições suaves de movimento. A câmera de 3ª pessoa segue o Alex suavemente com `lerp`, e um HUD moderno em HTML/CSS permite disparar as animações e visualizar os controles.

**Tech Stack:** Three.js (r160+), Vite 5, JavaScript ES Modules, HTML5 Canvas, CSS3.

**Spec:** [docs/superpowers/specs/2026-10-26-threejs-backrooms-alex-design.md](file:///c:/Users/lukas/OneDrive/Área%20de%20Trabalho/PROJETOS/Marcos%20-%20Comp/docs/superpowers/specs/2026-10-26-threejs-backrooms-alex-design.md)

## Global Constraints

- O projeto roda localmente via `npm run dev` com Vite na porta padrão 5173.
- Os modelos 3D originais `backrooms_vr` e `super_star_kartz_-_alex` devem ser preservados e acessíveis na pasta estática `public/models/`.
- Devem existir exatamente pelo menos 3 ações de animação identificadas e controláveis: `idle`, `walk` e `roar_jump`.
- A proporção do Alex deve ser ajustada para navegar confortavelmente dentro dos corredores do mapa sem colidir com o teto.
- Deve ser mantida a função modular `register3DMember` para permitir a inclusão de modelos de outros membros da equipe no futuro.

## Review Focus

- Falha de textura ou arquivo binário do GLTF (caminhos relativos incorretos em `public/models/`).
- Queda do personagem no vazio ou atravessar paredes sem colisão.
- Trepidação da câmera durante a rotação ou aceleração.
- Transição brusca (pop) entre as animações sem interpolação suave.
- Distorção de aspecto ao redimensionar a janela do navegador.

---

### Task 1: Scaffolding do Projeto Vite + Three.js e Organização dos Assets

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `public/models/backrooms/` (mover ou copiar de `backrooms_vr/`)
- Create: `public/models/alex/` (mover ou copiar de `super_star_kartz_-_alex/`)

**Interfaces:**
- Produces: Servidor Vite configurado, assets 3D em `public/models/`, canvas 3D e container DOM no `index.html`.

- [ ] **Step 1: Criar package.json com dependências three e vite**
```json
{
  "name": "backrooms-alex-threejs",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.160.0"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

- [ ] **Step 2: Criar vite.config.js**
```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: false
  },
  publicDir: 'public'
});
```

- [ ] **Step 3: Copiar os modelos 3D para a pasta estática public/models/**
Copiar `backrooms_vr/*` para `public/models/backrooms/` e `super_star_kartz_-_alex/*` para `public/models/alex/`.

- [ ] **Step 4: Criar index.html com container 3D e viewport correto**
```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Alex Leão nos Backrooms - Three.js</title>
    <link rel="stylesheet" href="./src/style.css" />
  </head>
  <body>
    <div id="loading-screen" class="loading-screen">
      <div class="loader-content">
        <h1>CARREGANDO BACKROOMS</h1>
        <p>Preparando cenário e personagem Alex...</p>
        <div class="progress-bar-bg">
          <div id="progress-bar" class="progress-bar"></div>
        </div>
      </div>
    </div>
    <div id="canvas-container"></div>
    <div id="ui-container"></div>
    <script type="module" src="./src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 5: Instalar dependências via npm**
Executar `npm install` e verificar que não há erros.

- [ ] **Step 6: Commit**
```bash
git add package.json vite.config.js index.html public/
git commit -m "chore: setup vite threejs project and public 3d assets"
```

---

### Task 2: Iluminação Fluorescente e Cenário Backrooms

**Files:**
- Create: `src/scene/lights.js`
- Create: `src/scene/backroomsMap.js`

**Interfaces:**
- Consumes: `THREE.Scene`, assets em `/models/backrooms/scene.gltf`
- Produces: `setupLights(scene): { ambientLight, ceilingLights, updateLights(time) }`, `loadBackroomsMap(scene, onProgress): Promise<{ mapGroup, spawnPoint, colliders }>`

- [ ] **Step 1: Criar src/scene/lights.js com estética Backrooms**
Configurar luz ambiente amarelada (#ffe899), luz direcional suave e luzes de teto com leve flicker senoidal.

- [ ] **Step 2: Criar src/scene/backroomsMap.js**
Carregar `models/backrooms/scene.gltf` usando `GLTFLoader`. Centralizar o mapa, habilitar sombras (`castShadow`/`receiveShadow`) em cada mesh, computar bounding box e definir o ponto de *spawn* inicial seguro `(0, 0, 0)`.

- [ ] **Step 3: Testar carregamento do mapa via script de verificação**
Executar teste de importação e integridade do GLTF.

- [ ] **Step 4: Commit**
```bash
git add src/scene/lights.js src/scene/backroomsMap.js
git commit -m "feat: add backrooms map loader and fluorescent lighting"
```

---

### Task 3: Alex Leão e Criação das 3 Ações de Animação

**Files:**
- Create: `src/player/alexAnimations.js`

**Interfaces:**
- Consumes: Objeto 3D do Alex carregado (`THREE.Group`)
- Produces: `setupAlexAnimations(alexModel): { mixer, actions: { idle, walk, roar_jump }, playAction(name), update(delta) }`

- [ ] **Step 1: Criar src/player/alexAnimations.js**
Implementar a criação programática de 3 `THREE.AnimationClip`s usando `THREE.VectorKeyframeTrack` e `THREE.QuaternionKeyframeTrack`:
1. `idle`: Ciclo senoidal de 2.0s de respiração suave na posição Y e rotação X.
2. `walk`: Ciclo rítmico de 0.8s com passadas, elevação vertical e balanço lateral em Z.
3. `roar_jump`: Animação de 1.4s onde Alex salta verticalmente, ergue a cabeça/tronco e aterrissa com amortecimento.

- [ ] **Step 2: Configurar o THREE.AnimationMixer e transições suaves (crossFadeTo)**
Garantir que ao chamar `playAction('walk')` ou `playAction('idle')`, ocorra transição de 0.25s sem cortes bruscos.

- [ ] **Step 3: Testar criação dos clips e mixer**
Verificar que os 3 clips são válidos e anexados ao mixer sem erros.

- [ ] **Step 4: Commit**
```bash
git add src/player/alexAnimations.js
git commit -m "feat: add 3 procedural animation actions and mixer for Alex"
```

---

### Task 4: Controlador do Jogador e Detecção de Colisão

**Files:**
- Create: `src/player/alexController.js`

**Interfaces:**
- Consumes: `alexModel`, `alexAnimations`, `mapColliders`
- Produces: `class AlexController { update(delta), getPosition(), getMesh() }`

- [ ] **Step 1: Criar src/player/alexController.js**
- Implementar listeners de teclado para `W`, `A`, `S`, `D`, `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Shift` e `Space`.
- Velocidade de caminhada: 3.5 u/s (com Shift: 6.5 u/s).
- Rotação suave em torno do eixo Y.
- Troca de animação automática: se houver entrada de movimento, toca `walk`; se parado, toca `idle`; se pressionar `Space`, toca `roar_jump`.

- [ ] **Step 2: Implementar Raycasting para piso e colisão simples com paredes**
Garantir que Alex permaneça no chão e não atravesse paredes dos Backrooms.

- [ ] **Step 3: Commit**
```bash
git add src/player/alexController.js
git commit -m "feat: implement player movement controller and collision logic"
```

---

### Task 5: Câmera de Terceira Pessoa Suave

**Files:**
- Create: `src/player/thirdPersonCamera.js`

**Interfaces:**
- Consumes: `THREE.PerspectiveCamera`, `targetObject` (Alex)
- Produces: `class ThirdPersonCamera { update(delta), setupMouseControls(domElement) }`

- [ ] **Step 1: Criar src/player/thirdPersonCamera.js**
- Calcular posição desejada da câmera atrás e ligeiramente acima do Alex (offset: `[0, 2.2, 4.0]`).
- Interpolação suave com `lerp` para amortecer movimentos e curvas.
- Suporte a rotação do ângulo da câmera via clique e arraste do mouse.

- [ ] **Step 2: Commit**
```bash
git add src/player/thirdPersonCamera.js
git commit -m "feat: add smooth 3rd person follow camera with mouse orbit"
```

---

### Task 6: HUD Moderno, Estilos e Controles Visuais

**Files:**
- Create: `src/style.css`
- Create: `src/ui/hud.js`

**Interfaces:**
- Consumes: `alexController`, `alexAnimations`
- Produces: `createHUD(container, controller, animations): { updateSpeed(speed), showMessage(msg) }`

- [ ] **Step 1: Criar src/style.css**
Estilo limpo e moderno com estética cyberpunk/Backrooms:
- Canvas full-screen sem barras de rolagem.
- HUD com transparência fosca (glassmorphism), cores amarelo-fluorescente e âmbar.
- Botões estilizados com hover micro-interativo para acionar cada uma das 3 animações:
  - `[1] Parado (Idle)`
  - `[2] Caminhar (Walk)`
  - `[3] Rugido / Salto (Roar)`
- Painel com lista de comandos (WASD, Shift, Espaço).
- Tela de carregamento elegante com barra de progresso.

- [ ] **Step 2: Criar src/ui/hud.js**
Renderizar elementos no DOM, vincular cliques dos botões para chamar `animations.playAction()`, e atualizar velocímetro no loop.

- [ ] **Step 3: Commit**
```bash
git add src/style.css src/ui/hud.js
git commit -m "feat: create modern HUD with animation action triggers and controls guide"
```

---

### Task 7: Módulo Extensível de Registro de Membros

**Files:**
- Create: `src/members/membersRegistry.js`

**Interfaces:**
- Produces: `register3DMember(config): void`, `getActiveMembers(): Array`, `loadMemberModels(scene): Promise`

- [ ] **Step 1: Criar src/members/membersRegistry.js**
Implementar o registro extensível de modelos para outros membros da equipe.
Documentar o arquivo com exemplos claros de como plugar outros modelos do Sketchfab.
Alex vem pré-registrado como membro principal ativo.

- [ ] **Step 2: Commit**
```bash
git add src/members/membersRegistry.js
git commit -m "feat: add extensible 3d member model registry"
```

---

### Task 8: Integração Principal, Loop de Renderização e Verificação

**Files:**
- Create: `src/main.js`

**Interfaces:**
- Ponto de entrada que inicializa Three.js Scene, Camera, Renderer, Luzes, Mapa, Alex, HUD e Resize Handler.

- [ ] **Step 1: Criar src/main.js com ciclo de vida completo**
- Inicialização do `WebGLRenderer` com `antialias: true` e `outputColorSpace = THREE.SRGBColorSpace`.
- Carregamento assíncrono do Mapa e do Alex com barra de progresso no HUD.
- Loop `requestAnimationFrame` atualizando `lights`, `alexController`, `thirdPersonCamera`, `alexAnimations` e `hud`.
- Listener de `resize` para manter proporção e resolução corretas.

- [ ] **Step 2: Iniciar servidor Vite e validar no navegador**
Executar servidor de desenvolvimento localmente e inspecionar visualmente com subagente de navegador ou requisição HTTP.

- [ ] **Step 3: Validar os 5 critérios de sucesso:**
  1. O mapa dos Backrooms carrega e renderiza com iluminação adequada.
  2. O Alex leão aparece proporcional dentro dos corredores.
  3. Controles WASD movem o Alex suavemente.
  4. As 3 ações de animação funcionam tanto via teclado quanto pelos botões do HUD.
  5. A função `register3DMember` está pronta e documentada para uso futuro.

- [ ] **Step 4: Commit final**
```bash
git add src/main.js
git commit -m "feat: integrate main application loop, rendering and verification"
```
