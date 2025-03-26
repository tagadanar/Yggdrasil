'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { SkillGraph, SkillNode, UserProgress } from '../../types/skills';
import { unlockSkill } from '../../lib/skillTreeUtils';

interface SkillGraphProps {
  data: SkillGraph;
  userProgress: UserProgress;
  onProgressUpdate: (progress: UserProgress) => void;
}

export default function SkillGraph({ data, userProgress, onProgressUpdate }: SkillGraphProps) {
  const fgRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<SkillNode | null>(null);
  
  // Update dimensions on window resize
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight - 100 // Leave some space for UI elements
        });
      };
      
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);
  
  // Handle node click (double click to unlock)
  const handleNodeClick = useCallback((node: SkillNode) => {
    if (node.canUnlock) {
      const updatedProgress = unlockSkill(node.id, userProgress);
      onProgressUpdate(updatedProgress);
    }
    
    // Focus on clicked node
    fgRef.current?.centerAt(node.x, node.y, 1000);
    fgRef.current?.zoom(2.5, 1000);
  }, [userProgress, onProgressUpdate]);
  
  // Custom node painting
  const paintNode = useCallback((node: SkillNode, ctx: CanvasRenderingContext2D) => {
    const size = node.level === 0 ? 20 : node.level === 1 ? 15 : 10;
    
    // Base circle
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, 2 * Math.PI);
    
    // Fill based on node state
    if (node.isUnlocked) {
      // Unlocked - use a bright color
      ctx.fillStyle = '#2DD4BF'; // Teal color
    } else if (node.canUnlock) {
      // Can unlock - use a slightly dimmer color
      ctx.fillStyle = '#0D9488'; // Darker teal
    } else {
      // Locked - use a dark/muted color
      ctx.fillStyle = '#134E4A'; // Very dark teal
    }
    
    ctx.fill();
    
    // Outer glow for canUnlock nodes
    if (node.canUnlock) {
      ctx.shadowColor = '#2DD4BF';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    
    // Border
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Label for important nodes or hovered node
    if (node.level <= 1 || hoveredNode?.id === node.id) {
      ctx.fillStyle = '#F8FAFC';
      ctx.font = node.level === 0 ? 'bold 12px Arial' : '10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.name, 0, size + 10);
    }
  }, [hoveredNode]);
  
  // Custom link painting for curved edges
  const paintLink = useCallback((link: any, ctx: CanvasRenderingContext2D) => {
    const { source, target } = link;
    
    // Determine color based on source/target state
    if (source.isUnlocked && target.isUnlocked) {
      ctx.strokeStyle = '#2DD4BF'; // Bright for connected
    } else if (source.isUnlocked && target.canUnlock) {
      ctx.strokeStyle = '#0D9488'; // Medium for potential
    } else {
      ctx.strokeStyle = '#134E4A'; // Dark for locked
    }
    
    ctx.lineWidth = link.value || 1;
    
    // Calculate control point for curve
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Draw curved path
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    
    // Simple curved line
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;
    const curveFactor = dist * 0.2;
    
    // Orthogonal vector for control point
    const orthX = -dy / dist * curveFactor;
    const orthY = dx / dist * curveFactor;
    
    ctx.quadraticCurveTo(
      midX + orthX, 
      midY + orthY, 
      target.x, 
      target.y
    );
    
    ctx.stroke();
  }, []);
  
  return (
    <div className="skill-graph" style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <ForceGraph2D
        ref={fgRef}
        graphData={data}
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
        cooldownTime={3000}
        d3VelocityDecay={0.3}
        d3AlphaDecay={0.02}
        d3Force={(d3) => {
          // Customize forces
          d3.force('charge').strength(-120);
          d3.force('link').distance((link: any) => 
            link.value === 2 ? 150 : 80
          );
          
          // Apply radial force to organize by levels
          d3.force('radial', d3.forceRadial()
            .radius((node: any) => node.level * 120)
            .strength(0.8)
          );
        }}
      />
      
      {/* Tooltip for hovered node */}
      {hoveredNode && (
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
        </div>
      )}
    </div>
  );
} 