import * as THREE from 'three';

/**
 * Cria e gerencia as 3 ações de animação para o Alex:
 * 1. idle: Respiração suave e postura de prontidão
 * 2. walk: Ciclo de passada dinâmico com elevação e balanço corporal
 * 3. roar_jump: Salto triunfal, rugido e amortecimento no solo
 * 
 * @param {THREE.Object3D} animRig - O grupo/nó que receberá as faixas de animação
 */
export function setupAlexAnimations(animRig) {
  // Garantir que animRig tem nome definido para as faixas de animação
  animRig.name = 'AlexAnimRig';

  // 1. ANIMAÇÃO IDLE (2.0 segundos, contínua)
  const idleTimes = [0, 0.5, 1.0, 1.5, 2.0];
  const idlePosValues = [
    0, 0, 0,
    0, 0.035, 0,
    0, 0, 0,
    0, 0.035, 0,
    0, 0, 0
  ];

  const idleQuat = (pitch, roll, yaw) => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll));
    return [q.x, q.y, q.z, q.w];
  };

  const idleRotValues = [
    ...idleQuat(0, 0, 0),
    ...idleQuat(-0.02, 0.015, 0),
    ...idleQuat(0, 0, 0),
    ...idleQuat(-0.02, -0.015, 0),
    ...idleQuat(0, 0, 0)
  ];

  const idleClip = new THREE.AnimationClip('idle', 2.0, [
    new THREE.VectorKeyframeTrack('.position', idleTimes, idlePosValues),
    new THREE.QuaternionKeyframeTrack('.quaternion', idleTimes, idleRotValues)
  ]);

  // 2. ANIMAÇÃO WALK (0.7 segundos, passada rítmica)
  const walkTimes = [0, 0.175, 0.35, 0.525, 0.7];
  const walkPosValues = [
    0, 0, 0,
    0, 0.09, 0.02,      // Elevação do passo esquerdo
    0, 0.01, 0,
    0, 0.09, 0.02,      // Elevação do passo direito
    0, 0, 0
  ];

  const walkRotValues = [
    ...idleQuat(0.06, 0, 0),
    ...idleQuat(0.08, 0.07, -0.03),  // Inclinação passo esquerdo
    ...idleQuat(0.06, 0, 0),
    ...idleQuat(0.08, -0.07, 0.03),  // Inclinação passo direito
    ...idleQuat(0.06, 0, 0)
  ];

  const walkClip = new THREE.AnimationClip('walk', 0.7, [
    new THREE.VectorKeyframeTrack('.position', walkTimes, walkPosValues),
    new THREE.QuaternionKeyframeTrack('.quaternion', walkTimes, walkRotValues)
  ]);

  // 3. ANIMAÇÃO ROAR / JUMP (1.4 segundos, disparo especial)
  const roarTimes = [0, 0.25, 0.55, 0.85, 1.15, 1.4];
  const roarPosValues = [
    0, 0, 0,
    0, -0.08, -0.03,    // Preparação / agachamento
    0, 0.55, 0.08,      // Salto no ápice
    0, 0.50, 0.05,      // Pose triunfal de rugido no ar
    0, -0.06, 0,        // Amortecimento no pouso
    0, 0, 0             // Retorno à posição base
  ];

  const roarRotValues = [
    ...idleQuat(0, 0, 0),
    ...idleQuat(0.12, 0, 0),         // Curva para frente preparando salto
    ...idleQuat(-0.25, 0, 0),        // Expande o peito e cabeça para cima (rugido)
    ...idleQuat(-0.28, 0.04, 0),     // Vigor do rugido
    ...idleQuat(0.08, 0, 0),         // Amortecimento
    ...idleQuat(0, 0, 0)
  ];

  const roarClip = new THREE.AnimationClip('roar_jump', 1.4, [
    new THREE.VectorKeyframeTrack('.position', roarTimes, roarPosValues),
    new THREE.QuaternionKeyframeTrack('.quaternion', roarTimes, roarRotValues)
  ]);

  // Configuração do AnimationMixer
  const mixer = new THREE.AnimationMixer(animRig);

  const actions = {
    idle: mixer.clipAction(idleClip),
    walk: mixer.clipAction(walkClip),
    roar_jump: mixer.clipAction(roarClip)
  };

  // Configurar repetições
  actions.idle.setLoop(THREE.LoopRepeat);
  actions.walk.setLoop(THREE.LoopRepeat);
  actions.roar_jump.setLoop(THREE.LoopOnce);
  actions.roar_jump.clampWhenFinished = false;

  let currentActionName = 'idle';
  actions.idle.play();

  // Transição suave entre animações
  function playAction(name, onComplete) {
    if (!actions[name]) {
      console.warn(`Animação '${name}' não encontrada.`);
      return;
    }

    if (currentActionName === name && name !== 'roar_jump') {
      return;
    }

    const prevAction = actions[currentActionName];
    const newAction = actions[name];

    if (name === 'roar_jump') {
      newAction.reset();
      newAction.crossFadeFrom(prevAction, 0.15, true);
      newAction.play();
      currentActionName = name;

      const onFinished = (e) => {
        if (e.action === newAction) {
          mixer.removeEventListener('finished', onFinished);
          currentActionName = 'idle';
          actions.idle.reset();
          actions.idle.crossFadeFrom(newAction, 0.25, true);
          actions.idle.play();
          if (onComplete) onComplete();
        }
      };
      mixer.addEventListener('finished', onFinished);
    } else {
      newAction.reset();
      newAction.crossFadeFrom(prevAction, 0.2, true);
      newAction.play();
      currentActionName = name;
    }
  }

  function update(delta) {
    mixer.update(delta);
  }

  function getCurrentActionName() {
    return currentActionName;
  }

  return {
    mixer,
    actions,
    playAction,
    update,
    getCurrentActionName
  };
}
