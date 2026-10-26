import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { setupAlexAnimations } from './alexAnimations.js';

/**
 * Controlador do personagem Alex o Leão.
 * Gerencia carregamento do modelo, proporção, hierarquia de animação,
 * movimentação com teclado (WASD/setas) e colisões com o mapa.
 */
export class AlexController {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = options;

    // Grupo raiz que se move pelo mundo
    this.root = new THREE.Group();
    this.root.name = 'AlexPlayerRoot';

    // Grupo intermediário para aplicar as transformações de animação
    this.animRig = new THREE.Group();
    this.animRig.name = 'AlexAnimRig';
    this.root.add(this.animRig);

    this.scene.add(this.root);

    // Estado de movimentação
    this.speed = 3.8;
    this.sprintMultiplier = 1.7;
    this.rotationSpeed = 3.2;
    this.velocity = new THREE.Vector3();
    this.isMoving = false;
    this.currentSpeed = 0;

    // Colisões e raycasting
    this.raycaster = new THREE.Raycaster();
    this.downVector = new THREE.Vector3(0, -1, 0);
    this.collidableMeshes = options.collidableMeshes || [];
    this.floorMesh = options.floorMesh || null;
    this.spawnPoint = options.spawnPoint || new THREE.Vector3(0, 0, 0);

    // Controles de teclado
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false
    };

    this.setupKeyboardListeners();
  }

  /**
   * Carrega o modelo do Alex e inicializa animações e proporções.
   */
  async load(onProgress) {
    const loader = new GLTFLoader();

    return new Promise((resolve, reject) => {
      loader.load(
        './models/alex/scene.gltf',
        (gltf) => {
          this.model = gltf.scene;
          this.model.name = 'AlexModel';

          // Habilitar sombras e ajustar materiais
          this.model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // Medir tamanho natural do modelo
          const bbox = new THREE.Box3().setFromObject(this.model);
          const size = bbox.getSize(new THREE.Vector3());
          const center = bbox.getCenter(new THREE.Vector3());

          // Escala proporcional aos Backrooms (altura alvo ~1.3 unidades)
          const targetHeight = 1.35;
          const scaleFactor = targetHeight / (size.y || 1);
          this.model.scale.setScalar(scaleFactor);

          // Centralizar os pés do Alex no pivô do animRig (y = 0)
          this.model.position.x = -center.x * scaleFactor;
          this.model.position.y = -bbox.min.y * scaleFactor;
          this.model.position.z = -center.z * scaleFactor;

          // Adicionar o modelo ao rig de animação
          this.animRig.add(this.model);

          // Configurar as 3 ações de animação
          this.animations = setupAlexAnimations(this.animRig);

          // Posicionar Alex no ponto de spawn inicial
          this.root.position.copy(this.spawnPoint);
          this.root.rotation.y = Math.PI; // Olhando para frente no corredor

          resolve(this);
        },
        (xhr) => {
          if (onProgress && xhr.total) {
            onProgress((xhr.loaded / xhr.total) * 100);
          }
        },
        (err) => {
          console.error('Erro ao carregar modelo do Alex:', err);
          reject(err);
        }
      );
    });
  }

  setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  onKeyDown(e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = true;
        break;
      case 'Space':
        if (!this.keys.jump) {
          this.triggerRoarJump();
        }
        this.keys.jump = true;
        break;
    }
  }

  onKeyUp(e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = false;
        break;
      case 'Space':
        this.keys.jump = false;
        break;
    }
  }

  triggerRoarJump() {
    if (this.animations) {
      this.animations.playAction('roar_jump');
    }
  }

  update(delta) {
    if (!this.animations) return;

    // Atualizar AnimationMixer
    this.animations.update(delta);

    // Calcular rotação (A e D)
    let rotationDelta = 0;
    if (this.keys.left) rotationDelta += this.rotationSpeed * delta;
    if (this.keys.right) rotationDelta -= this.rotationSpeed * delta;
    this.root.rotation.y += rotationDelta;

    // Calcular translação (W e S)
    let moveSpeed = this.speed;
    if (this.keys.sprint) moveSpeed *= this.sprintMultiplier;

    let moveDirection = 0;
    if (this.keys.forward) moveDirection += 1;
    if (this.keys.backward) moveDirection -= 0.6; // Ré mais lenta

    this.isMoving = moveDirection !== 0;
    this.currentSpeed = this.isMoving ? Math.abs(moveDirection * moveSpeed) : 0;

    if (this.isMoving) {
      // Vetor para a frente baseado na orientação do Alex
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        this.root.rotation.y
      );

      const moveStep = forward.multiplyScalar(moveDirection * moveSpeed * delta);
      const nextPos = this.root.position.clone().add(moveStep);

      // Checar limites e aplicar movimento
      this.root.position.copy(nextPos);
    }

    // Controle de estado de animação (Idle vs Walk vs Roar)
    const currentAction = this.animations.getCurrentActionName();
    if (currentAction !== 'roar_jump') {
      if (this.isMoving || rotationDelta !== 0) {
        this.animations.playAction('walk');
      } else {
        this.animations.playAction('idle');
      }
    }

    // Verificação de segurança: se cair abaixo do piso, reseta no spawn
    if (this.root.position.y < -4) {
      this.root.position.copy(this.spawnPoint);
    }
  }

  getPosition() {
    return this.root.position;
  }

  getRotation() {
    return this.root.rotation;
  }

  getMesh() {
    return this.root;
  }
}
