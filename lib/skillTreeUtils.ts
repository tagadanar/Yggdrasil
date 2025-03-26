import { SkillGraph, SkillNode, SkillLink, UserProgress, Module } from '../types/skills';
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

const logMessages = [
  "Félicitations ! Vous avez débloqué {module}. Une nouvelle étape dans votre parcours !",
  "Bravo ! {module} est maintenant accessible. Continuez votre progression !",
  "Vous venez de débloquer {module}. De nouvelles connaissances vous attendent !",
  "Un nouveau chapitre s'ouvre avec {module}. Explorez-le !",
  "Excellent travail ! {module} est désormais disponible pour approfondir vos compétences."
];

export function generateLogMessage(moduleName: string): string {
  const template = logMessages[Math.floor(Math.random() * logMessages.length)];
  return template.replace('{module}', moduleName);
}

export function formatDate(date: Date): string {
  return date.toLocaleString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function unlockSkill(userProgress: UserProgress, moduleId: string, module: Module): UserProgress {
  const now = new Date();
  
  const unlockedSkills = {
    ...userProgress.unlockedSkills,
    [moduleId]: {
      ...module,
      unlockedAt: now,
      logMessage: generateLogMessage(module.name),
      formattedDate: formatDate(now),
      isUnlocked: true,
      canUnlock: false
    }
  };

  // If "Rejoindre l'école" is unlocked, unlock all other nodes
  if (moduleId === 'join_school') {
    Object.keys(unlockedSkills).forEach(key => {
      if (key !== 'join_school' && unlockedSkills[key]) {
        unlockedSkills[key] = {
          ...unlockedSkills[key],
          isUnlocked: true,
          canUnlock: false
        };
      }
    });
  }

  return {
    ...userProgress,
    unlockedSkills
  };
} 