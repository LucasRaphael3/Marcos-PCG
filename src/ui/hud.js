/**
 * Interface de Usuário (HUD) para controle interativo e visualização de status.
 */
export function createHUD(container, controller) {
  container.innerHTML = `
    <div class="hud-layer">
      <!-- Barra Superior -->
      <div class="hud-top-bar">
        <div class="badge-card">
          <h2>ALEX O LEÃO // BACKROOMS VR</h2>
          <div class="badge-meta">Cenário 3D Three.js • Modelo Sketchfab • 3 Ações de Animação</div>
        </div>

        <div class="telemetry-card">
          <div class="telemetry-label">Velocidade Atual</div>
          <div id="telemetry-speed" class="telemetry-value">0.0 u/s</div>
        </div>
      </div>

      <!-- Barra Inferior -->
      <div class="hud-bottom-bar">
        <!-- Guia de Controles -->
        <div class="controls-guide">
          <h3>🎮 COMANDOS</h3>
          <div class="key-row">
            <span class="key-cap">W</span><span class="key-cap">A</span><span class="key-cap">S</span><span class="key-cap">D</span>
            <span>Mover / Girar</span>
          </div>
          <div class="key-row">
            <span class="key-cap">SHIFT</span>
            <span>Correr</span>
          </div>
          <div class="key-row">
            <span class="key-cap">ESPAÇO</span>
            <span>Rugido / Salto</span>
          </div>
          <div class="key-row">
            <span class="key-cap">MOUSE</span>
            <span>Arrastar para girar câmera</span>
          </div>
        </div>

        <!-- Seletor das 3 Animações -->
        <div class="actions-selector">
          <div class="actions-header">
            <span>AÇÕES DE ANIMAÇÃO (MIN. 3)</span>
            <span id="current-action-badge" style="color: #2ed573;">ATIVO: IDLE</span>
          </div>
          <div class="actions-buttons">
            <button id="btn-anim-idle" class="action-btn active" data-action="idle">
              <span class="btn-key-badge">1</span>
              <span>Parado (Idle)</span>
            </button>
            <button id="btn-anim-walk" class="action-btn" data-action="walk">
              <span class="btn-key-badge">2</span>
              <span>Caminhar (Walk)</span>
            </button>
            <button id="btn-anim-roar" class="action-btn" data-action="roar_jump">
              <span class="btn-key-badge">3</span>
              <span>Rugido / Salto</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  const speedElement = document.getElementById('telemetry-speed');
  const actionBadge = document.getElementById('current-action-badge');
  const btnIdle = document.getElementById('btn-anim-idle');
  const btnWalk = document.getElementById('btn-anim-walk');
  const btnRoar = document.getElementById('btn-anim-roar');

  const buttons = {
    idle: btnIdle,
    walk: btnWalk,
    roar_jump: btnRoar
  };

  function setActiveButton(actionName) {
    Object.keys(buttons).forEach((key) => {
      if (buttons[key]) {
        buttons[key].classList.toggle('active', key === actionName);
      }
    });

    if (actionBadge) {
      actionBadge.textContent = `ATIVO: ${actionName.toUpperCase().replace('_', ' / ')}`;
    }
  }

  // Eventos de clique nos botões
  btnIdle?.addEventListener('click', () => {
    controller.animations?.playAction('idle');
    setActiveButton('idle');
  });

  btnWalk?.addEventListener('click', () => {
    controller.animations?.playAction('walk');
    setActiveButton('walk');
  });

  btnRoar?.addEventListener('click', () => {
    controller.triggerRoarJump();
    setActiveButton('roar_jump');
  });

  // Teclas numéricas 1, 2, 3 para trocar animações
  window.addEventListener('keydown', (e) => {
    if (e.key === '1') {
      controller.animations?.playAction('idle');
      setActiveButton('idle');
    } else if (e.key === '2') {
      controller.animations?.playAction('walk');
      setActiveButton('walk');
    } else if (e.key === '3') {
      controller.triggerRoarJump();
      setActiveButton('roar_jump');
    }
  });

  return {
    update(speed, currentAction) {
      if (speedElement) {
        speedElement.textContent = `${speed.toFixed(1)} u/s`;
      }
      if (currentAction) {
        setActiveButton(currentAction);
      }
    },
    hideLoadingScreen() {
      const loader = document.getElementById('loading-screen');
      if (loader) {
        loader.classList.add('hidden');
      }
    },
    updateProgress(percent) {
      const bar = document.getElementById('progress-bar');
      const text = document.getElementById('progress-text');
      if (bar) bar.style.width = `${Math.min(100, Math.round(percent))}%`;
      if (text) text.textContent = `${Math.min(100, Math.round(percent))}%`;
    }
  };
}
