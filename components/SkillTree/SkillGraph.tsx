'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import ForceGraph2D, { ForceGraphMethods, NodeObject, LinkObject } from 'react-force-graph-2d';
import type { SkillGraph as SkillGraphType, SkillNode, UserProgress, SkillLink, Module } from '../../types/skills';
import { unlockSkill, generateLogMessage, formatDate } from '../../lib/skillTreeUtils';
import skillsData from '../../skills.json';
import { forceSimulation, forceLink, forceManyBody, forceCollide, forceRadial, forceCenter } from 'd3-force';
import type { Simulation } from 'd3-force';

// Potential Issue Hypotheses:
// 1. Incorrect initial positioning strategy
// 2. Force simulation parameters causing overcrowding
// 3. Incompatible node type definitions
// 4. Unexpected interaction between D3 force and react-force-graph
// 5. Unintended fixed positions preventing node separation

// Extend SkillNode type to include group
interface ExtendedSkillNode extends SkillNode {
  group?: string;
  fx?: number | undefined;
  fy?: number | undefined;
}

interface SkillGraphProps {
  data: SkillGraphType;
  userProgress: UserProgress;
  onProgressUpdate: (progress: UserProgress) => void;
}

type ForceGraphInstance = ForceGraphMethods<SkillNode, LinkObject>;

export default function SkillGraph({ data, userProgress, onProgressUpdate }: SkillGraphProps) {
  const fgRef = useRef<ForceGraphInstance>(undefined);
  const simulationRef = useRef<Simulation<SkillNode, SkillLink> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<SkillNode | null>(null);
  const [selectedModule, setSelectedModule] = useState<SkillNode | null>(null);
  
  // Force simulation parameters state
  const [forceParams, setForceParams] = useState({
    linkDistance: 50,
    chargeStrength: -30,
    collisionRadius: 20,
    radialStrength: 0.5,  // Increased from 0.1
    centerForce: 0.1,     // New parameter for center attraction
    alphaDecay: 0.01,     // New parameter for simulation cooling
    velocityDecay: 0.3    // New parameter for damping
  });

  // State to control visibility of control panel
  const [showControlPanel, setShowControlPanel] = useState(false);

  // Diagnostic logging function
  const logNodePositions = useCallback((nodes: SkillNode[], context: string) => {
    console.group(`Node Positions - ${context}`);
    nodes.forEach((node, index) => {
      console.log(`Node ${index} (${node.name}):`, {
        id: node.id,
        level: node.level,
        x: node.x,
        y: node.y,
        fx: node.fx,
        fy: node.fy,
        isUnlocked: node.isUnlocked,
        canUnlock: node.canUnlock
      });
    });
    console.groupEnd();
  }, []);
  
  // Update dimensions on window resize
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        setDimensions({
          width: window.innerWidth * 0.95,  // Use more screen space
          height: window.innerHeight * 0.95
        });
      };
      
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Handle node click
  const handleNodeClick = useCallback((node: SkillNode) => {
    if (!node.isUnlocked && node.canUnlock) {
      // Update progress
      onProgressUpdate(unlockSkill(userProgress, node.id, node));
      
      // Center on node
      if (fgRef.current && node.x !== undefined && node.y !== undefined) {
        fgRef.current.centerAt(node.x, node.y, 1000);
        fgRef.current.zoom(2, 1000);
      }
    }
    setSelectedModule(node);
  }, [userProgress, onProgressUpdate]);

  // Initialize force simulation
  useEffect(() => {
    const visibleNodes = data.nodes.filter(node => node.isUnlocked || node.id === 'join_school');
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    // Define radii for each level with more spread
    const levelRadii = {
      0: dimensions.height * 0.1,  // Center node
      1: dimensions.height * 0.3,  // Domain nodes
      2: dimensions.height * 0.5   // Module nodes
    };

    // Initialize simulation with dynamic parameters
    const simulation = forceSimulation<SkillNode>(visibleNodes)
      .force("link", forceLink<SkillNode, SkillLink>(data.links)
        .id(d => d.id)
        .distance(forceParams.linkDistance)
        .strength(0.5))
      .force("charge", forceManyBody<SkillNode>()
        .strength(forceParams.chargeStrength)
        .distanceMax(dimensions.width / 2))  // Limit charge force range
      .force("collide", forceCollide<SkillNode>(forceParams.collisionRadius)
        .strength(0.8)
        .iterations(4))
      .force("center", forceCenter(centerX, centerY)
        .strength(forceParams.centerForce))  // Soft center attraction
      .force("radial", forceRadial<SkillNode>(
        d => levelRadii[d.level as keyof typeof levelRadii] || levelRadii[2],
        centerX,
        centerY
      ).strength(forceParams.radialStrength))
      .alphaDecay(forceParams.alphaDecay)
      .velocityDecay(forceParams.velocityDecay);

    // Store simulation reference
    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [data.nodes, data.links, dimensions, forceParams]);
  
  // Helper function to detect overlapping nodes
  function findOverlappingNodes(nodes: SkillNode[], minSpacing: number) {
    const overlaps: Array<{node1: string, node2: string, distance: number}> = [];
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];
        if (node1.x && node1.y && node2.x && node2.y) {
          const dx = node1.x - node2.x;
          const dy = node1.y - node2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < minSpacing) {
            overlaps.push({
              node1: node1.name,
              node2: node2.name,
              distance
            });
          }
        }
      }
    }
    return overlaps;
  }
  
  // Custom node painting function
  const paintNode = useCallback((node: SkillNode, ctx: CanvasRenderingContext2D) => {
    const baseSize = node.level === 0 ? 40 : 30;  // Larger base size
    const isHovered = hoveredNode === node;
    
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, baseSize, 0, 2 * Math.PI);
    
    // Fill style based on node state
    if (node.isUnlocked) {
      ctx.fillStyle = '#10B981'; // Emerald-500
    } else if (node.canUnlock) {
      ctx.fillStyle = '#F59E0B'; // Amber-500
    } else {
      ctx.fillStyle = '#6B7280'; // Gray-500
    }
    
    ctx.fill();
    
    // Add hover effect
    if (isHovered) {
      ctx.strokeStyle = '#F8FAFC'; // Slate-50
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    // Add text with word wrapping
    ctx.font = '10px Arial';
    ctx.fillStyle = '#F8FAFC'; // Slate-50
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Word wrap function
    const wrapText = (text: string, maxWidth: number) => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = words[0];

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + ' ' + word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width < maxWidth) {
          currentLine = testLine;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);
      return lines;
    };

    // Wrap and render text
    const wrappedText = wrapText(node.name, baseSize * 1.5);
    wrappedText.forEach((line, index) => {
      ctx.fillText(
        line, 
        node.x!, 
        node.y! + baseSize + 10 + (index * 12) - ((wrappedText.length - 1) * 6)
      );
    });
  }, [hoveredNode]);
  
  // Custom link painting function
  const paintLink = useCallback((link: SkillLink, ctx: CanvasRenderingContext2D) => {
    const source = typeof link.source === 'string' ? data.nodes.find(n => n.id === link.source)! : link.source;
    const target = typeof link.target === 'string' ? data.nodes.find(n => n.id === link.target)! : link.target;
    
    ctx.beginPath();
    ctx.strokeStyle = '#475569'; // Slate-600
    ctx.lineWidth = 2;
    
    const dx = target.x! - source.x!;
    const dy = target.y! - source.y!;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate control point offset
    const offset = distance * 0.2;
    const midX = (source.x! + target.x!) / 2;
    const midY = (source.y! + target.y!) / 2;
    
    // Calculate perpendicular vector for control point
    const orthX = -dy / distance * offset;
    const orthY = dx / distance * offset;
    
    ctx.moveTo(source.x!, source.y!);
    ctx.quadraticCurveTo(
      midX + orthX, 
      midY + orthY, 
      target.x!, 
      target.y!
    );
    
    ctx.stroke();
  }, [data.nodes]);
  
  // Add the new node to the initial data structure
  const initialNodes = [
    {
      id: 'join_school',
      name: 'Rejoindre l\'école',
      description: 'Débloquez cette compétence pour accéder au reste du parcours.',
      isUnlocked: false,
      canUnlock: true,
      level: 0,
      group: 'root',
      skillPoints: {
        problem_solving: 0,
        coding_implementation: 0,
        systems_thinking: 0,
        collaboration_communication: 0,
        learning_adaptability: 0
      }
    },
    ...skillsData.domaines_principaux.flatMap(domain => {
      return domain.modules.map((module, index) => ({
        id: `${domain.id}_module_${index}`,
        name: module.titre,
        description: module.titre,
        isUnlocked: false,
        canUnlock: false,
        level: 1,
        group: domain.id,
        skillPoints: module.skill_points || {
          problem_solving: 0,
          coding_implementation: 0,
          systems_thinking: 0,
          collaboration_communication: 0,
          learning_adaptability: 0
        }
      }));
    })
  ];

  // Update the graph data to include the new node
  const graphData = {
    nodes: initialNodes,
    links: [] // Define links as needed
  };

  // In the unlockSkill function, ensure that unlocking "Rejoindre l'école" allows other nodes to be visible
  function unlockSkill(userProgress: UserProgress, moduleId: string, module: Module): UserProgress {
    const now = new Date();
    
    const unlockedSkills = {
      ...userProgress.unlockedSkills,
      [moduleId]: {
        ...module,
        unlockedAt: now,
        logMessage: generateLogMessage(module.name),
        formattedDate: formatDate(now)
      }
    };

    // If "Rejoindre l'école" is unlocked, unlock only top level domaines
    if (moduleId === 'join_school') {
      console.log("Just joined the school, unlocking top level domaines!");
      const topLevelDomainIds = skillsData.domaines_principaux.map(domain => domain.id);
      Object.keys(unlockedSkills).forEach(key => {
        if (topLevelDomainIds.includes(key)) {
          unlockedSkills[key].isUnlocked = true;
          unlockedSkills[key].canUnlock = false; // Prevent further unlocking
        }
      });
    }
    return {
      ...userProgress,
      unlockedSkills
    };
  }

  // In the rendering logic, conditionally render nodes based on unlock status
  const visibleNodes = data.nodes.filter(node => {
    // If no skills are unlocked, only show 'join_school'
    if (Object.keys(userProgress.unlockedSkills).length === 0) {
      return node.id === 'join_school';
    }
    
    // Otherwise, show unlocked nodes or 'join_school'
    return node.isUnlocked || node.id === 'join_school';
  });

  // Force Simulation Control Panel
  const renderControlPanel = () => (
    <div 
      className="force-control-panel"
      style={{
        position: 'absolute',
        top: '20px',
        left: showControlPanel ? '20px' : '-230px',
        background: 'rgba(15, 23, 42, 0.9)',
        padding: '16px',
        borderRadius: '8px',
        width: '250px',
        color: '#F8FAFC',
        border: '1px solid #1E293B',
        zIndex: 10,
        transition: 'left 0.3s ease',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}
    >
      {/* Player Stats Section */}
      <div className="mb-4 p-2 bg-slate-800 rounded">
        <h4 className="text-sm font-semibold mb-2">Statistiques Joueur</h4>
        <div className="flex justify-between items-center">
          <span className="text-xs">Compétences déverrouillées:</span>
          <span className="text-sm font-bold text-teal-400">{visibleNodes.length}</span>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Force Simulation</h3>
        <button 
          onClick={() => setShowControlPanel(!showControlPanel)}
          className="absolute -right-12 top-0 bg-slate-800 p-2 rounded-r-md hover:bg-slate-700 transition-colors"
          style={{
            transform: 'translateX(0)',
            boxShadow: '2px 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          {showControlPanel ? '←' : '→'}
        </button>
      </div>

      {/* Force Parameters Sliders */}
      {Object.entries(forceParams).map(([key, value]) => (
        <div key={key} className="mb-3">
          <label className="block text-sm mb-1">
            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: 
            {typeof value === 'number' ? value.toFixed(2) : value}
          </label>
          <input 
            type="range" 
            min={key === 'chargeStrength' ? -300 : 0}
            max={key === 'chargeStrength' ? 0 : 1}
            step={key === 'chargeStrength' ? 10 : 0.1}
            value={value}
            onChange={(e) => setForceParams(prev => ({
              ...prev, 
              [key]: Number(e.target.value)
            }))}
            className="w-full"
          />
        </div>
      ))}

      {/* Reset and Initial State Buttons */}
      <div className="flex space-x-2 mt-4">
        <button 
          onClick={() => setForceParams({
            linkDistance: 50,
            chargeStrength: -30,
            collisionRadius: 20,
            radialStrength: 0.5,
            centerForce: 0.1,
            alphaDecay: 0.01,
            velocityDecay: 0.3
          })}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-sm py-2 rounded"
        >
          Reset Parameters
        </button>
        <button 
          onClick={() => {
            // Reset to initial state with only 'join_school' visible
            const resetProgress: UserProgress = {
              playerName: userProgress.playerName,
              unlockedSkills: {}
            };
            
            // Force a re-render by updating the entire progress
            onProgressUpdate(resetProgress);
            
            // Optional: Log the reset for debugging
            console.log("Progress reset to initial state");
          }}
          className="flex-1 bg-red-800 hover:bg-red-700 text-sm py-2 rounded"
        >
          Reset Progress
        </button>
      </div>
    </div>
  );

  return (
    <div className="skill-graph" style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <ForceGraph2D
        ref={fgRef as any}
        graphData={{
          nodes: visibleNodes.map(node => ({
            ...node,
            x: node.x ?? Math.random() * dimensions.width,
            y: node.y ?? Math.random() * dimensions.height,
            fx: node.fx ?? undefined,
            fy: node.fy ?? undefined
          })),
          links: data.links
            .filter(link => {
              const source = typeof link.source === 'string' ? link.source : link.source.id;
              const target = typeof link.target === 'string' ? link.target : link.target.id;
              return visibleNodes.some(n => n.id === source) && visibleNodes.some(n => n.id === target);
            })
            .map(link => ({
              source: typeof link.source === 'string' ? link.source : link.source.id,
              target: typeof link.target === 'string' ? link.target : link.target.id,
              value: link.value
            }))
        }}
        width={dimensions.width}
        height={dimensions.height}
        nodeLabel="description"
        nodeCanvasObject={paintNode}
        linkCanvasObject={paintLink}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.005}
        nodeRelSize={1}
        onNodeClick={handleNodeClick}
        onNodeHover={setHoveredNode}
        cooldownTime={5000}
      />
      
      {renderControlPanel()}
      
      {/* Module Details Popup */}
      {selectedModule && (
        <div
          className="module-details"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(15, 23, 42, 0.95)',
            padding: '16px',
            borderRadius: '8px',
            maxWidth: '400px',
            color: '#F8FAFC',
            border: '1px solid #1E293B',
            zIndex: 10,
          }}
        >
          <h3 className="text-lg font-bold mb-3">{selectedModule.name}</h3>
          
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2">Actions Clés</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              {selectedModule.actions_cles?.map((action: string, i: number) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          </div>
          
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2">Concepts Acquis</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              {selectedModule.concepts_acquis?.map((concept: string, i: number) => (
                <li key={i}>{concept}</li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold mb-2">Points de Compétence</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(selectedModule.skillPoints).map(([skill, points]) => (
                <div key={skill} className="flex justify-between">
                  <span>{skill.replace(/_/g, ' ')}:</span>
                  <span>{points}</span>
                </div>
              ))}
            </div>
          </div>
          
          <button 
            onClick={() => setSelectedModule(null)}
            className="absolute top-2 right-2 text-slate-400 hover:text-slate-200"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* Node Tooltip */}
      {hoveredNode && !selectedModule && (
        <div
          className="skill-tooltip"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(15, 23, 42, 0.9)',
            padding: '12px',
            borderRadius: '8px',
            maxWidth: '300px',
            color: '#F8FAFC',
            border: '1px solid #1E293B',
            zIndex: 10,
          }}
        >
          <h3 className="text-lg font-bold mb-2">{hoveredNode.name}</h3>
          <p className="text-sm mb-3">{hoveredNode.description}</p>
          
          {/* Skill points visualization */}
          {Object.entries(hoveredNode.skillPoints).map(([skill, value]) => (
            value > 0 && (
              <div key={skill} className="skill-point-bar mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>{skill.replace('_', ' ')}</span>
                  <span>{value}/5</span>
                </div>
                <div className="bg-slate-700 rounded-full h-2 w-full">
                  <div 
                    className="bg-teal-500 h-2 rounded-full" 
                    style={{ width: `${(value / 5) * 100}%` }} 
                  />
                </div>
              </div>
            )
          ))}
          
          <div className="mt-4 text-sm">
            {hoveredNode.isUnlocked ? (
              <span className="text-teal-400">✓ Débloqué</span>
            ) : hoveredNode.canUnlock ? (
              <span className="text-amber-400">⟳ Disponible - Double-cliquez pour débloquer</span>
            ) : (
              <span className="text-slate-400">🔒 Verrouillé</span>
            )}
          </div>
          
          <button 
            onClick={() => setSelectedModule(hoveredNode)}
            className="mt-2 text-sm text-teal-400 hover:text-teal-300"
          >
            Voir les détails →
          </button>
        </div>
      )}
    </div>
  );
} 