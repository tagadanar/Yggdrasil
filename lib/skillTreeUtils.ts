import { SkillGraph, SkillNode, SkillLink, UserProgress } from '../types/skills';
import skillsData from '../skills.json';

/**
 * Transforms the hierarchical skills JSON into a flattened graph structure
 * suitable for visualization with force-directed graphs
 */
export function transformSkillsToGraph(progress: UserProgress): SkillGraph {
  const nodes: SkillNode[] = [];
  const links: SkillLink[] = [];
  
  // First level: core skill domains
  skillsData.domaines_principaux.forEach((domain, domainIndex) => {
    // Add domain as a node
    const domainNode: SkillNode = {
      id: domain.id,
      name: domain.titre.split('.')[1].trim(), // Remove the numbering
      description: domain.titre,
      isUnlocked: domainIndex === 0 || progress.unlockedSkills.includes(domain.id),
      canUnlock: canUnlockSkill(domain.id, progress),
      level: 1,
      group: domain.id,
      skillPoints: {
        problem_solving: 0,
        coding_implementation: 0,
        systems_thinking: 0,
        collaboration_communication: 0,
        learning_adaptability: 0
      }
    };
    
    nodes.push(domainNode);
    
    // Link to center node
    if (domainIndex > 0) {
      links.push({
        source: 'root',
        target: domain.id,
        value: 2
      });
    }
    
    // Add modules as nodes and link them to domain
    domain.modules.forEach((module, moduleIndex) => {
      const moduleId = `${domain.id}_module_${moduleIndex}`;
      const moduleNode: SkillNode = {
        id: moduleId,
        name: module.titre.split('.')[2]?.trim() || module.titre,
        description: module.titre,
        isUnlocked: progress.unlockedSkills.includes(moduleId),
        canUnlock: canUnlockSkill(moduleId, progress),
        level: 2,
        group: domain.id,
        skillPoints: module.skill_points || {
          problem_solving: 0,
          coding_implementation: 0,
          systems_thinking: 0,
          collaboration_communication: 0,
          learning_adaptability: 0
        }
      };
      
      nodes.push(moduleNode);
      
      // Link module to domain
      links.push({
        source: domain.id,
        target: moduleId,
        value: 1
      });
    });
  });
  
  // Add root node
  nodes.unshift({
    id: 'root',
    name: 'Compétences',
    description: skillsData.titre_parcours,
    isUnlocked: true,
    canUnlock: false,
    level: 0,
    group: 'root',
    skillPoints: {
      problem_solving: 0,
      coding_implementation: 0,
      systems_thinking: 0,
      collaboration_communication: 0,
      learning_adaptability: 0
    }
  });
  
  return { nodes, links };
}

/**
 * Determines if a skill can be unlocked based on prerequisites
 */
function canUnlockSkill(skillId: string, progress: UserProgress): boolean {
  // Simple implementation - can unlock if:
  // 1. It's not already unlocked
  // 2. It's a direct child of an unlocked skill
  if (progress.unlockedSkills.includes(skillId)) {
    return false;
  }
  
  // Simple unlocking logic - can be expanded for more complex prerequisites
  if (skillId.includes('_module_')) {
    const parentId = skillId.split('_module_')[0];
    return progress.unlockedSkills.includes(parentId);
  }
  
  // For domains, unlock if it's the first one or if at least one skill 
  // from the previous domain is unlocked
  const domainIndex = skillsData.domaines_principaux.findIndex(d => d.id === skillId);
  if (domainIndex === 0) return true;
  if (domainIndex > 0) {
    const previousDomain = skillsData.domaines_principaux[domainIndex - 1];
    const previousModules = previousDomain.modules.map((_, i) => 
      `${previousDomain.id}_module_${i}`
    );
    
    return previousModules.some(id => progress.unlockedSkills.includes(id));
  }
  
  return false;
}

/**
 * Initialize default user progress
 */
export function initializeUserProgress(): UserProgress {
  return {
    unlockedSkills: ['1_Creer_Premiers_Programmes'], // Start with first domain unlocked
    skillPoints: 0
  };
}

/**
 * Unlock a skill and update user progress
 */
export function unlockSkill(skillId: string, progress: UserProgress): UserProgress {
  if (!progress.unlockedSkills.includes(skillId) && canUnlockSkill(skillId, progress)) {
    return {
      ...progress,
      unlockedSkills: [...progress.unlockedSkills, skillId]
    };
  }
  return progress;
} 