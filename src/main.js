import * as THREE from 'three';
import { setupLights } from './scene/lights.js';
import { loadBackroomsMap } from './scene/backroomsMap.js';
import { AlexController } from './player/alexController.js';
import { ThirdPersonCamera } from './player/thirdPersonCamera.js';
import { createHUD } from './ui/hud.js';
import { loadSecondaryMembers } from './members/membersRegistry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Ponto de Entrada Principal da Aplicação 3D.
 */
async function initApp() {
  const container = document.getElementById('canvas-container');
  const uiContainer = document.getElementById('ui-container');

  // 1. Cena com Névoa Imersiva estilo Backrooms
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14120c);
  scene.fog = new THREE.FogExp2(0x14120c, 0.04);

  // 2. Câmera Perspectiva
  const camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );

  // 3. WebGL Renderer de Alta Fidelidade
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  // 4. Iluminação Fluorescente dos Backrooms
  const lights = setupLights(scene);

  // Progresso de Carregamento
  let mapProgress = 0;
  let alexProgress = 0;

  function updateOverallProgress() {
    const total = (mapProgress + alexProgress) / 2;
    hud?.updateProgress(total);
  }

  // 5. Instanciar Controlador do Alex
  const alexController = new AlexController(scene);

  // 6. Criar HUD de Controle e Ações
  const hud = createHUD(uiContainer, alexController);

  try {
    // 7. Carregar Mapa dos Backrooms
    console.log('[Main] Carregando mapa dos Backrooms...');
    const mapData = await loadBackroomsMap(scene, (p) => {
      mapProgress = p;
      updateOverallProgress();
    });

    // Atualizar ponto de spawn e colisores no controlador
    alexController.spawnPoint.copy(mapData.spawnPoint);
    alexController.collidableMeshes = mapData.collidableMeshes;
    alexController.floorMesh = mapData.floorMesh;

    // 8. Carregar Personagem Alex Leão
    console.log('[Main] Carregando personagem Alex o Leão...');
    await alexController.load((p) => {
      alexProgress = p;
      updateOverallProgress();
    });

    // 9. Configurar Câmera de Terceira Pessoa
    const thirdPersonCamera = new ThirdPersonCamera(
      camera,
      alexController.getMesh(),
      renderer.domElement
    );

    // 10. Carregar Membros Secundários (se cadastrados)
    const gltfLoader = new GLTFLoader();
    await loadSecondaryMembers(scene, gltfLoader);

    // Expor no window para inspeção e testes
    window.__scene = scene;
    window.__alex = alexController;
    window.__camera = camera;
    window.__thirdPersonCamera = thirdPersonCamera;

    // Concluir Carregamento e Ocultar Loader
    hud.updateProgress(100);
    setTimeout(() => {
      hud.hideLoadingScreen();
      console.log('[Main] Aplicação inicializada com sucesso!');
    }, 600);

    // 11. Loop Principal de Animação
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsedTime = clock.getElapsedTime();

      // Atualizar oscilação de lâmpadas fluorescentes
      lights.updateLights(elapsedTime);

      // Atualizar movimentação e animações do Alex
      alexController.update(delta);

      // Atualizar câmera em 3ª pessoa
      thirdPersonCamera.update(delta);

      // Atualizar dados de telemetria no HUD
      const currentAction = alexController.animations?.getCurrentActionName();
      hud.update(alexController.currentSpeed, currentAction);

      // Renderizar cena
      renderer.render(scene, camera);
    }

    animate();

    // 12. Tratamento de Redimensionamento de Janela
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });

  } catch (error) {
    console.error('[Main] Falha crítica na inicialização:', error);
    alert('Erro ao carregar elementos 3D. Verifique o console para mais detalhes.');
  }
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
