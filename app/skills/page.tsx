'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const SkillGraph = dynamic(() => import('../../components/SkillTree/SkillGraph'), {
  ssr: false,
});
import PlayerPanel from '../../components/SkillTree/PlayerPanel';
import skillsData from '../../data/skills';
import { SkillGraph as SkillGraphType, UserProgress, Module, SkillNode, SkillLink } from '../../types/skills';
import { unlockSkill } from '../../lib/skillTreeUtils';

export default function SkillsPage() {
  const [userProgress, setUserProgress] = useState<UserProgress>({
    playerName: '',
    unlockedSkills: {}
  });
  
  const [graphData, setGraphData] = useState<SkillGraphType>({
    nodes: [],
    links: []
  });
  
  // Initialize graph data from skills.json
  useEffect(() => {
    const nodes: SkillNode[] = [];
    const links: SkillLink[] = [];
    
    // Add fundamental skills as central nodes
    skillsData.fundamental_skills.forEach(skill => {
      nodes.push({
        id: skill.id,
        name: skill.nom,
        description: skill.description,
        level: 0,
        actions_cles: [],
        concepts_acquis: [],
        skillPoints: {
          problem_solving: 0,
          coding_implementation: 0,
          systems_thinking: 0,
          collaboration_communication: 0,
          learning_adaptability: 0
        },
        isUnlocked: true,
        canUnlock: true,
        unlockedAt: new Date()
      });
    });
    
    // Add domain nodes and their modules
    skillsData.domaines_principaux.forEach((domain, domainIndex) => {
      // Add domain node
      const domainNode: SkillNode = {
        id: domain.id,
        name: domain.titre,
        description: '',
        level: 1,
        actions_cles: [],
        concepts_acquis: [],
        skillPoints: {
          problem_solving: 0,
          coding_implementation: 0,
          systems_thinking: 0,
          collaboration_communication: 0,
          learning_adaptability: 0
        },
        isUnlocked: true,
        canUnlock: true,
        unlockedAt: new Date()
      };
      nodes.push(domainNode);
      
      // Link domain to fundamental skills
      skillsData.fundamental_skills.forEach(skill => {
        const skillNode = nodes.find(n => n.id === skill.id);
        if (skillNode) {
          links.push({
            source: domainNode,
            target: skillNode,
            value: 1
          });
        }
      });
      
      // Add module nodes and link them to domain
      domain.modules.forEach((module, moduleIndex) => {
        const moduleId = `${domain.id}_${moduleIndex}`;
        const moduleNode: SkillNode = {
          id: moduleId,
          name: module.titre,
          description: '',
          level: 2,
          actions_cles: module.actions_cles,
          concepts_acquis: module.concepts_acquis,
          skillPoints: module.skill_points,
          isUnlocked: false,
          canUnlock: true,
          unlockedAt: undefined
        };
        nodes.push(moduleNode);
        
        // Link module to domain
        links.push({
          source: moduleNode,
          target: domainNode,
          value: 2
        });
      });
    });
    
    setGraphData({ nodes, links });
    
    // Initialize user progress with fundamental skills
    const initialProgress: UserProgress = {
      playerName: '',
      unlockedSkills: {}
    };
    
    // Add fundamental skills as unlocked
    skillsData.fundamental_skills.forEach(skill => {
      initialProgress.unlockedSkills[skill.id] = {
        id: skill.id,
        name: skill.nom,
        description: skill.description,
        level: 0,
        actions_cles: [],
        concepts_acquis: [],
        skillPoints: {
          problem_solving: 0,
          coding_implementation: 0,
          systems_thinking: 0,
          collaboration_communication: 0,
          learning_adaptability: 0
        },
        isUnlocked: true,
        canUnlock: true,
        unlockedAt: new Date()
      };
    });
    
    setUserProgress(initialProgress);
  }, []);
  
  const handleProgressUpdate = (progress: UserProgress) => {
    setUserProgress(progress);
  };
  
  const handleNameChange = (name: string) => {
    setUserProgress(prev => ({
      ...prev,
      playerName: name
    }));
  };
  
  return (
    <div className="flex h-screen">
      <div className="flex-1">
        <SkillGraph
          data={graphData}
          userProgress={userProgress}
          onProgressUpdate={handleProgressUpdate}
        />
      </div>
      <PlayerPanel
        userProgress={userProgress}
        onNameChange={handleNameChange}
      />
    </div>
  );
} 