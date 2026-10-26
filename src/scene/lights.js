import * as THREE from 'three';

/**
 * Configura a iluminação característica dos Backrooms:
 * Luz amarelada fluorescente com oscilação sutil (flicker).
 */
export function setupLights(scene) {
  // Luz ambiente amarelada constante
  const ambientLight = new THREE.AmbientLight(0xfff1b0, 0.9);
  scene.add(ambientLight);

  // Luz hemisférica para contraste de teto e carpete
  const hemiLight = new THREE.HemisphereLight(0xfffae6, 0x554422, 0.6);
  hemiLight.position.set(0, 10, 0);
  scene.add(hemiLight);

  // Lâmpada principal fluorescente (PointLight) que segue o ambiente
  const mainCeilingLight = new THREE.PointLight(0xfff3be, 2.5, 35, 1.2);
  mainCeilingLight.position.set(0, 3.2, 0);
  mainCeilingLight.castShadow = true;
  mainCeilingLight.shadow.mapSize.width = 1024;
  mainCeilingLight.shadow.mapSize.height = 1024;
  mainCeilingLight.shadow.camera.near = 0.2;
  mainCeilingLight.shadow.camera.far = 30;
  mainCeilingLight.shadow.bias = -0.002;
  scene.add(mainCeilingLight);

  // Lâmpada secundária com efeito de flicker intermitente
  const flickerLight = new THREE.PointLight(0xffe099, 1.8, 25, 1.5);
  flickerLight.position.set(5, 3.2, -5);
  scene.add(flickerLight);

  // Luz fraca adicional em outro corredor
  const corridorLight = new THREE.PointLight(0xffdf88, 1.5, 25, 1.5);
  corridorLight.position.set(-6, 3.2, 8);
  scene.add(corridorLight);

  // Função para animar a oscilação das lâmpadas fluorescentes
  function updateLights(time) {
    // Efeito de chiado e oscilação de lâmpada falhando
    const noise = Math.sin(time * 30) * Math.cos(time * 17);
    if (Math.random() > 0.96) {
      flickerLight.intensity = 0.3 + Math.random() * 0.8;
    } else {
      flickerLight.intensity = 1.8 + noise * 0.25;
    }

    // Leve pulsação sutil na luz principal
    mainCeilingLight.intensity = 2.4 + Math.sin(time * 2) * 0.15;
  }

  return {
    ambientLight,
    mainCeilingLight,
    flickerLight,
    corridorLight,
    updateLights
  };
}
