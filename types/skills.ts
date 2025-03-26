// Types for the skill tree visualization

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  isUnlocked: boolean;
  canUnlock: boolean;
  level: number;
  group: string;
  skillPoints: {
    problem_solving: number;
    coding_implementation: number;
    systems_thinking: number;
    collaboration_communication: number;
    learning_adaptability: number;
  };
}

export interface SkillLink {
  source: string;
  target: string;
  value: number;
}

export interface SkillGraph {
  nodes: SkillNode[];
  links: SkillLink[];
}

export interface UserProgress {
  unlockedSkills: string[];
  skillPoints: number;
} 