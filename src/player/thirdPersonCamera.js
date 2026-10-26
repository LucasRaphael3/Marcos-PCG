import * as THREE from 'three';

/**
 * Câmera suave em 3ª pessoa que acompanha o Alex.
 * Suporta rotação orbital com o mouse e amortecimento suave (lerp).
 */
export class ThirdPersonCamera {
  constructor(camera, targetObject, domElement) {
    this.camera = camera;
    this.target = targetObject;
    this.domElement = domElement || document.body;

    // Configurações de posicionamento
    this.distance = 3.6;
    this.height = 1.6;
    this.lookAtHeight = 0.9;
    this.damping = 0.08;

    // Controles orbitais do mouse
    this.yaw = 0; // Rotação horizontal adicional do mouse
    this.pitch = 0.15; // Rotação vertical (ângulo de visão)
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };

    // Posições interpoladas
    this.currentPosition = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();

    this.setupMouseEvents();
  }

  setupMouseEvents() {
    this.domElement.addEventListener('mousedown', (e) => {
      if (e.button === 0 || e.button === 2) {
        this.isDragging = true;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.yaw -= deltaX * 0.005;
      this.pitch = Math.max(-0.2, Math.min(0.65, this.pitch + deltaY * 0.004));

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    // Zoom com scroll do mouse
    window.addEventListener('wheel', (e) => {
      this.distance = Math.max(1.8, Math.min(6.5, this.distance + e.deltaY * 0.003));
    }, { passive: true });
  }

  update(delta) {
    if (!this.target) return;

    const targetPos = this.target.position;
    const targetRotY = this.target.rotation.y;

    // Calcular ângulo global da câmera (orientação do personagem + yaw do mouse)
    const totalYaw = targetRotY + this.yaw + Math.PI;

    // Posição ideal da câmera em relação ao alvo
    const offsetX = Math.sin(totalYaw) * this.distance * Math.cos(this.pitch);
    const offsetY = this.height + Math.sin(this.pitch) * this.distance;
    const offsetZ = Math.cos(totalYaw) * this.distance * Math.cos(this.pitch);

    const idealPosition = new THREE.Vector3(
      targetPos.x + offsetX,
      targetPos.y + offsetY,
      targetPos.z + offsetZ
    );

    // Ponto onde a câmera deve mirar (altura dos olhos do Alex)
    const idealLookAt = new THREE.Vector3(
      targetPos.x,
      targetPos.y + this.lookAtHeight,
      targetPos.z
    );

    // Interpolação suave (lerp)
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
