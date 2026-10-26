import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Carrega o mapa dos Backrooms a partir de public/models/backrooms/scene.gltf
 * Ajusta a escala, centraliza o piso no y = 0 e configura sombras e colisores.
 */
export function loadBackroomsMap(scene, onProgress) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();

    loader.load(
      './models/backrooms/scene.gltf',
      (gltf) => {
        const map = gltf.scene;
        map.name = 'BackroomsMap';

        // Escala normalizada para o mapa
        map.scale.set(1, 1, 1);

        // Habilita sombras e otimiza materiais
        const collidableMeshes = [];
        let floorMesh = null;

        map.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            const name = (child.name || '').toLowerCase();
            const matName = (child.material?.name || '').toLowerCase();

            // Identificar carpete / piso
            if (name.includes('moquette') || matName.includes('moquette') || name.includes('floor')) {
              floorMesh = child;
            } else {
              collidableMeshes.push(child);
            }

            if (child.material) {
              child.material.roughness = 0.8;
              child.material.metalness = 0.1;
            }
          }
        });

        // Calcular Bounding Box para nivelar o chão no y = 0
        const bbox = new THREE.Box3().setFromObject(map);
        const mapSize = bbox.getSize(new THREE.Vector3());
        const mapCenter = bbox.getCenter(new THREE.Vector3());

        // Nivelar piso na altura 0 e centralizar no plano XZ
        map.position.x = -mapCenter.x;
        map.position.y = -bbox.min.y;
        map.position.z = -mapCenter.z;

        scene.add(map);

        // Ponto de spawn inicial seguro nos corredores
        const spawnPoint = new THREE.Vector3(0, 0, 0);

        resolve({
          mapGroup: map,
          spawnPoint,
          mapSize,
          collidableMeshes,
          floorMesh
        });
      },
      (xhr) => {
        if (onProgress && xhr.total) {
          const percent = (xhr.loaded / xhr.total) * 100;
          onProgress(percent);
        }
      },
      (error) => {
        console.error('Erro ao carregar o mapa dos Backrooms:', error);
        reject(error);
      }
    );
  });
}
