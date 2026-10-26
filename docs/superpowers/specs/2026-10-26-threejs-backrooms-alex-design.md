# Especificação de Design: Alex Leão no Mapa Backrooms com Three.js

**Data:** 2026-10-26  
**Status:** Aprovado para Planejamento  
**Autor:** Antigravity AI & Marcos  

---

## 1. Visão Geral e Objetivo

O projeto consiste em uma aplicação 3D interativa no navegador utilizando **Three.js** e **Vite**, renderizando um mapa proporcional dos **Backrooms** com iluminação atmosférica e inserindo o personagem **Alex Leão** (do DreamWorks Super Star Kartz / Sketchfab). 

O Alex poderá caminhar livremente pelos corredores dos Backrooms utilizando controles de teclado (WASD / Setas), com câmera suave em 3ª pessoa, detecção de colisão com o chão e paredes, e um sistema de animações com pelo menos **3 ações distintas**:
1. **Idle (Parado):** Ciclo contínuo de respiração e micro-movimentos do tronco e cabeça.
2. **Walk (Andando):** Ciclo rítmico de passada com elevação de passos e inclinação em curvas.
3. **Roar / Jump (Rugido/Salto Especial):** Ação comemorativa com salto vertical, elevação de braços/cabeça e aterrissagem elástica.

Além disso, a aplicação possui uma arquitetura modular com a função `register3DMember()` para permitir a adição futura de outros modelos 3D proporcionais.

---

## 2. Arquitetura do Sistema e Tecnologias

- **Linguagem & Plataforma:** JavaScript (ES Modules), HTML5, CSS3.
- **Empacotador / Servidor Local:** Vite (alta performance, HMR, carregamento direto de `.gltf`, `.bin` e texturas PNG sem erros de CORS).
- **Engine 3D:** Three.js (versão recente estável).
- **Carregadores:** `GLTFLoader` (com suporte a materiais PBR e animações).
- **Controles de Câmera:** Câmera orbital / terceira pessoa em Three.js.

### 2.1 Estrutura de Arquivos

```
Marcos - Comp/
├── index.html                  # Container 3D, canvas WebGL e HUD visual
├── package.json                # Dependências (three, vite)
├── vite.config.js              # Configurações do Vite
├── public/
│   └── models/
│       ├── backrooms/          # Modelo GLTF do mapa dos Backrooms (scene.gltf, scene.bin, textures/)
│       └── alex/               # Modelo GLTF do Alex leão (scene.gltf, scene.bin, textures/)
├── src/
│   ├── style.css               # Estilos modernos para o HUD e tela cheia
│   ├── main.js                 # Ponto de entrada, loop de animação, resize listener
│   ├── scene/
│   │   ├── lights.js           # Iluminação amarelada de lâmpadas fluorescentes dos Backrooms
│   │   └── backroomsMap.js     # Carregamento do mapa, escala, materiais e colisores
│   ├── player/
│   │   ├── alexController.js   # Movimentação do Alex (WASD, física, rotação e velocidade)
│   │   ├── alexAnimations.js   # Criação das 3 ações de animação com THREE.AnimationMixer
│   │   └── thirdPersonCamera.js# Câmera suave que segue o Alex
│   ├── ui/
│   │   └── hud.js              # Painel com botões para disparar as 3 animações e velocímetro
│   └── members/
│       └── membersRegistry.js  # Função extensível para registrar novos modelos 3D
```

---

## 3. Especificação dos Componentes

### 3.1 Cenário dos Backrooms (`backroomsMap.js`)
- **Origem dos dados:** `public/models/backrooms/scene.gltf` (VTX Backrooms VR).
- **Escala e Posicionamento:** Centralizado no ponto de origem com ajuste de escala para garantir proporção realista com o personagem.
- **Colisão:** 
  - *Chão:* Raycaster vertical (`down`) para ancorar os pés do Alex na altura correta do carpete.
  - *Paredes:* Detecção de aproximação de vértices/bounding boxes para evitar atravessar paredes amarelas.

### 3.2 Iluminação dos Backrooms (`lights.js`)
- **Luz Ambiente:** Tom amarelado característico (`#fff4d0`), intensidade moderada.
- **Luz Direcional / Spotlights de Teto:** Simulando as calhas de lâmpadas fluorescentes.
- **Efeito de Flicker:** Oscilação periódica sutil na intensidade da luz para amplificar a imersão de ambiente liminar.

### 3.3 Alex Leão e Animações (`alexController.js` e `alexAnimations.js`)
- **Origem dos dados:** `public/models/alex/scene.gltf` (Alex Super Star Kartz).
- **Proporção:** Altura aproximada de 1.4 unidades, ajustado para passar confortavelmente sob as portas e lâmpadas dos Backrooms.
- **Sistema de Animações (`THREE.AnimationMixer`):**
  - **Ação 1 (`idle`):** Pista de `VectorKeyframeTrack` e `QuaternionKeyframeTrack` simulando respiração suave (frequência 0.5 Hz, elevação de 2-3 cm e rotação leve).
  - **Ação 2 (`walk`):** Pistas de movimento com frequência proporcional à velocidade de caminhada (elevação cíclica do corpo, inclinação lateral nas curvas e balanço para frente).
  - **Ação 3 (`roar_jump`):** Animação de 1.2 segundos onde o personagem salta, ergue os membros em pose de rugido triunfal e amortece no pouso.
  - **Transição Suave:** Uso de `crossFadeTo()` para transição contínua sem quebras de postura.

### 3.4 Controles e Câmera (`thirdPersonCamera.js`)
- Teclas `W` / `S` ou `Seta Cima` / `Seta Baixo`: Caminhar para frente / ré.
- Teclas `A` / `D` ou `Seta Esquerda` / `Seta Direita`: Girar o personagem.
- Tecla `Shift`: Corrida (aumenta velocidade e acelera o ciclo de animação).
- Tecla `Espaço`: Disparo da Ação 3 (Rugido/Salto).
- Câmera: Acompanha suavemente o personagem com amortecimento lerp, posicionada ligeiramente elevada e atrás do Alex, com rotação livre por arrasto do mouse.

### 3.5 Interface do Usuário (HUD - `hud.js`)
- Cartão superior com título e informações do projeto.
- Painel de controles com botões clicáveis:
  - Botão `[1] Parado (Idle)`
  - Botão `[2] Andar (Walk)`
  - Botão `[3] Rugido / Salto (Roar)`
- Guia visual de teclas (`W`, `A`, `S`, `D`, `Shift`, `Espaço`).
- Indicador de velocidade em tempo real.

### 3.6 Extensibilidade para Novos Modelos (`membersRegistry.js`)
- Exportação da função:
  ```javascript
  register3DMember({
    id: 'nome_do_membro',
    name: 'Nome de Exibição',
    modelPath: '/models/caminho/scene.gltf',
    scale: 1.0,
    initialPosition: [0, 0, 0],
    animations: ['idle', 'walk', 'action']
  })
  ```
- Estrutura pronta para carregar instâncias adicionais no mesmo mapa caso outros modelos sejam fornecidos.

---

## 4. Tratamento de Erros e Casos de Borda

1. **Falha de Carregamento de Texturas / GLTF:** Exibição de tela de carregamento com barra de progresso visual percentual. Em caso de erro, mensagem amigável no console e no HUD.
2. **Queda fora dos Limites:** Caso o jogador atinja uma área fora dos limites do mapa, a posição do Alex é reiniciada suavemente no ponto de *spawn*.
3. **Redimensionamento da Janela:** `window.addEventListener('resize')` atualizando `camera.aspect` e `renderer.setSize` dinamicamente para manter a proporção sem distorção.

---

## 5. Plano de Testes e Validação

1. **Teste de Carregamento:** Verificar se o mapa e o Alex carregam sem avisos de texturas ausentes.
2. **Teste de Proporção:** Verificar visualmente a altura do Alex em relação aos tetos e portas dos Backrooms.
3. **Teste de Movimentação:** Testar teclas W, A, S, D, rotação e resposta imediata.
4. **Teste das 3 Animações:**
   - Confirmar transição de Idle para Walk ao se mover.
   - Confirmar disparo e término suave da Ação 3 (Rugido/Salto).
   - Confirmar acionamento direto das 3 animações através dos botões no HUD.
5. **Teste de Câmera:** Testar rotação com mouse e acompanhamento suave do personagem sem trepidação.
