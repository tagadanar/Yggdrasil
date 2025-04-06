'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useCurriculum } from '@/contexts/CurriculumContext';
import { getCategoryColors, getDirectPrerequisites, getDirectDependents } from '@/lib/curriculumUtils';
import { GraphNode } from '@/types';

export const CurriculumGraph: React.FC = () => {
  const { 
    graphData, 
    selectedCourse, 
    selectCourse, 
    completedCourses, 
    unlockedCourses, 
    completeCourse,
    isLoading
  } = useCurriculum();
  
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  
  // Category colors
  const categoryColors = getCategoryColors();

  // Generate the skill tree visualization
  useEffect(() => {
    if (!graphData?.nodes.length || !svgRef.current) return;

    // Clear previous SVG content
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Get container dimensions
    const containerWidth = graphContainerRef.current?.clientWidth || 960;
    const containerHeight = graphContainerRef.current?.clientHeight || 600;
    
    // Calculate total graph width based on levels
    const totalGraphWidth = (graphData.maxLevel + 1) * 300; // 300px per level
    
    // Create SVG with dark background
    const svg = d3.select(svgRef.current)
      .attr("width", totalGraphWidth)
      .attr("height", containerHeight);
    
    // Add background
    svg.append("rect")
      .attr("width", totalGraphWidth)
      .attr("height", containerHeight)
      .attr("fill", "#0a0a0a");
      
    const g = svg.append("g");
    
    // Create filters for glow effects
    const defs = svg.append("defs");
    
    // Create glow filter
    const filter = defs.append("filter")
      .attr("id", "glow")
      .attr("x", "-40%")
      .attr("y", "-40%")
      .attr("width", "180%")
      .attr("height", "180%");
      
    filter.append("feGaussianBlur")
      .attr("stdDeviation", "4")
      .attr("result", "coloredBlur");
      
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");
    
    // Create strong glow filter for selected nodes
    const strongFilter = defs.append("filter")
      .attr("id", "strongGlow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
      
    strongFilter.append("feGaussianBlur")
      .attr("stdDeviation", "8")
      .attr("result", "coloredBlur");
      
    const strongFeMerge = strongFilter.append("feMerge");
    strongFeMerge.append("feMergeNode").attr("in", "coloredBlur");
    strongFeMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Create completed node glow filter (green)
    const completedFilter = defs.append("filter")
      .attr("id", "completedGlow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
      
    completedFilter.append("feGaussianBlur")
      .attr("stdDeviation", "6")
      .attr("result", "coloredBlur");
      
    const completedFeMerge = completedFilter.append("feMerge");
    completedFeMerge.append("feMergeNode").attr("in", "coloredBlur");
    completedFeMerge.append("feMergeNode").attr("in", "SourceGraphic");
    
    // Create locked node filter (gray and desaturated)
    const lockedFilter = defs.append("filter")
      .attr("id", "lockedGlow")
      .attr("x", "-40%")
      .attr("y", "-40%")
      .attr("width", "180%")
      .attr("height", "180%");
    
    lockedFilter.append("feColorMatrix")
      .attr("type", "matrix")
      .attr("values", "0.3 0.3 0.3 0 0 0.3 0.3 0.3 0 0 0.3 0.3 0.3 0 0 0 0 0 1 0")
      .attr("result", "desaturated");
      
    lockedFilter.append("feGaussianBlur")
      .attr("in", "desaturated")
      .attr("stdDeviation", "1")
      .attr("result", "coloredBlur");
      
    const lockedFeMerge = lockedFilter.append("feMerge");
    lockedFeMerge.append("feMergeNode").attr("in", "coloredBlur");
    lockedFeMerge.append("feMergeNode").attr("in", "SourceGraphic");
    
    // Create category-specific glow filters
    Object.entries(categoryColors).forEach(([category, color]) => {
      const catFilter = defs.append("filter")
        .attr("id", `glow-${category.replace(/\s+/g, '-').toLowerCase()}`)
        .attr("x", "-40%")
        .attr("y", "-40%")
        .attr("width", "180%")
        .attr("height", "180%");
        
      catFilter.append("feGaussianBlur")
        .attr("stdDeviation", "3")
        .attr("result", "coloredBlur");
        
      const catFeMerge = catFilter.append("feMerge");
      catFeMerge.append("feMergeNode").attr("in", "coloredBlur");
      catFeMerge.append("feMergeNode").attr("in", "SourceGraphic");
    });
    
    // Create gradients for links
    graphData.links.forEach((link, i) => {
      const sourceCategory = typeof link.source === 'object' ? link.source.group : 
        graphData.nodes.find(n => n.id === link.source)?.group;
      const targetCategory = typeof link.target === 'object' ? link.target.group : 
        graphData.nodes.find(n => n.id === link.target)?.group;
        
      const sourceColor = categoryColors[sourceCategory || ''] || "#888";
      const targetColor = categoryColors[targetCategory || ''] || "#888";
      
      const gradient = defs.append("linearGradient")
        .attr("id", `link-gradient-${i}`)
        .attr("gradientUnits", "userSpaceOnUse");
        
      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", sourceColor);
        
      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", targetColor);
    });
    
    // Calculate horizontal positions based on levels - with more spacing
    const levelSpacing = 300; // Fixed spacing between levels
    graphData.nodes.forEach(node => {
      // Calculate x position from left to right with fixed spacing
      node.fixedX = node.level * levelSpacing + 150; // Center in each level column
    });
    
    // Vertical layout - separate nodes in the same level with more spacing
    const levelGroups: Record<number, GraphNode[]> = {};
    graphData.nodes.forEach(node => {
      if (!levelGroups[node.level]) {
        levelGroups[node.level] = [];
      }
      levelGroups[node.level].push(node);
    });
    
    // Distribute nodes vertically with more spacing
    Object.entries(levelGroups).forEach(([level, nodes]) => {
      const groupHeight = containerHeight * 0.8;
      const nodeSpacing = groupHeight / (nodes.length + 1);
      
      nodes.forEach((node, i) => {
        node.fixedY = (i + 1) * nodeSpacing + containerHeight * 0.1;
      });
    });
    
    // Create links group
    const links = g.selectAll(".link")
      .data(graphData.links)
      .enter()
      .append("g");
      
    // Add path for each link
    links.append("path")
      .attr("class", "link-path")
      .attr("stroke", (d, i) => {
        const sourceCourseId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetCourseId = typeof d.target === 'object' ? d.target.id : d.target;
        
        if (completedCourses.includes(sourceCourseId) && completedCourses.includes(targetCourseId)) {
          return "#2ecc71"; // Completed path is green
        } else if (completedCourses.includes(sourceCourseId) && unlockedCourses.includes(targetCourseId)) {
          return `url(#link-gradient-${i})`;
        } else {
          return "#555"; // Locked path is gray
        }
      })
      .attr("stroke-width", 2)
      .attr("opacity", d => {
        const sourceCourseId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetCourseId = typeof d.target === 'object' ? d.target.id : d.target;
        
        if (completedCourses.includes(sourceCourseId) && completedCourses.includes(targetCourseId)) {
          return 0.9; // Completed path is more visible
        } else if (completedCourses.includes(sourceCourseId) && unlockedCourses.includes(targetCourseId)) {
          return 0.7; // Active path
        } else {
          return 0.3; // Locked path is faded
        }
      })
      .attr("fill", "none")
      .attr("filter", d => {
        const sourceCourseId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetCourseId = typeof d.target === 'object' ? d.target.id : d.target;
        
        if (completedCourses.includes(sourceCourseId) && completedCourses.includes(targetCourseId)) {
          return "url(#strongGlow)"; // Completed path has strong glow
        } else if (completedCourses.includes(sourceCourseId) && unlockedCourses.includes(targetCourseId)) {
          return "url(#glow)"; // Active path has normal glow
        } else {
          return "none"; // Locked path has no glow
        }
      });
      
    // Add arrowhead markers
    links.append("path")
      .attr("class", "link-arrow")
      .attr("fill", d => {
        const targetCourseId = typeof d.target === 'object' ? d.target.id : d.target;
        
        if (completedCourses.includes(targetCourseId)) {
          return "#2ecc71"; // Green for completed
        } else if (unlockedCourses.includes(targetCourseId)) {
          const targetCategory = typeof d.target === 'object' ? d.target.group : 
            graphData.nodes.find(n => n.id === d.target)?.group;
          return categoryColors[targetCategory || ''] || "#888";
        } else {
          return "#555"; // Gray for locked
        }
      })
      .attr("filter", d => {
        const targetCourseId = typeof d.target === 'object' ? d.target.id : d.target;
        
        if (completedCourses.includes(targetCourseId)) {
          return "url(#strongGlow)";
        } else if (unlockedCourses.includes(targetCourseId)) {
          return "url(#glow)";
        } else {
          return "none";
        }
      });
    
    // Create node groups with proper position
    const nodes = g.selectAll(".node")
      .data(graphData.nodes)
      .enter().append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.fixedX},${d.fixedY})`)
      .style("cursor", d => unlockedCourses.includes(d.id) && !completedCourses.includes(d.id) ? "pointer" : completedCourses.includes(d.id) ? "default" : "not-allowed");
    
    // Add outer glow circle for nodes
    nodes.append("circle")
      .attr("r", d => d.isStartingNode || d.isFinalNode ? 35 : 25)
      .attr("fill", d => {
        if (completedCourses.includes(d.id)) {
          return "rgba(46, 204, 113, 0.2)"; // Green glow for completed
        } else if (unlockedCourses.includes(d.id)) {
          return "rgba(0,0,0,0.4)";
        } else {
          return "rgba(30,30,30,0.6)"; // Darker for locked
        }
      })
      .attr("stroke", d => {
        if (completedCourses.includes(d.id)) {
          return "#2ecc71"; // Green for completed
        } else if (unlockedCourses.includes(d.id)) {
          return categoryColors[d.group] || "#888";
        } else {
          return "#555"; // Gray for locked
        }
      })
      .attr("stroke-width", 3)
      .attr("filter", d => {
        if (d.id === selectedCourse?.id) {
          return "url(#strongGlow)"; // Strong glow for selected node
        } else if (completedCourses.includes(d.id)) {
          return "url(#completedGlow)";
        } else if (unlockedCourses.includes(d.id)) {
          if (d.isStartingNode || d.isFinalNode) {
            return "url(#strongGlow)";
          }
          return `url(#glow-${d.group.replace(/\s+/g, '-').toLowerCase()})`;
        } else {
          return "url(#lockedGlow)";
        }
      });
    
    // Add inner circle for nodes
    nodes.append("circle")
      .attr("r", d => d.isStartingNode || d.isFinalNode ? 25 : 18)
      .attr("fill", d => {
        if (completedCourses.includes(d.id)) {
          return d3.color("#2ecc71")?.darker(0.5).toString() || "#1e8449";
        } else if (unlockedCourses.includes(d.id)) {
          const color = categoryColors[d.group] || "#888";
          return d3.color(color)?.darker(0.8).toString() || "#333";
        } else {
          return "#333"; // Dark gray for locked
        }
      })
      .attr("stroke", d => {
        if (completedCourses.includes(d.id)) {
          return "#2ecc71";
        } else if (unlockedCourses.includes(d.id)) {
          return categoryColors[d.group] || "#888";
        } else {
          return "#555";
        }
      })
      .attr("stroke-width", 2);
    
    // Add decorative elements for special nodes
    nodes.filter(d => d.isStartingNode || d.isFinalNode)
      .append("circle")
      .attr("r", 33)
      .attr("fill", "none")
      .attr("stroke", d => {
        if (completedCourses.includes(d.id)) {
          const color = d3.color("#2ecc71");
          return color?.brighter(0.5).toString() || "#7aedb4";
        } else if (unlockedCourses.includes(d.id)) {
          const color = d3.color(categoryColors[d.group] || "#888");
          return color?.brighter(0.5).toString() || "#aaa";
        } else {
          return "#555";
        }
      })
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "8,4")
      .attr("opacity", d => unlockedCourses.includes(d.id) ? 0.7 : 0.3);
      
    // Add completion checkmark for completed courses
    nodes.filter(d => completedCourses.includes(d.id))
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 7)
      .attr("font-size", 20)
      .attr("fill", "#fff")
      .attr("filter", "url(#glow)")
      .text("✓");
    
    // Add lock symbol for locked courses
    nodes.filter(d => !unlockedCourses.includes(d.id) && !completedCourses.includes(d.id))
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 7)
      .attr("font-size", 16)
      .attr("fill", "#888")
      .text("🔒");
      
    // Add year indicator
    nodes.append("text")
      .attr("dy", d => d.isFinalNode ? -30 : -25)
      .attr("text-anchor", "middle")
      .attr("font-size", 10)
      .attr("fill", d => {
        if (completedCourses.includes(d.id)) {
          return "#9befc3"; // Light green
        } else if (unlockedCourses.includes(d.id)) {
          const color = d3.color(categoryColors[d.group] || "#888");
          return color?.brighter(0.8).toString() || "#aaa";
        } else {
          return "#888";
        }
      })
      .attr("filter", d => unlockedCourses.includes(d.id) ? "url(#glow)" : "none")
      .text(d => `Y${d.year}`);
    
    // Handle node click
    nodes.on("click", (event, d) => {
      // Only allow clicking on unlocked courses
      if (unlockedCourses.includes(d.id) || completedCourses.includes(d.id)) {
        selectCourse(selectedCourse?.id === d.id ? null : d.id);
      }
    });
    
    // Handle node hover for tooltip
    nodes.on("mouseenter", (event, d) => {
      setHoveredNode(d);
      
      // Get bounding rect for positioning tooltip
      const rect = event.currentTarget.getBoundingClientRect();
      const tooltipElement = tooltipRef.current;
      
      if (tooltipElement) {
        tooltipElement.style.opacity = '1';
        tooltipElement.style.left = `${rect.left}px`;
        tooltipElement.style.top = `${rect.top - 10}px`;
      }
    })
    .on("mouseleave", () => {
      setHoveredNode(null);
      
      const tooltipElement = tooltipRef.current;
      if (tooltipElement) {
        tooltipElement.style.opacity = '0';
      }
    });
    
    // Add course name labels
    g.selectAll(".label")
      .data(graphData.nodes)
      .enter().append("text")
      .attr("class", "label")
      .attr("x", d => d.fixedX || 0)
      .attr("y", d => d.fixedY || 0)
      .attr("text-anchor", "middle")
      .attr("fill", d => {
        if (completedCourses.includes(d.id)) {
          return "#9befc3"; // Light green
        } else if (unlockedCourses.includes(d.id)) {
          const color = d3.color(categoryColors[d.group] || "#888");
          return color?.brighter(1).toString() || "#fff";
        } else {
          return "#888"; // Gray for locked
        }
      })
      .attr("filter", d => unlockedCourses.includes(d.id) ? "url(#glow)" : "none")
      .attr("font-size", d => d.isStartingNode || d.isFinalNode ? 14 : 12)
      .attr("dy", d => d.isStartingNode || d.isFinalNode ? 45 : 35)
      .attr("font-weight", d => d.isStartingNode || d.isFinalNode ? "bold" : "normal")
      .text(d => {
        // Truncate long names
        return d.name.length > 20 ? d.name.substring(0, 18) + '...' : d.name;
      });
      
    // Update link paths as curved lines
    links.selectAll(".link-path")
      .attr("d", d => {
        const sourceNode = typeof d.source === 'object' ? d.source : graphData.nodes.find(n => n.id === d.source);
        const targetNode = typeof d.target === 'object' ? d.target : graphData.nodes.find(n => n.id === d.target);
        
        if (!sourceNode || !targetNode) return '';
        
        const sourceX = sourceNode.fixedX || 0;
        const sourceY = sourceNode.fixedY || 0;
        const targetX = targetNode.fixedX || 0;
        const targetY = targetNode.fixedY || 0;
        
        // Calculate control points for a horizontal curve
        const midX = (sourceX + targetX) / 2;
        
        // More horizontal curve for left-to-right flow
        return `M${sourceX},${sourceY} C${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}`;
      });
    
    // Update arrow positions
    links.selectAll(".link-arrow")
      .attr("d", d => {
        const sourceNode = typeof d.source === 'object' ? d.source : graphData.nodes.find(n => n.id === d.source);
        const targetNode = typeof d.target === 'object' ? d.target : graphData.nodes.find(n => n.id === d.target);
        
        if (!sourceNode || !targetNode) return '';
        
        const sourceX = sourceNode.fixedX || 0;
        const sourceY = sourceNode.fixedY || 0;
        const targetX = targetNode.fixedX || 0;
        const targetY = targetNode.fixedY || 0;
        
        // Calculate midpoints for the Bézier curve
        const midX = (sourceX + targetX) / 2;
        
        // Find a point along the curve
        // For a cubic Bézier, we can use the formula
        const t = 0.9; // Position arrow near the end of the curve
        const x1 = sourceX, y1 = sourceY;
        const x2 = midX, y2 = sourceY;
        const x3 = midX, y3 = targetY;
        const x4 = targetX, y4 = targetY;
        
        const Bx = Math.pow(1-t, 3)*x1 + 3*Math.pow(1-t, 2)*t*x2 + 3*(1-t)*Math.pow(t, 2)*x3 + Math.pow(t, 3)*x4;
        const By = Math.pow(1-t, 3)*y1 + 3*Math.pow(1-t, 2)*t*y2 + 3*(1-t)*Math.pow(t, 2)*y3 + Math.pow(t, 3)*y4;
        
        // Calculate the tangent at point t
        const dx = 3*Math.pow(1-t, 2)*(x2-x1) + 6*(1-t)*t*(x3-x2) + 3*Math.pow(t, 2)*(x4-x3);
        const dy = 3*Math.pow(1-t, 2)*(y2-y1) + 6*(1-t)*t*(y3-y2) + 3*Math.pow(t, 2)*(y4-y3);
        
        // Calculate angle from tangent
        const angle = Math.atan2(dy, dx);
        
        // Calculate arrow points
        const arrowSize = 8;
        const arrowAngle = 0.5;
        
        const tip = [Bx, By];
        const left = [
          Bx - Math.cos(angle - arrowAngle) * arrowSize,
          By - Math.sin(angle - arrowAngle) * arrowSize
        ];
        const right = [
          Bx - Math.cos(angle + arrowAngle) * arrowSize,
          By - Math.sin(angle + arrowAngle) * arrowSize
        ];
        
        return `M${tip[0]},${tip[1]}L${left[0]},${left[1]}L${right[0]},${right[1]}Z`;
      });
      
    // Update scroll position based on slider value
    if (graphContainerRef.current) {
      const maxScroll = totalGraphWidth - containerWidth;
      const scrollValue = (scrollPosition / 100) * maxScroll;
      graphContainerRef.current.scrollLeft = scrollValue;
    }
    
  }, [graphData, selectedCourse, completedCourses, unlockedCourses, scrollPosition, selectCourse, categoryColors]);
  
  // Handle horizontal scrolling
  const handleScrollChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScrollPosition(parseInt(e.target.value));
  };

  // Determine prerequisites and dependents for display
  const relatedCourses = selectedCourse ? {
    prerequisites: getDirectPrerequisites(selectedCourse.id, graphData || { nodes: [], links: [], maxLevel: 0 }),
    dependents: getDirectDependents(selectedCourse.id, graphData || { nodes: [], links: [], maxLevel: 0 })
  } : null;
  
  // Determine if all prerequisites are complete for the selected node
  const allPrerequisitesComplete = selectedCourse && 
    selectedCourse.allPrerequisites.every(prereq => completedCourses.includes(prereq));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-200">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="ml-3 text-lg font-medium">Loading curriculum...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 text-gray-200">
      <h2 className="text-2xl font-bold mb-2 text-yellow-400">Curriculum Skill Tree</h2>
      <p className="mb-4 text-gray-300">
        This interactive visualization shows direct course dependencies. Hover over nodes for details, 
        click to select courses, and complete them to unlock new ones.
      </p>
      
      <div className="flex flex-1 flex-col lg:flex-row gap-4">
        <div className="lg:w-3/4 h-96 lg:h-auto rounded-lg border border-gray-700 overflow-hidden relative flex flex-col">
          {/* Tooltip element */}
          <div 
            ref={tooltipRef}
            className="absolute z-10 bg-gray-800 text-white p-3 rounded-lg shadow-lg border border-gray-600 pointer-events-none opacity-0 transition-opacity duration-200"
            style={{transform: "translateY(-100%)", maxWidth: "250px"}}
          >
            {hoveredNode && (
              <div>
                <h3 className="font-bold text-sm mb-1">{hoveredNode.name}</h3>
                <p className="text-xs text-gray-300 mb-1">{hoveredNode.description}</p>
                <div className="flex justify-between text-xs mt-1">
                  <span 
                    className="px-1 rounded" 
                    style={{
                      backgroundColor: categoryColors[hoveredNode.group] + "33", 
                      color: categoryColors[hoveredNode.group]
                    }}
                  >
                    {hoveredNode.group}
                  </span>
                  <span>
                    {completedCourses.includes(hoveredNode.id) 
                      ? "✅ Completed" 
                      : unlockedCourses.includes(hoveredNode.id) 
                        ? "🔓 Unlocked" 
                        : "🔒 Locked"}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {/* Graph container with horizontal scroll */}
          <div 
            ref={graphContainerRef}
            data-testid="graph-container"
            className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-900"
          >
            <svg 
              ref={svgRef}
              data-testid="curriculum-svg" 
              className="h-full"
            />
          </div>
          
          {/* Horizontal scrollbar */}
          <div className="px-4 py-2 border-t border-gray-700 bg-gray-800">
            <input 
              type="range"
              min="0"
              max="100"
              value={scrollPosition}
              onChange={handleScrollChange}
              className="w-full appearance-none h-2 bg-gray-700 rounded-full outline-none cursor-pointer"
              style={{
                backgroundImage: `linear-gradient(to right, #3498db 0%, #3498db ${scrollPosition}%, #333 ${scrollPosition}%, #333 100%)`
              }}
            />
            <div className="flex justify-between text-gray-500 text-xs mt-1">
              <span>Level 0</span>
              <span>Level {graphData?.maxLevel || 0}</span>
            </div>
          </div>
        </div>
        
        <div className="lg:w-1/4 flex flex-col gap-4">
          {selectedCourse ? (
            <div className={`p-4 border rounded-lg shadow-md bg-gray-800 border-opacity-50 ${
              completedCourses.includes(selectedCourse.id) ? 'border-green-500' : 
              unlockedCourses.includes(selectedCourse.id) ? 'border' : 'border-gray-700'
            }`} 
                 style={{ 
                   borderColor: completedCourses.includes(selectedCourse.id) ? 
                     '#2ecc71' : unlockedCourses.includes(selectedCourse.id) ? 
                     categoryColors[selectedCourse.group] : undefined 
                 }}>
              <div className="flex justify-between items-center pb-2 border-b" 
                  style={{ 
                    borderColor: completedCourses.includes(selectedCourse.id) ? 
                      '#2ecc71' : unlockedCourses.includes(selectedCourse.id) ? 
                      categoryColors[selectedCourse.group] : '#555' 
                  }}>
                <h3 className="text-lg font-semibold" 
                    style={{ 
                      color: completedCourses.includes(selectedCourse.id) ? 
                        '#2ecc71' : unlockedCourses.includes(selectedCourse.id) ? 
                        categoryColors[selectedCourse.group] : '#888' 
                    }}>
                  {selectedCourse.name}
                </h3>
                <div className="text-sm font-medium px-2 py-1 rounded-full" 
                     style={{ 
                       backgroundColor: completedCourses.includes(selectedCourse.id) ? 
                         'rgba(46, 204, 113, 0.2)' : unlockedCourses.includes(selectedCourse.id) ? 
                         'rgba(255, 255, 255, 0.1)' : 'rgba(80, 80, 80, 0.2)',
                       color: completedCourses.includes(selectedCourse.id) ? 
                         '#2ecc71' : unlockedCourses.includes(selectedCourse.id) ? 
                         '#fff' : '#888'
                     }}>
                  {completedCourses.includes(selectedCourse.id) ? 'Completed' : 
                   unlockedCourses.includes(selectedCourse.id) ? 'Unlocked' : 'Locked'}
                </div>
              </div>
              
              <div className="my-4">
                <p className="my-2"><strong className="text-gray-300">Year:</strong> <span className="text-white">{selectedCourse.year}</span></p>
                <p className="my-2"><strong className="text-gray-300">Category:</strong> <span className="text-white">{selectedCourse.group}</span></p>
                <p className="my-2"><strong className="text-gray-300">Level:</strong> <span className="text-white">{selectedCourse.level}</span></p>
                <p className="my-2"><strong className="text-gray-300">Description:</strong> <span className="text-gray-300">{selectedCourse.description}</span></p>
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium text-gray-300">Direct Prerequisites:</h4>
                {relatedCourses?.prerequisites.length ? (
                  <ul className="list-disc pl-5 mt-1">
                    {relatedCourses.prerequisites.map(prerequisite => (
                      <li key={prerequisite} 
                          className={completedCourses.includes(prerequisite) ? 
                            "text-green-400" : "text-gray-400"}>
                        {prerequisite} {completedCourses.includes(prerequisite) ? '✓' : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="italic text-gray-500 mt-1">No direct prerequisites</p>
                )}
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium text-gray-300">Unlocks Directly:</h4>
                {relatedCourses?.dependents.length ? (
                  <ul className="list-disc pl-5 mt-1">
                    {relatedCourses.dependents.map(dependent => {
                      const isCompleted = completedCourses.includes(dependent);
                      const isUnlocked = unlockedCourses.includes(dependent);
                      
                      return (
                        <li key={dependent} 
                            className={
                              isCompleted ? "text-green-400" : 
                              isUnlocked ? "text-white" : "text-gray-500"
                            }>
                          {dependent} {isCompleted ? '✓' : isUnlocked ? '' : '🔒'}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="italic text-gray-500 mt-1">This is a terminal course</p>
                )}
              </div>
              
              {/* Complete course button */}
              {unlockedCourses.includes(selectedCourse.id) && !completedCourses.includes(selectedCourse.id) && (
                <button
                  className="mt-6 w-full py-2 px-4 rounded font-medium text-white transition-all duration-200 focus:outline-none"
                  style={{
                    backgroundColor: allPrerequisitesComplete ? '#2ecc71' : '#e74c3c',
                    boxShadow: `0 0 10px ${allPrerequisitesComplete ? '#2ecc71' : '#e74c3c'}`
                  }}
                  onClick={() => completeCourse(selectedCourse.id)}
                  disabled={!allPrerequisitesComplete}
                >
                  {allPrerequisitesComplete ? 'Complete Course' : 'Complete Prerequisites First'}
                </button>
              )}
              
              {completedCourses.includes(selectedCourse.id) && (
                <div className="mt-6 w-full py-2 px-4 rounded font-medium text-center text-green-400 bg-green-900 bg-opacity-20 border border-green-700">
                  Course Completed! ✓
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 border rounded-lg shadow-md bg-gray-800 border-gray-700">
              <p className="text-gray-300">Click on an unlocked skill node to see details and complete the course.</p>
            </div>
          )}
          
          <div className="p-4 border rounded-lg shadow-md bg-gray-800 border-gray-700">
            <h3 className="text-lg font-semibold mb-2 text-yellow-400">Legend</h3>
            
            <div className="mb-4">
              <h4 className="font-medium mb-2 text-gray-300">Categories</h4>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(categoryColors).map(([category, color]) => (
                  <div key={category} className="flex items-center">
                    <div className="w-4 h-4 mr-2 rounded-full" style={{ 
                      backgroundColor: color,
                      boxShadow: `0 0 6px ${color}` 
                    }}></div>
                    <span className="text-sm text-gray-300">{category}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2 text-gray-300">Node Status</h4>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center">
                  <div className="w-6 h-6 mr-2 rounded-full border-2" 
                      style={{ backgroundColor: "rgba(0,0,0,0.4)", borderColor: "#3498db" }}></div>
                  <span className="text-sm text-gray-300">Unlocked (available to start)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 mr-2 rounded-full border-2 flex items-center justify-center" 
                      style={{ 
                        backgroundColor: "rgba(46, 204, 113, 0.2)", 
                        borderColor: "#2ecc71" 
                      }}>
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-sm text-gray-300">Completed</span>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 mr-2 rounded-full border-2 flex items-center justify-center" 
                      style={{ backgroundColor: "#333", borderColor: "#555" }}>
                    <span className="text-gray-400 text-xs">🔒</span>
                  </div>
                  <span className="text-sm text-gray-300">Locked (prerequisites needed)</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 border rounded-lg shadow-md bg-gray-800 border-gray-700">
            <h3 className="text-lg font-semibold mb-2 text-yellow-400">Progress</h3>
            <div className="w-full bg-gray-700 rounded-full h-4">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-400 h-4 rounded-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${(completedCourses.length / (graphData?.nodes.length || 1)) * 100}%`,
                  boxShadow: "0 0 10px rgba(46, 204, 113, 0.5)"
                }}
              ></div>
            </div>
            <p className="mt-2 text-center text-gray-300">
              <span className="text-green-400 font-bold">{completedCourses.length}</span> of <span className="font-bold">{graphData?.nodes.length || 0}</span> courses completed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};