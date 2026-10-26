import * as THREE from 'three';

/**
 * Registro de Membros da Equipe / Objetos 3D
 * Permite cadastrar facilmente novos modelos 3D importados do Sketchfab
 * de forma proporcional e modular na cena.
 */

// Lista de membros cadastrados
const membersRegistry = [
  {
    id: 'alex_leao',
    name: 'Alex o Leão',
    source: 'Sketchfab (super-star-kartz-alex)',
    modelPath: './models/alex/scene.gltf',
    isPlayer: true,
    scale: 1.35,
    initialPosition: [0, 0, 0],
    animations: ['idle', 'walk', 'roar_jump']
  }
];

/**
 * Função extensível para cadastrar um novo modelo 3D de membro da equipe.
 * 
 * Exemplo de uso:
 * register3DMember({
 *   id: 'outro_personagem',
 *   name: 'Marty a Zebra',
 *   source: 'Sketchfab (url-do-modelo)',
 *   modelPath: './models/marty/scene.gltf',
 *   scale: 1.2,
 *   initialPosition: [2, 0, -3],
 *   animations: ['idle', 'walk', 'jump']
 * });
 */
export function register3DMember(memberConfig) {
  if (!memberConfig || !memberConfig.id || !memberConfig.modelPath) {
    console.error('Configuração de membro inválida. É obrigatório fornecer id e modelPath.');
    return false;
  }

  // Evita duplicatas pelo ID
  const existingIndex = membersRegistry.findIndex((m) => m.id === memberConfig.id);
  if (existingIndex >= 0) {
    membersRegistry[existingIndex] = { ...membersRegistry[existingIndex], ...memberConfig };
  } else {
    membersRegistry.push({
      isPlayer: false,
      scale: 1.0,
      initialPosition: [0, 0, 0],
      animations: ['idle', 'walk', 'action'],
      ...memberConfig
    });
  }

  console.log(`[MembersRegistry] Membro 3D registrado com sucesso: ${memberConfig.name || memberConfig.id}`);
  return true;
}

/**
 * Retorna todos os membros registrados.
 */
export function getRegisteredMembers() {
  return [...membersRegistry];
}

/**
 * Carrega modelos 3D secundários registrados no mapa (caso existam).
 */
export async function loadSecondaryMembers(scene, gltfLoader) {
  const secondaryMembers = membersRegistry.filter((m) => !m.isPlayer);
  const loadedObjects = [];

  for (const member of secondaryMembers) {
    try {
      const gltf = await new Promise((resolve, reject) => {
        gltfLoader.load(member.modelPath, resolve, undefined, reject);
      });

      const model = gltf.scene;
      model.name = `Member_${member.id}`;
      model.scale.setScalar(member.scale || 1.0);
      model.position.set(...(member.initialPosition || [0, 0, 0]));

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      scene.add(model);
      loadedObjects.push({ config: member, object: model });
      console.log(`[MembersRegistry] Modelo carregado no mapa: ${member.name}`);
    } catch (err) {
      console.warn(`[MembersRegistry] Não foi possível carregar o modelo de ${member.id}:`, err);
    }
  }

  return loadedObjects;
}
