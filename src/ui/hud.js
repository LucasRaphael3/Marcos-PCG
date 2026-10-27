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
          <div class="badge-meta">Cenário 3D Three.js • Modelo Sketchfab</div>
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
      </div>
    </div>
  `;

  const speedElement = document.getElementById('telemetry-speed');

  // Teclas numéricas opcionais 1, 2, 3 para acionar animações
  window.addEventListener('keydown', (e) => {
    if (e.key === '1') {
      controller.animations?.playAction('idle');
    } else if (e.key === '2') {
      controller.animations?.playAction('walk');
    } else if (e.key === '3') {
      controller.triggerRoarJump();
    }
  });

  return {
    update(speed) {
      if (speedElement) {
        speedElement.textContent = `${speed.toFixed(1)} u/s`;
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
