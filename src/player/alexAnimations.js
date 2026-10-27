import * as THREE from 'three';

/**
 * Sistema de animação do Alex o Leão sem distorção de malha.
 * Preserva 100% a integridade geométrica do modelo (sem quebras de ossos ou deformações feias),
 * aplicando ciclos dinâmicos de Idle (respiração e presença), Walk (passada ritmada com balanço e bobbing)
 * e Roar/Jump (salto enérgico, rugido triunfal e impacto elástico no solo).
 */
export function setupAlexAnimations(model, animRig) {
  // Preservar a pose original dos ossos do GLTF
  // Cada osso já vem com sua rotação de bind correta do modelo 3D.
  // Salvar quaternions originais de bind para qualquer interpolação
  const bindQuats = new Map();
  model.traverse((child) => {
    if (child.isBone) {
      bindQuats.set(child, child.quaternion.clone());
    }
  });

  // Identificar apenas a cauda para um leve balanço suave que não distorce o corpo
  const tailBones = [];
  model.traverse((child) => {
    if (child.isBone && child.name.includes('91')) {
      tailBones.push(child);
    }
  });

  // Criar AnimationMixer no animRig
  const mixer = new THREE.AnimationMixer(animRig);

  // 1. ANIMAÇÃO IDLE (2.0s, contínua) - Respiração e presença viva
  const idleTimes = [0, 0.5, 1.0, 1.5, 2.0];
  const idlePositions = [
    0, 0, 0,
    0, 0.04, 0,
    0, 0, 0,
    0, 0.04, 0,
    0, 0, 0
  ];
  const idleRotations = [
    0, 0, 0, 1,
    0.02, 0, 0.015, 0.999,
    0, 0, 0, 1,
    -0.02, 0, -0.015, 0.999,
    0, 0, 0, 1
  ];

  const idleClip = new THREE.AnimationClip('idle', 2.0, [
    new THREE.VectorKeyframeTrack('.position', idleTimes, idlePositions),
    new THREE.QuaternionKeyframeTrack('.quaternion', idleTimes, idleRotations)
  ]);

  // 2. ANIMAÇÃO WALK (0.75s, passada ritmada de caminhada)
  const walkTimes = [0, 0.1875, 0.375, 0.5625, 0.75];
  const walkPositions = [
    0, 0, 0,
    0, 0.12, 0.03,    // Passo 1 (elevação e avanço)
    0, 0.02, 0,
    0, 0.12, 0.03,    // Passo 2 (elevação e avanço)
    0, 0, 0
  ];
  // Inclinação corporal lateral alternada ao pisar com cada pata
  const walkRotations = [
    0.05, 0, 0, 0.998,
    0.06, 0, 0.08, 0.994,   // Inclina para a esquerda no passo
    0.05, 0, 0, 0.998,
    0.06, 0, -0.08, 0.994,  // Inclina para a direita no passo
    0.05, 0, 0, 0.998
  ];

  const walkClip = new THREE.AnimationClip('walk', 0.75, [
    new THREE.VectorKeyframeTrack('.position', walkTimes, walkPositions),
    new THREE.QuaternionKeyframeTrack('.quaternion', walkTimes, walkRotations)
  ]);

  // 3. ANIMAÇÃO ROAR / JUMP (1.4s, salto acrobático com rugido)
  const roarTimes = [0, 0.25, 0.6, 0.9, 1.15, 1.4];
  const roarPositions = [
    0, 0, 0,
    0, -0.15, -0.05,   // Agachamento prévio elástico
    0, 0.75, 0.1,      // Salto no ar (ápice)
    0, 0.70, 0.05,     // Pose triunfal no ar
    0, -0.1, 0,        // Amortecimento elástico no pouso
    0, 0, 0            // Retorno à postura de prontidão
  ];
  const roarRotations = [
    0, 0, 0, 1,
    0.15, 0, 0, 0.988,    // Curva para frente agachando
    -0.3, 0, 0, 0.953,    // Peito e cabeça expandidos para trás em rugido!
    -0.35, 0, 0.05, 0.935,// Força do rugido no ápice
    0.1, 0, 0, 0.994,     // Absorção do impacto
    0, 0, 0, 1
  ];

  const roarClip = new THREE.AnimationClip('roar_jump', 1.4, [
    new THREE.VectorKeyframeTrack('.position', roarTimes, roarPositions),
    new THREE.QuaternionKeyframeTrack('.quaternion', roarTimes, roarRotations)
  ]);

  const actions = {
    idle: mixer.clipAction(idleClip),
    walk: mixer.clipAction(walkClip),
    roar_jump: mixer.clipAction(roarClip)
  };

  actions.idle.setLoop(THREE.LoopRepeat);
  actions.walk.setLoop(THREE.LoopRepeat);
  actions.roar_jump.setLoop(THREE.LoopOnce);
  actions.roar_jump.clampWhenFinished = false;

  let currentAction = 'idle';
  actions.idle.play();

  let animTime = 0;

  function playAction(name, onComplete) {
    if (!actions[name]) return;
    if (currentAction === name && name !== 'roar_jump') return;

    const prevAction = actions[currentAction];
    const newAction = actions[name];

    if (name === 'roar_jump') {
      newAction.reset();
      newAction.crossFadeFrom(prevAction, 0.15, true);
      newAction.play();
      currentAction = name;

      const onFinished = (e) => {
        if (e.action === newAction) {
          mixer.removeEventListener('finished', onFinished);
          currentAction = 'idle';
          actions.idle.reset();
          actions.idle.crossFadeFrom(newAction, 0.25, true);
          actions.idle.play();
          if (onComplete) onComplete();
        }
      };
      mixer.addEventListener('finished', onFinished);
    } else {
      newAction.reset();
      newAction.crossFadeFrom(prevAction, 0.25, true);
      newAction.play();
      currentAction = name;
    }
  }

  function update(delta) {
    animTime += delta;
    mixer.update(delta);

    // Balanço suave e natural da cauda (sem quebrar malha)
    if (tailBones.length > 0) {
      tailBones[0].rotation.y = Math.sin(animTime * 3.5) * 0.15;
    }
  }

  function getCurrentActionName() {
    return currentAction;
  }

  return {
    mixer,
    actions,
    playAction,
    update,
    getCurrentActionName
  };
}
