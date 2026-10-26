import * as THREE from 'three';

/**
 * Câmera em 3ª pessoa aprimorada para jogos.
 * - Enquadramento dinâmico com visão sobre as costas/ombro do Alex.
 * - Centralização automática suave quando o jogador se move.
 * - Rotação orbital livre com o mouse e zoom por scroll.
 * - Amortecimento elástico sem trepidação.
 */
export class ThirdPersonCamera {
  constructor(camera, targetObject, domElement, options = {}) {
    this.camera = camera;
    this.target = targetObject;
    this.domElement = domElement || document.body;
    this.collidableMeshes = options.collidableMeshes || [];

    // Enquadramento de jogo em 3ª pessoa
    this.distance = 2.8;
    this.minDistance = 1.2;
    this.maxDistance = 5.0;
    this.height = 1.35;
    this.lookAtHeight = 0.95;
    this.damping = 0.12;

    // Controles orbitais do mouse
    this.yaw = 0; // Offset horizontal do mouse
    this.pitch = 0.12; // Ângulo vertical de inclinação
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.mouseMovedRecently = false;
    this.idleMouseTimer = 0;

    // Vetores reutilizáveis
    this.currentPosition = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();
    this.raycaster = new THREE.Raycaster();

    this.setupMouseEvents();
  }

  setupMouseEvents() {
    this.domElement.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.mouseMovedRecently = true;
      this.idleMouseTimer = 0;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      // Sensibilidade suave
      this.yaw -= deltaX * 0.005;
      this.pitch = Math.max(-0.25, Math.min(0.7, this.pitch + deltaY * 0.004));

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
      this.mouseMovedRecently = true;
      this.idleMouseTimer = 0;
    });

    // Zoom fluido
    window.addEventListener('wheel', (e) => {
      this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance + e.deltaY * 0.0025));
    }, { passive: true });
  }

  update(delta) {
    if (!this.target) return;

    const targetPos = this.target.position;
    const targetRotY = this.target.rotation.y;

    // Re-centralização suave da câmera atrás do personagem quando ele caminha
    if (!this.isDragging) {
      this.idleMouseTimer += delta;
      if (this.idleMouseTimer > 1.2) {
        this.yaw = THREE.MathUtils.lerp(this.yaw, 0, delta * 3.0);
      }
    }

    // Calcular ângulo da câmera (visão traseira com offset)
    const totalYaw = targetRotY + this.yaw + Math.PI;

    // Posição desejada da câmera
    const cosPitch = Math.cos(this.pitch);
    const offsetX = Math.sin(totalYaw) * this.distance * cosPitch;
    const offsetY = this.height + Math.sin(this.pitch) * this.distance;
    const offsetZ = Math.cos(totalYaw) * this.distance * cosPitch;

    const idealPosition = new THREE.Vector3(
      targetPos.x + offsetX,
      targetPos.y + offsetY,
      targetPos.z + offsetZ
    );

    // Ponto focal da câmera (peito/cabeça do Alex)
    const idealLookAt = new THREE.Vector3(
      targetPos.x,
      targetPos.y + this.lookAtHeight,
      targetPos.z
    );

    // Evitar que a câmera atravesse paredes dos Backrooms (Camera Wall Raycast)
    if (this.collidableMeshes && this.collidableMeshes.length > 0) {
      const dir = idealPosition.clone().sub(idealLookAt);
      const camDist = dir.length();
      dir.normalize();

      this.raycaster.set(idealLookAt, dir);
      this.raycaster.near = 0.1;
      this.raycaster.far = camDist;

      const hits = this.raycaster.intersectObjects(this.collidableMeshes, true);
      if (hits.length > 0 && hits[0].distance < camDist) {
        // Encurtar a distância da câmera para ficar na frente da parede
        idealPosition.copy(hits[0].point).addScaledVector(dir, -0.2);
      }
    }

    // Interpolação suave (lerp) para amortecer curvas
    if (this.currentPosition.lengthSq() === 0) {
      this.currentPosition.copy(idealPosition);
      this.currentLookAt.copy(idealLookAt);
    } else {
      this.currentPosition.lerp(idealPosition, this.damping);
      this.currentLookAt.lerp(idealLookAt, this.damping);
    }

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
  }
}
