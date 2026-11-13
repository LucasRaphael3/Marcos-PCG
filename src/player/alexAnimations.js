import * as THREE from 'three';

/**
 * Animações esqueléticas do Alex o Leão (Three.js AnimationMixer).
 *
 * O modelo do Sketchfab vem sem clipes e com bind pose em "T". Aqui geramos
 * 3 clipes procedurais que rotacionam os ossos reais da skin:
 *   - idle      : respiração, braços relaxados, olhar ao redor, cauda balançando
 *   - walk      : ciclo de passada (pernas, joelhos, braços opostos, quadril, cauda)
 *   - roar_jump : agacha, salta, aterrissa e solta um rugido com a boca aberta
 *
 * As rotações são descritas no espaço do modelo (Y para cima, Alex olhando +Z,
 * +X = lado esquerdo dele) e convertidas para o espaço local de cada osso a
 * partir da pose de bind, então funcionam mesmo com eixos locais diferentes.
 */

// Sufixo numérico do nome de cada osso no scene.gltf
const BONE_IDS = {
  hips: 93,
  spine0: 67, spine1: 66, spine2: 65, chest: 64,
  neck: 47, head: 46,
  face: 38, lip: 41, mouth: 42, jaw: 43, // rosto: sobrancelhas, lábio superior, boca, mandíbula
  lClav: 15, lUpper: 14, lFore: 13, lHand: 12,
  rClav: 63, rUpper: 62, rFore: 61, rHand: 60,
  lThigh: 71, lShin: 70, lFoot: 69,
  rThigh: 76, rShin: 75, rFoot: 74,
  tail: [91, 90, 89, 88, 87, 86, 85, 84, 83, 82, 81, 80, 79, 78, 77]
};

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const FPS = 30;

const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

/** Interpola parâmetros nomeados entre keyframes [{t, ...params}] com smoothstep. */
function sampleKeys(keys, t) {
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1].t) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const k = smooth(THREE.MathUtils.clamp((t - a.t) / (b.t - a.t || 1), 0, 1));
  const out = {};
  for (const name of Object.keys(a)) {
    if (name !== 't') out[name] = lerp(a[name], b[name] ?? a[name], k);
  }
  return out;
}

export function setupAlexAnimations(model, animRig) {
  model.updateMatrixWorld(true);
  const modelInv = model.getWorldQuaternion(new THREE.Quaternion()).invert();
  const modelScale = model.getWorldScale(new THREE.Vector3()).x;

  // Localiza ossos pelo sufixo e guarda dados de bind
  const allBones = [];
  model.traverse((o) => { if (o.isBone) allBones.push(o); });
  const find = (id) => allBones.find((b) => b.name.endsWith(`_${id}`));

  const rig = {};
  const register = (key, id) => {
    const bone = find(id);
    if (!bone) {
      console.warn(`[AlexAnimations] Osso _${id} (${key}) não encontrado`);
      return;
    }
    const parentQ = bone.parent.getWorldQuaternion(new THREE.Quaternion()).premultiply(modelInv);
    rig[key] = {
      bone,
      bindQ: bone.quaternion.clone(),
      bindP: bone.position.clone(),
      parentQ,
      parentQInv: parentQ.clone().invert(),
      // Escala do pai relativa ao modelo (o rig do Sketchfab tem nós escalados)
      parentScale: bone.parent.getWorldScale(new THREE.Vector3()).x / modelScale
    };
  };
  for (const [key, id] of Object.entries(BONE_IDS)) {
    if (Array.isArray(id)) id.forEach((tid, i) => register(`tail${i}`, tid));
    else register(key, id);
  }
  const tailCount = BONE_IDS.tail.length;

  const tmpQ = new THREE.Quaternion();
  const tmpR = new THREE.Quaternion();

  /** Converte uma lista de rotações [eixo, ângulo] no espaço do modelo para o quaternion local do osso. */
  function localQuat(entry, rotations) {
    const r = new THREE.Quaternion();
    for (const [axis, angle] of rotations) {
      if (angle) r.premultiply(tmpR.setFromAxisAngle(axis, angle));
    }
    // q_local = parent^-1 * R * parent * bind
    return tmpQ.copy(entry.parentQInv).multiply(r).multiply(entry.parentQ).multiply(entry.bindQ).clone();
  }

  /**
   * Constrói um AnimationClip amostrando uma função de pose.
   * poseFn(t) -> { rot: { boneKey: [[eixo, ângulo], ...] }, hips: dy, hipsZ: dz }
   */
  function buildClip(name, duration, poseFn) {
    const frames = Math.round(duration * FPS);
    const times = [];
    const quatData = {};
    const hipsPos = [];

    for (let f = 0; f <= frames; f++) {
      const t = (f / frames) * duration;
      times.push(t);
      const pose = poseFn(t);
      for (const key of Object.keys(rig)) {
        const q = localQuat(rig[key], pose.rot[key] || []);
        (quatData[key] ||= []).push(q.x, q.y, q.z, q.w);
      }
      const hp = rig.hips.bindP;
      // Offset em unidades do modelo -> espaço local do pai (rotação + escala)
      const offset = new THREE.Vector3(0, pose.hips || 0, pose.hipsZ || 0)
        .applyQuaternion(rig.hips.parentQInv)
        .divideScalar(rig.hips.parentScale);
      hipsPos.push(hp.x + offset.x, hp.y + offset.y, hp.z + offset.z);
    }

    const tracks = Object.keys(rig).map(
      (key) => new THREE.QuaternionKeyframeTrack(`${rig[key].bone.uuid}.quaternion`, times, quatData[key])
    );
    tracks.push(new THREE.VectorKeyframeTrack(`${rig.hips.bone.uuid}.position`, times, hipsPos));
    return new THREE.AnimationClip(name, duration, tracks);
  }

  // --- Pose base: braços abaixados (sai da T-pose) ---
  const ARM_DOWN = THREE.MathUtils.degToRad(68);
  function arms(rot, { lower = ARM_DOWN, swingL = 0, swingR = 0, forwardL = 0, forwardR = 0, elbow = 0.25 } = {}) {
    // Esquerdo aponta +X: abaixar = girar em Z negativo. Direito aponta -X: Z positivo.
    rot.lUpper = [[Z, -lower], [Y, -forwardL], [X, swingL]];
    rot.rUpper = [[Z, lower], [Y, forwardR], [X, swingR]];
    // Cotovelo dobra para frente (em torno do eixo Y do modelo)
    rot.lFore = [[Y, -elbow]];
    rot.rFore = [[Y, elbow]];
  }

  function tail(rot, { wag = 0, phase = 0, freqLag = 0.45, lift = 0 }) {
    for (let i = 0; i < tailCount; i++) {
      const falloff = 0.4 + (i / tailCount) * 0.8;
      rot[`tail${i}`] = [
        [Y, wag * falloff * Math.sin(phase - i * freqLag)],
        [X, lift / tailCount]
      ];
    }
  }

  // 1) IDLE (3.0s, loop)
  const IDLE_T = 3.0;
  const idleClip = buildClip('idle', IDLE_T, (t) => {
    const p = (t / IDLE_T) * Math.PI * 2;
    const breath = Math.sin(p * 2);
    const rot = {};
    rot.spine1 = [[X, 0.015 * breath]];
    rot.chest = [[X, -0.025 * breath]];
    rot.head = [[Y, 0.28 * Math.sin(p)], [X, 0.04 * Math.sin(p * 2 + 1)]];
    rot.neck = [[Z, 0.03 * Math.sin(p)]];
    rot.spine0 = [[Z, 0.02 * Math.sin(p)]];
    arms(rot, { lower: ARM_DOWN + 0.04 * breath, swingL: 0.05 * Math.sin(p), swingR: -0.05 * Math.sin(p) });
    tail(rot, { wag: 0.12, phase: p * 2, lift: 0.25 });
    return { rot, hips: -0.008 * (1 + breath) };
  });

  // 2) WALK (0.8s, loop)
  const WALK_T = 0.8;
  const walkClip = buildClip('walk', WALK_T, (t) => {
    const p = (t / WALK_T) * Math.PI * 2;
    const s = Math.sin(p);
    const rot = {};
    // Pernas: ângulo negativo em X = perna para frente
    rot.lThigh = [[X, -0.55 * s]];
    rot.rThigh = [[X, 0.55 * s]];
    // Joelho dobra quando a perna volta para frente (fase de balanço)
    rot.lShin = [[X, 0.7 * Math.max(0, Math.cos(p))]];
    rot.rShin = [[X, 0.7 * Math.max(0, -Math.cos(p))]];
    rot.lFoot = [[X, 0.25 * s]];
    rot.rFoot = [[X, -0.25 * s]];
    // Braços opostos às pernas
    arms(rot, { swingL: 0.45 * s, swingR: -0.45 * s, elbow: 0.4 });
    // Tronco: leve inclinação para frente e torção contrária ao quadril
    rot.hips = [[Y, 0.1 * s], [Z, 0.04 * Math.cos(p)]];
    rot.spine1 = [[X, 0.06], [Y, -0.08 * s]];
    rot.chest = [[Y, -0.06 * s]];
    rot.head = [[Y, 0.1 * s], [X, -0.04]];
    tail(rot, { wag: 0.2, phase: p, lift: 0.35 });
    // Quadril sobe no meio de cada passo (2x por ciclo)
    return { rot, hips: -0.045 * (1 - Math.abs(Math.cos(p))) };
  });

  // 3) ROAR + JUMP (2.4s, uma vez)
  const ROAR_T = 2.4;
  const roarKeys = [
    { t: 0.00, crouch: 0, lift: 0, lean: 0, look: 0, armUp: 0, jaw: 0, tailUp: 0.3 },
    { t: 0.30, crouch: 1, lift: 0, lean: 0.35, look: 0.1, armUp: -0.25, jaw: 0, tailUp: 0.2 },  // agacha
    { t: 0.55, crouch: 0, lift: 1.0, lean: -0.1, look: -0.2, armUp: 0.9, jaw: 0.2, tailUp: 1.0 }, // decola
    { t: 0.80, crouch: 0.2, lift: 1.25, lean: -0.15, look: -0.2, armUp: 1.0, jaw: 0.2, tailUp: 1.2 }, // ápice
    { t: 1.05, crouch: 0.9, lift: 0, lean: 0.3, look: 0.1, armUp: 0.1, jaw: 0, tailUp: 0.4 },   // aterrissa
    { t: 1.35, crouch: 0.15, lift: 0, lean: -0.35, look: -0.45, armUp: 0.75, jaw: 1, tailUp: 1.4 }, // RUGIDO
    { t: 1.85, crouch: 0.1, lift: 0, lean: -0.4, look: -0.5, armUp: 0.8, jaw: 1, tailUp: 1.4 },
    { t: 2.40, crouch: 0, lift: 0, lean: 0, look: 0, armUp: 0, jaw: 0, tailUp: 0.3 }
  ];
  const roarClip = buildClip('roar_jump', ROAR_T, (t) => {
    const k = sampleKeys(roarKeys, t);
    const shake = t > 1.3 && t < 1.9 ? Math.sin(t * 60) * 0.03 : 0; // tremor do rugido
    const rot = {};
    // Agachamento: coxa para frente, joelho para trás, pé compensa
    rot.lThigh = [[X, -0.7 * k.crouch]];
    rot.rThigh = [[X, -0.7 * k.crouch]];
    rot.lShin = [[X, 1.3 * k.crouch]];
    rot.rShin = [[X, 1.3 * k.crouch]];
    rot.lFoot = [[X, -0.6 * k.crouch]];
    rot.rFoot = [[X, -0.6 * k.crouch]];
    rot.spine1 = [[X, k.lean * 0.5]];
    rot.chest = [[X, k.lean * 0.5 + shake]];
    rot.neck = [[X, k.look * 0.4]];
    rot.head = [[X, k.look * 0.6], [Y, shake * 2]];
    // Rosto do rugido: mandíbula abre, lábio sobe (rosnado), sobrancelhas franzem
    rot.jaw = [[X, 0.75 * k.jaw]];
    rot.mouth = [[X, 0.6 * k.jaw]];
    rot.lip = [[X, 0.35 * k.jaw]];
    rot.face = [[X, 0.3 * k.jaw]];
    // Braços: armUp 1 = erguidos acima da linha do ombro, abertos em garra
    arms(rot, {
      lower: lerp(ARM_DOWN, -0.55, Math.min(1, k.armUp / 0.8)),
      forwardL: 0.6 * k.armUp,
      forwardR: 0.6 * k.armUp,
      elbow: 0.25 + 0.9 * k.armUp
    });
    tail(rot, { wag: 0.08, phase: t * 20, freqLag: 0.3, lift: k.tailUp });
    // Unidades do modelo (~2.2 de altura): 0.55 = salto de ~1/4 do corpo
    return { rot, hips: 0.55 * k.lift - 0.09 * k.crouch, hipsZ: 0.12 * k.lift };
  });

  // --- Mixer e ações ---
  const mixer = new THREE.AnimationMixer(animRig);
  const actions = {
    idle: mixer.clipAction(idleClip),
    walk: mixer.clipAction(walkClip),
    roar_jump: mixer.clipAction(roarClip)
  };
  actions.idle.setLoop(THREE.LoopRepeat);
  actions.walk.setLoop(THREE.LoopRepeat);
  actions.roar_jump.setLoop(THREE.LoopOnce, 1);
  actions.roar_jump.clampWhenFinished = true;

  let currentAction = 'idle';
  actions.idle.play();

  mixer.addEventListener('finished', (e) => {
    if (e.action !== actions.roar_jump) return;
    currentAction = 'idle';
    actions.idle.reset().play();
    actions.idle.crossFadeFrom(actions.roar_jump, 0.3, false);
  });

  function playAction(name) {
    const next = actions[name];
    if (!next) return;
    if (currentAction === name && name !== 'roar_jump') return;
    if (currentAction === 'roar_jump' && name === 'roar_jump' && actions.roar_jump.isRunning()) return;

    const prev = actions[currentAction];
    next.reset();
    next.setEffectiveWeight(1);
    next.play();
    if (prev !== next) next.crossFadeFrom(prev, name === 'roar_jump' ? 0.15 : 0.25, false);
    currentAction = name;
  }

  /** Ajusta a cadência da passada conforme a velocidade (correr = passos mais rápidos). */
  function setWalkSpeed(multiplier) {
    actions.walk.timeScale = multiplier;
  }

  function update(delta) {
    mixer.update(delta);
  }

  return {
    mixer,
    actions,
    playAction,
    setWalkSpeed,
    update,
    getCurrentActionName: () => currentAction
  };
}
