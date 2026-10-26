import * as THREE from 'three';

/**
 * Sistema avançado de animação esquelética para o Alex o Leão.
 * Elimina completamente a T-pose, aplicando poses anatômicas naturais
 * e ciclos dinâmicos de Idle, Walk (caminhada com balanço de braços e pernas)
 * e Roar/Jump (rugido triunfal com braços erguidos).
 */
export function setupAlexAnimations(model, animRig) {
  // Mapear todos os ossos do esqueleto pelo nome
  const bones = {};
  model.traverse((child) => {
    if (child.isBone) {
      bones[child.name] = child;
    }
  });

  console.log('[AlexAnimations] Total de ossos detectados:', Object.keys(bones).length);

  // Principais ossos do esqueleto do Alex
  const leftClavicle = bones['bone_d3d118cf_47'];
  const leftArm = bones['bone_54333800_46'];
  const leftForearm = bones['bone_203180f9_38'];

  const rightClavicle = bones['bone_75eaf07b_63'];
  const rightArm = bones['bone_d4aebdd3_62'];
  const rightForearm = bones['bone_b62a34b9_61'];

  const spineLower = bones['bone_bc3902bb_67'];
  const spineChest = bones['bone_00ad9b46_64'];
  const neckHead = bones['bone_8fe5cd18_15'];

  const leftThigh = bones['bone_83d080e3_71'];
  const leftShin = bones['bone_238fb542_70'];

  const rightThigh = bones['bone_79dfbd80_76'];
  const rightShin = bones['bone_d9808821_75'];

  const tailBase = bones['bone_6f30eaeb_91'];
  const tailMid = bones['bone_f639bb51_90'];

  // Guardar rotações base originais
  const baseRotations = {
    leftClavicle: leftClavicle?.rotation.clone() || new THREE.Euler(),
    leftArm: leftArm?.rotation.clone() || new THREE.Euler(),
    rightClavicle: rightClavicle?.rotation.clone() || new THREE.Euler(),
    rightArm: rightArm?.rotation.clone() || new THREE.Euler(),
    spineChest: spineChest?.rotation.clone() || new THREE.Euler(),
    neckHead: neckHead?.rotation.clone() || new THREE.Euler(),
    leftThigh: leftThigh?.rotation.clone() || new THREE.Euler(),
    rightThigh: rightThigh?.rotation.clone() || new THREE.Euler(),
    tailBase: tailBase?.rotation.clone() || new THREE.Euler()
  };

  // Estados de animação
  let currentAction = 'idle';
  let targetAction = 'idle';
  let walkWeight = 0;
  let roarWeight = 0;
  let animTime = 0;
  let roarTimer = 0;

  // Criar AnimationMixer no modelo para conformidade com Three.js
  const mixer = new THREE.AnimationMixer(animRig);
  
  // Criar 3 AnimationClips formais para o mixer (permitindo clipAction)
  const emptyTrack = new THREE.VectorKeyframeTrack('.position', [0, 1], [0, 0, 0, 0, 0, 0]);
  const idleClip = new THREE.AnimationClip('idle', 2.0, [emptyTrack]);
  const walkClip = new THREE.AnimationClip('walk', 0.8, [emptyTrack]);
  const roarClip = new THREE.AnimationClip('roar_jump', 1.5, [emptyTrack]);

  const actions = {
    idle: mixer.clipAction(idleClip),
    walk: mixer.clipAction(walkClip),
    roar_jump: mixer.clipAction(roarClip)
  };

  actions.idle.play();

  function playAction(name) {
    if (name === currentAction && name !== 'roar_jump') return;

    if (name === 'roar_jump') {
      currentAction = 'roar_jump';
      targetAction = 'roar_jump';
      roarTimer = 0;
    } else {
      targetAction = name;
      currentAction = name;
    }
  }

  /**
   * Atualiza a cinemática e rotação dos ossos a cada frame.
   * Transiciona suavemente sem T-pose.
   */
  function update(delta) {
    animTime += delta;
    mixer.update(delta);

    // Interpolar pesos das animações (transição suave)
    const isWalking = targetAction === 'walk' && currentAction !== 'roar_jump';
    walkWeight = THREE.MathUtils.lerp(walkWeight, isWalking ? 1.0 : 0.0, delta * 6.0);

    if (currentAction === 'roar_jump') {
      roarTimer += delta;
      roarWeight = THREE.MathUtils.lerp(roarWeight, 1.0, delta * 8.0);
      if (roarTimer > 1.4) {
        currentAction = targetAction === 'walk' ? 'walk' : 'idle';
      }
    } else {
      roarWeight = THREE.MathUtils.lerp(roarWeight, 0.0, delta * 6.0);
    }

    const idleWeight = Math.max(0, 1.0 - walkWeight - roarWeight);

    // ==========================================
    // 1. ANIMAÇÃO IDLE (Respiração, Postura Natural)
    // ==========================================
    const breathSin = Math.sin(animTime * 2.5);
    const breathCos = Math.cos(animTime * 2.5);

    // Abaixar os braços da T-pose para a lateral do corpo de forma simétrica
    const leftArmRestZ = -1.15;
    const rightArmRestZ = -1.15;
    const armRestX = 0.25;

    // ==========================================
    // 2. ANIMAÇÃO WALK (Passadas rítmicas com balanço)
    // ==========================================
    const walkSpeed = 7.5; // Frequência da caminhada
    const walkPhase = animTime * walkSpeed;
    const walkSin = Math.sin(walkPhase);
    const walkCos = Math.cos(walkPhase);

    // Balanço alternado dos braços (como um quadrúpede/bípede natural)
    const armSwingAngle = 0.55;
    const leftArmWalkX = armRestX + walkSin * armSwingAngle;
    const rightArmWalkX = armRestX - walkSin * armSwingAngle;

    // Balanço das pernas/quadril
    const legSwingAngle = 0.45;
    const leftLegWalkX = -walkSin * legSwingAngle;
    const rightLegWalkX = walkSin * legSwingAngle;

    // Bobbing vertical do corpo no andar
    const walkBobY = Math.abs(Math.sin(walkPhase)) * 0.08;

    // ==========================================
    // 3. ANIMAÇÃO ROAR / JUMP (Salto e Rugido Triunfal)
    // ==========================================
    // Fase do rugido: 0 a 1.4s
    const roarPhase = Math.min(1.0, roarTimer / 1.4);
    let roarJumpY = 0;
    let roarArmUpZ = 0;
    let roarHeadTiltX = 0;

    if (roarWeight > 0.01) {
      if (roarPhase < 0.25) {
        // Agachamento prévio
        roarJumpY = -0.15 * Math.sin((roarPhase / 0.25) * (Math.PI / 2));
      } else if (roarPhase < 0.7) {
        // Salto no ar com braços abertos
        const jumpProgress = (roarPhase - 0.25) / 0.45;
        roarJumpY = 0.75 * Math.sin(jumpProgress * Math.PI);
        roarArmUpZ = 1.5 * Math.sin(jumpProgress * Math.PI); // Braços erguidos ao alto!
        roarHeadTiltX = -0.45 * Math.sin(jumpProgress * Math.PI); // Cabeça para trás rugindo
      } else {
        // Pouso com amortecimento
        const landProgress = (roarPhase - 0.7) / 0.3;
        roarJumpY = -0.08 * (1.0 - landProgress);
      }
    }

    // ==========================================
    // APLICAR TRANSFORMAÇÕES NOS OSSOS
    // ==========================================

    // Braço Esquerdo
    if (leftClavicle) {
      const targetZ = THREE.MathUtils.lerp(
        leftArmRestZ,
        leftArmRestZ * 0.8,
        walkWeight
      ) + (roarArmUpZ * 1.2 * roarWeight);

      const targetX = THREE.MathUtils.lerp(
        armRestX + breathSin * 0.04,
        leftArmWalkX,
        walkWeight
      );

      leftClavicle.rotation.z = targetZ;
      leftClavicle.rotation.x = targetX;
    }

    if (leftArm) {
      leftArm.rotation.y = 0.2 + (roarWeight * 0.4);
      leftArm.rotation.x = 0.25;
    }

    // Braço Direito (com compensação de Math.PI no eixo X do rig)
    if (rightClavicle) {
      const targetZ = THREE.MathUtils.lerp(
        -1.15,
        -1.15 * 0.8,
        walkWeight
      ) + (roarArmUpZ * 1.5 * roarWeight);

      const targetX = THREE.MathUtils.lerp(
        armRestX - breathSin * 0.04,
        rightArmWalkX,
        walkWeight
      );

      rightClavicle.rotation.set(Math.PI - targetX, 0, targetZ);
    }

    if (rightArm) {
      rightArm.rotation.y = -0.2 - (roarWeight * 0.4);
      rightArm.rotation.x = 0.25;
    }

    // Cabeça e Pescoço (Rugido e Olhar)
    if (neckHead) {
      const idleHeadY = Math.sin(animTime * 1.2) * 0.12;
      const walkHeadX = walkCos * 0.08;
      
      neckHead.rotation.x = (breathSin * 0.03 * idleWeight) + (walkHeadX * walkWeight) + (roarHeadTiltX * roarWeight);
      neckHead.rotation.y = idleHeadY * idleWeight;
    }

    // Coluna / Tórax (Respiração e inclinação em curvas)
    if (spineChest) {
      spineChest.rotation.x = (breathSin * 0.05 * idleWeight) + (0.12 * walkWeight) - (roarHeadTiltX * 0.4 * roarWeight);
      spineChest.rotation.z = walkSin * 0.06 * walkWeight;
    }

    // Pernas (Passadas na caminhada)
    if (leftThigh) {
      leftThigh.rotation.x = leftLegWalkX * walkWeight;
    }
    if (rightThigh) {
      rightThigh.rotation.x = rightLegWalkX * walkWeight;
    }

    // Cauda (Abana continuamente)
    if (tailBase) {
      const tailWag = Math.sin(animTime * 4.0) * (0.2 + walkWeight * 0.35);
      tailBase.rotation.y = tailWag;
      tailBase.rotation.x = -0.25 + breathCos * 0.05;
    }
    if (tailMid) {
      tailMid.rotation.y = Math.sin(animTime * 4.0 - 0.4) * 0.3;
    }

    // Elevação corporal no rig (pulo / passada)
    animRig.position.y = (walkBobY * walkWeight) + (roarJumpY * roarWeight);
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
