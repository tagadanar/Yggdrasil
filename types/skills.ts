// Types for the skill tree visualization

export interface SkillPoints {
  problem_solving: number;
  coding_implementation: number;
  systems_thinking: number;
  collaboration_communication: number;
  learning_adaptability: number;
}

export interface Module {
  id: string;
  name: string;
  description: string;
  level: number;
  actions_cles: string[];
  concepts_acquis: string[];
  skillPoints: SkillPoints;
  isUnlocked: boolean;
  canUnlock: boolean;
  unlockedAt?: Date;
  logMessage?: string;
  formattedDate?: string;
  actions?: string[];
  concepts?: string[];
  prerequisites?: string[];
}

export type SkillNode = Module & {
  x?: number;
  y?: number;
  index?: number;
  vx?: number;
  vy?: number;
  fx?: number | undefined;
  fy?: number | undefined;
  group?: string;
};

export interface SkillLink {
  source: string | SkillNode;
  target: string | SkillNode;
  value: number;
  index?: number;
}

export interface SkillGraph {
  nodes: SkillNode[];
  links: SkillLink[];
}

export interface UserProgress {
  playerName: string;
  unlockedSkills: Record<string, Module>;
} 